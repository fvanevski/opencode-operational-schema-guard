# Issue #92 — S1 configurable recall-first scaffold qualification

**Status:** Central implementation is staged on `work/91-memory-utility-r1`; source and tests NOT yet native-host qualified. This is a scaffold integration milestone, not prospective acceptance and not a duplicate-suppression optimization campaign.

**Authority:** Issue #92; approved `docs/issue-91/ADR-91-2026-11-09-GRAPHITI-OPENVIKING-MEMORY-ARCHITECTURE.md`; most recent B3 blocker evidence `docs/issue-91/evidence/92-b3-specificity/` @ `4a2a0dcafb685ced1508bace2ad5697ac42870b3`; recall correction `docs/issue-91/adr-acceptance/ISSUE92_RECALL_FIRST_POLICY_AND_FROZEN_RECOVERY.md`.

**Source changes:** `finite-batch-tuning.mjs` (new), `finite-batch.mjs`, `curator-cli.mjs`, `model.mjs`, their focused regression tests. The original deterministic source validator, capture admission, ReviewStore, Graphiti persistence/UUID and existing normal installed curator remain unchanged. `model-policy.mjs` retains the conservative installed-global profile budget. The higher 4096 completion-token ceiling is explicit development-stage tuning only; default remains 1600.

## Priorities and acceptance boundary

Establish a usable **source-grounded, finite-batch, recall-first** development-memory scaffold with adjustable inference controls and inspectable outcomes, before selecting optimal prompt wording or a duplicate yield target.

1. **Must preserve:** native source refs, workspace/group/project and evidence class, source-offset bounds, privacy exclusions, temporal uncertainty, per-fact ReviewStore/CAS/UUID/source index, EX post-exit and ambiguous-submission no-replay.
2. **Soft quality decisions:** exact semantic-family equivalence, redundancy and novelty are not automatic vetoes under the default `--novelty-policy recall`. The older `conservative` policy remains for explicit historical experiments. A bounded amount of repetition is an expected, measured tradeoff; do not invent a retrospective 0-duplicate threshold.
3. **Tuning control:** optional private JSON file schema `issue92-finite-batch-tuning-v1` offers per-stage `model`, `reasoning_effort` (`off/low/medium/high/xhigh`), `temperature` (0–1), `max_tokens` (256–4096), `timeout_ms` (1000–180000), and additive `prompt_guidance` (≤1600 characters). Stages: `discovery`, `utility`, `arbitration`, `specificity`; the last two execute only under explicit `conservative` novelty policy. Defaults use the existing `LOCAL_CURATOR_MODEL` and `modelPolicy`. The thinking `reasoning_effort` override is allowed only on supported `chat-review/chat-audit` aliases; actual local model alias support must be verified against the current serving environment, not assumed.
4. **Input identity:** a versioned profile hash is persisted with the active batch and frozen plan, while stage-specific model request and prompt SHA-256 bind every pre-call intent and completed response. Changing model/parameters/prompt must never silently consume an old response or reissue an ambiguous call. No credentials or raw private prompts appear in the sanitized evidence.
5. **Inspection:** `validate-tuning --tuning-file /ABS/FILE.json` validates the profile without inference and prints only configuration metadata and prompt hashes. Run `drain --finite-batch on [--novelty-policy recall] [--tuning-file /ABS/FILE.json]` only inside the canonical admitted EX wrapper. `--replay-only on` makes any attempt to begin an unrecorded model call fail closed and is mandatory when reusing the frozen B3 evidence. Completed results expose per-stage call counts, token categories, reported-field counts and measured latency where the backend supplied them; missing values are not evidence of zero use.
6. **Sample profile:** `docs/issue-91/adr-acceptance/issue92-finite-batch-tuning-example.json` is an EXAMPLE and must NOT be automatically installed or injected into a historical batch. It selects `chat-fast` for discovery and `chat-review` medium effort for utility; test support for the review alias first. The sample prompt text is advisory: deterministic authority remains in code.

## One consolidated local Build execution

### A. CPU: exact Git authority and native tests

Fetch `work/91-memory-utility-r1`, authenticate the kickoff-required full commit SHA and current blob IDs. Read Issue #92, ADR, applicable AGENTS.md/GHDEV references, B3 evidence/typed blocker, existing recall-first recovery contract, and this document. Confirm no unrelated source/production changes. Run, preserving original producer exits:

```bash
node --check docs/issue-78/v2-curator/finite-batch-tuning.mjs
node --check docs/issue-78/v2-curator/finite-batch.mjs
node --check docs/issue-78/v2-curator/model.mjs
node --check docs/issue-78/v2-curator/curator-cli.mjs
node --check docs/issue-78/v2-curator/finite-batch-tuning.test.mjs
node --check docs/issue-78/v2-curator/finite-batch.test.mjs
node --test docs/issue-78/v2-curator/finite-batch-tuning.test.mjs
node --test docs/issue-78/v2-curator/finite-batch.test.mjs
node --test docs/issue-78/v2-curator/fact-review.test.mjs
node --test docs/issue-78/v2-curator/curator.test.mjs
node --test docs/issue-78/v2-curator/issue92-source-fact.test.mjs
node --test docs/issue-91/adr-acceptance/adr-causal-audit.test.mjs
npm run check
npm test
node docs/issue-78/v2-curator/curator-cli.mjs validate-tuning --tuning-file \
  "$(pwd)/docs/issue-91/adr-acceptance/issue92-finite-batch-tuning-example.json"
```

The root `npm test` does NOT run all focused curator tests. Central performed isolated V8 parsing and pure-function smoke checks, not native Node tests. Mechanical host/fixture repair is permitted, semantic source rewrites, weakened tests, source-validator changes and new broad campaigns are not. If an actual source defect blocks correct behavior, return precise code/test evidence.

### B. CPU: historical B3 frozen response preflight

Inspect, READ-ONLY, the original disposable B3 specificity root and Graphiti group (no deletion or replacement): active snapshot, authenticated source refs from the original 24 eligible sources, model responses, call-intents, SHA-256 values, optional prior `plan.json`, ReviewStore/Graphiti terminal state and original policies. The last B3 handback reported **48/48 complete model intents/results, 0 original specificity-arm episodes and no plan**. This is historical evidence, not a guarantee the private files still exist or remained unchanged. Original prospective `freeze.json` bytes were lost earlier: report `ORIGINAL_FREEZE_BYTES_UNAVAILABLE` and independently verify recovered native source identity from B2/B3, not by asserting the historical SHA-256 over a reconstructed file.

If all conditions authenticate and B3 specificity group remains empty, use the same exact original B3 group/root/source/model endpoint and `chat-fast` default parameters, with no tuning file, under `--finite-batch on --novelty-policy recall --replay-only on`. The original frozen discovery and utility responses may be reused; obsolete arbitration/specificity responses are kept as forensic evidence, not promotion gates. No new inference, no rearming original B3 launcher marker and no model-call deletion. Use a *new* once-only host recovery marker under the existing EX admission protocol. Abort on missing/altered source, prompt, model or call result.

If B3 private data cannot authenticate, do **not** manufacture a matching freeze or repeatedly retry it. Continue with the bounded fresh scaffold smoke in Phase C rather than losing the entire assignment.

### C. One bounded fresh tuning smoke, within the same accepted EX admission

Prepare a fresh disposable group/root using **2–4** independently attributable native source examples already exposed in B1/B2/B3, including at least one previously missed specific Graphiti contract/constraint and one ordinary durable technical finding. This is functional scaffold qualification, not a new statistical sample or a separate acceptance cohort. Choose the examples and commit their source-ref identities to the sanitized preflight ledger **before** launching any model. Existing nonvaluable/secret privacy controls remain excluded.

Preflight whether current local OpenAI-compatible model-serving exposes `chat-review` and the requested `reasoning_effort`. If supported, run the example tuning profile once. If not, use **one clearly recorded supported fallback profile** (chat-fast with stage-specific prompt guidance and temperatures within bounds); do not attempt the unsupported profile first and then silently retry it. No multiple temperature/effort/prompt sweeps and no handoff fragmentation.

Both Phase B replay-only recovery (if eligible) and Phase C smoke belong to a single properly admitted EX window where practical: real interactive harness exit; quiet grace; eligible process classification; scheduler idle; production-drain serialization; canonical flock held through model/Graphiti terminal readback. No model or Graphiti write inside the interactive OpenCode session. Canonical `GHDEV_MEMORY_POST_EXIT_LEASE=admitted` env token alone is not admission. Use fresh batch markers and preserve all 0700/0600 private snapshots, call intents/results, model parameters/hashes, plans and receipts. No replay of ambiguous inference or Graphiti writes.

### D. Evidence and final disposition

Independently score **the recovered frozen B3 population** (if available) against the 16 historically valuable/11 nonvaluable source targets. Record valuable supported facts, duplicates and boilerplate, first-loss stages and original source status without changing the frozen labels. A duplicate is not a hard B3/S1 FAIL unless it demonstrably crowds out or misattributes useful knowledge.

For the separate tiny tuned smoke, report **functional scaffold behavior** rather than invented precision/retention statistics: stage settings actually sent, reasoning alias/effort accepted or unsupported, prompt SHA/profile identity, provider-reported reasoning/cached tokens if available, operator-guidance effect, positive sourced Graphiti readback and no-replay. Do not infer meaningful model-quality percentage from 2–4 sources.

Verify every terminal episode by ReviewStore remote UUID, episode-index/source reference, Graphiti MCP `get_episodes` with `group_ids` ARRAY and adequate `max_episodes`, and raw FalkorDB `Episodic` UUID/content. Graphiti `Source` nodes were absent historically; do not invent them. Source privacy/temporal/workspace/group invariance, production and historical group nonmutation (account for independently active production drains), EX and exact-head evidence readback are mandatory.

Return `ISSUE92_S1_SCAFFOLD_RESULT=FUNCTIONAL_SCAFFOLD|REMEDIATION_REQUIRED|BLOCKED`:
- `FUNCTIONAL_SCAFFOLD` means native gates, configurable model/prompt controls, response and policy identity, inferred-or-frozen Graphiti write/readback and hard source safety work end-to-end. It **does NOT** mean the >=85% later prospective utility objective, zero duplicates, retrieval usefulness or production readiness.
- `REMEDIATION_REQUIRED` means a concrete scaffold-function or attribution defect persists, not simply imperfect semantic precision.
- `BLOCKED` means native source, authentication, EX or remote ambiguity prevents a valid result.

Publish **one** sanitized evidence-only commit under `docs/issue-91/evidence/92-s1-recall-scaffold/` on the existing branch by exact-head non-force CAS and independent remote ref/commit/blob readback. Include versioned tuning schema, stage model/profile fingerprint and reported performance (no raw prompts/replies, credentials, private host paths or personal source text), original cohort validity, terminal UUID proof, source-supported vs duplicate yield, blockers and full GHDEV `COMMAND_SHAPE_FRICTION`. No PR/merge/issue close/production activation, new untouched prospective holdout, new backend, daemon, model serving reconfiguration, or repeated tuning sweeps.

**Next engineering slice, only after S1 functional proof:** incremental refinements to discovery and utility prompts for g1–g4/sp1 high-recall false negatives, plus later read/retrieval evaluation. No new novelty hard-veto campaign.
