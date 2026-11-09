# Issue #92 ADR — prospective two-trial qualification: sanitized freeze receipt

Evidence-only commit 1 of 2 on `work/91-memory-utility-r1`. This freeze receipt
precedes any model inference. No raw private source text, credentials, raw
inference payloads, or sensitive episode content are included; digests are
authoritative and private bytes remain 0600 on the host.

## Identities

| role | value |
|---|---|
| repository | `fvanevski/opencode-operational-schema-guard` |
| branch | `work/91-memory-utility-r1` |
| required starting HEAD | `96d50f563ebbe43242a675b3a1c5bd22c3f3091d` |
| baseline source | `c8eb5260f2b10832346234b1b5d0cf28302ffba8` |
| candidate source | `a684667a6eefa2dc19f29755bed0c3048874721d` (includes the `.trim()` + per-fact utility-label fixes) |
| scoring source | `96d50f563ebbe43242a675b3a1c5bd22c3f3091d` (`adr-evaluate.mjs` / `adr-target-score.mjs`; NOT the model-tested implementation) |
| architecture | `ADR-91-2026-11-09` |

## Cohort (frozen, pre-output)

- **24 review clusters**, **4 task families**: `graphiti-mcp` (4), `swebench-sphinx` (9), `swebench-django` (8), `swebench-pylint` (3).
- **24 eligible** native source opportunities + **1 ineligible** privacy/scope control.
- **27 targets**, **16 valuable**.
- **Capacity ceiling 1.0** (all 16 valuable targets within the 3-per-cluster automatic bound); the 85% structural-coverage metric is feasible — no architectural conflict.

Sources are authentic `opencode.db` `session_message` rows from the raw native event
stream (not captured queue entries). Value judgments are blind to any model output.

## Digests

| field | SHA-256 |
|---|---|
| freeze file (exact private bytes) | `96cfef46ab642aeb1d05cf246478da92f34547daf6575ea2d756d192afbdbb5f` |
| corpus (case set) | `b82840b69958a563c62918a522a5d52bec025c99484d5215075bb4d39be7db2d` |
| model policy | `38ea80aeafc8dbeb4a0d71e86bcfde7cc5f89867909a14daf8a77f9d05f30d40` |

Model policy: `chat-fast` @ `http://127.0.0.1:8002/v1/chat/completions`, temperature 0,
max_tokens 1600, json_object, no reasoning effort, 90 s timeout — identical for all four arms.

## Chronology

- frozen_at `2026-11-09T19:56:33.000Z`, ratified_at `2026-11-09T19:57:03.000Z`, `first_model_observed=false`.
- Cohort, target labels, model policy and the two-trial (t1, t2) execution order are frozen before any model output. The four-arm campaign runs only after the interactive harness exits under the native EX gate.

## Exposure control (independence)

Selected families (`mcp_servers/graphiti`, `swebench-mini` sphinx/django/pylint) are
project families **not present** in any exposed cohort (H2 tdarr/firecrawl/guard81, H3
hermes/openviking/plex, H4 issue75/26/70/79/80 + dev cronparse/firecrawl/hermes/
openviking/plex, #81 cronparse dev, gh_mcp diagnostic, ADR r05-r08). No previously
exposed case was renamed; the exposed `#81 first qualification campaign` session and all
tdarr `P5M` sessions were excluded.

## Groups (fresh, disposable, episode-free)

| arm | group |
|---|---|
| t1-baseline | `graphiti-adr92-prospective-t1-base` |
| t1-candidate | `graphiti-adr92-prospective-t1-cand` |
| t2-baseline | `graphiti-adr92-prospective-t2-base` |
| t2-candidate | `graphiti-adr92-prospective-t2-cand` |

All four verified 0 episodes via FalkorDB raw query and Graphiti MCP `get_episodes`
before seeding. 24 eligible frozen source opportunities staged into each arm queue;
review_count=0 pre-drain. Production `development-knowledge` and all historical groups
untouched.

## Phase 2 reconciliation note (prior r07/r08 uuid discrepancy)

The five 64-character identifiers published as `uuid` in the prior `92-adr-integration`
r07/r08 receipts are the **local review-record-id** (the `curated-v1:<id>` episode-name
suffix, a 64-char SHA-256 local review identifier), **not** the Graphiti episode UUID and
**not** a redacted digest of it (`sha256(real_episode_uuid)` differs from the published
value for all five). Real episode UUIDs (FalkorDB + Graphiti MCP readback):

| published (review-record-id) | real episode UUID |
|---|---|
| `0f66b63f…` (r07) | `fdbb1e8c-eba0-4bab-b764-4ca229fe04fa` |
| `34cc936e…` (r07) | `d80375a3-5697-42c7-9560-5cf071e53d53` |
| `8684e84a…` (r07) | `e36ca58c-22c8-4927-9ce9-a0c9d2f94b78` |
| `4f6f1093…` (r08) | `292f218a-5242-4df8-8e58-acfcf2c881c5` |
| `6204fa9c…` (r08) | `58f57ea5-4224-4644-ba7e-1982ea7774e6` |

These are to be published as `review_record_id_sha256` (a digest label), not `uuid`.
Historical evidence is not rewritten; this is a new provenance note.

## EX gate readiness (no inference)

Gate interface OK (`Config`/`Worker`/`parse_vllm_metrics`); lock
`/run/user/1000/openviking-agent.lock` present; scheduler `:8001` idle (running=0,
waiting=0); the active `opencode` harness is present, so admission is post-exit only.

**Next:** arm the bounded exactly-once post-exit four-arm launcher, exit the TUI, then
reconcile terminal evidence and score (commit 2 of 2). No PR/merge/production activation.
