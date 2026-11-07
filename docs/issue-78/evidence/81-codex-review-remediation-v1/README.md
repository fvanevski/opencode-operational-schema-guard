# Issue 81 Codex Review Remediation V1 — Evidence Packet

One consolidated host-validation campaign of the Central-owned source corrections to the
three blocking Codex review findings on PR #89, executed against the exact staged source.

- Campaign: `ISSUE81_CODEX_REVIEW_REMEDIATION_V1`
- Repository: `fvanevski/opencode-operational-schema-guard`
- Exact source: `d0cb07562bfdd37021de653bcbe948e993e31883` (branch `issue/81-source-recall-correction`, PR #89 OPEN/DRAFT)
- Reviewed defect head: `7a82f0099bd5c281a12d2377326e0671aa8d5b33`
- Main base: `9a27b73de882c0af6fec4d86de81945338611479`
- Controlling handoff: `docs/issue-78/v2-benchmark/ISSUE81_CODEX_REVIEW_REMEDIATION_HANDOFF.md`

## Result

- All three Codex findings (P1 unhandled rejection; P2 slow optional proof; P2 reranker pre-merge truncation) are **fixed in the exact source and regression-protected** (focused suite 78/78, raw exit 0).
- Exposed 16+4 offline replay: **12/16 exact-source vs the strict 13/16 gate — NOT met** (`HOST_CANDIDATE_READY=no`).
- A/B attribution: identical per-case outcomes on the current corpus for the old (`7a82f00`) and new (`d0cb075`) source — the Codex remediation delta is **zero**; the S10 regression (13/16 → 12/16) is attributed to curated-index corpus drift (227 → 256 rows, including an S10 diagnostic-probe artifact row), returned for Central disposition.
- N01/N03/N04 no-injection; N02 frozen FAIL_INJECTED unchanged. S06 temporal precedence preserved. No wrong-group / private-marker / unconfirmed-UUID selections.
- HOOK_P95 = UNVERIFIED (300 ms binding); human precision 126 items = UNVERIFIED (operator-owned).

## Files

| File | Content |
|---|---|
| `source-and-focused-tests.json` | exact source identities, diff scope, blob SHAs, syntax checks, focused-suite TAP counts and raw exit |
| `codex-p1-p2-p2-regressions.json` | the three Codex findings, source corrections, regression proofs, invariant fences, ranker fake-transport verification |
| `sixteen-case-offline-replay.json` | sanitized 16+4 replay: per-case status, source-anchored identities, pools, attribution, latency |
| `remote-authority-and-latency.json` | effective config authentication, fresh remote readback (256 episodes, group-pure, drift +29), p50/p95/max, 70 ms grace, HOOK_P95, 126-item packet status |
| `review-disposition.md` | consolidated disposition and gate result |
| `command-shape-friction.json` | GHDEV-10 command-shape friction ledger |
| `SHA256-MANIFEST.txt` | digests of every file in this packet |

## Sanitization

No raw private queries, assertions, excerpts, messages, credentials, operator worksheets, or
host secrets in this packet. Questions and facts appear only as SHA256; source refs and
episode/message UUIDs are source-anchored identities (precedent: `81-integrated-recall-acceptance-v1`).
The complete private raw evidence (replay-raw.json, replay-old-src.json, harness scripts, logs)
is retained at 0600/0700 under `/tmp/opencode/issue81-codex/`.

## Boundaries

One sanitized evidence-only commit on `issue/81-recall-acceptance`; no production source change,
no new PR, no implementation push, no merge, no Issue #81 closure, no production deployment,
no EX-gate edit, no Groupiti write.
