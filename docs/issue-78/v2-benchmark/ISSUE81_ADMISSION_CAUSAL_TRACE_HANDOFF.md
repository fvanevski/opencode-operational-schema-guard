# GH dev Issue #81 — Exact admission-cause and tie-break trace (complete Build contract)

CAMPAIGN=ISSUE81_ADMISSION_CAUSAL_TRACE_V1
PRIMARY_AGENT=build
REPO_ID=fvanevski/opencode-operational-schema-guard
ISSUE_NUMBER=81
PR_NUMBER=89
IMPLEMENTATION_BRANCH=issue/81-source-recall-correction
IMPLEMENTATION_SHA=authenticate exact commit containing this contract; kickoff provides full SHA
CONTROLLER_BASE=9a27b73de882c0af6fec4d86de81945338611479
PRE_DIAGNOSTIC_SOURCE_HEAD=0a62d220edd5d7f814dbb736f51e373ade2d0e89
EVIDENCE_BRANCH=issue/81-recall-acceptance
EXPECTED_EVIDENCE_HEAD=93ed977d5000f0caf02be1d01aa63ab4b1112635
EVIDENCE_ROOT=docs/issue-78/evidence/81-admission-causal-trace-v1/
DIAGNOSTIC_SCRIPT=docs/issue-78/v2-benchmark/issue81-admission-audit.mjs
DIAGNOSTIC_TEST=docs/issue-78/v2-benchmark/issue81-admission-audit.test.mjs
CURRENT_GROUP=development-knowledge
CURRENT_WORKSPACE=/workspace/mcp_servers/gh_mcp
CURRENT_PROJECT=gh_mcp
CURRENT_GRAPHITI_MCP=http://127.0.0.1:8766/mcp

## Purpose and authority

One exact-source, CPU-only diagnostic and decisive Central handback, not another full search/benchmark campaign. An independent review of the preceding operator evidence found a *material causal classification conflict*:

- Published residual analysis calls S03 and S13 “below the 0.34 topical floor.”
- The staged automatic recall path is Memory.search -> shortlistQualifiedCandidates -> linkedSourceSignals -> relevanceSignals -> relevanceFilter.
- relevanceSignals only requires overlap.count>=2 plus named/Issue/numeric/independent topic checks. It does NOT enforce the admitFact() 0.34 floor. admitFact() is a separate on-demand helper.
- Therefore DO NOT lower 0.34, waive named IDs, score S03/S13 as resolved, or invent source changes until the actual missing predicate is identified.
- S05 may fail a named/issue/numeric/independent topical fence, but the exact predicate has not been source-proven in the sanitized evidence.
- S10 may be an irreducible exact-metric tie between same-session sibling tool sources. Candidate input-order alone cannot prove proposition correctness.

The previous exact-source exposed offline score is 12/16, below immutable ratified 13/16. Prior 8/16 frozen baseline, 9/16 post-S06 native, and 11/16 preceding offline remain unchanged. S06 historic/superseded preference must remain protected. N02 remains frozen FAIL_INJECTED and no cross-group leakage is inferred from a fact discussing a former group.

The Central diagnostic source and tests have been committed on this SAME PR branch:
- docs/issue-75/v2-candidate/relevance.mjs adds explainRelevanceAdmission() (pure, text-free reason-code return; no production selector change).
- docs/issue-75/v2-candidate/relevance.test.mjs proves a 2/6=.333 candidate is accepted by the automatic path even though admitFact() rejects it, and checks named/Issue/numeric/link-source behavior.
- DIAGNOSTIC_SCRIPT imports the ACTUAL relevance and privacy functions; it emits no raw query, fact, excerpt or source reference, only case IDs, SHA-256 identities, reason-code booleans/counts and pairwise order comparison.
- DIAGNOSTIC_TEST proves pure behavior, source-text non-disclosure and safe handling of malformed/private facts.

No production recall policy, source persistence, endpoint, threshold, output shape, native timeout or test gate may be changed by this campaign.

## Execution authority

Allowed:
- Fetch and inspect exact GitHub source and evidence.
- Isolated, collision-free CPU worktree at exact commit (do not reset/clean/checkout owner's primary worktree).
- Run focused Node tests, inspection of frozen private user prompts and authenticated scoped persisted source events.
- Read-only Graphiti get_episodes only if necessary to reconfirm positive identity in a changed host snapshot. No other Graphiti query needed for this trace.
- Disposable private adapter, one bounded diagnostic run, bounded private argument/format corrections; compile one clean sanitized 4-case matrix.
- At most one evidence-only commit on EVIDENCE_BRANCH under EVIDENCE_ROOT with exact CAS and readback.
- Autonomous resolution of standard shell, isolated scratch, Node and private adapter issues, without Central approval for incidental mechanics.

Forbidden:
- Production code changes, even “minor” relevance adjustments; implementation-branch push or PR rewrite.
- Moving benchmark targets, normalizing assertions to a known expected answer, test weakening, broad reranker/embedding tuning, new native/GPU acceptance campaign.
- Graphiti writes, curator mutations, source-index modifications, model-service starts, EX lease bypass, group migrations or service restart.
- Export of raw private prompts, source assertions, event excerpts, credentials, operator worksheet or human-precision verdicts to GitHub.
- New PR, merge, issue closure or a parallel diagnostic campaign.

No local agent may supply the substantive semantic algorithm fix; Central will implement it on PR #89 after this causal proof.

## Phase A — exact identity and focused source checks

1. Independently read current GitHub PR #89, main and evidence refs, authenticate exact kickoff SHA and that this contract/diagnostic/tests are in its immutable tree. If branch moved, stop STALE rather than silently following a different head.
2. Fetch the current implementation ref FIRST and prove it equals the kickoff exact SHA before local object/worktree checks.
3. Authenticate prior published packet at evidence commit 93ed977d5000f0caf02be1d01aa63ab4b1112635. Its main facts: 58/58 targeted tests PASS, exact-source offline 12/16, all five expected episodes remote-present, and four unresolved S03/S05/S10/S13. These are not replaced.
4. Run:
   node --check docs/issue-75/v2-candidate/relevance.mjs
   node --check docs/issue-78/v2-benchmark/issue81-admission-audit.mjs
   node --test docs/issue-75/v2-candidate/relevance.test.mjs docs/issue-78/v2-benchmark/issue81-admission-audit.test.mjs
   Capture true shell exit and TAP count. Run the already approved additional suites only if a changed source boundary requires it; no need to duplicate a trusted exact-head repository-final profile.
5. Confirm the diagnostic does not mutate or call remote services; validate literal imports and that output contains neither raw prompt/fact/sourceContext nor source ref text. This is a correctness and confidentiality condition.

## Phase B — assemble exact private source-bound cases

6. Re-authenticate frozen roster SHA256:
   47e141bdc81f1f2cdc2e98c7697162dbbf3250a5eb209a56361b358bc2441652
   and exact four case questions/expected episode UUIDs:
   S03 082fe673-8cf9-4da1-bc43-aaa9e04f68d8
   S05 1a20d974-b5a7-4367-8da5-8c9d7dbb06c5
   S10 0de3cdc8-07ff-46a5-a0bc-ed7f9bc5e47b
   S13 009974d2-f051-45fd-ac0c-f259dcfdd1a8
7. For each case, obtain the *actual* expected persisted assertion and its **exact native-source-anchored** source excerpt from the positively persisted review record and source index. Obtain the ACTUAL wrong selected candidate's assertion/source excerpt using the prior 12/16 offline matrix and its selected exact source ref. Do NOT reconstruct or paraphrase these texts from case names.
8. Assert both candidate records have:
   - exact group=development-knowledge, workspace=/workspace/mcp_servers/gh_mcp, project=gh_mcp;
   - status=persisted with unique, valid remote UUIDs in the curator index;
   - original source_refs backed by native-id events of same evidence class;
   - actual expected selected source refs equal the previous sanitized matrix;
   - no private/secrets markers under safeText before using the audit.
   If any source binding is incomplete, mark that case UNVERIFIED and report the missing evidence, never substitute a guessed record. Current Graphiti get_episodes may reconfirm remote presence if live index has changed; it is read-only.
9. Build exactly one private JSON adapter (mode 0600 in a new mode-0700 scratch dir):
   {"cases":[
     {"case_id":"S03","question":"EXACT FROZEN TEXT",
      "expected":{"fact":"EXACT PERSISTED FACT","source":"opencode:...","sourceContext":"EXACT NATIVE EVENT EXCERPT"},
      "observed":{"fact":"EXACT SELECTED FACT","source":"opencode:...","sourceContext":"EXACT NATIVE EVENT EXCERPT"}},
     ... same shape for S05,S10,S13
   ]}
   SourceContext is optional only if no verified native event excerpt exists; do not invent it. Validate adapter source SHA256, restricted permissions, and zero changes to original private inputs. Do not commit the adapter.

## Phase C — run the one pure trace and evaluate causes

10. Execute exactly one:
    node docs/issue-78/v2-benchmark/issue81-admission-audit.mjs --input PRIVATE_ADAPTER.json
    Capture literal exit code, stdout and stderr in the private scratch directory. If genuine file/schema problems arise, perform bounded private adapter correction and rerun once; no production script editing or acceptance tuning.
11. Cross-check explainRelevanceAdmission().admitted against current shortlist-qualified source admission with exactly the same candidate object. A mismatch is a diagnostic defect and stops causal conclusions; report source + reproduction.
12. For S03/S05/S13, return:
    - direct and source-linked overlap counts/ratios;
    - NAMED_IDENTITY, ISSUE_IDENTITY, NUMERIC_IDENTITY, INDEPENDENT_TOPIC, NO_SUPPORTED_ADMISSION_PATH pass/fail using exact source;
    - whether the linked fallback prerequisite (direct overlap >=2, exact identity in asserted fact) was met;
    - first *actual* rejection predicate and source-backed reason;
    - whether sourceContext is original native evidence or merely an unrelated excerpt.
    Do not interpret overlap.score 0.333 as a veto when the actual path does not enforce 0.34.
13. For S10, compare the expected and observed actual assertions, native source event classes, source time/order and facts without copying content to GitHub. Identify whether their stated propositions are genuinely distinguishable by user question. Report both shortlist and final selector pairwise order outcomes. If metrics are equal and selection flips when input order reverses, classify INPUT_ORDER_AMBIGUITY; never substitute episode UUID sorting as proof of correctness. If one source's evidence supports the requested proposition while the other does not, classify that as an independently inspected proposition difference. Source ref identity alone is NOT relevance evidence.
14. Provide Central with **one bounded, generalizable correction proposal** tied to the first truly failed predicate, with adversarial negative tests required. No user-facing rename, threshold adjustment, source-context authority upgrade, wrong-group/secret leak, fabricated source facts, or immutable score alteration.
15. Do NOT launch another full native, fresh-client, or 20-case offline replay during this diagnostic: it cannot establish improvement while production selector behavior is unchanged.

## Phase D — sanitized evidence and one handback

16. Publish a small sanitized packet under EVIDENCE_ROOT:
    README.md
    admission-reason-matrix.json
    s10-tie-authority.json
    central-diagnostic-disposition.md
    command-shape-friction.json
    SHA256-MANIFEST.txt
   Retain adapter, raw private fact/excerpt material and complete local logs privately. Use digests of source refs and query text, no raw source strings in Git. Source event class, reason codes and boolean identity-match flags are permitted.
17. Re-read evidence branch remote head immediately before publication; require it equals EXPECTED_EVIDENCE_HEAD. One non-force evidence-only commit at most; no PR, merge or issue closure. Read back exact new remote commit parent, changed paths, manifest and content digests. If remote moved, stop publication STALE and return local packet without force/rebase.
18. Return complete one-shot handback:
    CAMPAIGN; RESULT; IMPLEMENTATION_HEAD and exact test outcomes; ROSTER_SHA; private adapter SHA;
    four case source/remote index identity status; actual direct and linked reason codes; explicit verification that .34 is NOT in the automatic selector; S10 pairwise ambiguity and proposition evidence class; safety/authority status; one recommended Central correction with negative regressions; unchanged 12/16 exposed and 9/16 native historical scores; HOOK_P95=UNVERIFIED; HUMAN_PRECISION=UNVERIFIED; evidence commit/parent/readback; canonical GHDEV COMMAND_SHAPE_FRICTION with requested/effective commands/provenance; unexpected host changes and stop boundary.

## Completion discipline

This is the last bounded evidence-clarification step before Central makes an algorithmic selection decision on the existing PR. One exact four-case readback, one packet, no side campaigns or new PR. If actual private record evidence is insufficient, report the exact blocker and finish; do not change standards, invent a new store or begin unbounded source hunts.

This GitHub document is the complete authoritative handoff. The operator sees only the short kickoff referencing its exact branch/SHA/path.
