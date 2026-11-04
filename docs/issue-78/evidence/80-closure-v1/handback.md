# Issue #80 closure-v1: handback (evidence packet 80-closure-v1)

```text
RESULT=PARTIAL_PENDING_POST_EXIT_ADMISSION
LOCAL_AGENT_PRIMARY=build
REPO_ID=fvanevski/opencode-operational-schema-guard; ISSUE_NUMBER=80; BRANCH_NAME=issue/79
SOURCE_START_SHA=59cbd9055a4a3710b880e26be2c6887b3f6f6c12
SOURCE_TESTED_SHA=59cbd9055a4a3710b880e26be2c6887b3f6f6c12 + uncommitted 7-file delta (full bytes in source.patch, SHA-256 below; source remains uncommitted for Central review)
REMOTE_ISSUE79_HEAD_AT_PACKET_TIME=59cbd9055a4a3710b880e26be2c6887b3f6f6c12 (matches source authority; not stale)
EVIDENCE_COMMIT_SHA=pending (confirmed by remote readback; a commit cannot embed its own SHA pre-publication)
EVIDENCE_PUBLICATION=pending (this single evidence-only fast-forward commit; see remote readback below)
EVIDENCE_PACKET_REF=docs/issue-78/evidence/80-closure-v1 @ issue/79
EVIDENCE_MANIFEST_SHA256=86e164542236f448b6601530a03bbc8d27c8b7e24a6b2caad025b986022fe823
SOURCE_PATCH_SHA256=539fda78d460965f2ff73860818805585f73cc29da262139fd3f586acc212477
CHANGED_SOURCE_PATHS=docs/issue-75/v2-candidate/post-exit-drain.py; docs/issue-78/v2-curator/core.mjs; docs/issue-78/v2-curator/curator.test.mjs; docs/issue-78/v2-curator/graph-evidence.test.mjs; docs/issue-78/v2-curator/terminal-recovery-cli.mjs; docs/issue-78/v2-curator/terminal-recovery.mjs; docs/issue-78/v2-curator/terminal-recovery.test.mjs
PREMATURE_TRANSITION_CAUSE=local-only staging: previous Build session ses_e5c40c49effedpeZU74h4Tlmxr tool call call_dee51a26f72ecd5b ran `node -e ReviewStore.advance(ca268f5d...,'approved','submission_unknown')` at 23:34:03-05Z (15:34:05PST) directly, with NO GHDEV_MEMORY_POST_EXIT_LEASE marker, NO canonical flock, and NO add_memory
SUBMISSION_DELIVERY=never-submitted (unknown -> rejected-by-absence-of-call: zero mcp-mux Graphiti POST /mcp traffic 15:33:30-15:34:30PST, zero cur80_qual02 queue-processing events since 15:00, live scoped get_episodes=0, canonical gate _unresolved_graphiti_from_existing_db()=False); NOT a replay and NOT a failed_extraction
GRAPHITI_EPISODE_STATE=cur80_qual02: 0 episodes (genuine FIRST add_memory pending post-exit admission); cur80_qual01: 1 episode 26299f65-f48c-45c1-abf0-9c7d521b1a03 (curated-v1:924eee7a..., persisted); cur80_disposable: 1 episode 27a67cb8-c880-40ea-af99-e5722dfc8693
EX_ADMISSION=marker-only (GHDEV_MEMORY_POST_EXIT_LEASE=admitted is a declaration, not flock proof) -> admission invariant now enforced at the sole durable writer (core.mjs advance) for submission_unknown|queued|persisted; bare interactive staging is fail-closed EX_POST_EXIT_ADMISSION_REQUIRED
REVIEW_STATES=ca268f5d... (cur80_qual02) now approved rev 4, remote_episode_uuid=null, never_submitted_evidence present (sha 90c5e5693a7c375cfff2c94eaad2a3a3870cbd487fe276ffcfa0754db4bb3362); 924eee7a... (cur80_qual01) persisted rev 4 uuid 26299f65...; d1ebf82a... (cur80_qual01) failed_extraction rev 5 (FIFO-inference, no replay); c95c124a... (cur80_disposable) persisted uuid 27a67cb8...
SOURCE_DIFF=7 files / +281 -32 (post-exit-drain.py reconcile_late strict=False; core.mjs advance admission guard + edge-check-after-CAS + reconcileNeverSubmitted; terminal-recovery.mjs assessNeverSubmittedRecovery; terminal-recovery-cli.mjs --never-submitted mode; 3 test files: lease-marker wraps + 4 new regression tests); full bytes in source.patch
REGRESSION_RESULTS=v2-curator 5 files 39/39 exit 0 (terminal-recovery 6, curator 24, portal-api 1, graph-evidence 5, graph-preview 3); #79 candidate 15/15 exit 0; #75 legacy 4 files 26/26 exit 0; Python post-exit wrapper 11/11 OK exit 0; node --check 6 mjs exit 0; py_compile exit 0; git diff --check exit 0; RED/GREEN: HEAD core 21/22 (1 fail) -> worktree core 22/22
PORTAL_RESULTS=operator browser approval of ca268f5d... at 15:34:02PST (edit-and-approve -> approved rev 2) + durables consistent post-reconciliation (approved rev 4, 0 remote episodes = genuine-first-submission-pending); pre-exit redacted screenshots in screenshots/ (qual02-10/11/12/13); no portal source change in this delta
SHARED_SERVICE_SAFETY=mcp-mux.service (Graphiti worker, PID 1657) NOT stopped; disposable ghdev-curator80-qual02.service in 30s restart loop FAIL_CLOSED (interactive harness active/unknown) while this Build session is alive; .path re-armed+enabled
PRODUCTION_MUTATION=none (installed seven-plugin config, production Graphiti group ghdev_gh_mcp, OpenViking state, installed gate all untouched; disposable group/state/units only)
GITHUB_MUTATION=one evidence-only fast-forward commit (this packet; no source push, no PR, no merge, no issue closure, no force)
KNOWN_GAPS=qual02 genuine FIRST add_memory (approved -> queued -> persisted) is PENDING the post-exit automatic admission (cannot run while the interactive harness holds the EX lease; see NEXT + continuation-qual02.json); qual01 d1ebf82a failure is a FIFO-inference, not a UUID-level proof; fresh-client/native-session acceptance belongs to #81
NEXT=operator exits the interactive harness; the re-armed ghdev-curator80-qual02.path/service performs the genuine post-exit admission + drain (promoteOne FIRST add_memory for ca268f5d... -> queued -> persisted, OR UNRESOLVED retention in reconcile_late); operator returns the authenticated post-exit receipt (persisted episode UUID readback, _episode-index, queue convergence, journal) from a separate terminal for Central adjudication; then Central independent review + accepted source integration of the uncommitted 7-file delta on issue/79
```

## Lane-by-lane outcome

1. **Root-cause diagnosis** (`terminal-extraction-recovery.md`): the
   premature 15:34:05PST `submission_unknown` of `ca268f5d...` was a
   local-only `ReviewStore.advance` from the previous Build session (no EX
   marker, no flock, no `add_memory`); remote write proven never issued
   (zero mcp-mux Graphiti POST traffic in the window, zero scoped episodes,
   canonical gate idle).
2. **Bounded source remediation** (`source.patch`, `cpu-tests.md`): 7-file
   delta — a new never-submitted reconciliation path
   (`assessNeverSubmittedRecovery` / `reconcileNeverSubmitted` / CLI
   `--never-submitted`), an admission invariant enforced at the sole durable
   writer, and the structural edge-check moved after the CAS state check.
   RED/GREEN against the admitted HEAD proves the edge-check move is
   necessary (HEAD 21/22 -> worktree 22/22). All suites green.
3. **Live state reconciliation** (`graphiti-extraction.json`): the
   never-submitted adjudication applied (rev 3 `submission_unknown` -> rev 4
   `approved`), repeat apply rejected (idempotency guard). Scoped episode
   lists captured (qual02 0, qual01 1, disposable 1).
4. **Activation / post-exit** (`activation-postexit.md`): drain timeline
   captured (15:36:27 wake, 15:38/15:40 FAIL_CLOSED lease-held, 15:42:45
   EX admission proven + reconcile-only loop, 16:26:50/16:27:20
   post-adjudication FAIL_CLOSED harness-active). The genuine first
   submission is the pending post-exit step.
5. **Portal real-state** (`portal-real-state.md`): operator approval at
   15:34:02PST + durables consistent; redacted pre-exit screenshots.

## Known gaps (bounded)

- **qual02 genuine FIRST `add_memory`** (`approved -> queued -> persisted`,
  exact episode-UUID readback + `_episode-index` confirmation) cannot execute
  while the interactive harness holds the shared EX lease; it is the single
  declared post-exit operator step (exact commands in
  `activation-postexit.md` / `continuation-qual02.json`). The operator result
  must be returned as an authenticated separate receipt.
- **qual01 `d1ebf82a...` failure attribution** is an
  `anonymous_group_fifo_inference` (operator-attested), not a UUID-level
  proof that that specific record was the failing task.
- **Fresh-client/native-session acceptance** after a real merge belongs to
  #81 by contract; not exercised here.

## Invariants honored

No production config, production Graphiti group, OpenViking state, or
installed gate was mutated. No model curation and no Graphiti `add_memory`
occurred while the interactive harness was active (all pre-exit drain
attempts FAIL_CLOSED, exit 2). The shared `mcp-mux.service` Graphiti worker
(PID 1657) was never stopped. Source changes remain uncommitted for Central
review; the only remote write is this evidence-only fast-forward commit. No
PR, merge, issue closure, force-push, or deployment.

## Remote readback (post-publication)

Filled in the chat handback after push: remote `issue/79` ref SHA, evidence
commit SHA, and per-file path/hash readback of this packet on the remote.

## Final post-exit resolution (second evidence-only commit)

The single pending step declared above — the genuine FIRST `add_memory` for
`ca268f5d...` under post-exit automatic admission — has now occurred and
settled. This is recorded in `postexit-terminal.md` and `gui-acceptance-final.md`
(original pre-exit claims and timestamps in this file are preserved unchanged):

- **Terminal drain (automatic, no manual drain):** after the operator exited the
  interactive harness, `ghdev-curator80-qual02.service` reached
  `inactive (dead)`, `Result=success`, `NRestarts=32`; the admitted drain JSON
  was `{"curated":0,"deferred":0,"skipped":0,"approved":0,"queued":1,
  "persisted":1,"unresolved":0,"model_calls":0,"model_ms":0,"status":"settled"}`.
- **Remote Graphiti episode:** exactly one, group `cur80_qual02`,
  UUID `0e04a359-2ae4-4b37-890e-3e34c40f3fce`, name
  `curated-v1:ca268f5dd77dee45d74494a604985fcf2c81fcad764f2d62ca66c49f4e764828`;
  `_episode-index/0e04a359-...json` resolves to the same review.
- **Review state:** `ca268f5d...` now `persisted` rev 7,
  `remote_episode_uuid=0e04a359-...`, `never_submitted_evidence` retained.
- **Real-graph readback:** `graph-readback.mjs` → `verified_readback`,
  2 extracted entities (`node`, `prime.test.js`) + 1 real relationship edge
  (group `cur80_qual02`), `unlinked_edge_count=0`.
- **GUI acceptance:** portal launched on `http://127.0.0.1:48311` (group
  `cur80_qual02`, private 0600 token, loopback-only, read-only Graphiti endpoint);
  26/26 Playwright browser checks passed (inbox/counts, source timeline,
  decision audit retaining the original approval + never-submitted
  reconciliation, graph preview with real extracted entities/edges + persisted
  episode node, replay safety with all actions disabled in `persisted` state,
  portal usable with the worker stopped, CLI/browser agreement, no token leak).
- **Shared service safety:** `mcp-mux.service` (Graphiti worker PID 1657) was
  never stopped; no pending `cur80_qual02` extraction.
- **Cleanup:** the disposable `ghdev-curator80-qual02.{service,path}` user-systemd
  units are removed after confirming no pending extraction / EX obligation;
  durable source records and evidence are preserved.

**Final RESULT for the #80 closure campaign: PASS** (all #80 acceptance lanes
host-verified; see `gui-acceptance-final.md` matrix — remaining items are
#81-owned). The original `RESULT=PARTIAL_PENDING_POST_EXIT_ADMISSION` above is
preserved as the first-packet historical state.

## COMMAND_SHAPE_FRICTION (canonical)

See `command-shape-friction.md` (encountered=yes; 3 events: scratch
`rm -rf && mkdir` pre-execution rejection, edit-tool whitespace
mismatches recovered via python replace, zsh-history awk multibyte warning
recovered via python parse + session-DB authoritative source).
