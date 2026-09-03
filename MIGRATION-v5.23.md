# operational-schema v5.23.0 target lifecycle and owner-base reconciliation

v5.23.0 resolves a lifecycle deadlock between persistent exact-head target authority and repository-owned `repo-pr` base-authority admission. It does not weaken the gateway requirement that the owner checkout already be clean at the selected authority SHA when the assessment starts.

## Root defect

v5.22.0 persisted target-mode authority per workspace across sessions and plugin restarts. That is intentional for fail-closed exact-head admission, but the target binding represented only the candidate SHA. A repository-owned assessment with `runner.authority: "base"` independently requires the owner checkout to be clean at the pinned base SHA. If authoritative `main` advanced after a prior merge while the owner remained on the previous clean main SHA, a candidate-bound target mismatch blocked every owner HEAD-changing operation except exact detached movement to the candidate. The gateway therefore could not run because the owner was behind its pinned base, while the guard prevented satisfying that gateway precondition.

A fresh chat, terminal, or OpenCode session was not a lifecycle transition: workspace safety state was deliberately persisted and restored. v5.22.0 also had no authenticated assessment-terminal transition and no separately modeled trusted-base reconciliation capability. The result was a repository-owned gateway admission cycle rather than evidence against the candidate PR.

## Authenticated target lifecycle

The target lifecycle is now:

```text
IDLE
  -> TARGET_BOUND                 explicit exact-head target declaration
  -> ASSESSMENT_ACTIVE           exact public local-agent-assessment invocation
  -> ASSESSMENT_TERMINAL         terminal evidence authenticated to target + spec
       -> TARGET_RELEASED         PASS|FAIL|BLOCKED|INFRA_ERROR|ISOLATION_BREACH
       -> TARGET_BOUND            STALE for remote/ref/other non-reconcilable causes
       -> OWNER_RECONCILIATION    STALE only for proved clean-owner-behind-base cause
  -> TARGET_RELEASED             authenticated exact owner-base reconciliation PASS
```

`ASSESSMENT_ACTIVE`, `ASSESSMENT_TERMINAL`, and `OWNER_RECONCILIATION` are lifecycle states, not alternative Git authorities. The persisted exact-head target remains the authority boundary until an authenticated terminal transition releases it or a new explicit target supersedes it under the existing authority-change rules.

A fresh chat/session does not release target authority. An interrupted assessment, malformed output, missing terminal evidence, inconsistent exit code, cross-target result, or result whose exact spec/summary identity cannot be authenticated leaves the target bound.

## Assessment-terminal authentication

The public assessment command remains fixed-shape:

```text
/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/local-agent-assessment.mjs \
  --spec /tmp/opencode/verify/assessments/<assessment>.json
```

Before invocation, the operation guard loads that exact non-symlink typed spec and, when target authority is bound, requires `repository.head_sha` to equal the persisted target. The public wrapper emits a structured marker containing the assessment ID, SHA-256 of the exact spec bytes, pinned base SHA, pinned target SHA, and gateway outer-summary path.

A terminal transition is accepted only when all of the following agree:

- the exact public command and the preflight-loaded spec;
- the persisted target SHA;
- assessment ID;
- exact spec SHA-256;
- pinned base and target SHAs;
- one and only one `HOST_EVIDENCE_RESULT` marker;
- `GATE_DECISION=NOT_EVALUATED`;
- the public gateway exit-code contract (`PASS=0`, `FAIL=1`, `BLOCKED=2`, `STALE=3`, `INFRA_ERROR=2`, `ISOLATION_BREACH=4`); and
- the bounded no-follow outer summary under `/tmp/opencode/verify/evidence`, including its schema, assessment identity, exact spec hash, base/target identities, host result, and gate decision.

If any element disagrees, the wrapper sanitizes the terminal marker before the legacy/core after-hook sees it, records a rejected lifecycle transition, and leaves target authority bound. This prevents a different valid assessment spec, forged terminal text, wrong exit status, or mismatched summary from releasing an unrelated target.

## Which `STALE` results admit reconciliation

`STALE` is not itself a reconciliation capability.

The guard mints `OWNER_RECONCILIATION` only when the authenticated gateway outer summary proves the specific repository-owned/base-authority admission condition that v5.22.0 could not repair:

- `runner_execution == "repository-owned"`;
- `runner_authority == "base"`;
- the owner was on the exact `repository.base_ref` branch;
- the owner worktree was clean;
- the owner HEAD equals the currently proved old-owner SHA;
- the gateway had already freshly verified remote base == pinned base SHA;
- the gateway had already freshly verified canonical PR head == pinned target SHA; and
- the gateway's exact terminal cause is the owner checkout being at that old SHA instead of the pinned base authority SHA.

A `STALE` caused by moved remote base/head authority, a head-authority bootstrap, mismatched control bytes, or any other cause does **not** mint owner-reconciliation state. The target remains bound, but a corrected/new exact same-target assessment spec may be run again. This avoids converting an unrelated stale condition into a new lifecycle lock.

The admitted `OWNER_RECONCILIATION` capability is persisted separately from ordinary core safety state and survives plugin restart. Its record is bound to the exact target SHA, base ref/SHA, proved old-owner SHA, assessment ID, spec path, and spec SHA-256. Corrupt reconciliation-capability state fails closed; corrupt legacy/core state continues through the core's existing fail-closed recovery path and cannot mint a reconciliation capability.

While `OWNER_RECONCILIATION` is active, alternate owner HEAD movement—including a detached move to the candidate—is blocked. Only the exact authenticated reconciliation helper invocation may cross that boundary.

## Sanctioned repository-owned base reconciliation

The public helper is:

```text
/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/reconcile-owner-base.mjs \
  --spec /tmp/opencode/verify/assessments/<assessment>.json \
  --expected-old-sha <40-lowercase-owner-sha> \
  --expected-base-sha <40-lowercase-pinned-base-sha> \
  --expected-target-sha <40-lowercase-target-sha>
```

Generic target mismatch does not admit this command. Arbitrary `STALE` does not admit it. The same exact assessment must first establish the persisted `OWNER_RECONCILIATION` capability described above.

Before execution, the guard requires the helper command and freshly loaded spec to match that capability exactly: spec path and SHA-256, assessment ID, base ref/SHA, target SHA, old-owner SHA, repository-owned execution, and base runner authority.

The helper itself independently requires:

- `kind: "repo-pr"`;
- `repository.base_sha == --expected-base-sha`;
- `repository.head_sha == --expected-target-sha`;
- `runner.execution == "repository-owned"`;
- `runner.authority == "base"`;
- current owner branch == `repository.base_ref`;
- clean owner worktree;
- current owner HEAD == `--expected-old-sha`;
- fresh remote base == `repository.base_sha`;
- fresh canonical/declared PR head == `repository.head_sha`;
- old-owner SHA is an ancestor of the pinned base;
- an immediate owner identity/cleanliness recheck; and
- a second fresh remote-authority check immediately before mutation.

Only then does it execute:

```text
git merge --ff-only <repository.base_sha>
```

Afterward it requires branch == pinned base branch, HEAD == pinned base SHA, a clean owner worktree, and another fresh remote base/head authority proof. There is no reset, rebase, force operation, merge-commit path, user-selected destination, or candidate-head movement capability.

A successful helper output is itself authenticated before target release. Its exit must be zero and its unique result marker must match the persisted capability and admitted command/spec on assessment ID, exact spec SHA-256, expected old-owner SHA, base SHA, target SHA, and base branch. A forged or inconsistent success marker leaves the target and reconciliation capability bound.

After authenticated reconciliation PASS, the operation guard updates current workspace provenance to the exact pinned base, releases target authority, consumes the reconciliation capability, and requires any subsequent exact-head assessment to establish fresh target authority/spec identity.

## Regression coverage

The v5.23.0 suite covers:

- cross-target assessment-spec rejection before execution;
- forged/mismatched assessment ID, target, spec hash, outer-summary identity, and exit status;
- fail-closed interrupted or missing terminal evidence;
- all public gateway terminal exit mappings;
- generic mismatch rejection of owner reconciliation;
- remote-authority and non-base `STALE` not minting reconciliation authority;
- exact owner-base `STALE` persistence across plugin restart;
- alternate HEAD movement blocked while `OWNER_RECONCILIATION` is active;
- exact stale spec/hash/old/base/target/branch binding for reconciliation success;
- dirty/wrong owner preconditions;
- non-fast-forward base rejection;
- fresh remote-authority rechecks before and after mutation; and
- immediate repository-owned gateway admission after the sanctioned exact fast-forward.

## Configuration and deployment

No `opencode.json` migration is required solely for v5.23.0. The reconciler is a primary-side deterministic public capability; it is not a Verify-child permission surface and does not broaden generic shell permissions.

Upgrade remains stage-first:

1. update a staging/source checkout to the exact reviewed v5.23.0 commit;
2. run `npm run check` and `npm test`;
3. verify staged/live inventory and exact bytes;
4. install through the project-controlled deployment path;
5. start/reload a genuinely fresh OpenCode process;
6. prove v5.23.0 and the exact assessment/reconciliation grammars live;
7. reproduce the target mismatch and prove generic/raw owner HEAD movement remains denied;
8. run the exact target assessment and require authenticated clean-owner-behind-base `STALE` before reconciliation becomes available;
9. execute the exact reconciliation helper and prove exact branch/HEAD/clean readback; and
10. stop before running the target repository's next host assessment until that deployment/reconciliation evidence has been reviewed.

Do not hot-edit the deployed tree and do not use another shell/session to bypass persisted target state.
