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
- a non-empty `integrity_files` array whose entries each bind a repository-relative path to an exact Git `blob_sha` at the same authority commit;
- `runner.run_argv` to bind `{assessment_id}`, `{head_sha}`, and `{pr_number}`; and
- `runner.plan_argv`, when present, to bind `{head_sha}` and `{pr_number}`.

`{base_sha}` and `{evidence_path}` are not required in repository-owned runner argv. `{evidence_path}` is rejected there because the native evidence location belongs to the declared result contract, not to an invented runner flag. A pre-existing venv is optional and is validated only when the spec/argv actually bind `{venv}`.

Canonical `refs/pull/<PR>/head` is now accepted as `repository.head_ref`; arbitrary full refs remain rejected. `repository.base_ref` remains a branch name.

## Evidence and freshness

For repository-owned mode the public gateway still owns the outer authority boundary. Before execution it fresh-fetches and proves exact base and head authority, proves the clean owner checkout is at the selected authority SHA, and proves every pinned runner/control file against both its exact Git blob and current working bytes. Optional SHA-256 pins may add a second content check.

The native runner writes:

```text
/tmp/opencode/verify/results/<assessment-id>/assessment.json
```

The gateway accepts at most the bounded `local-agent-assessment-v1` contract. It opens the native evidence with no-follow semantics, proves the opened regular file remains inside the bounded native-result root, and reads one byte snapshot whose actual size is also checked against the evidence limit. The SHA-256/size metadata, strict JSON validation, and canonical evidence copy all derive from that same immutable in-process buffer so a post-run path replacement cannot make the recorded hash describe different accepted bytes or bypass the symlink/size boundary. It verifies matching assessment/PR/requested-head identity and `GATE_DECISION=NOT_EVALUATED`, requires the native exit code to agree with `PASS|FAIL|BLOCKED|STALE|INFRA_ERROR|ISOLATION_BREACH`, and applies stricter exact tested/head/control/cleanup checks before accepting PASS. It then copies the validated snapshot without reinterpretation to:

```text
/tmp/opencode/verify/evidence/<assessment-id>.runner.json
```

and writes the normal gateway summary at:

```text
/tmp/opencode/verify/evidence/<assessment-id>.summary.json
```

Both gateway-owned and repository-owned modes now re-fetch and revalidate remote base/head authority at the final boundary. Gateway-owned integrity entries remain backward compatible with path-only and optional SHA-256 forms; when a `blob_sha` is supplied, v5.22.0 enforces it against the exact assessed-head Git blob and current worktree bytes rather than silently accepting an unchecked pin.

## Upgrade procedure

No `opencode.json` migration is required solely for v5.22.0. Upgrade remains stage-first:

1. update the staged plugin tree;
2. run `npm run check` and `npm test`;
3. verify the staged and intended live trees byte-for-byte;
4. replace/reload the live plugin through the existing installation procedure;
5. verify the live plugin reports the v5.22.0 policy contract; and
6. only then construct or execute repository-owned assessment specs.

Do not use a repository-owned spec against a still-live v5.21.1 dispatcher. Do not bypass the public dispatcher by invoking a repository runner directly when project policy requires the operational guard.
