<<< LOCAL_AGENT_CONTRACT_BEGIN >>>
# Issue #108 D1 scheduler-race correction: post-merge host acceptance
HARNESS=Hermes
ROLE=external-host-supervisor
REPO=fvanevski/opencode-operational-schema-guard
PRIMARY_EXECUTION=Hermes host tools (not an interactive OpenCode lease holder)
MUTATION_SCOPE=one reversible exact-merged-source controller-only promotion plus normal curator reactivation
SOURCE_AND_GITHUB_WRITES=forbidden
GRAPHITI_OV_SQLITE_LEDGER_REPLAY_OR_RESTORE=forbidden

## Preconditions
Proceed only after Central supplies an independently reviewed and merged exact main SHA, CI receipt and the reviewed controller Git blob. Verify those against fresh GitHub main. Do not deploy from a draft PR, working branch, mutable checkout or merely similar file content. The user-systemd OpenCode :49374 fence and :49375 private backend must be authenticated from current live sources, not a historical PID. Preserve the already recovered journal `idle`, existing canonical SH lock, the exact durable source/ledger/SQLite bytes, and all rollback material. Curator .path/.timer were intentionally stopped with enablement preserved; do not rearm before source installation and health proof.

## A. Read/prepare
- Inspect installed owner-only `~/.config/ghdev-108/window.json`, installed `~/.local/share/ghdev-108/idle_window.py`, canonical `openviking-agent-run`, `post-exit-drain.py`, front fence and user units. Record actual file modes, source SHA-256, systemd PIDs/invocation, journal state/attempt, shared and coordinator lock identities, active scheduler metric family/URL, and current Graphiti/OV unresolved states. Keep credentials private.
- Confirm live controller is the approved previous blob and live source contains no unexplained drift. Authenticate the new controller bytes by exact merged Git blob and compute its SHA-256 before staging.
- Run D1 focused Python tests in isolated scratch against exact reviewed merged code plus Node syntax/fence tests only where the changed implementation requires them. Reuse current exact-head trusted GitHub CI for repository-deterministic acceptance; do not waste a second local full-suite run.
- Prove the service is healthy, the front and private backend identities match, the journal is idle, there is no active curator EX or coordinator, and no native or background work will be interrupted by source-only installation. If any prerequisite fails, return BLOCKED rather than stopping a healthy service by guess.

## B. Controlled source-only promotion
- Preserve a byte-identical old controller and owner/mode metadata in private rollback. Promote only the reviewed merged `docs/issue-108/d1/idle_window.py` to the authenticated owner-local installed controller path through a same-filesystem atomic file replacement, preserving restrictive permissions. Verify installed bytes, blob/SHA-256 and any config `pinned_files` entries that actually govern this controller. Do not silently revise pins for unrelated sources or regenerate unrelated config.
- Do not restart the healthy shared front/backend solely to replace the separate curator controller if live inspection proves the controller is loaded fresh per timer/service invocation. If it is cached or if provenance cannot be proved, stop and return the exact current loader interface rather than improvising.
- Keep curator timer/path stopped until post-install identities and tests pass. Only then rearm via the existing user-systemd units and verify active/enabled state, with a reversible stop plan if the next cycle becomes unsafe.

## C. One bounded natural maintenance cycle
- Let the existing timer/path invoke the normal controller. Do not force a Graphiti approval, inject synthetic remote work, call a second drain, bypass EX, manipulate the scheduler, manually toggle SH/EX or replay an ambiguous submission.
- Capture naturally observed states and real UTC timestamps: `idle -> preparing -> stopping -> stopped -> (scheduler_deferred OR draining -> starting) -> idle`, noting that ordinary pre-stop quiet deferral can return directly from preparing to idle. A recognized post-stop `SchedulerBusy` must recover by ONE normal SH-gated service start, positive bounded backend readiness, and final fenced-ingress check before `idle`; it must never reopen while the backend is down.
- If a natural scheduler-busy interleaving occurs, identify the stage and verify no-EX or terminal-safe-EX provenance. If it does not, do not fabricate the race; focused deterministic regressions plus one ordinary safe host cycle are acceptable for the narrow fix, with race coverage classified as deterministic rather than live-observed.
- Test/observe one natural supported 0/4 outcome as available; do not claim a new Graphiti terminal UUID unless an actually approved, positively source-qualified new fact reaches terminal same-group remote membership and index proof.
- Re-read canonical SH/EX and coordinator ownership, front/backend health, scheduler, Graphiti :8766 group `development-knowledge`, OV :1933, live XDG SQLite/guard and preserved applied-turn ledger. Verify original provider route and absence of a direct private backend bypass.
- On an unsafe journal, unknown remote submission, unexplained source/lock drift, or failed backend readiness: preserve the fence and evidence; stop without retry/replay/manual journal reset.

## D. Sanitized handback and stop
Return one allowlisted .tar.gz with a SHA-256/size manifest and:
1. merged-main Git exact SHA/tree/controller blob, CI receipt and installed before/after bytes/modes;
2. journal/lock/service/config nonsecret identities and initial admission;
3. focused test commands/results;
4. controlled replacement and verified rollback identity;
5. timer/path rearm state and native maintenance cycle chronology;
6. gate/Graphiti/OV/SQLite/ledger nonmutation and final health;
7. specifically labeled live-observed versus deterministic scheduler-busy proof;
8. remaining #108 C4/C5 acceptance (new terminal UUID, same-group source/index, model-bound useful recall) without overstating historical controls.
No private backups, raw provider bodies, secret values or Graphiti episode text in the archive.

RESULT=PASS|PARTIAL|BLOCKED
MERGED_MAIN_SHA=<40hex>
MERGED_CONTROLLER_BLOB=<40hex>
BEFORE_INSTALLED_SHA256=<64hex>
AFTER_INSTALLED_SHA256=<64hex>
JOURNAL_INITIAL_AND_FINAL=<state/attempt pairs>
CURATOR_PATH_TIMER=<active/enabled readback>
NATURAL_CYCLE_OUTCOME=<actual typed result or not_observed>
SCHEDULER_BUSY_TEST=<deterministic PASS|FAIL>
SCHEDULER_BUSY_LIVE=<observed PASS|not_observed|FAIL>
UNCLASSIFIED_REMOTE=none|present|UNVERIFIED
BACKEND_FRONT_AND_SH=PASS|FAIL|UNVERIFIED
LIVE_MUTATION=<exact changed host paths>
ROLLBACK_RETAINED=yes|no
NEW_TERMINAL_GRAPHITI_UUID=<grounded UUID|none>
ISSUE108_C4_C5=PASS|PARTIAL|BLOCKED
EVIDENCE_ARCHIVE_PATH=<absolute>
EVIDENCE_ARCHIVE_SHA256=<64hex>
EVIDENCE_ARCHIVE_BYTES=<integer>
EVIDENCE_MANIFEST_PASS=yes|no

COMMAND_SHAPE_FRICTION:
  encountered=<yes|no>
  events:
    - scenario=<short key>
      requested_shape=<sanitized actual tool invocation>
      effective_shape=<actual effective command|same-as-requested|unknown>
      rewrite_provenance=<none|rtk_opencode_hook|shell_or_alias|other_harness_hook|unknown>
      event_kind=<pre_execution_rejection|execution_failure|successful_recovery|guard_annotation|harness_rewrite|runtime_misbinding|interface_discovery|other>
      execution_effect=<not_executed|executed_failed|executed_succeeded|recovered_after_retry|unknown>
      correction_or_annotation=<decisive bounded fact>
      replacement_shape=<successful corrected shape|none>
      recipe_reference=<GHDEV-10 key|none>
      resource_reference=<resource|none>
      contract_conflict=<yes|no|uncertain>
      durable_gap_candidate=<yes|no|uncertain>
  omitted_sensitive_values=<yes|no>
If no friction: encountered=no, events=[], omitted_sensitive_values=no.

Central owns independent acceptance, any PR/merge/issue close and parent #105 gate. Stop after the bounded campaign. No broad model cohort or new PR.
<<< LOCAL_AGENT_CONTRACT_END >>>
