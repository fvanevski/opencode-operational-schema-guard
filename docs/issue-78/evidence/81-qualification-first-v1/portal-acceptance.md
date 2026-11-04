# Issue #81 — portal/CLI focused acceptance (C.4)

Scope: the #80 portal/CLI surface against the new cur81 cohort binding — private 0600 token, loopback-only listener, source timeline, decision audit, graph node/edge distinction, and no-replay action lockout. The accepted #80 35/35 and 26/26 browser suites are reused as invariant controls and were not re-run; the checks below target the new cohort/real-graph/difference.

## Binding

- Portal server: `docs/issue-78/v2-curator/portal-server.mjs` (unchanged product source), built dist copied read-only from the developer worktree's build output to a scratch location; two temporary loopback listeners on `127.0.0.1:18821` (real cur81 binding) and `127.0.0.1:18822` (disposable lifecycle root). Both listeners were stopped after the checks; no temporary host binding remains.
- Real binding: `--group cur81_dev_ce555621 --state-dir /home/filip/.local/state/ghdev-graphiti-issue81/qual81` with a private 0600 token file (48 hex chars, never printed in this packet).

## Real cur81 binding (port 18821, pre-exit)

| check | result |
|---|---|
| `GET /api/clusters` without token | **401** (token required) |
| token + wrong `Origin` | **403** (exact-origin enforcement) |
| token + loopback origin | **200**, `total:0` (correct: no curation records pre-drain) |
| `GET /api/status` | **200**; scope `cur81_dev_ce555621`, `review_count:0`, candidate queue `total:33` with `counts.new=33` (staged cohort visible through the API) |
| listener binding | `127.0.0.1:18821` only (loopback, verified via `ss`) |

## Review lifecycle (disposable root, port 18822)

One cluster staged through the authentic #79 `fromPrompt` adapter (native session `ses_e5c8c5478ffeI0mfZsHAvN37tx`), created as `DEFER` ("Requires operator review"):

| step | result |
|---|---|
| `GET /api/clusters` | 1 item, `state=deferred`, `decision=DEFER`, `revision=1` |
| `POST …/review` `discard` rev 1, exact origin | **200** → state `skipped`, decision `SKIP`, `revision=2` (decision audit: `reason`, `updated_at`, `evidence_classes`, `event_kinds`, `last_observed_at` all present) |
| identical `POST` again (stale revision) | **409** — no-replay action lockout (terminal revision CAS) |
| `GET …/preview` | source node with native source ref `opencode:ses_e5c8c5478ffeI0mfZsHAvN37tx:message:msg_lc1`, authority `user-stated`; explicit node/edge distinction note ("Source/proposal/confirmed-episode associations only. This is not an assertion of extracted Graphiti entity edges."); `remote_graph.status=not_configured` (no endpoint configured for that instance) |
| `GET /api/clusters?state=skipped` | `total:1`, `has_more:false` |

## CLI

- `curator-cli.mjs status --group cur81_dev_ce555621 --state-dir …/qual81` → exit 0; review counts empty (pre-drain), queue `total:33, new:33`.
- `curator-cli.mjs reconcile-only` / model drain: require the accepted EX admission (`GHDEV_MEMORY_POST_EXIT_LEASE=admitted`), i.e. post-exit; not invoked pre-exit by design.

## Post-exit continuation (operator)

After the harness exit and the armed drain admits under EX:
1. `systemctl --user status ghdev-curator81-qual.service` + `journalctl --user -u ghdev-curator81-qual.service` for the admitted run.
2. `curator-cli.mjs status/list` on the cur81 state dir: expect `approved → queued → persisted` (or typed `deferred`/`skipped`/`submission_unknown`).
3. Re-bind the portal on the real cur81 state dir and read the persisted/deferred states, preview node/edge structure with the real graph endpoint, and confirm no-replay lockout on a persisted record.
4. Authenticated `get_episodes` readback for `cur81_dev_ce555621` (episode UUID/name match, exact native source index, ≥1 real extracted entity+relationship, zero duplicates).
5. `/home/filip/.local/state/ghdev-graphiti-issue81/usage.jsonl`: per-cluster model usage/latency.
