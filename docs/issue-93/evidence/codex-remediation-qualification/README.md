# Issue #93 — one consolidated Codex-remediation requalification (evidence)

Sanitized, evidence-only publication. No production/source/test/workflow/config
changes; no new candidate, branch, PR, review, merge, deployment, or issue
closure. One commit on the existing `issue/93` branch.

## Authority

- Controlling contract: `docs/issue-93/LOCAL_AGENT_CONTRACT_CODEX_REMEDIATION_QUALIFICATION.md`
- Approval: `docs/issue-93/APPROVED_CODEX_REMEDIATION_COMPARATOR_EXTENSION.md`
- `REQUIRED_REMOTE_HEAD_SHA = 224c2e1678218c68a1ac7b3b29de87d21cf66e62` (authenticated, matches `origin/issue/93`)
- `TESTED_REMEDIATION_SOURCE_SHA = d40506d15ed2ed2c2c08edcd64995182c197a6d8` (exact source tested)
- Original semantic `69014b739d490f8cb90bce86233edf3054673209`; original B2.2 `4bc169cc59e8900f5dc3cd4d3c70a22d0fcfb9f4`; pre-fix PR head `fd81cd65c43c6e94502696c5cc3ffdc611046f8f`.

## A. CPU — exact-source + focused regressions

- Diff protection `fd81cd6..d40506d`: ONLY `docs/issue-75/v2-candidate/semantic-recall.mjs`
  (strict-anchor requalification) + `docs/issue-93/semantic-abstention.test.mjs` (3 new
  regression cases). `relevance.mjs` and all caller source/group/remote/EX checks are
  byte-identical (blob `relevance.mjs` = `46749f1d…` at both SHAs).
- Codex provenance: external code-review induced (PR #96 discussion_r4577140954), not
  selected by exposed holdout outcomes; the fix postdates holdout exposure (disclosed).
- Focused suites at exact SHA (`node --test`, v26.13.1, isolated worktree): 118/118 pass,
  exit 0 (14+6+10 focused + 31+15+4+12+22+3+1 integration/curator/privacy). See
  `focused-regression-receipts.json`.
- Codex counterexample independently reproduced in the unmodified d40506d source:
  11/11 assertions PASS, exit 0 (`codex-counterexample.json`).

## B. CPU — frozen dev + approved retrospective holdout

- Frozen identities re-verified with the original `freeze-manifest.mjs` algorithm
  (dev / holdout / snapshot all MATCH) (`frozen-identities.json`).
- Dev 18-pos/5-neg source-exact comparison on one identical frozen transport
  (`dev-comparison.json`): strict 13/18, base 15/18, B2.2 15/18, revised 15/18;
  revised no positive loss vs base OR b22, no new gains; N01/N02 abstain; N03/N05 not
  worse. **COMPARATIVE_DEV_GATE = PASS (relative, nonnegative).**
- Single read-only post-exposure holdout replay H01-H04/HN01-HN02, revised labelled
  `POST_EXPOSURE_CODEX_REMEDIATION_EXCEPTION` (`holdout-replay.json`): revised >= base
  and >= b22 for every positive; no new off-topic/secret injection relative to
  comparators; historical once-only B2.2 1/4 + HN01=4 preserved unchanged.
  **COMPARATIVE_HOLDOUT_GATE = PASS (relative, nonnegative).**

### Known gap (bounded)
The absolute secret fences (dev N04, holdout HN02) read 4 and 2 respectively under the
re-captured frozen transport, versus 0 in the original 2026-11-15 capture. All four
authority roles (strict/base/b22/revised) read them identically, so this is a
**frozen-transport drift** (the live read-only Graphiti service now ranks
FalkorDB/secret-adjacent facts into the N04/HN02 query top-24), NOT a revised-candidate
regression. The original byte-identical frozen transport was not persisted, so the
absolute `=0` fence is **UNVERIFIED** (not reproducible); the comparative no-loss/no-new-
injection gate, which is the load-bearing control, PASSES.

## C. Native performance + D12 answer-proof bridge

- Native context hook on the revised d40506d chain: n=20 (6 injected / 10 empty /
  2 error / 2 late), p50=42.53ms, **p95=299.99ms <= 300ms**, max=300.9ms;
  source-attributed to the matching user message, private excerpt omitted,
  max selector JSON 1011 chars (<=1400), max facts 2 (<=5). search RTT ~150ms and
  get_episodes RTT ~37ms measured separately. **NATIVE_PERFORMANCE = PASS.**
- D12 answer-proof bridge: the D12 fact (SERVICE_ACTIVATION_PENDING_OPERATOR,
  tool-reported) is selected **identically** at B2.2 and d40506d (no-anchor and
  with-anchor byte-identical), via the independent-support path (not the new
  strictAnchor logic); source ref unchanged; plugin/host/transport authorization
  unchanged (only semantic-recall.mjs changed).
  **D12_ANSWER_PROOF_BRIDGE = EXACT_SOURCE_BEHAVIOR_EQUIVALENT →
  ANSWER_PROOF_REUSED_WITH_EXACT_BRIDGE.** Carried caveat: the earlier advertised
  `skill` schema was OFFERED_BUT_UNUSED (no tool invoked/result). This is a CPU
  read-only source-equivalence argument, NOT a fresh model-inference PASS on d40506d.

## D. Publication

- CI on the current remote head `224c2e1…` = SUCCESS (3 recent `node-contract` runs);
  `reviewDecision` empty (no approval). After this evidence commit the PR SHA changes
  and exact-head revalidation is required (do not infer CI from this head).
- `SHA256SUMS` covers every published file in this directory.

## Overall result

`RESULT = PARTIAL` — every candidate-specific control PASSES (comparative dev +
holdout gates, native performance, D12 exact-source bridge, counterexample
correction, frozen identities, diff protection, 118/118 focused tests); the single
UNVERIFIED item is the absolute secret fence (N04/HN02 = 0), which is not
reproducible under the drifted live read-only transport and is not a candidate
regression (all roles identical). Central owns any further decision (e.g. a
prospectively re-frozen transport to re-close the absolute fence, or a single
operator-owned serial model validation).
