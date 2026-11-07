# Issue #81 — excluded-echo reranker background: final source-specific review gate

CAMPAIGN=ISSUE81_ECHO_BACKGROUND_REVIEW_GATE_V1
PRIMARY_AGENT=evidence
REPO_ID=fvanevski/opencode-operational-schema-guard
ISSUE_NUMBER=81
PR_NUMBER=89
IMPLEMENTATION_BRANCH=issue/81-source-recall-correction
IMPLEMENTATION_SHA=authenticate exact full remote SHA from operator kickoff containing THIS file
PRE_CORRECTION_HEAD=a78ebb69926e9e4bc2e7d9c036d65501c911294e
BASE_MAIN=9a27b73de882c0af6fec4d86de81945338611479
EVIDENCE_BRANCH=issue/81-recall-acceptance
EVIDENCE_EXPECTED_HEAD=b39631e70d2e5fedb3d6f2d441b4cfc3f71c4e7d
EVIDENCE_ROOT=docs/issue-78/evidence/81-echo-background-review-gate-v1
PRODUCTION_GROUP=development-knowledge
PRODUCTION_PROJECT=gh_mcp
PRODUCTION_WORKSPACE=/workspace/mcp_servers/gh_mcp

## Review scope and independent finding

Central independently inspected the *new* exact PR #89 head after the host-qualified query-echo correction. The prior independently verified packet at EVIDENCE_EXPECTED_HEAD establishes source-correct 13/16 on a 256-episode corpus, 81/81 source-focused tests, no new wrong-group/secret/false-verified admission, genuine S10 source selection, S06 temporal precedence and frozen N02 failure. It is a historical exposed offline result, NOT a new native stock-V2 acceptance. The 126-item operator grounded-precision and native hook p95 remain UNVERIFIED.

Central identified and reproduced one adjacent **blocking optional-reranker invariant** at PRE_CORRECTION_HEAD:
- Automatic selector rankedCandidates() excluded toolQuestionEcho() candidates in its admitted candidates loop.
- But its semantic-choice background was computed first from all scored candidates, including the disqualified tool-question echoes.
- A high-scored excluded tool echo (1.0) therefore raised the background enough to veto a legitimate source-qualified paraphrased decision (0.9), even though it was eligible when compared with a normal background (0.1).
- The same contaminated comparator could propagate via cachedBackground into the final one-fact selection after pre-merge Graphiti reranking.
- This defect did NOT affect the actual production host 13/16 replay because the effective host config has rerankEndpoint UNSET and ranker=null. It does affect a supported optional configuration and blocks exact-head semantic approval until corrected.

Central's minimal correction filters toolQuestionEcho(query,item) from the semantic background computation as well as shortlisted and final admitted candidates. No scoring threshold, source/remote/group/named/Issue/numeric/private gate, source ref, benchmark case ID, 24-candidate limit, one-fact output, shared MCP serialization, 70ms optional proof or native 300ms Promise.race was changed. The new relevance.test.mjs regression exercises optional ranker, cached background, final selection, and verifies an excluded echo cannot affect a supported choice. The preexisting 13/16 ranker-null result should be preserved as historical corroboration, not silently upgraded to a new exact-head replay.

This is a narrowly bounded **immutable review-evidence** campaign. The local agent's primary is evidence; Central owns all semantic code, reviewer judgment and any further correction.

## Environment and authority

Use the existing OpenViking-managed host shim, clean isolated worktree after an authoritative GitHub fetch of the exact branch, and read-only source/tests. Do not change the operator's checkout, untracked files, deployed plugin, Graphiti/curation state or control infrastructure. No GPU/model inference, service restart, Graphiti API calls, full fresh-client benchmark or full 16+4 replay are needed for this ranker-only diff. CPU-only.

ALLOWED: exact remote/source inspection, code checks, focused Node suites, deterministic mocked reranker/source tests, bounded host effective-config readback, small sanitized evidence packet, ONE CAS-guarded evidence-only commit on EVIDENCE_BRANCH at EVIDENCE_ROOT.

FORBIDDEN: source or semantic test modification, implementation-branch push, production plugin/config/service/state mutation, accepted-target changes, test weakening/skip, EX lease bypass, Codex request, formal approval, merge, issue closure, new PR, human precision adjudication.

## Phase A — exact-head authority and scope

1. Independently read current PR #89 and main, fetch exact implementation branch head before any local object/worktree proof; verify kickoff 40-character SHA, base=BASE_MAIN and PR OPEN/DRAFT, source tree and handoff contents. STOP STALE rather than silently following an advanced branch.
2. Compare PRE_CORRECTION_HEAD..kickoff. Require ONLY the explicit relevance.mjs / relevance.test.mjs correction plus THIS host contract. No protected control-plane or unrelated production edits.
3. Inspect current relevance.mjs directly. Confirm toolQuestionEcho() is used in:
   (a) shortlistQualifiedCandidates; (b) final rankedCandidates admission; and (c) the semantic-choice background calculation.
   Confirm both direct and cached background paths reuse the corrected comparator. No source authority upgrade.
4. Confirm unchanged Memory.search/GraphitiMcp and plugin files compared with PRE_CORRECTION_HEAD. Verify the effective installed host rerankEndpoint remains unset/ranker=null; if it is now configured, report scope drift and STOP rather than replaying unstated runtime behavior.

## Phase B — deterministic regression evidence

5. Syntax check the changed relevance.mjs and relevance.test.mjs, preserving actual producer exit code.
6. Run the complete implicated focused suite, capture actual Node TAP counts and producer exit without filter masking:
   node --test \
     docs/issue-75/v2-candidate/memory-core.test.mjs \
     docs/issue-75/v2-candidate/relevance.test.mjs \
     docs/issue-75/v2-candidate/relevance-priority-regression.test.mjs \
     docs/issue-75/v2-candidate/relevance-observation-replay.test.mjs \
     docs/issue-75/v2-candidate/plugin-behavior.test.mjs \
     docs/issue-78/v2-curator/curated-recall-candidates.test.mjs \
     docs/issue-78/v2-curator/production-cutover.test.mjs \
     docs/issue-78/v2-benchmark/issue81-retrieval-feasibility.test.mjs \
     docs/issue-78/v2-benchmark/issue81-admission-audit.test.mjs
   No masking, test skipping, assertion correction or "it should pass" claims.
7. Independently run the **actual production module** through a deterministic in-memory ranker scenario without touching any live service:
   - Query expresses a legitimate past decision, e.g. "What did we settle on for interactive issue map?"
   - A named/source-qualified paraphrased decision (score 0.90, no literal overlap) would be choiceOnly under relevanceSignals.
   - An ordinary unrelated distractor scores 0.10, and a TOOL record that repeats the full query scores 1.00.
   - With and without the echo, the semantic-choice background must remain 0.10 and the paraphrase must be admitted. The disqualified echo must not appear in ranked output.
   - With cachedScores and cachedBackground from rankQualifiedForMerge, final relevanceFilter still selects the paraphrase with only one initial ranker call; no second HTTP request.
   - A non-echo unrelated high-scored distractor is not automatically ignored merely because it is inconvenient; preserve the original background safety test. Wrong-group/secret/Issue/numeric/name and source-type distinctions remain enforced by existing tests.
8. Reconfirm current shared-client FIFO and Codex P1/P2/P2 focused regressions in the existing suite. Do not launch a new 20-case replay for an optional branch not enabled on host.
9. Reuse the trusted exact-head repository-final-v1 Actions receipt if Central provides it. Do not duplicate root npm check/test locally only to produce a second equivalent check. Explicitly separate the trusted receipt from docs-specific host tests.

## Phase C — one evidence packet, stop

10. Authenticate prior published 13/16 evidence packet and its unchanged 256-episode cohort and roster SHA256:
    47e141bdc81f1f2cdc2e98c7697162dbbf3250a5eb209a56361b358bc2441652.
    Treat it as prior-head corroboration only; no new ranker-null replay result is claimed.
11. Record HOOK_P95=UNVERIFIED (300 ms remains binding); HUMAN_PRECISION=UNVERIFIED (126-item operator worksheet with all verdict fields null). No new native read or human evaluation is authorized.
12. Assemble ONE sanitized packet under EVIDENCE_ROOT, e.g. README.md, exact-source-and-tests.json, reranker-echo-background-proofs.json, review-readiness.md, command-shape-friction.json and SHA256-MANIFEST.txt. No raw private source data, prompts, token/credentials, worksheets, host logs or full private fact text.
13. Immediately before publication, re-fetch EVIDENCE_BRANCH and require it equals EVIDENCE_EXPECTED_HEAD. At most ONE non-force evidence-only commit confined to EVIDENCE_ROOT. Independently read back remote head, parent, diff inventory and every SHA256 manifest digest. If moved, STOP STALE without force/rebase.
14. Return ONE consolidated handback: CAMPAIGN/RESULT, exact PR head/base/tree, two changed source/test blobs and handoff blob, source inspection of all three echo gates, actual focused TAP counts and producer exits, deterministic ranker test with score background/cached choice, unchanged ranker-null configuration, historic 13/16 attribution, authoritative CI receipt, Codex P1/P2/P2 and safety regressions, native/human gate status, evidence SHA/parent/readback, GHDEV-10 command-shape ledger, unexpected host changes, review-ready yes/no and stop boundary.

## Central next decision

If all source/tests/invariants pass, return HOST_REVIEW_READY=yes for Central to conduct the final fresh exact-head semantic review, adjudicate old Codex threads and decide whether the remaining manual Codex request (1 of 2 already used) is warranted. That is NOT permission to mark ready-for-review, formally approve, merge, install, migrate or close issue. Do not initiate any of those actions from the local host.

If any stage fails, report the concrete source/test failure without modifying production or expanding scope. Finish after one packet, no side campaigns.

The complete authoritative agent handoff is this exact GitHub file. The operator sees only a concise kickoff with repo, branch, full exact SHA and handoff path.
