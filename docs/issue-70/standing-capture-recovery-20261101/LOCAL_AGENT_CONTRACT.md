<<< LOCAL_AGENT_CONTRACT_BEGIN >>>
LOCAL_AGENT_PRIMARY=build
TASK=Reconcile Issue-70 standing-capture backend receipt mismatch, then prepare one recoverable host continuation from the existing queued Graphiti job.

GIT AUTHORITY:
- Canonical repo: fvanevski/opencode-operational-schema-guard
- Working branch: refs/heads/work/graphiti-standing-capture-recovery
- The operator kickoff provides an exact remote head SHA. Fetch that branch and prove the fetched remote-ref SHA equals it before worktree setup. Use a clean separate worktree; never reset or force-push `main`, and do not mutate `/workspace/mcp_servers/gh_mcp` history.
- Read this branch's `docs/issue-70/standing-capture-recovery-20261101/README.md`, `tools/rearm_prehandler_rejection.py`, and tests in full before making host changes. This branch supplies Central-owned design and code, not mere prose asking you to invent a repair.

SCOPE & OWNERSHIP:
- ONE bounded host integration campaign: effective backend receipt service configuration, proof of the exact pre-handler failure, exact pending claim recovery, and post-exit continuation of already-admitted work.
- Your host-side authority covers inspect/diagnose and non-destructive service configuration, isolated tests, backups and preparing a post-exit controller. You MAY resolve ordinary proven host-specific layout/systemd/permission errors within this exact subsystem. Do not redesign the coordinator, extract a new model, modify the gate's fail-closed admission logic, or create unrelated issues/PRs.
- This agent process can run for **CPU-only** diagnosis/preparation. No inference-producing Graphiti or OpenViking work, no `--apply` DB repair, no backend restart that might resume inference, and no production activation while this agent is active.
- A direct Antigravity launch previously bypassed `OPENVIKING_ADMISSION=blocked_reconcile`. Treat the unleased diagnostic harness as potentially invisible to the gate; verify gate process fallback visibility, keep capture disabled and the gate blocked, avoid other simultaneous agents, and exit before any operator controller.

PREPARE, DO NOT IMPLICITLY APPLY:
1. Verify branch source, exact current installed gate and backend code, current service units, effective environment, receipt database status, the target queue work key, original Git HEAD and source record, the one `unknown` intent, and the absence/presence of receipt/task/archive for the exact request. Preserve the two prior episodes. Do not trust prior summaries when live state contradicts them.
2. Prove the backend receipt route returns `503` because `OPENVIKING_COMMIT_RECEIPT_DB` is absent. Locate the correct existing backend source environment and choose one private durable ledger path consistent with the installed system service user and file ownership. Prepare a minimal systemd drop-in (no credentials or broad service rewrites). Do not assume the gate's `EnvironmentFile` propagates to the system backend.
3. Run Central's seven synthetic regressions and the read-only rearm preflight. Check actual host schema compatibility and inspect every production SQL update in the staged script. Small mechanical/host-specific updates may be made in the same working branch and tested; any semantic change to rearm invariants, identity selection, or admission/proof policy is Central-owned and must STOP for adjudication rather than silently rewriting Central's repair.
4. Prepare a **single operator-executed post-exit controller** in a private local evidence directory, authenticated against the fetched Git source SHA, checked with `bash -n`/relevant language checks, and stage exact config preimages/restore instructions. Controller performs: explicit *new* operator approval -> confirm all agents exited/lease exclusive -> backup state -> configure/restart backend receipt endpoint and prove live, independent read-only negative proof of original pre-handler request -> stop gate -> one exact rearm (no synthetic terminal outcome) -> restart gate in intended standing-capture configuration -> monitor the same OpenViking request through its real receipt and existing Graphiti work through its actual persisted receipt/episode UUID -> confirm recall/nonregression and enabled persistent config. On any failure revert **capture activation** to disabled, preserve durable pending/unknown state and forensics; preserve backend receipt facility if required for safe future reconciliation. Do not blindly redo a request or reset a Graphiti work row.
5. The controller must NOT self-authorize; prompt the operator with exact current request key/work key/scope, backend receipt facility and new standing enablement. The previous one-shot approvals do not authorize this recovery. Explicitly bound one-shot execution journal; fail closed if it exists. For CPU-only preparation, do not require unnecessary operator prompts.
6. Provide `READY_FOR_OPERATOR_POST_EXIT` plus controller pathname/digest, manifest identities, exact preflight results, private evidence directory, rollback plan and final pre-activation service posture. Exit this harness normally. Operator runs controller from a real TTY after all agents exit; do not issue that execution while the agent is live.

ACCEPTANCE:
- Backend and gate receipt protocols agree and support a genuine receipt round-trip; no standing capture enablement from config-only assertions.
- Original OpenViking session request's key/generation/body are preserved, newly processed at most once under proof of pre-handler rejection; no synthetic PASS or fake completion and no unrelated queue edits.
- Previously nominated Graphiti work key `a7877b6c3484049f808c6bdbb11b135338f2363dffe7f1e02b30b8af04874604` reaches one persisted Graphiti receipt with a true UUID, without another `read` or source commit; original two episodes persist.
- Capture remains enabled only on complete success for the previously approved `ghdev_gh_mcp` categories. On failure, disabled capture and durable state preservation are verified. No GitHub PR created as part of this host campaign.

STOP CONDITIONS:
- Live source/queue differs materially, a backend submission/archive/receipt is found for the supposedly rejected request, a second unknown/inflight claim appears, inability to prove an exclusive post-exit lease, or inability to authenticate the receipt service implementation. Never remove admission barriers to solve a timing failure.
- Do not expose credentials/session text/receipt DB backups in branch commits or handback.

HANDBACK:
- exact branch SHA and any changed files/tests; actual host service configuration evidence; exact one-claim/one-work state; representative redacted HTTP response and systemd readback; `READY_FOR_OPERATOR_POST_EXIT | BLOCKED` plus remaining action; sanitized evidence hashes and private paths.
- Include canonical `COMMAND_SHAPE_FRICTION` (fields: encountered, events with scenario/requested_shape/effective_shape/rewrite_provenance/event_kind/execution_effect/correction_or_annotation/replacement_shape/recipe_reference/resource_reference/contract_conflict/durable_gap_candidate, omitted_sensitive_values).
<<< LOCAL_AGENT_CONTRACT_END >>>
