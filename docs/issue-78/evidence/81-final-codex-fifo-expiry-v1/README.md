# Issue 81 Final Codex FIFO-expiry Remediation V1 — Evidence Packet

One consolidated exact-head evidence campaign qualifying the **only new finding** from the
second and FINAL manual Codex review (`discussion_r4499679347`, P2: optional episode proofs
must be expiry-aware inside the shared MCP FIFO and must abort their actual transport).

- Campaign: `ISSUE81_FINAL_CODEX_FIFO_EXPIRY_V1`
- Repository: `fvanevski/opencode-operational-schema-guard`
- Exact source: `27b8d713e05ef592ea867c400a1d949fd02bd7a1` (branch `issue/81-source-recall-correction`, PR #89 OPEN/DRAFT, tree `0b25c82a5488cc14bf0b1bd3f2614aefb8ebb4d6`)
- Codex-reviewed head: `eb20f06680e3558b67a54b2b288122efe2359eba`
- Main base: `9a27b73de882c0af6fec4d86de81945338611479`
- Controlling handoff: `docs/issue-78/v2-benchmark/ISSUE81_FINAL_CODEX_FIFO_EXPIRY_HANDOFF.md`

## Result

- **Focused suite 84/84, raw exit 0** (82 prior + 2 new FIFO-expiry regressions).
- **Queued-expiry + active-abort regressions PASS** with the real `GraphitiMcp`/`Memory` modules: expired proofs are dropped at FIFO dequeue (zero `get_episodes` network calls); in-flight proofs abort the real `fetch` exactly once within the ~70ms grace (observed 62–94ms, always far below the 410ms natural completion) through both `initialize` and `tools/call`; `maxActive=1`; exactly-once calls; no source authorization from an abandoned proof; two-argument callers keep the original transport-timeout semantics.
- **Exposed 16+4 replay (live read-only Graphiti, ranker=null, exact-head source): 13/16 exact-source — strict >=13/16 gate MET.** S03/S05/S13 = ratified named-identity-guard failures; N01/N03/N04 no-injection; N02 frozen historical FAIL_INJECTED. Zero new private/wrong-group/unconfirmed-episode/false-verified assertions. S06 historical/superseded PASS; S10 genuine commit-subject PASS.
- Corpus unchanged: 256 episodes, group-pure, drift 0, curated-UUID overlap 256.
- HOOK_P95 = UNVERIFIED (300ms binding); human precision 126 items = UNVERIFIED (operator-owned, as-of snapshot SHA256 re-matched).

**HOST_REVIEW_READY=yes — for a fresh Central exact-head rereview** (not GitHub approval,
merge, installation, native final acceptance, or Issue #81 closure). Manual Codex requests 2/2 consumed.

## Files

| File | Content |
|---|---|
| `source-and-tests.json` | exact source identities, diff scope, blob SHAs, syntax checks, focused-suite TAP counts and raw exit, unchanged-scope fences |
| `fifo-expiry-and-abort-regressions.json` | Codex P2 finding, the two committed shared-client regressions, and the independent real-module exercise with measured invariants |
| `exposed-16-plus-4-replay.json` | sanitized 16+4 replay: per-case status, source-anchored identities, pools, proof-scheduling outcomes, latency, strict gate |
| `remote-proof-and-latency.json` | effective config authentication (ranker=null), fresh remote readback (256 episodes, group-pure, drift 0), p50/p95/max, 70ms grace, HOOK_P95, 126-item packet status |
| `review-disposition.md` | consolidated disposition of all four Codex findings and the gate result |
| `command-shape-friction.json` | GHDEV-10 command-shape friction ledger |
| `SHA256-MANIFEST.txt` | digests of every file in this packet |

## Sanitization

No raw private queries, assertions, excerpts, messages, credentials, operator worksheets, or
host secrets in this packet. Questions and facts appear only as SHA256; source refs
(`opencode:` anchors) and episode/message UUIDs are source-anchored identities (precedent:
`81-integrated-recall-acceptance-v1`); `s10` references a public repository commit subject.
The complete private raw evidence (replay-raw.json, runner, logs, worksheet) is retained at
0600/0700 under `/tmp/opencode/issue81-fifo/` and
`/tmp/opencode/issue81-merged-promotion/evidence/phase-b/`.

## Boundaries

One sanitized evidence-only non-force commit on `issue/81-recall-acceptance` (CAS parent
`1bdd4aae63b79a66c75fe12b6be979a6745df0f8`); no production source change, no new PR, no
implementation push, no merge, no Issue #81 closure, no production deployment, no EX-gate
edit, no Graphiti write, no curator drain, no third manual Codex request.
