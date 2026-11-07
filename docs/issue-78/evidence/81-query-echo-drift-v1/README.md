# Issue 81 Query-Echo Corpus-Drift V1 — Evidence Packet

One bounded host qualification of the Central-authored general anti-echo source
correction on the existing draft PR #89, executed against the exact staged source.

- Campaign: `ISSUE81_QUERY_ECHO_DRIFT_V1`
- Repository: `fvanevski/opencode-operational-schema-guard`
- Exact source: `a78ebb69926e9e4bc2e7d9c036d65501c911294e` (branch `issue/81-source-recall-correction`, PR #89 OPEN/DRAFT)
- Pre-fix head: `d0cb07562bfdd37021de653bcbe948e993e31883`
- Main base: `9a27b73de882c0af6fec4d86de81945338611479`
- Controlling handoff: `docs/issue-78/v2-benchmark/ISSUE81_QUERY_ECHO_DRIFT_HANDOFF.md`

## Result

- The `toolQuestionEcho` anti-echo guard is verified source-type- and query-content-based,
  applied at BOTH the shortlist and final selector stages (including the reranker path),
  exclusion-only, and free of any case/source/UUID/SHA/answer hardcoding.
- The S10 contaminant (remote episode `625b58db-…`) is a confirmed tool-origin full
  question echo; the genuine expected commit-subject record is retained.
- Exposed 16+4 offline replay: **13/16 exact-source vs the strict 13/16 gate — MET**
  (`HOST_CANDIDATE_READY=yes` for Central's FRESH exact-head rereview only).
  S10 newly rescued; S03/S05/S13 remain the documented named-entity gaps;
  N01/N03/N04 no-injection; N02 frozen FAIL_INJECTED.
- Focused suite 81/81 (raw exit 0); all prior Codex P1/P2/P2, fence and FIFO regressions pass.
- HOOK_P95 = UNVERIFIED (300 ms binding); human precision 126 items = UNVERIFIED
  (operator-owned, PENDING_OPERATOR_ADJUDICATION).

## Files

| File | Content |
|---|---|
| `source-and-tests.json` | exact source identities, diff scope, blob hashes, syntax checks, focused-suite TAP counts and raw exit |
| `tool-echo-authority.json` | predicate design verification, S10 contaminant read-only inspection, all adversarial proofs |
| `sixteen-case-replay.json` | sanitized 16+4 replay: per-case status, source-anchored identities, S10 echo instrumentation, pools, score, latency |
| `timing-and-precision.json` | effective config authentication, fresh remote readback (256 episodes, drift 0), p50/p95/max, 70 ms grace, HOOK_P95, 126-item packet status |
| `central-disposition.md` | consolidated disposition and readiness boundary |
| `command-shape-friction.json` | GHDEV-10 command-shape friction ledger |
| `SHA256-MANIFEST.txt` | digests of every file in this packet |

## Sanitization

No raw private queries, assertions, excerpts, messages, credentials, operator worksheets,
or host logs in this packet. Questions and facts appear only as SHA256; source refs and
episode/message UUIDs are source-anchored identities (precedent:
`81-integrated-recall-acceptance-v1`). The complete private raw evidence
(replay-raw.json, harness scripts, logs) is retained at 0600/0700 under
`/tmp/opencode/issue81-echo-drift/`.

## Boundaries

One sanitized evidence-only commit on `issue/81-recall-acceptance`; no implementation-branch
write, no production source or semantic test edit, no acceptance/fixture weakening, no
source-ID blocklist, no installed plugin/config/service change, no Graphiti or curation
CRUD, no new PR, no merge, no Issue #81 closure, no production deployment, no EX-gate
edit, no second Codex request.
