# Issue #81 — Corrective Evidence Packet v2

**Campaign:** `ISSUE81_CORRECTIVE_EVIDENCE_V1`
**Mode:** READ_ONLY_HOST_DIAGNOSTICS_PLUS_EVIDENCE_PUBLICATION
**Repo:** `fvanevski/opencode-operational-schema-guard` · branch `issue/81-recall-acceptance`
**Supersedes (additively):** `docs/issue-78/evidence/81-native-source-audit-v1` (S13 source-index
conclusion only — see `s13-index-erratum.md`; the v1 packet is unchanged)

## Purpose

Complete the remaining evidence for Central to decide whether Issue #81 requires a bounded
production retrieval correction: (1) an authenticated S13 source-index erratum, (2) current
read-only Graphiti search results for the nine frozen target cases, (3) a source-backed
reconstruction of candidate admission and selection, (4) an explicit split of demonstrated
defects vs semantic-search limitations vs evaluation-policy concerns vs evidence gaps, and
(5) a bounded correction recommendation. **No production change is implemented.**

## Headline results

- **S13 index erratum:** the prior "missing source index" was a helper artifact (bare-UUID
  membership tested against suffixed filenames, `build-recall-diagnostics.py` lines 43/115).
  All six index/resolver predicates now **PASS**; `MISSING_SOURCE_INDEX_RULED_OUT = yes`.
  S13's no-injection is instead explained by a retrieval miss (expected episode absent from
  the current top-12) plus the lexical floor (all 11 admitted candidates rejected).
- **Nine-case bounded read-only probes** (`search_memory_facts`, `group_ids =
  ["development-knowledge"]`, `max_facts = 12`, no LLM, no new OpenCode sessions): all nine
  succeeded first attempt (12 facts each).
- **Replay with the installed production logic** (`memory-core.mjs` join + `sourcedEpisodeResolver`
  + `relevanceFilter`, `ranker = null`): the current selection **reproduces the historical
  frozen injection source for all seven wrong-source cases and N02**; S13 reproduces the MISS.
- **Demonstrated defects:** relevance/ranking layer only —
  `S06` priority over-match (bare `then`), `S01/S03/S04` named-term literal fence, `S13`
  lexical-floor abstention, `S10` index-order tie-break. **No retrieval-code defect is
  demonstrated** (five cases show a plain semantic-search top-12 miss, an embedding property).
- **Source misbindings confirmed: 0.** All selected sources are persisted
  `development-knowledge` curated records with permitted evidence classes.
- **N02:** the injected fact is stored **under** `development-knowledge` and is *about* the
  legacy `ghdev_gh_mcp` group — a fact ABOUT a historical group, not a fact RETRIEVED FROM the
  legacy group; no cross-group leak demonstrated. The frozen expectation is overbroad
  (disallows useful same-group historical-topic recall). Frozen control unmodified.
- **Recommendation:** `RELEVANCE_OR_RANKING_FIX_RECOMMENDED` (primary;
  `relevance.mjs`), with `EVALUATION_DESIGN_REVIEW_RECOMMENDED` as a secondary,
  non-blocking evaluation-policy item. Frozen 8/16 FAIL, 13/16 threshold and human precision
  `UNVERIFIED` are preserved.

## Files

| File | Content |
| --- | --- |
| `README.md` | This overview |
| `input-identities.json` | All pinned identities: remote refs, prior-packet manifest digest, frozen input digests, installed-source digests (vs `b39e1ff7`), production observation identity, raw-capture digest, helper digests |
| `s13-index-erratum.md` | Additive erratum: original claim, defective comparison, corrected test, actual result, implications |
| `s13-index-readback.json` | File/JSON/record/resolver predicates with evidence |
| `current-graphiti-search-results.json` | Nine-case probe metadata + sanitized fact/episode summaries (redaction: `garion` → `<host>`; every excerpt bound to the private raw capture by `raw_fact_sha256`) |
| `source-admission-traces.json` | Episode→source admission: legacy journal (empty), curated resolver admissions, per-fact first-resolvable episode |
| `relevance-decision-traces.json` | Per-candidate filter/rank decisions (signals, eligibility, final selection, budget) with the deterministic `ranker = null` note |
| `nine-case-diagnostics.json` | Per-case matrix: frozen verdict, expected/historical/current identities, outcomes, classifications, inference-strength labels |
| `central-correction-disposition.md` | The bounded recommendation, minimal surface, regression design, secondary evaluation-policy item |
| `reproducibility.md` | Exact commands, helper identities, service identity, snapshot state, observational limitations |
| `command-shape-friction.json` | Command-shape friction ledger for this campaign |
| `helpers/` | The two diagnostic helpers that were executed (`trace-recall.mjs`, `run-resolver.mjs`) |
| `SHA256-MANIFEST.txt` | Non-circular SHA-256 manifest of every exported regular file |

## Sanitization policy

- Published: fact **excerpts** (bounded, redacted only for the host name `garion` → `<host>`),
  fact/episode/node IDs, scores/signals, source refs (OpenCode session/message IDs, already
  published in the v1 packet), digests, and non-secret host paths (installed-plugin and
  state directories) where necessary for provenance.
- Never published: credentials, bearer tokens, private keys, credential-bearing DSNs, private
  environment values, full source transcripts, unrelated local user data, private model
  reasoning.
- The **complete raw MCP responses** live in the private scratch root
  `/tmp/opencode/issue81-corrective-evidence/private/raw/graphiti-probes-raw.json`
  (SHA-256 in `input-identities.json`); each published excerpt carries
  `raw_fact_sha256` for binding.
- Claims that cannot be publicly reproduced after redaction (e.g. the exact historical
  injected fact **text** for the seven wrong-source cases, recoverable only from the private
  litellm trace) are marked **`PRIVATE_EVIDENCE_REQUIRED`** and are not described as
  GitHub-reproducible.

## Boundaries honored

No Graphiti mutations, no curation-queue mutations, no service/config changes, no new native
OpenCode sessions, no LLM answering of the prompts, no full acceptance rerun, no model-inference
experiments, no frozen-benchmark edits, no source/test/config changes, no PR/merge/issue
closure, no force push. One evidence-only commit on top of `e94356e6bd041f44ff13aabdc65485b10f493bf0`.
