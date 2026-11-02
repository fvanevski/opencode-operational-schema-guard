# Issue #75 — third-handoff new-holdout evidence (20261102)

Evidence-only publication per `docs/issue-75/HOST_HOLDOUT_PUBLICATION_CONTRACT.md`.
No source implementation change, no PR/merge, no production mutation, no new
GPU extraction or Graphiti ingestion in this task.

## Identities

- Start source SHA (local HEAD at kickoff and remote `refs/heads/issue/75`):
  `2a75e3fff963a90da35aaef254b679e2669b0fab` (verified by `git ls-remote` before
  commit).
- Old qualification worktree `/tmp/ghdev-issue75-final.c8xbg34c/worktree` HEAD:
  `371919ea54c20a853e7747e32bcc42fae3453a86`, left unmodified (tracked-only
  `git diff --binary` captured; untracked `__pycache__` excluded).
- Group: `g_issue75_test` (disposable). Services (nonsecret): Graphiti MCP
  streamable-HTTP at `http://127.0.0.1:8766/mcp` (MCP protocol 2025-06-18);
  independent CPU ONNX reranker at `http://127.0.0.1:8004/v1/rerank`
  (model `rerank`, uvicorn/loopback). No model or gate configuration changed.

## New 12-query holdout fixture

- Original file `/tmp/opencode/issue75-final-qual/new-holdout-queries.json`.
- SHA256 `67e2a72888d561b3503c6c36543f6fd9cff3713b97af937868c041258586e470`
  (matches the reported hash; verified before use).
- 12/12 questions present with original IDs `n1`–`n12`, original wording,
  group `g_issue75_test`, and expected labels (f1/f2/f3 expectations and empty
  expectations for n1, n2, n7–n10, n12) preserved. Published copy
  `20261102-new-holdout-queries.json` is byte-identical.

## Historical results (original = published, byte-identical copies)

| published file | original source | SHA256 |
| --- | --- | --- |
| `20261102-new-holdout-live.json` | `new-holdout-live-holdout.json` (raw live 12-case, 9/12 correct) | `73ffaae7f9a50a8378c80fb90afc67aa19938eda29df4c00413d2fbced645f34` |
| `20261102-frozen-live.json` | `frozen-live-results.json` (7 fixed cases) | `581e561aebe3eecdeb322b19d151f9a9129cff87e83af9d24678f2d78b4fc6f9` |
| `20261102-prior-holdout-live.json` | `frozen-live-results-holdout.json` (5 prior holdout) | `0b948a1ac32997daa905e9c7cda38917f28755778afa41fc02f7e412a8160ac4` |

Original scores, admitted IDs, timings, error fields, provenance and recorded
order are preserved unmodified. These historical observations predate the
fresh collection and are labeled independently; the fresh scores below are not
claimed to equal them.

## Fresh per-fact reranker observations (19 cases = 7 frozen + 12 new holdout)

Collected read-only via `docs/issue-75/v2-candidate/collect-relevance-evidence.mjs`
(after `node --check`) with `--group g_issue75_test`,
`--state-dir /tmp/opencode/issue75-b75/state-b75`,
`--graphiti-endpoint http://127.0.0.1:8766/mcp`,
`--rerank-endpoint http://127.0.0.1:8004/v1/rerank`, and the verified fixture.
Output `20261102-new-holdout-reranker-observations.json`
(SHA256 `06dc74f71d9480b85f2d481a08456e27933b43549465b8fcc402139ec5cc3caf`),
schema `ghdev.issue75.reranker-observation.v1`, captured
`2026-11-02T01:45:31.951Z`. This is a 19-case per-fact trace (old frozen seven
plus new twelve), not a new 19-query holdout.

Counters: 19 cases; 0 `graphiti_search` errors; 0 reranker errors; 0 redacted
facts; raw fact counts 0–3 per case (52 total); `journal_persisted_count` 3.
Measured p50/p95: search_ms p50 26.668 / p95 45.483; rerank_ms p50 11.451 /
p95 16.040. Per-case status is uniformly complete (no `error_class`, no
`rerank.error`). Scores/candidates/ordering/episode UUIDs/local source
identities are preserved verbatim.

## Eligibility, ranking and rejection for n2 / n5 / n6

Gate logic is the tracked `docs/issue-75/v2-candidate/relevance.mjs`
(`relevanceFilter`, `maxSelected` 1): a fact is eligible only if topical
(lexical overlap count ≥ 2), a qualified history match, or a qualified choice
match (decision intent + decision fact + rerank score + ≥ 2 topic terms);
choice-only candidates additionally need `score > 2 × background` where
background is the max rerank score of non-decision, non-history facts. Named
mid-query terms (e.g. "React", "Flow") must appear in the fact. The four
host-patched files do not touch this gate.

- **n2_absent_db_choice** (expected: none; live result: `["f1"]` — false
  positive). Fresh candidates: f3 Tkinter history fact rank 1
  `0.05611933767795563`; f1 React Flow decision fact rank 2
  `0.05590043589472771`; f2 background fact rank 3 `0.02109130471944809`.
  Why the `0.0559` vs `0.0561` scores led to admission: the query's "choose"
  fires DECISION_INTENT; f1 ("chosen") is the only decision-eligible
  (choice-only) candidate, while the higher-scoring f3 fact contains
  "originally" (HISTORICAL_STATEMENT), which excludes it from both decision
  eligibility for this query and from the background set. The choice-only
  threshold is relative — `2 × 0.0210913 = 0.0421826` — so f1's `0.0559004`
  clears it and is admitted despite both absolute scores being ≈ 0.056.
  Signal cause: a single low-scoring background fact makes the relative
  2× threshold trivially satisfiable for any decision-lexicon hit.
- **n5_historical_f3** (expected: `[f3]`; live result: `["f1"]` — f3 missed).
  Fresh candidates: f1 rank 1 `0.6293780207633972`; f3 rank 2
  `0.5721237063407898`; f2 rank 3 `0.022359192371368408`. Both f1 and f3 are
  topical (overlap 3: "visualization", "react", "flow"), so both are eligible
  at priority 0: the query's bare "before React Flow" does not match
  HISTORICAL_INTENT (only "before change/switch/migrate/replace/adopt" or
  "used before" count; "before" alone is intentionally non-historical), so the
  f3 fact gets no historical priority, and DECISION_INTENT is absent so f1
  gets no decision priority. Tie-break is rerank score, where f1 wins
  (`0.6294 > 0.5721`) and `maxSelected` 1 returns only f1. Signal cause: the
  query naming "React Flow" gives the competing decision fact literal
  overlap and a higher cross-encoder score than the true historical fact.
- **n6_causal_f2** (expected: `[f2]`; live result: `[]` — f2 missed). Fresh
  candidates: f2 rank 1 `0.2765442728996277`; f3 rank 2
  `0.13376693427562714`; f1 rank 3 `0.08383458852767944`. f2 is the top
  candidate but is rejected at eligibility: topic terms are
  [media, replacement, wait, export, pipeline]; the f2 fact overlaps on one
  term only ("media" — "replacement" does not stem-match "replacing"→"replac"),
  below the count ≥ 2 topical threshold, and the causal wording matches no
  decision/historical intent cue. Rerank scores are never consulted for
  general eligibility (only for choice-only candidates), so the rank-1 score
  `0.2765` cannot admit f2. Signal cause: stem-mismatch under-lexing of the
  causal phrasing plus the hard lexical floor.

No source-level policy change is proposed here; these observations are for
Central's independent analysis.

## Host-local four-file patch (audit only, not applied to this source)

`20261102-host-local-fixes.diff` (7,333 bytes pre-redaction; SHA256 of the
pre-redaction capture `83eafcb1a9cd1cd3c25386836ff82542410ea64aa0d356373b62defc86b31f5e`;
SHA256 of the published redacted copy
`f7030e5a99fcb5009bb174e03493ba2d0d117af74af7eec6c3a42a412b560103`).
Tracked-only `git diff --binary` from the old worktree (47 insertions,
4 deletions); the untracked `__pycache__` directory is excluded. Changed
files and post-patch host SHA256:

- `docs/issue-75/v2-candidate/memory-core.mjs` — `7304fb2bf63b093ece27979d2c4613bc65bc34a18fa56c5717de4d32d0e4c17e` (RTK-wrapped test-command recognition for the same closed test set)
- `docs/issue-75/v2-candidate/memory-core.test.mjs` — `a960432cd824a21df3187ec5591bd6870e272f2a4356b5d7b7514e67dc12297d` (rtk wrapper test)
- `docs/issue-75/v2-candidate/plugin-behavior.test.mjs` — `58121630aedb8f8ee6c10f750a54804bd4776f55dadbf58905a2e43b0903f1c8` (JSON-quoted prompt wire test)
- `docs/issue-75/v2-candidate/plugin.mjs` — `d7b9bd10161eb6de8ac29a288c69eee3ee492903bf8148558a81e12230d01051` (`promptText()` decode of JSON-encoded V2 prompt text before capture/search)

These match the centrally reconstructed differences (RTK allowlist, quoted
prompt wire). This patch is audit evidence only: Central must not infer
host-tested parity solely from two independent implementations of the same
reported behavior.

## Privacy review

Checked before staging: all seven publication artifacts plus the original
host source files. Scans for local machine paths, credentials
(api keys/tokens/passwords/bearer/gh* / sk-* / private keys), `<private>`
markers, and URLs: the five JSON artifacts are clean; the patch's only local
machine path — `/tmp/opencode/issue75-final-qual/v2demo/test_smoke.py` inside
the added test fixture — was redacted in the published copy to
`/tmp/scratch/test_smoke.py` (1 redaction, 0 omissions; semantics, case IDs,
ordering and judgments unchanged). No journals, unfiltered model logs or
service credentials are published. Raw private evidence remains on the host.

## Read-only proof

The collector performs only `search_memory_facts` against the pinned Graphiti
endpoint and POSTs to the existing loopback reranker; it never calls
`add_memory`, never mutates journal state (read-only `journal.list()`),
changes no model/gate configuration, and ran no Qwen extraction. The five
pending post-exit Graphiti captures were not rerun.
