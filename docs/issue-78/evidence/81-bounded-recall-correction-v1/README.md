# Issue #81 Bounded-Recall Correction — v1 (ISSUE81_BOUNDED_RECALL_CORRECTION_V1)

Evidence-only qualification of the centrally staged Issue #81 bounded-recall
correction (PR #89, branch `issue/81-source-recall-correction`, head
`8f6e688f5a82ef405c6d1f76e63410d5be0c48fb`). Adds a sanitized evidence packet
to `issue/81-recall-acceptance` (parent head `431ca1f699f84dea4edef89030d5678c49a18dff`).
No production install, no config change, no impl-branch push, no new PR, no
merge, and no issue closure is made on this branch.

## Scope and method

- **Source authority:** the staged source is the impl branch head
  `8f6e688f…`; production base is `main@9a27b73de882c0af6fec4d86de81945338611479`.
  The implementation diff vs base is exactly the six staged files
  (`IMPLEMENTATION_DIFF_MATCH=PASS`). `SOURCE_REPOSITORY_EDIT=forbidden`.
- **CPU-only, read-only Graphiti access** (`search_memory_facts`, group
  `development-knowledge`); no writes, no deletes, no GPU inference, no
  production install.
- **Live paired depth probes** at `max_facts=12` and `max_facts=24` (current
  snapshot 2026-11-06) test whether raising the candidate cap recovers the
  residual retrieval misses.
- **Offline source-bound replay** runs the staged `relevanceFilter`
  (`ranker=null`, `maxSelected=1`) over the live depth-24 candidate sets and
  the staged `sourcedEpisodeResolver`; scoring is a **diagnostic
  exposed-regression**, not a native acceptance re-run.
- **N04 observer repair** recomputes all 20 roster cases from the raw litellm
  trace, scoping model requests by `trace_id == native_session` (fixing the v1
  question-text over-match that reported 427 out-of-session requests for N04).
- **Frozen results preserved verbatim:** 8/16 Phase-A baseline, 9/16
  post-S06 `FAIL`, S06 `PASS`, N02 `FAIL_INJECTED` retained, and
  `HUMAN_PRECISION=UNVERIFIED` (126 verdicts outstanding).

## Files

| File | Content |
| --- | --- |
| `source-and-test-validation.json` | Source auth, `node --check` (3/3), focused tests (45/45), resolver-implicated tests (44/44), six-file diff match, and inherited trusted-verify PASS (run `42278847322`). |
| `retrieval-depth-comparison.json` | Live depth 12-vs-24 expected-episode recovery table, the 5 retrieval misses absent at both depths, the S01/S04 admission misses, and negative identity guards. |
| `offline-recall-matrix.json` | Offline 9/16 `PASS_SOURCE_CORRECT` matrix (diagnostic), per-case selection + source resolution, and the blocking-defect checks (no wrong-group/private leak/false admission). |
| `latency-and-bounds.json` | p50/p95 latency for the depth-12 (n=7) and depth-24 (n=20) populations; `HOOK_P50/P95=UNVERIFIED`, source-resolution latency `UNVERIFIED`; verified code bounds (maxFacts=24, MAX_AUTOMATIC_CANDIDATES=24, anchor limit 288, maxSelected=1). |
| `observer-n04-erratum.json` | Additive N04 observer erratum: the trace_id-scoped recompute of all 20 cases, N04 = 2 native requests / 0 GHDEV blocks → `PASS_NO_INJECTION`, S12 no within-request duplicate, and the raw-trace SHA-256 identity. |
| `precision-status.json` | `HUMAN_PRECISION=UNVERIFIED` (126/126 human verdicts null, `AWAITING_OPERATOR_ADJUDICATION`), operator-review worksheet + target-ratification receipt SHA-256 authentication. |
| `review-readiness.md` | Consolidated review-readiness statement and the disposition handed to Central. |
| `command-shape-friction.json` | Command-shape friction ledger for this campaign. |
| `SHA256-MANIFEST.txt` | SHA-256 manifest over all published files in this directory (excluding the manifest itself). |

## Headline findings

- **Depth 24 does NOT recover the five retrieval misses.** The expected
  episodes for S03 (`082fe673`), S05 (`1a20d974`), S07 (`7dcfa76f`), S10
  (`0de3cdc8`) and S13 (`009974d2`) are absent from the candidate sets at
  **both** `max_facts=12` and `max_facts=24`. Raising the cap recovers 9 other
  expected episodes (11/16 present at d24 vs 2/16 at d12) but does not touch
  these five. **Do not raise the cap further**; the binding constraint is
  retrieval coverage / source binding, not the candidate cap.
- **S01 / S04 are selector/admission misses.** Their expected facts are
  eligible and present at d24, but a competing (S01 `a364f523`) or
  proposition-equivalent sibling (S04 `6940cadb`) wins the `maxSelected=1`
  tie-break.
- **Offline replay = 9/16 `PASS_SOURCE_CORRECT`** (S02, S06, S08, S09, S11,
  S12, S14, S15, S16), 6 `WRONG_SOURCE` (S01, S03, S04, S05, S07, S10), 1
  `ABSENT_FROM_CANDIDATES` (S13); negatives N01/N03/N04 `PRESENT_BUT_REJECTED`,
  N02 `INJECTED`. No wrong-group, private-marker, or false-admission blocking
  defect.
- **N04 observer reconciled** to its native session
  (`ses_e4dea883effe7cCGVWGfs40hGb`): 2 native requests, 0 GHDEV blocks →
  `PASS_NO_INJECTION`; S12 confirmed to have no within-request duplicate.
- **Human precision: UNVERIFIED** — the 126-item worksheet is staged with all
  human verdicts null; no human precision verdict is recorded this campaign.
- **Central source change required: yes** (retrieval coverage / source binding
  for the five retrieval misses; see `review-readiness.md`).

## Sanitization

No real credentials, full model requests, or source-private records are
included. Host file paths appear only as provenance references to private
artifacts; the operator-review worksheet and the ratification receipt are
referenced by path + SHA-256 only, not copied into the remote packet.
