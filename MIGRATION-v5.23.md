# operational-schema v5.23.0 target lifecycle and owner-base reconciliation

v5.23.0 resolves a lifecycle deadlock between persistent exact-head target authority and repository-owned `repo-pr` base-authority admission. It does not weaken the gateway requirement that the owner checkout already be clean at the selected authority SHA when the assessment starts.

## Root defect

v5.22.0 persisted target-mode authority per workspace across sessions and plugin restarts. That is intentional for fail-closed exact-head admission, but the target binding represented only the candidate SHA. A repository-owned assessment with `runner.authority: "base"` independently requires the owner checkout to be clean at the pinned base SHA. If authoritative `main` advanced after the prior PR merged while the owner remained on the previous clean main SHA, a candidate-bound target mismatch blocked every owner HEAD-changing operation except exact detached movement to the candidate. The gateway therefore could not run because the owner was behind its pinned base, while the guard prevented satisfying that gateway precondition.

A fresh chat, terminal, or OpenCode session was not a lifecycle transition: workspace safety state was deliberately persisted and restored. A typed gateway `STALE` result also had no target-state transition. The result was a repository-owned gateway admission cycle rather than evidence against the candidate PR.

## Lifecycle

The target lifecycle is now defined as:

```text
IDLE
  -> TARGET_BOUND                 explicit exact-head target declaration
  -> ASSESSMENT_ACTIVE           exact public local-agent-assessment invocation
  -> ASSESSMENT_TERMINAL         typed HOST_EVIDENCE_RESULT observed
       -> TARGET_RELEASED         PASS|FAIL|BLOCKED|INFRA_ERROR|ISOLATION_BREACH
       -> OWNER_RECONCILIATION    STALE, while target remains bound
  -> TARGET_RELEASED             successful exact owner-base reconciliation
```

`ASSESSMENT_ACTIVE`, `ASSESSMENT_TERMINAL`, and `OWNER_RECONCILIATION` are command/lifecycle states, not alternative Git authorities. The persisted exact-head target remains the authority boundary until it is explicitly released.

An interrupted assessment that does not emit a recognized typed terminal result remains fail-closed in the existing target-bound state. Starting another chat/session does not release it. A new explicit authority declaration may supersede the old binding under the existing authority-change rules.

## Sanctioned repository-owned base reconciliation

The new public helper is:

```text
/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/reconcile-owner-base.mjs \
  --spec /tmp/opencode/verify/assessments/<assessment>.json \
  --expected-old-sha <40-lowercase-owner-sha> \
  --expected-base-sha <40-lowercase-pinned-base-sha> \
  --expected-target-sha <40-lowercase-target-sha>
```

It accepts no destination argument. The caller must explicitly bind the expected old-owner, pinned-base, and target SHAs; the helper requires the latter two to equal the exact typed spec before any repository inspection or mutation. The destination is then derived only from that doubly bound pinned base.

The helper requires all of the following before owner movement:

- the spec is `kind: "repo-pr"`;
- the spec's `repository.base_sha` exactly equals `--expected-base-sha`;
- the spec's `repository.head_sha` exactly equals `--expected-target-sha`;
- when invoked under a persisted exact-head guard target, `--expected-target-sha` exactly equals that persisted target;
- `runner.execution == "repository-owned"`;
- `runner.authority == "base"`;
- the current owner branch exactly equals `repository.base_ref`;
- the owner worktree is clean;
- current owner HEAD exactly equals `--expected-old-sha`;
- a fresh fetch proves remote base exactly equals `repository.base_sha`;
- a fresh fetch proves the canonical/declared PR head exactly equals `repository.head_sha`;
- the expected old owner SHA is an ancestor of the pinned base; and
- a final immediate owner snapshot still matches the admitted branch/HEAD/clean state.

Only then does it execute:

```text
git merge --ff-only <repository.base_sha>
```

Afterward it requires branch == pinned base branch, HEAD == pinned base SHA, a clean owner worktree, and a second fresh remote base/head authority proof. Any wrong SHA, dirty checkout, moved remote authority, non-fast-forward relation, branch mismatch, or post-write identity discrepancy fails closed. There is no reset, rebase, force operation, merge-commit path, user-selected destination, or candidate-head movement capability.

The operation guard recognizes only the exact public helper grammar while target authority is pending/mismatched. Raw `git merge`, `git switch`, `git reset`, candidate movement, and arbitrary scripts remain under the existing exact-head mutation block. Strict-start mismatches cannot use this helper as an escape hatch.

A successful helper result updates the currently proven workspace HEAD to the exact pinned base and releases candidate target authority. The next exact-head assessment must be entered with a fresh explicit target declaration/spec, preserving the normal exact-head evidence boundary.

## Terminal assessment behavior

For an exact target-bound public repository assessment:

- `STALE` keeps target authority bound and exposes the bounded reconciliation route. This is necessary because stale owner/base admission can be repaired without changing candidate identity. If STALE is caused by moved remote authority instead, the reconciler independently fails its fresh authority checks and no owner mutation occurs.
- `PASS`, `FAIL`, `BLOCKED`, `INFRA_ERROR`, and `ISOLATION_BREACH` are recognized terminal outcomes and release target authority. Any remediation or reassessment is a new Central/caller-owned lifecycle with fresh authority.
- a crash/interruption without a typed `HOST_EVIDENCE_RESULT` does not release target authority.

## Configuration and deployment

No `opencode.json` migration is required solely for v5.23.0. The reconciler is a primary-side deterministic public capability; it is not a Verify-child permission surface and does not broaden existing generic shell permissions.

Upgrade remains stage-first:

1. update a staging/source checkout to the exact reviewed v5.23.0 commit;
2. run `npm run check` and `npm test`;
3. verify staged/live inventory and exact bytes;
4. install through the project-controlled deployment path;
5. start/reload a genuinely fresh OpenCode process;
6. prove v5.23.0 and the exact `reconcile-owner-base.mjs` public grammar live; and
7. only then use the helper to reconcile a repository-owned owner checkout.

Do not hot-edit the deployed tree and do not use a second shell/session to bypass persisted target state.
