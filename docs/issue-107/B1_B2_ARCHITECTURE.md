# #107 B1 + opt-in B2 protocol comparison (first cohesive slice)

**Authority:** issue [#107](https://github.com/fvanevski/opencode-operational-schema-guard/issues/107), parent #105, accepted #106 capture/source contract; base `main@5efc2c27f9c95da67dfd750f3bcb7877b7d380d5`. This is a **qualification candidate, not a live worker switch**.

## Root-cause map and chosen boundary

In the current autonomous worker, #106 source-origin grouping allocates each authenticated message/tool origin its own three-fact budget. One #100 model pass proposes up to three atomic facts; `validateAutonomousDecision` validates individual siblings and retains valid siblings. The durable source transition and fact-bundle save occur **after** that validation. The returned `blocked_candidates` entries contain reasons/indexes but not a durable resumable task for a potentially correctable discarded sibling. Creating a second review from the same source after the parent review would conflict with source ownership unless a targeted child-reconsideration plan were designed into that original durable identity. Do **not** implement a source reingestion or blind model retry to compensate.

Additional hypotheses: verbose format causes avoidable formatting retries; normalized-assertion duplicate checks might collapse distinct corroborating sources; two-per-drain consolidation might cost more than its actual later recall benefit. None of these is yet measured in native post-exit operation.

**First slice:** B1 frozen, source-adjudicated, paired local-model comparison + B2 opt-in compact prompt/adapter, fully centrally authored. Same authenticated cluster, same model/options, one pass per protocol, maximum 12 cases / 24 attempts; no automatic retry or Graphiti RPC, no queue state transition. The base protocol and deployed #100 worker remain unchanged. Do not declare a token saving or useful-fact uplift before host measurements.

## New pure code

- `protocol.mjs`: compact model proposal with exact `source`, `quote`, semantic `kind`/`temporal_status`, retention selection and `why`. Only `scope`, `evidence_class`, `observed_at` and original quote offsets are host-derived under the EXISTING strict #100 validator. No kind or temporal authority is guessed by the host.
- `qualification.mjs`: immutable in-memory snapshot of source-linked cases, human-frozen `useful` and `excluded` original quote labels (bounded/attested before calls), SHA-256 of full private freeze input, alternating paired protocol order, strict normalization/validation, model usage accounting and sanitized output. Returned reports never include source excerpts, model contents or secrets.
- `qualification.test.mjs`: deterministic permitted/no-admission, exact user-payload parity, strict bad-source/tool-fragment, useful/uncertain sibling, malformed-JSON, and nonmutation regressions.
- `qualify-cli.mjs`: direct Node model-only runner; the existing kernel-backed `ex_admitted_node_bridge.py` must provide the canonical flock. The CLI verifies `requireKernelExAdmission()` and never sets an EX marker. It reads a privately frozen `0600` JSON case array, invokes the installed `curateCluster` in the qualified one-pass interface, and creates a new `0600` redacted JSON report with `--cases /absolute/private/cases.json --out /absolute/private/report.json`. Only the live EX owner may call it, using the actual `LOCAL_CURATOR_URL` and `LOCAL_CURATOR_MODEL` values already authorized for that worker.
- Trusted curator test profile imports the new tests, so a normal PR CI run checks them.

## #106 and #99–#101 invariants

Native source identity and strength, same-origin span grouping, original tool-output per-fragment UTF-16 offsets, privacy/marker veto, source class/scope/temporal attribution, authenticated archive ownership, local ReviewStore source owner/revisions, EX admission, unknown-remote and UUID/index reconciliation are unchanged. Historical unsegmented tool receipts do not acquire invented original-output offsets. The compact adapter must never substitute a model normalized claim for an exact source quote or collapse multiple source refs.

## Required host evaluation

Under the **actual canonical post-exit EX lease** only, have an authorized Hermes supervisor use the same installed local model/endpoint/profile for both variants, and do not initiate an autonomous drain or Graphiti call. The qualified `curateCluster` callback itself enforces admitted EX; an environment marker without owning the canonical lease does not confer authorization.

Freeze 6–12 bounded source-linked cases **before** any model call. Reuse sanitized #106 observed source events where they can be re-read safely; supplement with independently selected mixed cases, tool fragment maps, established/provisional, invalid/missing metadata sibling, source-distinct corroboration, and negative skip cases. Disclose cases previously exposed to the model or Central. Never treat historical examples as untouched holdouts. If no current model/lease window exists, return `BLOCKED` with evidence, do not bypass gates or substitute a model.

Two prompts use **identical evidence payloads** with different system instructions. Capture separately: attempted/completed calls, provider-reported prompt/completion/reasoning tokens where actually exposed (no invented counts), output length, latency, validation reasons, accepted facts, established/provisional choices, pre-adjudicated useful-reference hits, unsupported/unadjudicated suggestions, malformed siblings, technical retry types, false-negative skips and source-distinct duplicates. Preserve raw source/model output only in private host custody. Do not publish raw memory or Graphiti retrievals.

Record read-only #99/#100 queue/review/archive + local/remote duplicate/consolidation baseline if available **without** triggering model/Graphiti mutations. For production state observe, do not alter the existing `ghdev-curator-prod.service` fail-closed EX retry posture.

## Decision at handback

Central compares source-link correctness and usable reference yield against cost and risk, deciding KEEP base protocol or promote a qualified compact variant into *future* #107 source code. If partial valid/invalid siblings are observed, return the exact sanitized local reproduction/identity and durable source owner, so Central can implement a bounded idempotent child retry within the **same issue branch/PR**. B3 duplicate/corroboration and B4 consolidation remain in issue #107; do not create separate PRs or fix speculative issues during model measurement.

No production deployment, GitHub approval, issue closure, Graphiti add_memory, remote replay, source-queue rewrite, or worker semantic edits are part of this first slice.
