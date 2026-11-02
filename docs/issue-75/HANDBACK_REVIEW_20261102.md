# Issue #75 — third host handback adjudication (2026-11-02)

**Status:** PARTIAL overall. Source HEAD qualified by Build: `371919ea54c20a853e7747e32bcc42fae3453a86`. Current Central branch has advanced beyond that SHA with the two reported host-binding corrections; its revised source is not yet host-qualified.

## Evidence accepted as host-reported

- Frozen 7/7, precision/recall 1.0/1.0 and p50 46 ms; prior, already-inspected holdout 5/5.
- New disjoint 12-query holdout frozen before scoring, fixture SHA-256 `67e2a72888d561b3503c6c36543f6fd9cff3713b97af937868c041258586e470`: **9/12 exact**, P=0.60, R=0.60, p50 49 ms, p95 59 ms, zero timeouts. The fixture and raw result bytes have **not yet been inspected centrally**.
- Three counterexamples: `n2_absent_db_choice` (unrelated chosen fact admitted), `n5_historical_f3` (wrong current-state source outranked historical record), and `n6_causal_f2` (semantic causal link had one lexical term and was rejected). These are distinct admission/intent/coverage failures.
- Native V2 capture and read-only Graphiti context injection and OpenViking coexistence observed in isolated live sessions. Five pending candidate rows remain in disposable group `g_issue75_test`.
- Node 20/20 and Python 6/6 reported passing in the host worktree. No post-exit LLM-backed extraction was performed. Ten prior `output_limit` completions are an identified risk; non-thinking `chat-extract` is proposed but still lacks native Graphiti end-to-end proof.
- Four **host-only** modified files with complete SHA-256 in the handback; original exact patch not attached and not GitHub-staged. Central independently reconstructed the narrow RTK allowlist and JSON-quoted prompt decoding with regression tests on the same working branch. Byte identity to the host patch remains UNVERIFIED.
- One command-shape observation merits durable note: V2 file-level plugins were not loaded and a directory entry with `{id,setup}` was needed. RTK-inserted prefix is a real input compatibility fact. No generic GHDEV KB revision has been justified by this one case.

## Material caveats and next action

The reported n2 scores (wrong f1 0.0559; f3 0.0561) alone **do not support** the claim that the source's `>2x background` condition passed "by a hair". The current source excludes historical candidate facts from its background computation, so inspect the **complete actual candidates, priority, scores and signals** before changing the rule. Likewise n5 may reflect absent historical-intent recognition rather than a simple reranker issue, and n6 may require a broader semantic dependency strategy. Do not hardcode issue-specific query IDs/names.

The exact new holdout fixture and the following result files are the missing primary evidence:

- `/tmp/opencode/issue75-final-qual/new-holdout-queries.json`
- `/tmp/opencode/issue75-final-qual/new-holdout-live-holdout.json`
- `/tmp/opencode/issue75-final-qual/frozen-live-results.json`
- `/tmp/opencode/issue75-final-qual/frozen-live-results-holdout.json`

Collect fresh read-only Jina per-fact scores for that frozen holdout using the existing centrally authored `collect-relevance-evidence.mjs`; do not synthesize or overwrite recorded results. Publish sanitized **evidence only** to the same `issue/75` branch under the scoped contract in `docs/issue-75/HOST_HOLDOUT_PUBLICATION_CONTRACT.md`. Central then designs a principled fix and reruns a separately new negative/adversarial holdout before final promotion.

The previous exact operator post-exit command, if run without a qualified isolated Graphiti worker and a Graphiti-specific non-thinking profile, can encounter asynchronous extraction failure while the wrapper retains the shared EX lock indefinitely. **Do not terminate the shared production Graphiti service merely to free that lock.** Prepare a safe isolated worker or complete a bounded end-to-end extraction with an explicit operator decision; no successful fresh post-exit extraction has been reported.

No merge, production deployment, or issue closure is authorized by this handback.
