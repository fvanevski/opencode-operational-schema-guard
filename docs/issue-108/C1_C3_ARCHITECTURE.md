# Issue #108: paired read-only recall measurement, source authority, and conditional C2/C3 decision

**Source authority at design:** `main@d928166fc0fa586a2dc905e7db3c64e44b0dddd1` (tree `bb69a8235c58d2b003ca7ad49cb3add7c2dbc6bb`), after #106 and #107 closure. This is a **pre-measurement C1/C3 diagnostic artifact**, not a claim of optimized recall, complete host proof, or installed source equivalence.

## Architecture: keep reach until measured

- #106 changed prompt coverage, original tool-output fragment offsets, and native origin isolation. Freeze facts against actual original prompt/tool events, not against model recollections or old session-wide clusters.
- #107 retains one-pass autonomous curation and provisional utility, added bounded source-owned format-sibling reconsideration and locally recognized source-distinct corroboration. A corroboration link is **not another persisted/remote-proven Graphiti episode**. A deferred sibling is not injectible until its own independently verified terminal episode/index exists. Neither is counted as a recall hit in C1.
- `Memory.search` obtains up to 24 native Graphiti facts and resolves source from legacy journal and/or indexed ReviewStore; optional indexed lookup is independent. The native Graphiti fact route and the legacy source resolver are overlapping, not interchangeable. Curated ReviewStore and `_episode-index/<uuid>.json` are **candidate identity**, never live remote membership authority.
- Curated query lookup scans at most 4096 indexed episodes and uses strict/semantic shortlist and exact source resolver. `get_episodes(group_ids=[group],max_episodes=1000)` is authoritative for curated positive group UUID membership only when nonfull and valid; 1000 is nonauthorizing. Both bounds are explicit availability risks, not invitations for cached-positive shortcuts.
- Default model presentation remains <=5 facts, <=1400 characters. The native `context` hook's historical 300-ms acceptance window is separate from direct `Memory.search` latency. A real shared-service provider-bound request and callback entry/exit timestamps, not this runner, are required for C4 acceptance. OpenViking remains distinct.

## Frozen source-scored comparator

`paired-recall.mjs` invokes **the real source modules** through the public `Memory.search` API in strict versus semantic configurations, alternated across cases/rounds, in a read-only diagnostic process. It never calls Graphiti mutators, edits journal/index/review state, changes plugin/config, or holds an EX drain. Run only while ordinary host scheduler/lease and native permissions admit its read-only calls. The script rejects out-of-scope group queries and records bounded per-call `search_memory_facts` / `get_episodes` evidence plus index/resolver/journal counts.

Prepare one **private** JSON freeze *before any candidate results*, schema `ghdev-108-freeze-v1`:

```json
{
  "schema": "ghdev-108-freeze-v1",
  "group": "development-knowledge",
  "workspace": "/absolute/authenticated/workspace",
  "project": "authenticated-project-name",
  "source_adjudication": "Independent original-native-source scoring method and frozen timestamp",
  "cases": [
    {
      "id": "query-01",
      "cohort": "paraphrase",
      "query": "What happened to the earlier negative constraint?",
      "expected": [{"id":"fact-01","source":"opencode:...:user:...","fact":"An exact observed original-source-supported fact."}],
      "forbidden": []
    }
  ]
}
```

This illustrative source placeholder is not accepted truth. Actual case facts must be full exact source-qualified `source` + `fact` strings, never fabricated. 6–12 cases where available: source-exact, paraphrase, temporal, related defect, ambiguous-source, off-topic, and negative controls; explicitly disclose #101/previously exposed controls, and use prospective cases frozen in advance. Preserve the full private freeze with SHA-256. The report outputs only case IDs, fact IDs, hashes, stage coverage flags and aggregate counts, not original queries, excerpts, source handles or complete facts. It treats unknown selected items as **unadjudicated**, not automatically false-positive or authorized.

Run with an authenticated exact candidate source branch after first verifying its full SHA and staging a private root using collision-safe `mkdir` (not `rm -rf`). Example (substitute authenticated actual paths, do not use the example as host truth):

```bash
node docs/issue-108/paired-recall.mjs \
  --freeze "$PRIVATE_ROOT/freeze.json" --out "$PRIVATE_ROOT/paired-report.json" \
  --journal-dir "$AUTHENTICATED_LEGACY_JOURNAL_ROOT" \
  --review-root "$AUTHENTICATED_CURATOR_REVIEW_ROOT" \
  --graphiti-endpoint http://127.0.0.1:8766/mcp \
  --source-revision "$EXACT_CANDIDATE_SHA" --rounds 2
```

`source-revision` is a metadata claim and **does not itself attest Git state or installed process bytes**. Independently prove remote/local exact commit and actual selected local files/host source/config. The comparator's `search_ms` p50/p95, RPC decoded JSON chars, journal page counts, resolver/curated counts and reported stage flags are not actual callback latency, bytes transferred on the wire, real disk reads, model answer quality, or a complete omission root-cause trace. A missing stage flag can result from source/semantic normalization, timing, or unavailable local positive proof; preserve `not_determined` when the exact loss cannot be established. Explicitly report any excluded or incomplete measurement instead of filling numbers.

## C2 / C3 decision from evidence, not speculation

- Present paired relevant-fact reach **per original source**, route overlap, stagewise omitted facts, unique legacy/native/curated contributions, abstentions, temporal/provisional/retired controls, negative technical constraints, and whether differences are stable across repetitions. When one mechanism has distinct reach, retain it; no subjective cleanup. If current strict/semantic components all justify unique benefit, the issue explicitly accepts supported no-change.
- Before any replacement of ranking, make a small Central-reviewed candidate on **this same branch**, carry forward one indexed+legacy proof path, regress paraphrases/issue identity/wrong-group/private/source spoof/retired and full-list boundaries, and benchmark it against the frozen cases. Local Build may supply diagnostic traces and narrow harness adapters but must not independently choose a production algorithm or weaken source authority.
- Profile 512, ~4096, and >4096 durable indexed/review records using independently bounded *disposable* fixtures or non-mutating actual readbacks. Disclose true page-cache state, actual filesystem read operations/bytes where available, and avoid claiming OS-cold from ordinary repeated requests. Check live Graphiti `tools/list`/public schema for a targeted **read-only** same-group episode lookup; only a separately validated full UUID/group/name/terminal proof can replace a list, never a cached local index or experimental mutator.
- End this first campaign with the C1–C3 source-linked diagnostic packet and a precise `KEEP|SIMPLIFY|REPLACE|RETIRE|CONDITIONAL` recommendation. C4 final deployment/fresh shared service+client native session, post-exit EX capture→curation→terminal index, on-hook p95 and same-provider-request dual memory evidence occur **after final source review/merge/current-main verification**, under a separate phase and parent #105 gate.

## Validation and disclosure

Trusted CI import of `paired-recall.test.mjs` is a pure deterministic contract check. It does not validate the live Graphiti backend. Reuse #101/#106/#107 tests for unchanged privacy/index/EX/retention controls; no broad campaign to revalidate the whole operational-schema V2 plugin. Never publish raw provider bodies, native prompts/tool output, local secrets, or original private adjudication source on GitHub. A sanitized digest-verified archive with source/version/actual command exits plus explicit omissions is the local-agent deliverable.
