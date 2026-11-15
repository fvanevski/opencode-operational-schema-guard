# Issue #93 — completion-bound-qualification evidence packet

Sanitized, evidence-only snapshot of the single completion-bound source-backed
qualification on the issue/93 working head (`9bba7d8cf5965741545b8ecf069b4d0f054527ed`).

Measurement only. Not a final acceptance claim; no production selector change
staged.

## Members

- `handback.md` — full typed handback, B2 disposition (INSUFFICIENT_EVIDENCE),
  exact SHA identities, COMMAND_SHAPE_FRICTION block.
- `native-context.json` — fresh-external-process native context qualification on
  the real read-only route: source-injection (4 facts, ≤1400 chars, sourceContext
  omitted, source-attributed), hook timings (p95=221.825ms, all <300ms), controls.
- `get-episodes-proof.json` — same-group `get_episodes` membership of a persisted
  #92 UUID, and get_episodes RTT (p95=40.6ms) measured separately from search RTT
  (p95=193.256ms) against the 70ms `INDEX_ENRICHMENT_MAX_WAIT_MS` window.
- `reviewstore-proof.json` — scoped #92 ReviewStore inventory (565/355 persisted)
  and the installed V2 resolver/retriever binding.
- `regression-receipts.json` — Central-authored `native-source-context.test.mjs`
  (6/6) + corrected scorer (10/10), Node v26.13.1.
- `command-shape-friction.json` — COMMAND_SHAPE_FRICTION block (guard
  annotations + the `opencode --session` id-prefix arg contract).
- `SHA256SUMS` — manifest covering the members above.

## Privacy

Raw queries, facts, remote/source UUID maps, credentials, model prompts, and
sensitive host traces are kept in private scratch (`/opt/filip/.hermes/cache/scratch/
issue93c-q9UemB/`) and are NOT published. This packet carries synthetic counts,
SHA identities, and bounded labels only.

## Native-client proof

- Fresh external `opencode run --standalone` (private server, new `ses-` session)
  loaded the real installed plugin and produced a model answer.
- A fresh external Node process drove the real installed plugin against the real
  read-only Graphiti + #92 ReviewStore route; only the OpenCode host ctx binding
  is emulated. This is not a claim that a mock ctx is a fresh external process.
