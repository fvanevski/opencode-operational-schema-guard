# Issue #75 — Retrieval & Reranker Evidence Publication (2026-11-01)

Evidence-only publication for Issue #75 (relevance retrieval/reranker). This commit
delivers inspectable raw scores and query-to-fact results so Central can design the
remaining relevance correction. No source/implementation changes are included.

## Source identity

- Source HEAD at publication: `8858bebb603f0bbdccfb2cd34acc9ec6f5c1096a`
- Repository: `fvanevski/opencode-operational-schema-guard`, branch `issue/75`
- Publication type: evidence-only commit (no source mutations)

## Original host artifacts (authenticated SHA256)

| File | Original location | SHA256 | Status |
| --- | --- | --- | --- |
| `plugin-behavior.test.mjs` | `/tmp/ghdev-issue75.BuzBwKeu/worktree/docs/issue-75/v2-candidate/` | `295bb0c5dbf45ad84a4f83f9c3c4c0cd3a8504f4261640f2ef5a576f5b6d8def` | Copied into `v2-candidate/` (byte-identical) |
| `extraction-profile.md` | `/tmp/ghdev-issue75.BuzBwKeu/worktree/docs/issue-75/v2-candidate/` | `cf9a09969eac8c698b0bce707ea7fff06484f227c1e8a1ccc88fc6332cec3865` | Copied into `v2-candidate/` (byte-identical) |
| `final-diff.binary` | `/tmp/opencode/issue75-evidence/final-diff.binary` | `39c2e54c1206634910362c187ffb8e2736707ba986c56195fb2d533d8aa3b338` | Previously reviewed; intentionally NOT committed |

Originals were left untouched; only the two verified files were copied.

## Group / journal / service identity

- Disposable group: `g_issue75_test` (read-only; no `add_memory`, no graph mutation)
- Journal: `/tmp/opencode/issue75-b75/state-b75/g_issue75_test` (local, private; not published)
  - 3 persisted episodes with remote Graphiti episode UUIDs:
    `6d4dd8b3-ee68-405d-9fb9-c5a4bc880b1b`, `896e0fe4-5f48-4a6d-9b48-da558f3fa922`,
    `95c0c4b4-8527-4f80-a67d-3e52ac6ec801`
- Graphiti: loopback MCP endpoint `http://127.0.0.1:8766/mcp` (graphiti-core; exact
  library version not exposed by the MCP initialize probe)
- Reranker: independent CPU reranker, `jinaai/jina-reranker-v1-turbo-en` via
  in-process ONNX at `http://127.0.0.1:8004/v1/rerank` (health: ok); embedding
  backend TEI with `Qwen/Qwen3-Embedding-0.6B`
- Collector: `docs/issue-75/v2-candidate/collect-relevance-evidence.mjs`
  (centrally staged, read-only; calls only `search_memory_facts`, local journal
  reads, and loopback reranker HTTP)

## Collector run

- Command: `node docs/issue-75/v2-candidate/collect-relevance-evidence.mjs --group g_issue75_test --state-dir /tmp/opencode/issue75-b75/state-b75 --graphiti-endpoint http://127.0.0.1:8766/mcp --rerank-endpoint http://127.0.0.1:8004/v1/rerank --output /tmp/opencode/issue75-rerank-evidence-20261101-01.json --holdout-file /tmp/opencode/issue75-b75/holdout-cases.json`
- Exit code: 0
- Cases: 12 (7 frozen + 5 holdout); 0 graphiti_search errors; 0 rerank errors; 0 collector redactions
- Output schema: `ghdev.issue75.reranker-observation.v1`

## Case outcomes (raw rerank top-1 per case; scores are raw, NOT probabilities)

| Case | Set | Expected | Top-1 fact | Top-1 score | Verdict |
| --- | --- | --- | --- | --- | --- |
| direct | frozen | f1 | f1 (React Flow) | 0.5976 | OK |
| paraphrase | frozen | f1 | f3 (Tkinter) | 0.0914 | MISS (f1 at 0.0687, rank 2) |
| dependency | frozen | f2 | f2 (quality gate) | 0.2116 | OK |
| historical | frozen | f3 | f3 (Tkinter) | 0.5196 | OK (f1 close at 0.5119) |
| multi | frozen | f2 | f2 (quality gate) | 0.2524 | OK |
| irrelevant | frozen | — | f3 | 0.0208 | OK (all scores ~0.01–0.02) |
| wrong-group | frozen | — | f3 | 0.1290 | OK (no cross-group fact returned) |
| h1_paraphrase_f1 | holdout | f1 | f1 | 0.6536 | OK |
| h2_dep_f2 | holdout | f2 | f2 | 0.3754 | OK |
| h3_hist_f3 | holdout | f3 | f3 | 0.2793 | OK |
| h4_irrelevant | holdout | — | f3 | 0.0255 | OK (low scores) |
| h5_crossgroup | holdout | — | f3 | 0.0555 | OK (low scores) |

Notable defect for Central: the frozen `paraphrase` case is the only top-1 miss —
the semantic paraphrase "interactive issue map" ranks the Tkinter historical fact
above the React Flow decision fact, with a small margin (0.0914 vs 0.0687).

## Prior frozen results (recovered, sanitized)

Recovered from the named prior evidence roots and published as sanitized originals:

- `20261101-old-baseline-results.json` — first-campaign heuristic lexical baseline
  (7 frozen cases), source `/tmp/opencode/issue75-evidence/baseline-results.json`
- `20261101-old-candidate-results.json` — first-campaign native Graphiti candidate
  results with raw facts (7 frozen cases), source
  `/tmp/opencode/issue75-evidence/candidate-results.json` (1 field redacted:
  `state_dir` local path)
- `20261101-old-benchmark-evaluation.json` — first-campaign aggregate P/R
  (baseline P 0.40 / R 0.80; candidate P 0.25 / R 1.00), source
  `/tmp/opencode/issue75-evidence/benchmark-evaluation.json`
- `20261101-old-b75-bench-lexical.json` — second-handback live lexical-filter run
  over `g_issue75_test`, source `/tmp/opencode/issue75-b75/bench-lexical.json`
- `20261101-old-b75-bench-rerank.json` — second-handback live native+rerank run
  (all cases returned 0 facts: reranker path failed closed), source
  `/tmp/opencode/issue75-b75/bench-rerank.json`

## Holdout

- Status: RECOVERED. Original fixture at `/tmp/opencode/issue75-b75/holdout-cases.json`
  (5 unseen queries over the same frozen facts f1–f3 plus irrelevant and
  cross-group probes). Published as `20261101-holdout-queries.json` and executed
  by the collector (holdout = `supplied`).

## Privacy / sanitization

- Independent inspection of every publication artifact found no credentials,
  tokens, PII, private-source bodies, or unredacted local filesystem paths.
- Redaction count: 1 field total (`state_dir` in the published old candidate
  results copy → `<redacted-local-path>`); 0 in the new observation file.
- Scores, candidate orders, and errors are unmodified; no quality defects were
  concealed. Raw private copies remain on the host only.

## Local tests

- `node --check` on collector + 3 test files: OK
- `node --test plugin-behavior.test.mjs relevance.test.mjs memory-core.test.mjs`:
  15 tests, 15 pass, 0 fail (exit 0)

## Limitations

- Raw rerank scores are uncalibrated and are NOT probabilities or adjudicated
  relevance verdicts; fact-ID adjudication is separate.
- The second-handback `bench-rerank.json` all-empty result reflects that run's
  fail-closed reranker behavior and is preserved as historical evidence, not
  reinterpreted.
- No Qwen extraction, second scheduler, production group, or graph mutation was
  used; the run is strictly read-only over the disposable group.
- Graphiti exact library version not exposed by the probe; endpoint identity and
  reranker model identity are recorded instead.

## Staged file integrity (SHA256, computed at staging time)

- `evidence/20261101-reranker-observations.json`: `532dc4c367367bf764dc7cd0d88b7a63ebf9a81eb561f5a9b3e93c300e3c1f00`
- `evidence/20261101-old-b75-bench-lexical.json`: `667246076362fa8cb6a252a29f1c7293c9e1408b0cc926cd20593d63b106fc28`
- `evidence/20261101-old-b75-bench-rerank.json`: `92d36a9a9225ab89b11ddbfc07c5f5d7f8607fe4e9bc1f037882554aabdd5507`
- `evidence/20261101-old-baseline-results.json`: `b571f2ed16a176ed2dc683b294136a0fb44d62daef57c6308d0a9a9ed665f35d`
- `evidence/20261101-old-benchmark-evaluation.json`: `3a6aadfedc234250be842217b1d7919f6a2ec412e6778740c319a78c2afa9c60`
- `evidence/20261101-old-candidate-results.json`: `841b04f0de7483ef9a203ecd87fcc61aff70d8c105bf744d2de72c91fb99e4a8`
- `evidence/20261101-holdout-queries.json`: `ab1efb55e29d3ced05858fc26cfca8e56138d3ec755ee9ac3ee886495ee7f990`
- `v2-candidate/plugin-behavior.test.mjs`: `295bb0c5dbf45ad84a4f83f9c3c4c0cd3a8504f4261640f2ef5a576f5b6d8def`
- `v2-candidate/extraction-profile.md`: `cf9a09969eac8c698b0bce707ea7fff06484f227c1e8a1ccc88fc6332cec3865`
