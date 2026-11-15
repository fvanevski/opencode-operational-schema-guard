# Issue #93 — ONE prospective replacement holdout (evidence)

Sanitized, evidence-only publication. No production/source/test/CI/config changes;
no graph writes; no model inference; no new branch/PR; one commit on the existing
`issue/93` branch.

## Authority

- Controlling contract: `docs/issue-93/LOCAL_AGENT_CONTRACT_PROSPECTIVE_HOLDOUT_FINAL.md`
- Approval: `docs/issue-93/APPROVED_PROSPECTIVE_REPLACEMENT_HOLDOUT.md`
- Prospective policy: `docs/issue-93/APPROVED_PROSPECTIVE_ACCEPTANCE.md`
- `REQUIRED_REMOTE_HEAD = 962d2c30c6206acd80c9c23d9a823d9a826b0e03e0f8dd` (authenticated, matches `origin/issue/93`)
- `FIXED_CANDIDATE_SOURCE = d40506d15ed2ed2c2c08edcd64995182c197a6d8` (exact source tested)
- Role sources: strict = invariant `relevance.mjs` (blob `46749f1d…`); original semantic `69014b739d490f8cb90bce86233edf3054673209`; original B2.2 `4bc169cc59e8900f5dc3cd4d3c70a22d0fcfb9f4`; fixed candidate `d40506d…`.

## Method (one coherent 4-positive / 2-negative prospective holdout)

1. **Authenticate + prepare** in an isolated worktree at the exact remote head; preserved the
   owner checkout and its untracked files. Inspected the #92 source records and the replay
   adapter; used source-authenticated `group=development-knowledge` / `ws=gh_mcp` /
   `project=gh_mcp`, `get_episodes{group_ids,max_episodes}` and
   `search_memory_facts{query,group_ids,max_facts:24}`; no implicit writes, no model/reranker.
2. **Adapter** — one read-only capture + deterministic replay adapter, validated on synthetic
   non-cohort data (determinism, secret-sentinel `NO_SEARCH_CALL`, unrecorded-RPC fail-closed)
   **before** sealing real cases.
3. **Cases** — 4 NEW positives (direct/cause/decision/temporal) + 2 NEW negatives
   (off-topic; synthetic `sk-` credential sentinel), source-adjudicated from the 355-fact
   snapshot **before** any selector output; raw-query sha256 disjoint from all 29 existing
   cohort queries.
4. **Seals** — private 4+2 manifest sealed **before** transport; transport bundle (ordered
   top-24 + episodes + index/journal + remote proofs) sealed **before** replay.
5. **One frozen replay** of strict / original-semantic / B2.2 / fixed-candidate on the
   identical frozen inputs; no live Graphiti fallback; `ranker=null` (no model).
6. **Adjudication** — case-wise source-exact positives, negative-stage counts, absolute
   privacy/EX fence, group/remote/source authority, selector budget.

## Result

`RESULT = PARTIAL`

- **COMPARATIVE gate = PASS (relative, nonnegative):** the fixed candidate loses no positive and
  injects no new off-topic/secret fact relative to original-semantic and B2.2; strict-only floor
  preserved.
- **ABSOLUTE privacy fence = PASS:** N2 secret sentinel rejected at stage 0 (`safeText` → `''`
  via the `PRIVATE` `sk-`+16-alnum match) → `NO_SEARCH_CALL`, zero model-facing facts, zero
  credential disclosure, all 4 roles.
- **Selector budget = PASS:** max 1389 JSON chars (<=1400), max 4 facts (<=5).
- **No live fallthrough = verified** (frozen mock; unrecorded RPC throws).

### Absolute findings (reported, not gate failures)

- **P1 (direct)** is a source-exact **FN for all 4 roles**: the pre-registered expected fact
  (snapshot idx 40) and its episode are absent from the frozen top-24 retrieval response for that
  query phrasing — a **uniform frozen-transport retrieval miss** (strict misses it identically),
  **not** a revised-candidate regression. Selectors surfaced topically-equivalent `graphiti_live`
  binding facts from other sources.
- **N1 (off-topic)** absolute injection = 3 in-group dev-knowledge facts for the three semantic
  roles (0 for strict); identical across base/b22/revised → not a candidate regression.
- P2/P3/P4 are source-exact **TP for all 4 roles**.

## Reused previous gates (exact-source, CPU — not fresh runs)

The d40506d selector blobs match the prior codex-remediation evidence exactly
(`relevance.mjs` `46749f1d…`, `semantic-recall.mjs` `9dd4d49c…`), so these evidence classes
apply by exact-source applicability: **118/118** focused tests (10 suites, exit 0); native hook
**n=20, p95=299.99ms <= 300ms** (max selector JSON 1011, 2 facts); D12 answer-proof bridge =
`ANSWER_PROOF_REUSED_WITH_EXACT_BRIDGE` (CPU source-equivalence, not a fresh GPU/model PASS).

## Files

- `handback.json` — full typed handback (hashes/counts/labels only).
- `casewise-results.json` — per-role, per-case TP/FN + negative-stage counts + budget.
- `seals.json` — manifest + transport seal digests + snapshot fingerprint.
- `ghdev-10-command-shape-friction.json` — GHDEV-10 command-shape friction (scenario,
  requested/effective, rewrite provenance, outcome, gap, omitted secrets).
- `SHA256SUMS` — covers every file in this directory.

## Publication / ownership

`SHA256SUMS` covers every file in this directory. **Central** owns final exact-head
CI/Verify + independent review on the final PR SHA. This evidence does NOT authorize merge,
deployment, PR approval, or Issue #93 closure. Original historical artifacts remain untouched.
