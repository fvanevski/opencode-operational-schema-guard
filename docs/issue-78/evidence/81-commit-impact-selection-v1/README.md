# Issue #81 — final bounded source-selection qualification: evidence packet

- **Campaign:** `ISSUE81_COMMIT_IMPACT_SELECTION_V1`
- **Repository:** `fvanevski/opencode-operational-schema-guard`
- **Issue / PR:** #81 / #89 (draft, kept draft; not merged, not closed)
- **Controlling handoff:** `docs/issue-78/v2-benchmark/ISSUE81_FINAL_SOURCE_SELECTION_HANDOFF.md` (blob `93ffb6a6818697ae5dbffec14e4b1897c2fe423d`) at the exact head
- **Exact source head:** `0a4879fe626106b0d0bbc57079e82cee140b56c1` (tree `64ca28cb25b805f8ed407d687d31e727501d2ce0`), branch `issue/81-source-recall-correction`, PR #89 OPEN/draft
- **Controller base / remote main:** `9a27b73de882c0af6fec4d86de81945338611479` (verified equal; ancestor of head)
- **Evidence branch:** `issue/81-recall-acceptance` at pre-publication head `d531b1487b954e645ce53f54f62fcee6c2df861d`
- **Production scope:** group `development-knowledge`, workspace `/workspace/mcp_servers/gh_mcp`, project `gh_mcp`, state root `/home/filip/.local/state/ghdev-graphiti` (read-only), Graphiti endpoint `http://127.0.0.1:8766/mcp` (read-only `search_memory_facts` / `get_episodes`, serial)

## Result summary

| Axis | Result |
|---|---|
| Exact-head source + focused suites | 67/67 pass exit 0 (9 handoff-named files); +48/48 source-bound provenance suites; `node --check` 13/13 clean |
| Trusted exact-head receipts | CI `node-contract` PASS at head (run `42302766986`); `GHDEV exact-head Verify` (repository-final-v1) receipt `cb260091a322` bound to the trusted main controller epoch `9a27b73`, not the candidate head — candidate-head trusted dispatch left to Central per handoff A5 |
| Remote persistence proof | **227/227** curated index UUIDs confirmed in the live episode list (untruncated, group-pure, 0 growth); **16/16** roster positive UUIDs present |
| Frozen inputs | roster SHA256 `47e141bd…` verified; 126-fact precision worksheet `c8d5053c…` intact, all human verdicts null |
| One complete serial exposed `Memory.search` replay (staged modules, real source-resolving selection) | **12/16 exact-source** (target 13/16 **not met**); failures S03/S05/S13 = unchanged correctly-guarded `NAMED_IDENTITY` fence; S10 = new generic `answerTypeSupport` predicate miss (see `commit-impact-and-safety.json`) |
| Negative controls | N01/N03/N04 `PASS_NO_INJECTION` (N03/N04 prompt-side fences: 0 remote calls); N02 frozen `FAIL_INJECTED` preserved (same fact `1afbcca0` as prior adjudication; no cross-group leakage inferred) |
| Safety | no new wrong-group/private/authority-upgrade injection; `sourceContext`/`remoteEpisodeUuid` omitted from all output entries; single-fact output; honest temporal labels; no false-verified claims |
| Latency (serial, n=20) | e2e p50 188 ms / p95 299 ms / max 597 ms (S01 cold-search tail 514 ms in a 151–161 ms band); d24 search p95 514 ms; `get_episodes` p95 52 ms; curated index p95 88 ms; deadline unchanged; `HOOK_P95=UNVERIFIED` |
| Human-grounded precision (126 facts) | `PENDING_OPERATOR_ADJUDICATION`, all verdicts null → **HUMAN_PRECISION=UNVERIFIED** |
| PR #89 | **NOT host-review-ready**: exact-source score 12/16 < ratified 13/16 with one concrete generic predicate defect (S10). See `central-disposition.md` |

## Files

| File | Content |
|---|---|
| `source-and-focused-tests.json` | Phase A: remote/source authentication, staged-change scope, fences/bounds confirmation, syntax checks, focused + provenance suite results, independent assertions, trusted receipts |
| `replay-matrix.json` | Phase B: sanitized 20-case exposed replay matrix (per-case counts, selected/expected identities by UUID/source-ref, statuses, score 12/16) |
| `commit-impact-and-safety.json` | Phase B.10–13: S10 predicate failure anatomy, S03/S05/S13 gate status, S06/N02, negative controls, safety checks |
| `latency-and-remote-authority.json` | Phase B.7/12 + C.14: latency population/methodology, `HOOK_P95`, remote authority readback, human-precision status |
| `central-disposition.md` | Decision packet for Central: exact root cause, bounded correction scope, readiness verdict |
| `command-shape-friction.json` | Command-shape friction ledger |
| `SHA256-MANIFEST.txt` | File hashes for this packet |

## Sanitization

No raw prompts, assertions, event excerpts, or credentials are in this packet: questions and facts appear only as SHA256 digests; case identities use episode UUIDs and `opencode:` source refs. Raw private evidence (full replay matrix with digests, probe scripts, suite logs) is retained in the host-private 0700 directory `/tmp/opencode/issue81-final-selection-private/` (0600 files), alongside the frozen 0700/0600 campaign fixtures under `/tmp/opencode/issue81-merged-promotion/evidence/phase-b/`.
