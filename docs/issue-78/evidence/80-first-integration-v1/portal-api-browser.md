# Issue #80 — portal build and real browser/API qualification

Host: Linux, Node v26.13.0, npm 12.2.1. Worktree head
`c38c8fd1b8fee0b701ebeb8888fa6f1f0a27bfda` (tree
`5d6e1612cb0309c2fb6c23887657100c60fa815e`). All work inside
`docs/issue-78/v2-curator/portal`.

## Build receipts

- `npm install` — exit 0 (clean; no network lockfile drift).
- `npm run check` (TypeScript) — exit 0, no diagnostics.
- `npm run build` (Vite) — exit 0. Produced
  `dist/index.html` + `dist/assets/index-CvYTe5oU.js` +
  `dist/assets/index-h0bHJ6nf.css` (SHA-256 in `manifest.json`).
- `package-lock.json` retained as **untracked proposal evidence** (in
  `source.patch`; NOT committed as source).
- `node --test docs/issue-78/v2-curator/portal-api.test.mjs` — exit 0,
  1/1 (contract-named portal API suite).

## Browser/API qualification (real UI, not static screenshots)

Browser automation: global Playwright driving host
Chromium (`/usr/bin/chromium`) via `executablePath` (the Playwright
bundled browser was absent on the host; see `handback.md` friction
ledger). Portal server ran the built `dist` on a fresh private
loopback port `127.0.0.1:43589` with a new 0600 random local portal
token (value omitted). Disposable group `portal80` and disposable
state root; seeded deterministic records:

- r1 `b933830d...` approved
- r2 `1966e2d1...` deferred
- r3 `02a899cd...` submission_unknown
- r4 `23535f00...` persisted (Graphiti episode uuid
  `1e8c3f2a-4b5d-4f6e-9a0b-7c8d9e0f1a2b`, fixture)
- r5 `5f453c0e...` skipped
- r6 `c367b0e8...` deferred
- `other` `266387e3...` (wrong-group rejection target)

**Result: 35/35 PASS** (full machine-readable list in
`browser-qual-results.json` under host-local `/tmp`; sanitized copy of
the check names/details below).

### Authentication and rejection

| check | receipt |
| --- | --- |
| login_card_visible | PASS |
| login_empty_button_disabled | PASS |
| login_short_token_button_disabled | PASS |
| login_wrong_token_rejected | PASS (UNAUTHORIZED callout) |
| login_success_inbox | PASS |
| origin_csrf_rejected | PASS http 403 `{"error":"ORIGIN_REJECTED"}` |
| wrong_group_404 | PASS http 404 (cross-group record not visible) |

### Filtering, timeline, state

| check | receipt |
| --- | --- |
| status_counts | PASS `{deferred:2, approved:1, submission_unknown:1, persisted:1, skipped:1}` |
| candidate_queue_visible | PASS `{new:3, reserved:0, deferred:0, skipped:0, approved:0, submission_unknown:0, queued:0, persisted:0}` |
| state_filter_deferred / _persisted / _all | PASS |
| search_no_match | PASS |
| source_timeline | PASS `gh_mcp / ses_portal80Cluster 1966e2d1...` |
| deferred_no_facts_message | PASS |

### Review semantics (source-bound, revision CAS)

| check | receipt |
| --- | --- |
| fabricated_assertion_rejected | PASS `INVALID_APPROVAL: unsupported_claim_text` |
| fabricated_keeps_deferred | PASS state stays `deferred` |
| verified_class_rejected | PASS http 400 `INVALID_APPROVAL: invalid_fact_fields` |
| edit_and_approve | PASS `state=approved rev=2` |
| tabA_defer_succeeds | PASS `state=deferred rev=2` |
| revision_conflict_two_tabs | PASS `STALE_REVIEW_REVISION` |
| reevaluate_requested | PASS `reevaluate_requested=true` |
| discard_to_skipped | PASS `state=skipped`, dialog "This does not delete Graphiti episodes." |
| merge_proposal | PASS `decision=MERGE state=deferred facts=1` |
| supersession_proposal | PASS `decision=SUPERSEDE_PROPOSED state=deferred` |
| submission_unknown_lockout | PASS callout shown, all review actions disabled |

### Graph, persistence badge, live UI

| check | receipt |
| --- | --- |
| persisted_green_badge | PASS |
| graph_episode_node | PASS episode label in DOM + API uuid `1e8c3f2a-...` |
| nonpersisted_no_episode_node | PASS deferred record graph has no episode node |
| graph_pan_zoom | PASS `scale(1)` → `scale(1.41151)` + pan delta |
| live_refresh_12s | PASS counts changed within 12 s without reload |
| keyboard_nav_select | PASS focus lands on `role=listitem` |
| theme_toggle | PASS `radix-themes dark` → `radix-themes light` |
| responsive_480 | PASS horizontal overflow 0 px at 480 px viewport (after the in-scope `main.tsx` detail-header wrap fix; see `cpu-tests.md`) |
| no_model_graphiti_browser_calls | PASS 84 requests, hosts `["127.0.0.1:43589"]` only — zero browser calls to the model or Graphiti endpoints |

## Screenshots (sanitized, in this packet)

- `screenshots/shot-01-inbox-dark.png` — inbox list, dark theme
- `screenshots/shot-02-graph-persisted.png` — persisted record graph with episode node
- `screenshots/shot-03-inbox-light.png` — inbox list, light theme
- `screenshots/shot-04-mobile-480.png` — 480 px viewport, no overflow
- `screenshots/shot-05-final-inbox.png` — final inbox state

No screenshot contains tokens, prompts, credentials, or private host
data (audited; see `handback.md` invariants).
