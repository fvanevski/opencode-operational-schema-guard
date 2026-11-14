# Issue #92 H2 — Sanitized freeze receipt (evidence-only, commit 1 of 2)

Public, sanitized chronology proof for the H2 multi-family prospective holdout.
No raw private excerpts or credentials. Digests are authoritative; private
bytes remain on the host under restricted permissions.

## Lineage

| Seal | Corpus SHA-256 | Cases / valuable | Frozen at (UTC) | Manifest SHA-256 |
|---|---|---|---|---|
| v1 (original) | `dc58025c3a26…09de3` | 30 / 19 | 2026-11-09T00:36:55.903Z | `663dd76f0f48…d77b9e` |
| v2 (re-freeze) | `63948f771f96…efb36` | 30 / 19 (tdarr 10, firecrawl 10, guard81 10) | 2026-11-09T01:08:11.317Z | `bdb180ac6253…94852a1e7` |

Pre-output AI adjudication replaced exactly one case before any model exposure:
`i92h2-22-fafe1848` (recall probe of the exposed gh_mcp FalkorDB crash-loop
fact family, citing its episode UUID) → `i92h2-22-ef6c1520` (genuinely new,
source-backed, natively re-verified, non-exposed durable runtime fact).
The other 29 cases are byte-identical to the v1 seal. v1 seal preserved.

## Exposure control

- 0 session/message overlap between the H2 cohort and the exposed gh_mcp
  diagnostic (15 sessions) + #81 cronparse dev (1 session) sets.
- 1 fact-level entanglement found and replaced pre-output (above).

## Model policy (frozen, identical for both arms)

`chat-fast` @ `http://127.0.0.1:8002/v1/chat/completions`, temperature 0,
max_tokens 1600, json_object, no reasoning effort, 90 s timeout.
Digest: `30806d64f7d6…20521501` (method: sha256 of compact JSON of the frozen
`model_policy` object).

## AI adjudication (user-authorized, independent)

- Reviewer: `independent_ai` — OpenCode V2 build primary
  (session `ses_e422b4544ffe3BLGdWdCLYVPto`, Qwen3.8 Chat, local provider,
  bounded reasoning).
- Outputs blinded, original private sources read, 30/30 cases source-verified
  against `opencode.db` (text/role/event-id/locator/timestamp).
- Ratification `issue92-h2-ai-ratification-v1`:
  SHA-256 `925a21dbeaeb…c8a95c4a5271ad8`, ratified 2026-11-09T01:09:12.258Z.
- 19/30 valuable ratified, 0 label changes, preflight `H2_PREFLIGHT_PASS`
  (native producer exit 0).

## Groups and seed state

- dev (exposed cronparse, development-only): `…development-r05` / `…r06` —
  24 new / 0 reviews each (untouched).
- holdout (re-frozen cohort): FRESH unused `…holdout-r09` / `…r10` —
  30 new / 0 reviews each (untouched); all six groups verified episode-free
  in Graphiti before seeding.
- v1 holdout groups `…r07` / `…r08` sealed and untouched.

## Chronology proof

No H2 model output exists as of this receipt: all four queues show new-only
counts with `review_count=0`; both seals predate any model call on these
events; the interactive harness must not trigger inference — the single
post-exit runner (`docs/issue-91/h2-acceptance/h2-post-exit-run-reviewed.sh`)
is the exclusive admission path.

This is evidence commit 1 of 2 (freeze, then final). Zero new PRs.
