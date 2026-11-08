# Issue #81 semantic-first recall — invariants, diagnostics, and findings

Evidence class: **shadow-replay-not-native-hook** (fresh read-only Graphiti snapshot). NOT native-session acceptance, NOT native hook p95.

## Verified invariants (source + host)

| # | Invariant | Result | Evidence |
|---|-----------|--------|----------|
| 1 | Issue #78 wrapper activates semantic recall by default | PASS | `docs/issue-78/v2-candidate/plugin.mjs`: `recallPolicy: options.recallPolicy === 'strict' ? 'strict' : 'semantic'` |
| 2 | Explicit strict mode retains the original selector as a control | PASS | `memory-core.mjs`: semantic policy imported only when `recallPolicy==='semantic'`; strict path keeps `shortlistQualifiedCandidates` |
| 3 | Issue #75 standalone behavior remains compatible | PASS | `docs/issue-75/v2-candidate/plugin.mjs`: defaults `strict` (`x.recallPolicy === 'semantic' ? 'semantic' : 'strict'`) |
| 4 | Native Graphiti search depth remains 24 | PASS | `memory-core.mjs` `const maxFacts = 24`; replay reports `search_depth: 24` |
| 5 | Selected source references resolve correctly | PASS | native candidates require `byRemote` journal/resolver source; curated rows require exact group + evidence class + `opencode:` source prefix |
| 6 | Legacy user-source anchors remain accepted | PASS | source prefix fence accepts `opencode:*:user:*`; test "legacy user-decision provenance remains eligible" green |
| 7 | Wrong-group, unpersisted or unsourced observations remain excluded | PASS | `fact.group_id !== this.group` skip; no-source skip; scopedRows require persisted exact-group rows |
| 8 | Curated index candidates require fresh remote episode membership | PASS | `indexedCandidates = possibleIndex.filter(r => remoteEpisodes.has(r.remoteEpisodeUuid))` |
| 9 | Source excerpts never enter model-facing context | PASS | strict path strips `sourceContext` before budgeting; semantic `publicFact` carries only fact/source/evidenceClass/temporal/validAt/invalidAt |
| 10 | Issue numbers & lexical overlap influence ranking without universal veto | PASS | `identitySignal` absence penalty is soft (-0.25); top native hit stays eligible with zero lexical overlap |
| 11 | Historical/superseded/uncertain observations keep evidence labels | PASS | `temporal` set from `invalid_at` (`historical/superseded`); S06 replay top fact carries `temporal: historical/superseded` |
| 12 | Selection deduplicates and respects context size | PASS | exact-normalized + Jaccard≥0.8 near-dup suppression; `maxChars` budget; `maxSelected≤5` |
| 13 | Optional reranking is not an absolute admission gate | PASS | rerank score capped at `*1.25`, one term of a summed score; reranker failure is caught and ignored |
| 14 | Native prompt/context hooks keep 300 ms allowance + user-message identity | PASS | `plugin.mjs` `Promise.race([selected.request, 300ms])`; `requestForContext` matches native user ID / exact text |

## Shadow-replay strict-vs-semantic comparison (fingerprint-only)

| Case | Role | strict count | semantic count | top fact identical | Notes |
|------|------|-------------:|---------------:|:------------------:|-------|
| S08 | FalkorDB persistence target | 1 | 4 | yes | semantic recovers the same top fact (source matches roster S08 expected source_ref digest `4ccddc4e…`) and adds 3 related observations |
| S07 | curator-service historical | 1 | 4 | yes | same top `tool-reported` fact; semantic adds 3 related observations |
| N01 | unrelated negative | 0 | 1 | n/a | semantic presents ONE unrelated `tool-reported` observation (no-anchor cap=1); presented as observation, not authority — bounded false-context cost |
| S06 | historical-superseded | 1 | 3 | yes | top fact from roster S06 expected source_ref digest `cf0a9e8e…`, `temporal: historical/superseded` preserved |
| N02 | legacy/wrong-group control | 1 | 3 | yes | all facts remain within `development-knowledge`; no cross-group leak |
| N03 | secret control | 0 | 0 | n/a | `sk-…` key trips the pre-Graphiti `PRIVATE` fence in BOTH modes (verified by direct `safeText` probe); zero facts, sub-ms elapsed |

## Unresolved findings / potential false-context costs

- **N01 false-context cost (semantic mode only):** an unrelated question ("weather in Tokyo") surfaced one `tool-reported` observation that strict mode correctly suppressed. The no-lexical-anchor cap bounds this to a single observation, and the observation is labelled as non-authority. Recorded as a prospective recall-utility tradeoff, not a contract defect; Central owns any threshold/policy decision.
- **Empty development-knowledge journal at preflight (0 files):** native fact sources resolve via the curated `sourcedEpisodeResolver`/index rather than the legacy journal. This is current host state, not a candidate defect; the candidate handles both paths.
- **S07 source drift:** the selected top source digest does not equal the frozen roster S07 expected source_ref digest; consistent with previously recorded corpus drift (the frozen 2026-11-06 roster predates current curation state). Not a policy error; the strict and semantic modes select the identical top fact.
- **N02 retained historical label:** N02 remains a same-group content-policy miss (historical `FAIL_INJECTED`), independently classified; no cross-group/secret leakage observed.

## Privacy & provenance

- Packet publishes SHA-256 fingerprints of fact assertions and source references only; no raw private facts, UUID-to-person mappings, transcripts, credentials or unredacted local data.
- Frozen roster digest `47e141bd…` re-authenticated host-side; roster body kept private on host.
- No Graphiti write, curation drain, model inference, service restart, or OpenCode mutation occurred.

## Proposed source repairs

- **None.** No mechanical or semantic source defect found in this campaign; the staged candidate is returned unmodified. `UNCOMMITTED_SOURCE_CHANGES=none`.
