# Issue #92 H3 — Sanitized freeze receipt (evidence-only, commit 1 of 2)

Public, sanitized chronology proof for the i92h3 multi-family prospective
holdout and the exposed-development regression corpus that accompany it.
No raw private excerpts or credentials. Digests are authoritative; private
bytes remain on the host under restricted permissions.

## Source identities

| Role | SHA | Note |
|---|---|---|
| baseline | `c8eb5260f2b1…2ffba8` | unchanged |
| candidate | `21556fa39c75…ea3ed3` | Central-staged tip: fix `9934b49` + test `21556fa` (negative-finding prompt selection in `core.mjs` + `h2-coverage-v2` fact-supported scorer) |

`model.mjs` is byte-identical across `270848a..21556fa`, so the frozen
inference identity is unchanged from the H2 campaign.

## Corpora (frozen, pre-output)

| Corpus | SHA-256 | Cases / valuable-prov | Families | Frozen at (UTC) | Manifest SHA-256 |
|---|---|---|---|---|---|
| i92h3 untouched holdout | `08b821199a10…2774b47e` | 38 / 30 | hermes 14, openviking 10, plex 14 | 2026-11-09T02:28:59.169Z | `70915d504061…104ee4` |
| dev regression (exposed, dev-only) | `6e3475ad0bb4…beafa2ca5` | 34 | #81 cronparse 24 + H2 firecrawl 10 (incl. negative pair i92h2-15 / i92h2-16) | same freeze | same manifest |

The dev corpus is reported, not scored. Historical September 2026 plex
controls (cases 37-38) are recorded as historical/transient controls.

## Exposure control

- 35 exposed sessions excluded wholesale: gh_mcp diagnostic (17), #81
  cronparse dev (1), #81 native holdout capture group, H2 i92h2 re-frozen
  cohort (16). 0 session/message overlap with i92h3.
- Families (hermes / openviking / plex-stack) are materially distinct from
  the exposed tdarr / firecrawl / guard81 / cronparse fact families.
- 1 pre-output label adjudication: `i92h3-21-7f60f29a` valuable
  true → false (transient 503 log-line reconfirmation; the durable
  disabled-receipt root cause is already carried by `i92h3-20`, so keeping
  both valuable would double-count one root-cause family).

## Model policy (frozen, identical for all four arms)

`chat-fast` @ `http://127.0.0.1:8002/v1/chat/completions`, temperature 0,
max_tokens 1600, json_object, no reasoning effort, 90 s timeout.
Digest: `39d8dd80b142…2247a4` (sha256 of compact JSON of the frozen
`model_policy` object).

## AI adjudication (user-authorized, independent)

- Reviewer: `independent_ai` — OpenCode V2 build primary agent (Qwen3.8
  Chat, local provider, bounded reasoning) acting as independent assessor
  under user-authorized AI adjudication for Issue #92.
- Outputs blinded; all 38 case texts read in full from `opencode.db`
  (read-only) before any model exposure.
- Ratification `issue92-h2-ai-ratification-v1`:
  SHA-256 `0fbd7ed20fed…c7a7a`, ratified 2026-11-09T02:28:59.170Z.
- 29/38 valuable ratified (1 label change, above), preflight
  `H2_PREFLIGHT_PASS` (native producer exit 0), corpus digest
  cross-verified.

## Groups and seed state

- dev (exposed, development-only): `…development-r11` / `…r12` —
  34 new / 0 reviews each (untouched).
- holdout (fresh cohort): FRESH unused `…holdout-r13` / `…r14` —
  38 new / 0 reviews each (untouched); r11-r14 verified episode-free via
  Graphiti MCP `get_episodes(group_ids)` before seeding.
- Sealed v1 groups `…r05` / `…r06` / `…r09` / `…r10` untouched.

## Chronology proof

No i92h3 model output exists as of this receipt: all four queues show
new-only counts with `review_count=0`; the freeze and the AI ratification
both predate any model call on these events; the interactive harness must
not trigger inference — the single post-exit four-arm runner (one-shot
launcher via the installed `post-exit-drain` EX wrapper) is the exclusive
admission path.

This is evidence commit 1 of 2 (freeze, then final). Zero new PRs.
