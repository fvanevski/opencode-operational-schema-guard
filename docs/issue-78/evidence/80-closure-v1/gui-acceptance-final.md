# Issue #80 closure-v1 — final GUI acceptance + #80 completeness matrix

Scope: real browser/API qualification of the operator portal against the
**current persisted** qual02 state, plus the #80 feature/acceptance matrix.
Reuses earlier authorization, source-validation, duplicate/conflict and
browser-negative-test evidence (see `portal-real-state.md` and the prior
`browser-qual` campaign); does not repeat the full campaign.

## Portal runtime

- Launch mode: temporary loopback portal against the disposable `cur80_qual02`
  group, private 0600 operator token file, loopback-only binding, existing
  read-only Graphiti endpoint.
- Command:
  `node docs/issue-78/v2-curator/portal-server.mjs --group cur80_qual02
  --state-dir /home/filip/.local/state/ghdev-graphiti-issue80/closure80-qual02
  --token-file .../closure80-scratch/portal-token-qual02
  --dist .../v2-curator/portal/dist --port 48311
  --graphiti-endpoint http://127.0.0.1:8766/mcp`
- Operator-facing URL: **`http://127.0.0.1:48311`** (bound to `127.0.0.1` only).
- Token file: `.../closure80-scratch/portal-token-qual02` (mode `0600`, 64-hex;
  value never staged). The portal reads the token from the 0600 file at start;
  the browser carries it in-memory only (no browser storage).
- Startup procedure: create a 0600 token file (32..256 chars), run the
  `portal-server.mjs` command above, open `http://127.0.0.1:48311` in the
  browser, paste the token into the "Review token" field, click "Unlock local
  inbox".
- State-root/group binding: `--state-dir .../closure80-qual02`,
  `--group cur80_qual02`. The portal is scope-fixed to that group; wrong-group
  refs 404 (verified in the prior `browser-qual` campaign).

## Browser + API results (Playwright, host Chromium 156, `/usr/bin/chromium`)

26/26 checks passed against the running portal (script
`/tmp/opencode/issue80-portal-qual02-postexit.cjs`; results
`.../closure80-scratch/screenshots-qual02-postexit/browser-acceptance-results.json`):

- **Inbox + counts reflect persisted state:** status counts
  `persisted=1`, all others `0`; single inbox item `issue80-qual02-ws-fresh`
  with green `persisted` badge and the operator-seed origin label.
- **Source timeline + decision audit:** detail "Evidence and proposal" tab
  shows the 4-event source timeline + curator proposal fact; "Decision history"
  tab retains the original `edit-and-approve→approved` approval **and** the
  `operator_attested_never_submitted→approved` reconciliation, and the
  `submission_unknown→queued→persisted` terminal sequence. Prior revision
  history and current state agree.
- **Remote episode appears only after positive persistence:** the graph
  preview shows the "Persisted Graphiti episode" node **only** because
  `state=persisted` with a confirmed `remote_episode_uuid`; the green
  "Remote graph: verified readback" badge + "2 extracted entities · 1 extracted
  edges" line are gated on `verified_readback`.
- **Graph preview shows real extracted entities/relationships separately from
  source/proposal associations:** React Flow renders source nodes → proposal →
  persisted episode (green) → extracted entities (`node`, `prime.test.js`)
  with "extracted from" edges, distinct from the source/proposal/episode
  association edges; the note states extracted claims are not independently
  fact-verified.
- **No unsafe replay for queued/persisted entries:** in `persisted` state all
  six operator actions (Validate & approve, Keep deferred, Request
  re-evaluation, Propose merge, Propose supersession, Discard) are **disabled**;
  no "submission outcome unknown" callout is offered.
- **Portal usable with the automatic worker not running:** the drain service
  is `inactive/dead`; a manual Refresh still re-loads the persisted state.
- **Headless CLI agrees with the browser:** `curator-cli.mjs status`/`list`
  (see `postexit-terminal.md`) match the portal's counts and item.
- **No token leak / no page errors / no unexpected 404s** (only the expected
  favicon 404, since the dist has no favicon link).

## Reused earlier evidence (not re-run)

- Authorization / CSRF / origin / redaction: `browser-qual` campaign (portal80)
  — `login_wrong_token_rejected`, `origin_csrf_rejected`,
  `wrong_group_404`, `no_model_graphiti_browser_calls`.
- Conflict/duplicate + merge/supersession proposals: `merge_proposal`,
  `supersession_proposal`, `revision_conflict_two_tabs` (two-tab CAS /
  double-submit idempotency).
- Rejected unsupported-source assertion + verified-class rejection:
  `fabricated_assertion_rejected`, `verified_class_rejected`.
- `submission_unknown` safe handling (lockout, no blind retry):
  `submission_unknown_lockout`.
- Keyboard navigation, theme, responsive 480px, live 12s refresh:
  `keyboard_nav_select`, `theme_toggle`, `responsive_480`, `live_refresh_12s`.

## #80 feature / acceptance matrix

Legend: **[H]** implemented + host-verified, **[I]** implemented, not yet
host-verified, **[G]** partial/gap that materially blocks #80, **[81]** broader
#81 requirement.

| #80 acceptance requirement | Status | Evidence |
| --- | --- | --- |
| CPU contract tests (grounded EMIT, MERGE, dup, SKIP, DEFER, cross-group, temporal, malformed, replay ambiguity, no-active-session add_memory) | **[H]** | 33 v2-curator + 4 activation + 15 candidate + 26 legacy #75 all pass on `3574f8ca` |
| Real local-LLM curator host qualification → concise source-linked record → Graphiti terminal persistence with usable extracted entities/relationships | **[H]** | `80-first-integration-v1` real model call (1 queued episode, 1 positive readback); this task's graph-readback confirms 2 entities + 1 real relationship for the persisted episode |
| Automatic, shared-gate-admitted post-exit processing (normal session end → user-systemd path wake → admitted drain → terminal, no manual drain) | **[H]** | `postexit-terminal.md`: pre-exit FAIL_CLOSED, post-exit `EX admission proven`, drain `settled`, service `Result=success`, single extraction by shared worker |
| Real operator portal: source-bound approval through graph persistence, CAS/CSRF, conflict/duplicate, unknown-write lockout, filters, a11y, refresh/restart, screenshots | **[H]** | this task 26/26 browser checks + reused `browser-qual` 35/35 (CAS/CSRF/dup/lockout/keyboard/responsive) |
| GUI shows a practical operator workflow for **newly captured deferred** reviews (not just historical records) | **[H]** | portal renders a live `deferred` seed from `prepare-review.mjs` with an enabled edit-and-approve path; qual02 demonstrates the full deferred→approved→queued→persisted transition; inbox/counts refresh live |
| Graph preview distinguishes proposed/unverified from persisted edges | **[H]** | graph preview: association edges vs extracted-entity edges vs "verified readback" badge, with explicit note |
| No added interactive latency / no OpenViking or #75 recall regression | **[H]** | drain is post-exit only (`model_calls=0` while interactive); legacy #75 26/26 pass; no interactive write path |
| Curation yield / deferred / duplicates / tokens / latency against a frozen corpus | **[81]** | frozen comparative memory-quality benchmarking is owned by #81 (not this campaign) |
| Fresh installed stock-client / native-session recall | **[81]** | genuinely fresh installed native-session acceptance is #81 |
| Production activation/rollback, frozen quality benchmark | **[81]** | #81 (no production install in #80) |
| Full model-driven contradiction comparison | **[81]** | README marks this as #80/#81 acceptance work; not claimed here |
| Multi-fact EMIT (per-fact remote source identity) | **[81]** | README: currently deferred until per-fact remote source identity is implemented |

## Practical-workflow assessment (new deferred reviews)

The portal **does** provide a practical operator workflow for newly captured
deferred reviews, not merely historical records:

1. A normal native session captures bounded related native-ID events into the
   disposable candidate queue (no manual drain needed — the accepted post-exit
   path/wake does that).
2. `prepare-review.mjs` (or the admitted local-model curator) promotes an
   eligible cluster to a review — either an operator **DEFER** seed
   (explicitly marked "not LLM-curated") or a model decision.
3. The portal inbox shows the new `deferred` record with live counts; the
   operator opens the source timeline + proposal, edits the grounded
   assertion, chooses the exact supporting native source, and
   "Validate & approve" → `approved`.
4. The approved intent is recorded for the admitted post-exit worker
   (no browser LLM/Graphiti write); the post-exit drain advances
   `approved → queued → persisted` via a positive `get_episodes` readback, and
   the graph preview reflects the persisted episode only after that readback.
5. Stuck/unknown submissions stay in reconciliation (no blind retry); terminal
   persistence and the remote episode/source association are shown only after
   verified readback; the durable audit trail is preserved.

This is a bounded, deferred-event operator-adjudication GUI — not a general
GUI redesign, transcript browser, graph editor, backlog dashboard, or separate
service console.

## Material gaps for #80

- **None material.** The single-episode `cur80_qual02` group does not itself
  contain a live conflict/duplicate case in the browser (only one persisted
  record); the conflict/duplicate/merge/supersession browser demonstration is
  covered by the reused `browser-qual` (portal80) campaign per the contract's
  reuse directive. The LLM-curator (non-operator-seed) path is host-verified in
  `80-first-integration-v1`; the qual02 group uses an operator seed by design
  for the portal/graph/post-exit lanes.
- Remaining #80-adjacent items are explicitly **#81** (frozen quality
  benchmark, production activation/rollback, fresh installed native-session
  recall, model-driven contradiction comparison, multi-fact EMIT).
