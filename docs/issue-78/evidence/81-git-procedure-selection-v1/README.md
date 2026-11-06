# Issue #81 — Git-procedure source-selection fix: final host qualification packet

Campaign: `ISSUE81_GIT_PROCEDURE_SELECTION_V1`
Controlling handoff: `docs/issue-78/v2-benchmark/ISSUE81_GIT_PROCEDURE_SELECTION_HANDOFF.md` (at the exact implementation head)
Repository: `fvanevski/opencode-operational-schema-guard` — Issue #81, draft PR #89

## What this packet records

ONE consolidated host qualification of the centrally staged S10 correction at the exact
implementation head, plus ONE complete source-bound exposed offline 16-positive/4-negative
replay and the safety/precision/authority invariants required by the handoff.

- `source-and-tests.json` — exact-head authentication (PR #89 OPEN/draft, head `5d6b285`,
  base/main `9a27b73`, tree `e7973c3`), diff invariants (300 ms hook allowance, single-fact
  output, safeText, 24-candidate bound, fences, serialized MCP calls, ranking-only
  answerTypeSupport), 13/13 `node --check` PASS, focused suite 71/71 PASS (producer exit 0),
  10/10 generic A4 order-independence/fence assertions PASS.
- `16-case-replay.json` — the ONE exposed replay: exact-source **13/16** (ratified strict
  >=13/16 met), per-case selected/expected source refs, episode UUIDs, verdicts,
  control-delta (only S10 changed: WRONG_SOURCE → PASS), N01/N03/N04 PASS_NO_INJECTION,
  N02 frozen FAIL_INJECTED (same-group policy, identical injected ref to control),
  S06 temporal precedence preserved, S03/S05/S13 named fences preserved.
- `s10-procedural-vs-subject.json` — S10 predicates: expected conventional
  SHA-prefixed subject recognized (answerType 1); the incidental git -C worktree
  transcript is procedural (answerType 0, 6/6 procedural candidates); selected fact
  hash equals expected fact hash; no hardcoded source-ref shortcut (A4.4).
- `remote-proof-and-latency.json` — live read-only `get_episodes` readback (227 episodes,
  group-pure, untruncated, 16/16 expected UUIDs present), curator-root/index state,
  deployed-config verification (main-base plugin bytes, unmerged candidate NOT deployed),
  timing p50/p95/max with sample population, first-call transient, HOOK_P95=UNVERIFIED.
- `safety-and-precision.json` — frozen input reauthentication (roster, 126-item packet,
  worksheet, as-of snapshot — all SHA256 MATCH), HUMAN_PRECISION=UNVERIFIED (all 126
  human_verdict subfields null, AWAITING_OPERATOR_ADJUDICATION), privacy/group scans,
  authority invariants.
- `central-disposition.md` — recommended Central disposition.
- `command-shape-friction.json` — canonical GHDEV-10 command-shape friction ledger.

## Sanitization

No raw query text, fact text, source excerpt, credentials, private worksheet bytes, or raw
model messages are in this packet. Source refs (`opencode:ses_...:message/msg/tool:call_...`),
episode UUIDs, evidence classes, and SHA256 digests are the identity surface. Full private
evidence (replay-raw.json with complete fact texts and command lines, A4 harness, focused
suite log) is retained at `0600` under `/tmp/opencode/issue81-git-procedure-private/` on the
host, not published here.

## Historical scores (immutable)

- Frozen original: **8/16**
- Post-S06 native: **9/16**
- Prior exact-head exposed offline (PRE_FIX_HEAD 0a4879f, evidence commit 93ed977): **12/16**
- This run (staged 5d6b285): **13/16** — candidate-only exposed diagnostic, NOT native acceptance.
