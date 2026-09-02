# operational-schema v5.22.0 repository-assessment contract

v5.22.0 extends the typed `opencode-local-assessment-v1` `repo-pr` gateway without changing the live OpenCode configuration schema.

## Why this release exists

The v5.21.1 gateway assumed every repository runner could be executed from a gateway-created candidate worktree and could accept explicit base-SHA and evidence-output arguments. That is not valid for repositories whose assessment runner is itself the trusted lifecycle authority. In particular, a main-owned runner may intentionally derive and revalidate current-main control internally, bind candidate identity to canonical `refs/pull/<PR>/head`, provision its own exact-head environment and disposable services, and write an existing typed evidence contract beneath the sanctioned results root.

Attempting to force such a runner through the v5.21.1 argv/worktree shape either made the typed spec impossible to construct or moved orchestration authority into the candidate checkout. Neither is acceptable.

## New repository-owned mode

`runner.execution` now selects one of two contracts:

- `gateway-owned` — backward-compatible default. The gateway creates the isolated exact-head worktree and requires runner argv to bind base/head/PR authority plus the gateway evidence path.
- `repository-owned` — opt-in for a reviewed repository runner that already owns exact-head worktree, environment, service, validation, evidence, isolation, and cleanup lifecycle.

Repository-owned mode requires:

- `runner.authority`: `base` for normal trusted-main control or `head` only for an explicitly reviewed/pinned pre-merge bootstrap;
- `runner.blob_sha`: exact Git blob SHA of the executable runner at the selected authority commit;
- `runner.result_contract`: `local-agent-assessment-v1`;
- a non-empty `integrity_files` array containing the complete repository-local runtime control dependency set consumed by the runner, with every entry binding a repository-relative path to an exact Git `blob_sha` at the same authority commit;
- `runner.run_argv` to bind `{assessment_id}`, `{head_sha}`, and `{pr_number}`; and
- `runner.plan_argv`, when present, to bind `{head_sha}` and `{pr_number}`.

`{base_sha}` and `{evidence_path}` are not required in repository-owned runner argv. `{evidence_path}` is rejected there because the native evidence location belongs to the declared result contract, not to an invented runner flag. A pre-existing venv is optional and is validated only when the spec/argv actually bind `{venv}`.

Canonical `refs/pull/<PR>/head` is now accepted as `repository.head_ref`; arbitrary full refs remain rejected. `repository.base_ref` remains a branch name.

## Evidence and freshness

For repository-owned mode the public gateway still owns the outer authority boundary. Before execution it fresh-fetches and proves exact base and head authority, inode-anchors the owner repository, proves the clean owner checkout is at the selected authority SHA, no-follow anchors `/tmp/opencode/control-worktrees`, creates the assessment child through that parent descriptor, and immediately records the child device/inode before cloning a standalone shared-object, detached exact-authority control snapshot. A pre-existing child destination blocks without mutation; parent/child pathname substitution is an isolation breach rather than a redirect, and failures before exact snapshot admission remove only a child whose admitted parent/child identities still match. The gateway opens and retains directory descriptors for the control parent, control child, and disposable Git metadata. For each repository-owned phase, the supervisor starts a minimal Landlock-constrained capability-holder fork, `fchdir()`s that helper to the admitted control descriptor, closes its unrelated inherited descriptors, and renders `{repo_root}` as `/proc/<capability-holder-pid>/cwd`. The helper exposes no gateway decision state and uses `PR_SET_PTRACER` only for the supervisor PID, allowing the supervisor's runner process tree—but not arbitrary same-UID processes—to resolve the helper's procfs cwd under restrictive Yama settings. The resulting path remains stable across runner `chdir()` calls and ordinary child subprocess descriptor closing, so commands such as `git -C {repo_root} ...` remain bound to the admitted snapshot. The holder is signaled to exit and explicitly reaped before ordinary descendant accounting. Relative control watches are installed through the separate phase-local descriptor, so a pathname rename/substitution after validation cannot redirect runner imports, repository-root arguments, or watch admission. The clone owns disposable Git metadata while reading existing immutable objects through Git's shared-object mechanism; the runner receives no write authority to the owner repository or its Git common directory. The gateway also opens immutable directory anchors for the native-result and canonical-evidence roots, opens and hashes a no-follow descriptor for the exact admitted runner, and proves the runner plus every declared control dependency against both its exact Git blob and current snapshot bytes. Optional SHA-256 pins may add a second content check.

Each repository-owned plan/run phase is Linux-supervised. The supervisor becomes a child subreaper before starting the descriptor-bound runner and returns a typed outcome over a dedicated inherited status pipe whose descriptor is close-on-exec for the runner. Runner exit statuses therefore cannot collide with supervisor-reserved numeric process exits. The gateway requires the typed status version/kind to agree with the supervisor process exit, and runner `execve()` failure is carried by a separate close-on-exec handshake rather than masquerading as any runner exit value. `setsid()`, double-fork, and daemonized descendants cannot escape the phase boundary; the supervisor repeatedly reconstructs their live parent graph from Linux `/proc/*/status`, then kills and reaps surviving descendants against a bounded five-second monotonic deadline. A successfully reaped survivor terminalizes with the ordinary descendant result, while inability to terminate/reap uses a distinct containment-uncertain supervisor outcome instead of setup error. Repository-owned handling of that outcome returns `INFRA_ERROR` and preserves the assessment file reservation plus control snapshot; the in-process abstract-socket reservation is retained for that gateway process as well. This prevents a later same-process assessment from reusing the identity and leaves explicit forensic state rather than deleting evidence while containment is unproved. Landlock limits phase writes to the sanctioned `/tmp/opencode/verify` tree, the disposable control clone's own Git common directory required for fetch/worktree operations, and the exact `/dev/null` device file. The rest of `/dev` (including `/dev/shm`), the control snapshot working tree, and the owner repository/Git metadata remain outside those write grants. Inotify watches the runner, every declared integrity file, and their control-path ancestry, so external mutate-and-restore activity is detected even when final bytes are restored. Repository-owned mode therefore requires Linux with `/proc`, Python 3, Landlock, and inotify; inability to establish those primitives fails closed as infrastructure error rather than falling back to unsandboxed execution. After an optional plan and again immediately before run, the gateway revalidates admitted directory identities and runner/control inputs.

After acquiring the kernel assessment identity, the gateway also atomically creates and retains the outer `<assessment-id>.summary.json` file through the anchored evidence root before either same-ID reservation can be released. That pathname is therefore durably claimed throughout control cleanup and final owner-proof work; final summary bytes are written and synchronized through the originally reserved file descriptor, closing the release-before-publication race.

The native runner writes:

```text
/tmp/opencode/verify/results/<assessment-id>/assessment.json
```

The gateway accepts at most the bounded `local-agent-assessment-v1` contract. It walks every intermediate native-evidence directory through no-follow directory descriptors and then opens the final evidence file without following symlinks; metadata and actual snapshot length are both checked against the evidence bound. The SHA-256/size metadata, strict JSON validation, and canonical evidence copy all derive from that same immutable in-process buffer. Canonical evidence and the outer summary are written through the pre-run anchored evidence directory, so a runner cannot redirect accepted output by renaming a root and substituting a symlink. Root pathname identity is revalidated after execution and any replacement is an isolation breach. Before the anchors close, public result paths are rebound to the actual pathname still naming the anchored directory, preserving durable summary discovery even when a breach renamed the original root. It verifies matching assessment/PR/requested-head identity and `GATE_DECISION=NOT_EVALUATED`, requires the native exit code to agree with `PASS|FAIL|BLOCKED|STALE|INFRA_ERROR|ISOLATION_BREACH`, and applies stricter exact tested/head/control/cleanup checks before accepting PASS. It then copies the validated snapshot without reinterpretation to:

```text
/tmp/opencode/verify/evidence/<assessment-id>.runner.json
```

and writes the normal gateway summary at:

```text
/tmp/opencode/verify/evidence/<assessment-id>.summary.json
```

Both gateway-owned and repository-owned modes now re-fetch and revalidate remote base/head authority at the final boundary and fail closed if the final owner-workspace proof itself cannot be obtained. Repository-owned final proof is performed through the inode-anchored original owner repository, not by re-resolving its pathname; owner-root replacement is an isolation breach even if a replacement checkout reproduces the initial HEAD/branch/status. Repository-owned admission first acquires a Linux abstract-socket reservation keyed by `assessment_id`, then atomically creates and holds a matching file token under the gateway-only `/tmp/opencode/assessment-reservations/**` root before plan/run; that root is deliberately outside every supervised runner write grant. The kernel reservation remains authoritative for concurrent exclusion even if the reservation-root pathname is replaced, and a duplicate invocation that cannot acquire it does not write the active assessment's summary path. A competing token or pre-existing `<results>/<assessment-id>` directory blocks before runner invocation; reservation-root pathname identity, kernel reservation state, and token device/inode identity are revalidated after plan, immediately before run, and again before native evidence admission. The native runner still owns creation of `<results>/<assessment-id>` itself, while the gateway reads the resulting evidence through the no-follow directory-descriptor chain and requires clean reservation release before outer PASS. Containment-uncertain supervisor failure is the deliberate exception: the file reservation and control snapshot remain preserved rather than being released/deleted under uncertainty. Normal control cleanup verifies the admitted parent-opened child identity, removes contents only through the child descriptor, revalidates that parent/child identity at the destructive boundary, and removes the child entry through the retained parent descriptor; a replacement public pathname is never recursively deleted as though it were the admitted snapshot. The detached control snapshot must remain the exact clean authority checkout and must be removed successfully before an outer PASS is accepted. Gateway-owned integrity entries remain backward compatible with path-only and optional SHA-256 forms; when a `blob_sha` is supplied, v5.22.0 enforces it against the exact assessed-head Git blob and current worktree bytes rather than silently accepting an unchecked pin. After an optional plan, gateway-owned runner/integrity bytes are revalidated immediately before run. The outer summary is mandatory evidence: failure to materialize it is `INFRA_ERROR` and can never leave the returned outer disposition as PASS; when no durable pathname exists, the returned `summary_path` is `null` rather than stale.

## Upgrade procedure

No `opencode.json` migration is required solely for v5.22.0. Upgrade remains stage-first:

1. update the staged plugin tree;
2. run `npm run check` and `npm test`;
3. verify the staged and intended live trees byte-for-byte;
4. replace/reload the live plugin through the existing installation procedure;
5. verify the live plugin reports the v5.22.0 policy contract; and
6. only then construct or execute repository-owned assessment specs.

Do not use a repository-owned spec against a still-live v5.21.1 dispatcher. Do not bypass the public dispatcher by invoking a repository runner directly when project policy requires the operational guard.
