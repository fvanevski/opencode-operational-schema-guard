# Issue 81 — Final Codex FIFO-expiry remediation: review disposition

Campaign: `ISSUE81_FINAL_CODEX_FIFO_EXPIRY_V1`
Exact source: `27b8d713e05ef592ea867c400a1d949fd02bd7a1` (branch `issue/81-source-recall-correction`, PR #89 OPEN/DRAFT, base `9a27b73de882c0af6fec4d86de81945338611479`)
Codex-reviewed head: `eb20f06680e3558b67a54b2b288122efe2359eba`
Controlling handoff: `docs/issue-78/v2-benchmark/ISSUE81_FINAL_CODEX_FIFO_EXPIRY_HANDOFF.md` (blob `50085ede62a935a57a871140ca64802cf5d87ae7`, immutable in the exact tree)

## Codex finding dispositions (2/2 manual review slots consumed; no further request)

| # | Finding (discussion) | Disposition at exact head |
|---|---|---|
| 1 | P1 — unhandled rejection when the curated retriever rejects before the remote calls resolve (`4498775396`) | FIXED (immediate handler on `indexedWork`) and regression-protected: "early curated retriever rejection is safely handled during a slower Graphiti search" — suite pass |
| 2 | P2 — slow optional `get_episodes` can block legacy sourced recall past the 300ms hook (`4498775401`) | FIXED (70ms combined optional budget, shortlist-qualified pre-proof, legacy path materialized first) and regression-protected: "slow optional proof cannot delay an otherwise sourced legacy result" + skip/cold-search tests — suite pass |
| 3 | P2 — reranker truncation before scoring loses Graphiti positions 13–24 (`4498775406`) | FIXED (score all 24 facts once before the 24-slot merge, cached reuse) and regression-protected: "reranker scores all 24 Graphiti facts before merging 12 indexed facts, only once" + position-19 test — suite pass |
| 4 | **P2 (current, `4499679347`)** — optional proof not expiry-aware at shared-FIFO dequeue; abandoned work blocks later prompts past the 300ms hook | **FIXED at exact head**: `call(name,args,{deadlineMs})` drops expired proofs BEFORE `ensure()`/`tools/call`; an in-flight proof's AbortSignal (remaining budget, combined with the original 1200ms transport timeout via `AbortSignal.any`) aborts the real `fetch` through both `initialize` and `tools/call`; the FIFO advances only after the transport settles/aborts; late responses return `null` and can never authorize an indexed fact. Regression-protected by two new shared-client tests and independently re-exercised (see `fifo-expiry-and-abort-regressions.json`). |

## Gates

- **Focused suite**: 84/84 pass, raw exit 0 (9 files; 82 prior + 2 new FIFO-expiry regressions).
- **Queued-expiry + active-abort regressions**: PASS — expired proof never starts (zero `get_episodes` network calls), in-flight proof aborts the real fetch exactly once (~70ms grace, always far below the 410ms natural completion), `maxActive=1`, exactly-once calls, no source authorization from an abandoned proof, no FIFO release while a transport is active, two-argument callers keep the original transport-timeout semantics.
- **Exposed 16+4 replay (current head, live read-only Graphiti, ranker=null)**: **13/16 exact-source — strict >=13/16 gate MET**. S03/S05/S13 are the ratified named-identity-guard failures; N01/N03/N04 no-injection; N02 frozen historical FAIL_INJECTED. Zero new private/wrong-group/unconfirmed-episode/false-verified assertions. S06 historical/superseded source PASS; S10 genuine commit-subject PASS.
- **Safety/provenance**: corpus unchanged (256 episodes, group-pure, drift 0, curated overlap 256); source-index rows exact-group/UUID/source-bound; no Graphiti write, no curator drain, no queue modification, no deployment.
- **Latency**: d24 search p50=158/p95=208/max=426 (n=18); proof p50=26/p95=30/max=31 (n=17); index p50=39/p95=46/max=54 (n=20); full Memory.search p50=195/p95=228/max=485 (n=20); 0% canceled/expired/skipped proofs in this replay (all completed in budget); HOOK_P95=UNVERIFIED (300ms remains binding).
- **Human precision**: 126-item operator worksheet re-authenticated read-only (as-of snapshot SHA256 match); HUMAN_PRECISION=UNVERIFIED, PENDING_OPERATOR_ADJUDICATION; no AI adjudication.

## Result

All decision-boundary conditions are met (deadline/abort regressions PASS, full focused suite PASS, exposed recall 13/16 >= 13/16, safety/provenance PASS):

**HOST_REVIEW_READY=yes — for a fresh Central exact-head rereview** of `27b8d713e05ef592ea867c400a1d949fd02bd7a1`.

This is NOT GitHub approval, merge, production installation, native fresh-process final acceptance, or Issue #81 closure. Manual Codex requests: 2/2 consumed; no third request without explicit operator authorization.
