# Part A — Native gates @ REQUIRED_HEAD 11c37c6be83aa393fcdab26976ace9b96e8db767

Auth: `git merge --ff-only` from d06b1d1 -> 11c37c6 (7 Central commits). Untracked host files preserved.

## Command exits (real producer rc)
| # | command | rc | counts |
|---|---|---|---|
| 1 | node --check events.mjs | 0 | - |
| 2 | node --check long-prompt.test.mjs | 0 | - |
| 3 | node --check finite-batch.mjs | 0 | - |
| 4 | node --check finite-batch.test.mjs | 0 | - |
| 5 | node --check curator-cli.mjs | 0 | - |
| 6 | node --test long-prompt.test.mjs | **1** | 7 pass / 3 fail |
| 7 | node --test candidate.test.mjs | 0 | - |
| 8 | node --test finite-batch.test.mjs | **1** | 64 pass / 1 fail |
| 9 | node --test claim-evidence.test.mjs | 0 | - |
| 10 | node --test ex-admission-proof.test.mjs | 0 | - |
| 11 | node --test issue92-a3-acceptance.test.mjs | 0 | - |
| 12 | python3 test_ex_admitted_node_bridge.py | 0 | Ran 1 test, OK |
| 13 | npm run check | 0 | 35 node --check |
| 14 | npm test | 0 | 524 pass / 0 fail |

## NEW Central tests I was asked to verify
- 4 source-wrapper (OpenViking-context) tests in long-prompt.test.mjs: **ALL PASS**
  (injected tail survives / middle preserves both / memory-only+malformed no authority / secret scan not bypassed)
- 4 exact-quote salvage tests in finite-batch.test.mjs: **3 PASS, 1 FAIL**

## Failure 1 (NEW, from this campaign) — finite-batch.test.mjs:1380
Test: `source-quote salvage retains independently useful exact quote after rejecting normalized inference`
Error: `TypeError: Cannot read properties of undefined (reading 'filter')` at line 1380:46
Failing line: `assert.equal(plan.cluster_outcomes[0].facts.filter(x=>x.utility_class).length,1);`
Root cause: TEST field-name bug. Plan schema serializes `cluster_outcomes[i]` with
`fact_ids` (finite-batch.mjs:1155), NOT `facts`; fact objects carrying `utility_class`
live in the top-level `items[]` (finite-batch.mjs:1162 via planCandidate 438-440).
Source behavior is CORRECT: all prior assertions in the test pass
(persisted=1, graphiti.writes.length=1, episode_body includes `strong`,
source_quote_salvage_outcome.approved=1, plan.source_quote_salvage=true).
Minimal fix (test-only, NO source change):
  line 1380: `plan.cluster_outcomes[0].facts.filter(x=>x.utility_class).length`
     -> `plan.items.filter(x=>x.utility_class).length`
Verified in scratch worktree (wt-fix11c): applying that one line makes the test PASS.

## Failures 2-4 (PRE-EXISTING, failing at base d06b1d1 before the 7 commits)
long-prompt.test.mjs — confirmed 3/6 fail at d06b1d1 (worktree wt-d06b1d1):
- L43 `whole-message privacy, SELF, control, oversized payload and weak-ID gates precede segmentation`
  `assert.deepEqual(accepted(native('{"source":"'+filler.repeat(70)+'"}')),[])`
  -> JSON-object payload not gated before segmentation; returns 6 spans (braces in excerpts).
  Root: events.mjs promptSpans() has no JSON-object/control-payload whole-gate.
- L67 `narrative spans survive surrounding code without storing code segments as user decisions`
  `assert.ok(spans.every(e=>!/[{}]/.test(e.excerpt)))`
  -> code segment `const config = {"token":"example"};` leaks braces into a span excerpt.
  Root: events.mjs promptSpans() does not strip code/JSON fragments per span.
- L86 `long source span is a real native source handle and cannot become a model-invented statement`
  `assert.equal(validateModelDecision(proposal,clusters[0]).ok,true)`
  -> grounded proposal (assertion = 74-char prefix of real excerpt, no evidence_span) rejected.
  Root: core.mjs validateModelDecision->validateDecision grounding path (unchanged file).

## Classification
- 1 NEW test-code defect (finite-batch salvage field name) — non-substantive (test-only; source correct).
- 3 PRE-EXISTING source limitations (events.mjs promptSpans JSON/code gating; core.mjs grounding).
