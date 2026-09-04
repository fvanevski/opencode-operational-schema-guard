# OpenCode operational-schema guard

This local plugin turns the v5.23.2 delegation, child-capability, resumable-failure, authority-admission, project-neutral repository assessment, prompt-compatibility, interactive-call, trace-audit, and compaction contract into bounded runtime behavior.

<!-- generated-policy:start -->
[operational-policy-v5.23.2]
Operational budgets are advisory context-engineering signals, not execution authority. Read, reopen, shell-packet, direct-validation, ordinary operation, child-call, and routing-debt thresholds may emit concise guidance but must not stop otherwise permitted work.
Primary context-pressure thresholds are derived once at plugin initialization from the merged live OpenCode configuration for each primary agent's resolved model: warning=model.limit.input-compaction.reserved and emergency no-tool ceiling=model.limit.input. Configuration changes take effect only in a new plugin process; no fixed context-token thresholds are authoritative.
Normalize a fully envelope-less non-empty bounded Task prompt into the Turn-1 envelope whenever the deterministic wrapper plus the role contract still fits that role's existing prompt limit; preserve the original prompt verbatim as supporting context. Fresh-review envelope inference additionally requires deterministic bounded-scope evidence in the original prompt: either a finite in-limit filesystem target set or an explicit current/provided/attached diff, patch, PR, change-set, or changed-file anchor, with repository-wide or open-ended expansion language vetoing inference. The inferred Question and Stop condition never manufacture boundedness. Partial or ambiguous envelopes, unsafe scope, target overflow, and oversized or semantically unbounded delegation remain fail-closed. A child capability mismatch rejects only that invocation and provides a machine-readable correction code plus the supported route; it never terminalizes the child.
Inject the selected child's execution rule and exact completion marker directly into every bounded Task packet when space permits; do not make the child reconstruct that contract from guard failures. Fresh-review is explicitly read-only: prefer built-in read/grep/glob and allowlisted read-only Git, use shell only as one bare allowlisted invocation with no operators/redirects/substitutions/status probes, and route tests or validation suites to Verify.
Use question or ask_question only for genuinely missing user input and always provide at least one non-empty question. Once finalization is announced, emit the final response in that same turn; never launch an empty 0/0 interactive prompt. RESPOND_OR_ASK_NONEMPTY means answer directly when ready or retry with one real question.
Use /home/filip/.config/opencode/plugins/operational-schema-v5/scripts/session-trace-assessment.mjs for bounded session-trace evidence instead of disguising read-only parsing as a test command. Compatibility pattern: /home/filip/.config/opencode/plugins/operational-schema-v5/scripts/session-trace-assessment.mjs --input /tmp/opencode/verify/materials/*.json --session-id ses_* --profile guard-friction-v1. Remediation-audit pattern: /home/filip/.config/opencode/plugins/operational-schema-v5/scripts/session-trace-assessment.mjs --input /tmp/opencode/verify/materials/*.json --session-id ses_* --profile remediation-audit-v1. Actual invocations must provide one concrete .json file and one concrete ses_ identifier.
For deterministic repository host evidence, prefer the harness-owned local-agent-assessment.mjs gateway with one typed spec under /tmp/opencode/verify/assessments. The default gateway-owned mode owns exact remote-ref admission, isolated named candidate worktree creation, repository-runner invocation, evidence hashing, and cleanup. Repository-owned mode is an explicit Linux-only alternative for a pinned repository runner that already owns the candidate worktree/environment/service/test/evidence/cleanup lifecycle; the gateway still owns exact base/canonical-PR-head admission, an exact-authority detached control snapshot, complete declared control-dependency pinning and mutation detection, subreaper/Landlock runner containment, typed native-evidence validation/copying, final freshness, control-snapshot cleanup, and inode-anchored owner-checkout proof. Stale developer branches are not assessment authority. A recognized non-STALE terminal target assessment releases target authority. STALE remains target-bound: only an authenticated repository-owned/base-authority STALE whose outer summary proves a clean owner base branch whose old-owner SHA was gateway-verified as an ancestor of the still-exact pinned base admits the exact reconcile-owner-base.mjs capability, bound to that same spec plus explicit expected old-owner, pinned-base, and target SHAs. Remote/ref and other STALE causes do not admit reconciliation and may be reassessed with a corrected exact same-target spec. Successful authenticated reconciliation releases target authority. Interrupted assessment execution without authenticated terminal evidence remains fail-closed, and a fresh session is not a release event.
When a deterministic authority or lifecycle block rejects a command, do not ask for a conversational override that cannot change persisted authority; use the stated typed capability if admitted, otherwise report the blocker. Persisted target authority is never released merely because the session changes or work is idle. When the user explicitly changes the task to a different starting revision, a new primary declaration `REQUIRED STARTING HEAD: <40-hex>` or strict-start alias `REQUIRED STARTING HEAD SHA: <40-hex>` is the contract-defined authority transition; after a bare `git rev-parse HEAD` proof it supersedes incompatible prior-target state and prior-head review/Verify/delegation coverage. Exact local-agent-assessment.mjs and reconcile-owner-base.mjs wrappers remain one logical bare invocation: they may be formatted on one physical line or with unquoted backslash-LF/CRLF continuations only when those continuations canonicalize to the exact admitted argv; unescaped multiline input, operators, redirects, substitutions, extra args, wildcards, and malformed SHAs remain rejected. Keep host-evidence extraction bounded: prefer selectors and concise summaries over dumping large JSON, JUnit, or other structured payloads into primary context, especially after an initialization-derived context-pressure warning. Never generate or execute ad-hoc /tmp/*.sh orchestration; use bare commands or mandated deterministic helpers.
Hard stops remain for exact-head authority admission, unsafe child writes or external access, destructive or publish actions lacking required gates, proven-success duplicate child invocations, and the initialization-derived model input emergency ceiling.
[/operational-policy-v5.23.2]
<!-- generated-policy:end -->

## Session trace audits

Export an OpenCode session into `/tmp/opencode/verify/materials`, then invoke `scripts/session-trace-assessment.mjs` with the export path, its exact `ses_` identity, and a fixed profile. `guard-friction-v1` retains the legacy aggregate counters. `remediation-audit-v1` produces a deterministic `opencode-session-audit-v1` report with turns, structured fault events, explicit or temporal-only links, remediation candidates, and format diagnostics.

The remediation report never reproduces prompts, reasoning, patches, command arguments, environment values, tool output, or tool errors. It records bounded IDs, reason codes, input key names, source size/hash, and evidence provenance. Structured `metadata.operationalSchema` is authoritative; tool-error pattern matching is only a medium-confidence fallback. Compatibility counters use structured occurrence counts when available. Candidate frequency alone never authorizes relaxing permissions or safety gates.

It enforces:

- safe preflight normalization of fully envelope-less bounded Task prompts without an arbitrary short-prompt cliff, preserving the original prompt verbatim as supporting context when the inferred envelope plus role contract still fits the existing role limit; Fresh-review inference requires positive bounded-scope evidence from the original packet and rejects repository-wide/open-ended expansion, while partial/ambiguous envelopes and semantic/routing overflows remain fail-closed;
- direct injection of a compact type-specific child execution/result contract into bounded Task packets; Fresh-review explicitly remains read-only, uses built-in/read-only Git by preference, permits only one bare allowlisted shell invocation when necessary, and sends test/validation execution to Verify;
- OpenCode 1.18.20+ Task failures are classified from terminal ToolPart events: only transient failures carrying a `task_id` are resumable, exactly once, with the original subagent type and normalized Scope;
- unknown `task_id` values, type/Scope drift, repeated resumes, and silent fresh-session fallback are blocked fail-closed instead of inheriting OpenCode's permissive fallback;
- undefined failed Task results are tolerated without masking the original provider error; failed Tasks never reset parent routing, review, or Verify boundaries;
- rejection of known exact small-file lookups incorrectly routed to Explore;
- advisory individual child tool-call budgets rather than model-step approximations;
- separate child generation headroom and bounded returned handoffs;
- incomplete classification for `finish:length`, unknown finish, empty, truncated, oversized, or max-step child results;
- explicit Verify outcomes (`PASS`, `FAIL`, or `BLOCKED`) with matching command counts; transport completion alone cannot satisfy the gate;
- explicit Explore (`COMPLETE`, `PARTIAL`, or `BLOCKED`) and Fresh-review (`CLEAN`, `FINDINGS`, or `BLOCKED`) outcomes with matching nonzero target counts; partial, blocked, budget-exhausted, or terminal-breaker children cannot satisfy routing or publication gates;
- child shell-shape rejection for compound commands and redundant standalone exit-status probes; structured capability mismatches reject only the unsafe invocation and do not consume the normal work budget;
- a small parent reread budget, two bounded exact-range escape slots, and an exact Explore follow-up when direct reopening is exhausted;
- explicit overflow metadata when a child touches more paths than its bounded handoff can retain;
- a primary reconnaissance checkpoint and hard ceiling shared by read, grep, glob, Serena, Probe, and common read-only shell discovery commands;
- primary operation-boundary advisories at 24 and 30 accepted calls without fabricated execution stops;
- outcome-dependent delegation boundaries: only a healthy completed Explore/Fresh-review or explicit Verify PASS resets parent routing;
- advisory routing debt after a rejected broad Explore packet;
- Verify guidance after three direct validation commands, canonicalized across RTK, env, uv, Python-module, and repository-venv spellings;
- six-substantive-command primary shell advisories with literal output labels and heredoc bodies ignored;
- initialization-derived per-primary-agent context pressure, with warning at `model.limit.input - compaction.reserved`, emergency no-tool ceiling at `model.limit.input`, forced same-session auto-continuation, and configuration changes taking effect only in a fresh plugin process;
- compaction summaries containing bounded operational generations, authority, routing debt, and validation state;
- campaign-scoped persistence of workspace-owned edit/review/Verify generations and authority across sessions and harness restarts, closed after successful publish plus clean identity proof at the new HEAD;
- explicit success markers for empty shell output and rejection of retries after a successful equivalent child command;
- Verify-plan preflight that rejects equivalent duplicate commands and redundant standalone cleanup after owner-mode `--down-after`;
- typed `opencode-verify-manifest-v1` JSON plans referenced only by a standalone `Manifest:` field, so headings, explanatory prose, cached JSON, and other staged materials are never inferred to be executable plans;
- a shell-free Verify manifest runner that executes ordered argv arrays without model copy/replay, emits a SHA-256 command census, rejects shell payloads and write-capable commands, and preserves per-command exit attribution;
- capability-driven Task preflight that rejects commands and external paths the selected child cannot execute, with a machine-actionable `OPERATIONAL_PACKET_ACTION` before child creation;
- primary ownership of remote-ref refresh, workdir-based child Git commands instead of `git -C`, safe Verify path derivation through `git ls-files` or staged manifests, and wrapper-only external interpreters;
- narrowly scoped Explore/Fresh-review access to harness-owned exact-head worktrees under `/tmp/opencode/review/**`, plus the read-only Git identity/history commands required to audit them;
- explicit `Targets:` accounting, including one-slot `resolve:` aliases, so contextual paths and alternative spellings do not inflate child routing limits; legacy packets retain bounded fallback path parsing;
- Verify-plan and in-child rejection of `env`, assignment, RTK, or Node prefixes after the disposable wrapper delimiter, with an exact corrected-command hint;
- explicit shell-mutation tracking plus successful Fresh-review and Verify children before commit or push after multi-file, shell-mutating, or high-risk edits; content-neutral `/tmp` evidence redirection does not fabricate a new workspace edit or invalidate current gates;
- temporary Verify manifests that remain writable at a hard stop but never count as implementation edits or reset routing;
- invalidation of prior review, Verify, and delegated coverage when a labeled authoritative exact-head SHA changes, including common `HEAD_SHA` forms;
- persistent strict admission for `EXPECTED_START_HEAD` declarations, where a proved mismatch blocks reconciliation and edits until new user authority, plus a separately bounded target lifecycle; target authority remains workspace-persistent across sessions/restarts, recognized non-`STALE` terminal assessment evidence releases it, and only authenticated clean-owner-behind-pinned-base `STALE` enters the exact owner-reconciliation route;
- feedback-driven mismatch guidance: strict-start mismatch stops for new authority, while target mismatch stays out of the initial system prompt and exposes the explicit new-task authority transition (`REQUIRED STARTING HEAD: <40-hex>` or `REQUIRED STARTING HEAD SHA: <40-hex>`) alongside the typed assessment gateway, authenticated typed owner-base reconciler, and disposable-worktree routes; the guard never infers a task transition, remote/ref and other `STALE` causes remain target-bound and reassessable, interrupted/unrecognized assessment termination remains fail-closed, and a fresh session is never a release event;
- defensive prompt coalescing plus a required dedicated compatibility plugin configured after all prompt augmentation, producing one leading system message for strict OpenAI-compatible chat templates;
- bounded primary recovery after reasoning-only `finish:length`, including a one-turn 1024-token cap and an immediate executable next-action directive;
- operational-schema version and exact-head admission provenance in Task metadata and compaction continuity;
- bounded structured child guard events in Task metadata for capability mismatches, duplicate attempts, shell-shape corrections, terminal breakers, and tool-budget exhaustion;
- a strict live-config contract and backup-first atomic installer that never exposes a partially written `opencode.json`;
- a shell-free disposable-service Verify runner that strictly parses helper exports, allowlists validation executables, propagates failures, and cleans up services it starts.
- project-specific corpus/database gateways treated as optional project capabilities rather than core operational-schema invariants.
- a shell-free, typed local host-assessment gateway with separate gateway-owned candidate-worktree and Linux repository-owned control-snapshot contracts, exact base/head authority, bounded runner containment, evidence binding, and harness-state cleanup.
- a file-backed, identity-validating session export wrapper that avoids pipe truncation and fails explicitly on malformed JSON.
- a fixed-shape, shell-free session-trace assessment runner for bounded friction metrics and replay/fault evidence.
- reason-code-specific analyzer candidates, including publish-gate friction and completed-but-incomplete delegated result contracts.

`OPENCODE_OPERATION_GUARD_BYPASS=1` disables enforcement for emergency recovery. It should not be set during normal work or validation.

Run:

```text
npm run check
npm test
```

Install a validated staged configuration without directly editing the live file:

```text
scripts/install-live-config.mjs --candidate /absolute/path/opencode.json --backup /absolute/new/backup.json
```

The installer validates plugin wiring, ordered Verify path permissions, generic repository-local validation commands with autofix denied, typed assessment and manifest gateways, result-marker prompting, model contexts, and the live-config edit denial before making a same-directory atomic rename.

Export a large parent or child session without piping OpenCode's JSON through a bounded stdout buffer:

```text
scripts/export-session-safe.mjs ses_... --output /absolute/new/session.json
```

The wrapper refuses to overwrite an existing target, validates JSON and session identity, and reports an invalid/truncated export as an error.

For a project that owns `scripts/disposable-test-services`, a Verify child can run a disposable integration gate as:

```text
/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/verify-disposable.mjs --namespace <unique-name> --start --down-after -- pytest -q <target>
```

The command immediately after `--` must be the repository-pinned executable. Do not insert `env`, assignments, RTK, or `node`; the wrapper injects the disposable helper environment and `PYTHONDONTWRITEBYTECODE=1` itself.

Use that owner mode only when the child owns the lifecycle. If a parent or user already started the named disposable services, attach without ownership flags:

```text
/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/verify-disposable.mjs --namespace <existing-name> -- pytest -q <target>
```

Every Verify final response must end with exactly one machine-readable line:

```text
OPERATIONAL_RESULT: PASS|FAIL|BLOCKED; COMMANDS_RUN: <n>; COMMANDS_REQUIRED: <n>
```

For deterministic repository PR host evidence, stage one typed spec at
`/tmp/opencode/verify/assessments/<name>.json`, then invoke only the harness-owned
gateway:

```text
/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/local-agent-assessment.mjs --spec /tmp/opencode/verify/assessments/<name>.json
```

The exact assessment command is one logical bare invocation. It may be written on one physical line or split only with unquoted backslash immediately followed by LF or CRLF; after lexical joining it must still canonicalize to the exact argv above. Unescaped newlines, dangling/escaped-backslash variants, operators, redirects, substitutions, wildcards, extra arguments, and malformed paths remain rejected.

The default **gateway-owned** mode binds exact authority to a runner that is safe to execute from the gateway-created exact-head worktree:

```json
{
  "schema_version": "opencode-local-assessment-v1",
  "kind": "repo-pr",
  "assessment_id": "pr42-head-check",
  "pr_number": 42,
  "repository": {
    "remote": "origin",
    "base_ref": "main",
    "base_sha": "<40-lowercase-hex>",
    "head_ref": "feature/example",
    "head_sha": "<40-lowercase-hex>"
  },
  "environment": { "venv": "/absolute/pre-existing/project/.venv" },
  "runner": {
    "path": ".github/ci/assessment.py",
    "plan_argv": ["plan", "pr", "--base-sha", "{base_sha}", "--expected-head-sha", "{head_sha}", "--pr-number", "{pr_number}", "--venv", "{venv}"],
    "run_argv": ["run", "pr", "--base-sha", "{base_sha}", "--expected-head-sha", "{head_sha}", "--pr-number", "{pr_number}", "--venv", "{venv}", "--output", "{evidence_path}"]
  },
  "integrity_files": [".python-version", ".github/ci/toolchain.txt", "uv.lock"]
}
```

In gateway-owned mode the gateway performs a shell-free exact fetch, requires the remote base and head SHAs to match the spec, creates a unique named non-main branch under a harness-owned `/tmp/opencode/verify/worktrees/**` worktree at the exact head, verifies any declared canonical venv without creating or repairing it, fingerprints the tracked runner/integrity files, runs the declared plan/run argv templates, hashes the runner evidence, revalidates remote base/head authority, and proves the owner workspace unchanged. A stale developer branch with the same name as the PR head ref is irrelevant and is never reset, rebased, deleted, or otherwise reconciled. Cleanup removes only the generated assessment worktree/branch, and preserves them if their identity changed.

For a repository whose reviewed runner already owns exact-head candidate worktree, virtual-environment, disposable-service, validation, evidence, isolation, and cleanup lifecycle, use **repository-owned** mode instead of nesting a second candidate lifecycle around it. The owner repository checkout must already be clean at the explicitly selected `base` or `head` authority SHA. When `runner.authority` is `base` and a prior merge has advanced the still-exact remote base beyond a clean owner base branch, do not manually merge/switch/reset the owner and do not open another session to evade target state. First run the same exact target assessment and require authenticated terminal evidence whose outer summary proves the clean-owner-behind-pinned-base `STALE` condition. The gateway emits that reconcilable cause only after `git merge-base --is-ancestor` proves the old-owner SHA is an ancestor of the exact pinned base; a clean owner that is ahead of or divergent from the pinned base remains a non-reconcilable `STALE` and does not mint `OWNER_RECONCILIATION`. The authenticated outer summary's unchanged `owner_initial`/`owner_final` identity is authoritative for the old-owner SHA; a separately persisted core `observedHead`, when present, is an additional equality check rather than a prerequisite. Only then may the persisted `OWNER_RECONCILIATION` capability admit `/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/reconcile-owner-base.mjs --spec /tmp/opencode/verify/assessments/<name>.json --expected-old-sha <40-lowercase-owner-sha> --expected-base-sha <40-lowercase-pinned-base-sha> --expected-target-sha <40-lowercase-target-sha>`. That reconciler command follows the same exact lexical-format rule as the assessment wrapper: one logical bare argv, with optional unquoted backslash-LF/CRLF physical continuations only; no other shell syntax is admitted. The helper accepts only repository-owned/base-authority specs, requires the spec base/head identities to equal the explicit expected base/target SHAs, fresh-fetches and revalidates both exact base and PR head, requires the current owner branch to equal the spec base branch, requires the clean current HEAD to equal the explicit old SHA, proves old SHA is an ancestor of the pinned base, performs only `git merge --ff-only <pinned-base-sha>`, then requires exact branch/base/clean readback and revalidates remote authority. It accepts no destination argument and cannot reset, rebase, force, or move the owner to the candidate head. Remote/ref and other `STALE` causes do not mint this capability. `base` is the normal steady-state choice for a main-owned control runner; `head` is only for an explicitly reviewed and externally pinned pre-merge bootstrap. The gateway no-follow anchors `/tmp/opencode/control-worktrees` first, creates the assessment child through that parent descriptor, immediately opens and records the child device/inode, and clones only through the retained child descriptor; a pre-existing child collision is preserved and blocks, while a parent or child pathname substitution is an isolation breach rather than a redirect. Failures before exact snapshot admission clean only a child whose admitted parent/child identities still match. `{repo_root}` names that clone, not the mutable owner checkout. The clone has disposable Git metadata of its own; it may read immutable Git objects from the owner repository through Git's shared-object mechanism, but runner descendants receive no write authority to the owner repository or its Git common directory. The runner and every `integrity_files` entry are pinned to exact Git blob SHAs from that authority commit before execution. `integrity_files` must enumerate the complete repository-local runtime control dependency set consumed by the runner, including imported helpers, policy/profile files, launchers, and other control-plane inputs; it is not a representative sampling list. Optional SHA-256 pins may be added as a second byte-level check.

Repository-owned mode accepts the canonical GitHub PR identity `refs/pull/<PR>/head`, does not create a gateway **candidate** assessment branch/worktree, does not create or repair a venv, and does not replace the native runner's service/test/evidence/cleanup lifecycle. It requires plan/run argv to bind `{workspace_root}` so mutable runner state is rooted in the gateway-admitted per-assessment directory `/tmp/opencode/verify/repository-owned/<assessment-id>`; the gateway exports the same path as `LOCAL_AGENT_ASSESSMENT_ALLOWED_ROOT`. It does create and later remove the exact-authority detached control snapshot described above. Before launching the runner, the gateway inode-anchors the owner repository, canonical-evidence root, per-assessment runtime parent/child, control-snapshot root, and disposable control Git metadata; holds a no-follow descriptor for the exact verified runner bytes; and verifies the complete declared control dependency set in the control snapshot. `{repo_root}` is resolved by repository-owned supervision to `/proc/<capability-holder-pid>/cwd`. The capability holder is a minimal Landlock-constrained helper fork that `fchdir()`s to the admitted control descriptor, closes unrelated inherited descriptors, exposes no gateway decision state, and uses `PR_SET_PTRACER` only for the supervisor PID so the supervisor's runner process tree—not arbitrary same-UID processes—may resolve that helper's procfs cwd under restrictive Yama settings. The resulting path is independent of later runner `chdir()` calls and remains available to ordinary child subprocesses even when they close non-stdio descriptors, so commands such as `git -C {repo_root} ...` stay bound to the admitted control snapshot. The holder is signaled to exit and explicitly reaped before the supervisor performs its ordinary descendant sweep. Each plan/run phase resolves relative control watches through the separate inherited control descriptor. A rename/substitution of the public control-snapshot pathname after parent validation therefore cannot redirect runner imports, repository-root arguments, relative control access, or inotify admission to a replacement tree. The supervisor becomes a child subreaper before execution, runs the admitted descriptor rather than re-resolving `runner.path`, and reports its own outcome over a dedicated inherited status pipe that is close-on-exec for the repository runner. Ordinary runner exits—including numeric statuses 240–243—therefore cannot alias supervisor descendant/control/setup/reap outcomes. The gateway also requires the typed status version/kind to agree with the supervisor process exit, and runner `execve()` failure is reported over a separate close-on-exec handshake rather than being encoded as a runner exit value. The supervisor repeatedly reconstructs the live descendant tree from Linux `/proc/*/status` parent relationships, kills surviving descendants including `setsid()`/double-fork escapees, and reaps them against a bounded five-second monotonic deadline. A successfully killed/reaped survivor reports the ordinary descendant result; failure to terminate or reap descendants reports a distinct containment-uncertain supervisor outcome rather than being conflated with setup failure. Repository-owned mode then returns `INFRA_ERROR` **without releasing the assessment file reservation or deleting the control snapshot**; the in-process abstract-socket reservation is also retained for the lifetime of that gateway process, leaving explicit forensic state and preventing same-process identity reuse. It passes the admitted per-assessment runtime directory and disposable control-clone Git common directory to the supervisor by inherited descriptors; Landlock rules for those directories are attached directly to duplicated inherited descriptors without resolving them back through mutable pathnames. Write access is limited to those exact admitted directory inodes and the exact `/dev/null` device file. Canonical evidence, other assessment runtime directories, shared verification namespaces, the rest of `/dev` (including `/dev/shm`), the control snapshot working tree, and the owner repository—including the owner's Git common directory—remain outside those write grants. Inotify watches the runner plus every declared integrity file and their control-path ancestry, so an external mutate-and-restore event is still an isolation breach even if final bytes match. Repository-owned mode therefore requires Linux with `/proc`, Python 3, Landlock, and inotify support; missing containment primitives are `INFRA_ERROR`, not a reason to fall back to unsandboxed execution.

Evidence reads walk every intermediate native-evidence directory through no-follow descriptors before opening the final file, while canonical evidence/summary writes use the pre-run evidence-root descriptor. Immediately after acquiring the kernel assessment identity, repository-owned mode atomically creates and retains the outer `<assessment-id>.summary.json` descriptor before the file/kernel reservations may be released; final JSON is written and synchronized through that exact reserved descriptor. This durable pathname claim blocks same-ID publication races even during later control cleanup and owner-proof work. The original owner/evidence/runtime/reservation identities are revalidated across the runner interval; renaming or replacing an admitted root is an isolation breach rather than a redirect opportunity, and the returned summary path is rebound to the anchored evidence directory's actual recoverable pathname before descriptors close. Before plan/run the gateway acquires a Linux abstract-socket reservation keyed by `assessment_id` and atomically creates a matching file token under the gateway-only `/tmp/opencode/assessment-reservations/**` root, which is outside every runner Landlock write grant. The kernel reservation prevents a second concurrent invocation from acquiring the same identity even if the filesystem reservation-root pathname is replaced; such a rejected invocation does not materialize the active assessment's summary path. A competing reservation or pre-existing `/tmp/opencode/verify/repository-owned/<assessment-id>` runtime directory blocks before runner invocation. Reservation-root pathname identity, runtime parent/child identity, kernel reservation state, and token device/inode identity are revalidated after plan, immediately before run, and again before evidence admission; clean release of both reservations is required for outer PASS, while containment-uncertain supervisor failure deliberately preserves the file token and control snapshot instead of pretending cleanup is safe. The native runner still owns creation of its `results/<assessment-id>` subtree and must write `local-agent-assessment-v1` evidence at `/tmp/opencode/verify/repository-owned/<assessment-id>/results/<assessment-id>/assessment.json`. The gateway reads one no-follow, size-bounded byte snapshot through the anchored native directory chain; JSON validation, SHA-256/size metadata, and the canonical runner-evidence copy all derive from that same buffer. It validates the native assessment/PR/head/control identity, exact native exit/result mapping, `GATE_DECISION=NOT_EVALUATED`, and complete native cleanup proof for PASS; it preserves native `PASS|FAIL|BLOCKED|STALE|INFRA_ERROR|ISOLATION_BREACH`, writes the ordinary summary through the anchored evidence root, revalidates remote base and canonical PR head through the anchored owner repository, and requires both an unchanged inode-bound owner workspace and successful control-snapshot cleanup. Normal control cleanup first verifies the admitted parent/child identities, removes snapshot contents only through the retained child descriptor, revalidates the parent-opened child entry at the destructive boundary, and then removes that child entry through the retained parent descriptor; a substituted public pathname is preserved and cannot be recursively deleted as if it were the admitted snapshot. Runner/control bytes are also revalidated after an optional plan and immediately before run. Any `blob_sha` accepted on a gateway-owned integrity entry is likewise enforced against the exact assessed-head Git blob rather than treated as metadata only.

Example repository-owned spec for a main-owned exact-head runner:

```json
{
  "schema_version": "opencode-local-assessment-v1",
  "kind": "repo-pr",
  "assessment_id": "pr42-head-check",
  "pr_number": 42,
  "repository": {
    "remote": "origin",
    "base_ref": "main",
    "base_sha": "<40-lowercase-hex>",
    "head_ref": "refs/pull/42/head",
    "head_sha": "<40-lowercase-hex>"
  },
  "runner": {
    "execution": "repository-owned",
    "authority": "base",
    "path": "scripts/local-agent-assessment",
    "blob_sha": "<40-lowercase-git-blob-sha>",
    "result_contract": "local-agent-assessment-v1",
    "plan_argv": ["plan", "--repo", "{repo_root}", "--sha", "{head_sha}", "--profile", "phase1-control-policy", "--target-kind", "pr-head", "--pr", "{pr_number}", "--workspace-root", "{workspace_root}", "--fetch"],
    "run_argv": ["run", "--repo", "{repo_root}", "--sha", "{head_sha}", "--profile", "phase1-control-policy", "--target-kind", "pr-head", "--pr", "{pr_number}", "--assessment-id", "{assessment_id}", "--workspace-root", "{workspace_root}", "--fetch"]
  },
  "integrity_files": [
    {"path": "scripts/local_agent_assessment.py", "blob_sha": "<40-lowercase-git-blob-sha>"},
    {"path": "scripts/local_agent_pr_assessment.py", "blob_sha": "<40-lowercase-git-blob-sha>"},
    {"path": "references/local-agent-assessment-profiles.toml", "blob_sha": "<40-lowercase-git-blob-sha>"}
  ]
}
```

Do not add `{base_sha}` or `{evidence_path}` merely to satisfy the generic schema in repository-owned mode; the gateway itself binds remote base authority and the native result location. Do not use `authority: "head"` as a shortcut around a main-owned runner. A head-authority spec is valid only when Central has separately reviewed and pinned that exact bootstrap control plane.

In both modes the runner's `HOST_EVIDENCE_RESULT` remains host evidence; `GATE_DECISION` stays `NOT_EVALUATED`. Failure to materialize the outer summary is itself `INFRA_ERROR`; no mode may return outer PASS without a successfully written authoritative summary. When no durable pathname can name the anchored summary directory or the summary write itself fails, `summary_path` is returned as `null` rather than advertising an unreadable path.

Explore and Fresh-review similarly end with exactly one role marker:

```text
OPERATIONAL_EXPLORE: COMPLETE|PARTIAL|BLOCKED; TARGETS_INSPECTED: <n>; TARGETS_REQUIRED: <n>
OPERATIONAL_REVIEW: CLEAN|FINDINGS|BLOCKED; TARGETS_REVIEWED: <n>; TARGETS_REQUIRED: <n>
```

For a long Verify plan, stage `/tmp/opencode/verify/manifests/<name>.json`:

```json
{
  "schema_version": "opencode-verify-manifest-v1",
  "commands": [
    { "label": "lint", "argv": [".venv/bin/ruff", "check", "."] },
    { "label": "types", "argv": [".venv/bin/pyrefly", "check"] }
  ]
}
```

The Verify packet names it on a standalone `Manifest:` line and runs:

```text
/home/filip/.config/opencode/plugins/operational-schema-v5/scripts/verify-manifest.mjs --manifest /tmp/opencode/verify/manifests/<name>.json
```

Use `/tmp/opencode/verify/materials/**` for non-command inputs, `/tmp/opencode/verify/manifests/**` for typed Verify command plans, `/tmp/opencode/verify/assessments/**` for typed repository-assessment specs, `/tmp/opencode/verify/evidence/**` for canonical assessment outputs, `/tmp/opencode/verify/worktrees/**` for gateway-owned candidate worktrees, `/tmp/opencode/verify/repository-owned/<assessment-id>/**` for the one descriptor-bound mutable runtime assigned to that repository-owned assessment, and `/tmp/opencode/review/worktrees/**` for Explore/Fresh-review worktrees. `/tmp/opencode/control-worktrees/**` and `/tmp/opencode/assessment-reservations/**` are internal repository-owned gateway namespaces for exact-authority control snapshots and assessment-ID reservations; callers and repository runners must not stage, mutate, or reuse content there. Arbitrary `/tmp` access remains denied.

Upgrade a staged v5.20-style configuration with `scripts/migrate-v521-config.mjs --input <existing.json> --output <new.json>`, validate the candidate with `scripts/validate-config.mjs`, and install it only through `scripts/install-live-config.mjs`. The migration removes retired Firecrawl-specific core permissions, replaces the legacy assessment `--sha/--assessment-id` route with the typed `--spec` gateway, and generalizes repository-local Python validation permissions to `.venv*/bin/...`.
