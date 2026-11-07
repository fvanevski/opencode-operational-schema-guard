# Issue #81 — Git-procedure source-selection fix: final host qualification contract

CAMPAIGN=ISSUE81_GIT_PROCEDURE_SELECTION_V1
PRIMARY_AGENT=build
REPO_ID=fvanevski/opencode-operational-schema-guard
ISSUE_NUMBER=81
DRAFT_PR=89
IMPLEMENTATION_BRANCH=issue/81-source-recall-correction
IMPLEMENTATION_SHA=verify exact remote working-branch head containing this document; kickoff provides full SHA
MAIN_BASE=9a27b73de882c0af6fec4d86de81945338611479
PRE_FIX_HEAD=0a4879fe626106b0d0bbc57079e82cee140b56c1
EVIDENCE_BRANCH=issue/81-recall-acceptance
EXPECTED_EVIDENCE_HEAD=4debc580a8df39395da06a1a357886b77c4d179e
EVIDENCE_ROOT=docs/issue-78/evidence/81-git-procedure-selection-v1
PRODUCTION_GROUP=development-knowledge
PRODUCTION_PROJECT=gh_mcp
PRODUCTION_WORKSPACE=/workspace/mcp_servers/gh_mcp
GRAPHITI_ENDPOINT=http://127.0.0.1:8766/mcp

## Objective and controlling product decision

Complete ONE consolidated source-specific validation + exposed offline replay for the centrally staged S10 fix on the EXISTING draft PR #89. Do not initiate another causality campaign, new PR or wider scoring-policy redesign. The previous run at PRE_FIX_HEAD was exact-source 12/16, threshold >=13/16, with all tests and safety controls passing but S10 wrong-source. Frozen original 8/16 and post-S06 native 9/16 are immutable. The latest offline source-score is a candidate-only exposed diagnostic, not native acceptance. Human durable precision >=0.90 remains operator-adjudicated and UNVERIFIED.

Evidence commit 4debc580a8df39395da06a1a357886b77c4d179e establishes the specific S10 failure:
- Real selected source is a Git worktree-setup command sequence with "git -C <path> worktree add", rev-parse and status. Its output incidentally repeats a commit's subject. The old procedural detector only identified adjacent "git worktree" and incorrectly rewarded "add".
- Correct expected source is a genuine abbreviated-SHA-prefixed conventional commit subject about a change to the Graphiti test suite. Its change verb is "reject", absent from the old action verb lexicon, so it previously received no bonus.
- The current Central change recognizes git -C procedural commands and common worktree operations before any commit-effect scoring, and recognizes conventional SHA-prefixed commit-subject syntax independently of individual change verbs.
- This is a content-based answer-type ranker ONLY; it does not admit new facts, alter source/group/episode/Issue/numeric/named-entity fences, change timeout/caps, or choose by known source ref.

S03/S05/S13 are properly rejected on NAMED_IDENTITY: the requested named entity is absent from the positively persisted assertion and its source-linked original event excerpt. They must NOT be rescued by a threshold waiver or an answer-preference bonus. This campaign must not fabricate a 13/16 PASS.

## Allowed host work and limits

Primary Build through the existing OpenViking-managed OpenCode shim. Authenticate the exact remote source first, fetch that exact ref before local object/worktree proof and work only in a fresh isolated worktree. Do not reset/clean/rebase/move the operator checkout or untracked files.

CPU-only: source review, syntax, Node suites, exact frozen roster/source-index verification, private host replay and sanitized evidence. Service-backed read-only: existing Graphiti search_memory_facts/get_episodes at the current effective group; serial MCP requests. Embedding may use GPU implicitly; no new model server or competing inference/gate lease.

Local agent may autonomously resolve ordinary command, shell, scratch-dir, fixture, parser and mechanical private runner faults; must preserve producer exits. Substantive code, relevance-policy, test/assertion weakening or production behavior edits are Central-owned and NOT authorized to the agent.

Never install/deploy an unmerged candidate, change service/plugin/config, mutate Graphiti/curator/queue, bypass OpenViking EX gate, fill operator human precision verdicts, rewrite frozen results, create PR/merge/close issue, or change implementation branch. Only ONE evidence-only commit on EVIDENCE_BRANCH after exact CAS proof, if authorized by current ref.

## Phase A — exact source and deterministic test qualification

1. Independently authenticate GitHub main, PR #89 draft/OPEN, branch, exact kickoff commit SHA, parent/tree and COMPLETE current diff, plus the controlling handoff blob. Validate no protected control-plane changes and read the actual relevant source and test code.
2. Inspect and prove no change to relevanceSignals eligibility, named/Issue/numeric fences, Graphiti remote-positive episode membership, curated native-id scope, safeText, 24 final candidates, single-fact output or 300ms Promise.race.
3. Confirm answerTypeSupport is ranking-only and now handles:
   - a1b2c3d test(graphiti): reject ... (conventional subject)
   - git -C /path worktree add ... and git -C /path rev-parse ...
   - git -C "quoted path with spaces" checkout ...
   - transcript that echoes the subject after command execution
   - non-effect queries with no bonus
   - wrong named product, Issue or numeric ID still rejected even with a valid conventional subject.
4. Run node --check on every new/changed .mjs script/test; then the complete directly implicated focused suite (preserve exact producer exits):
   node --test \
     docs/issue-78/v2-curator/curated-recall-candidates.test.mjs \
     docs/issue-75/v2-candidate/relevance.test.mjs \
     docs/issue-75/v2-candidate/relevance-priority-regression.test.mjs \
     docs/issue-75/v2-candidate/relevance-observation-replay.test.mjs \
     docs/issue-75/v2-candidate/memory-core.test.mjs \
     docs/issue-75/v2-candidate/plugin-behavior.test.mjs \
     docs/issue-78/v2-curator/production-cutover.test.mjs \
     docs/issue-78/v2-benchmark/issue81-retrieval-feasibility.test.mjs \
     docs/issue-78/v2-benchmark/issue81-admission-audit.test.mjs
   Also include the directly implicated existing curator/candidate source provenance suites if required by repo conventions. Capture actual TAP count, failures and process exit separately. An authentic failing regression BLOCKS review; do not reinterpret it as a host harness issue without evidence.
5. Trusted exact-head repository-final-v1 receipt, if complete, may be reused rather than rerunning the same broad repository suite in the local harness. The docs-specific suites above are not automatically covered by root CI.

## Phase B — one source-correct exposed 16+4 replay

6. Reauthenticate the immutable private frozen roster SHA256:
   47e141bdc81f1f2cdc2e98c7697162dbbf3250a5eb209a56361b358bc2441652.
   Verify expected episode UUID/source refs and the original 12/16 control packet; never alter input identities or use case-conditioned ranking.
7. Reverify effective deployed config and curator root /home/filip/.local/state/ghdev-graphiti. Read current persisted source-index state, verify exact group/project/workspace and positive native-id source anchors. Live read-only Graphiti get_episodes must return a group-pure, structurally complete, untruncated list positively confirming expected episode UUIDs; a local persisted receipt alone is insufficient. Treat current corpus growth as drift in the diagnostic population, not an excuse to change expected refs.
8. Run exactly ONE complete source-bound Memory.search offline replay using the staged modules, actual current remote Graphiti search and serial get_episodes, and the source-verified indexed-curator path. Use the same trusted private runner shape as the previous control; fix only PRIVATE harness mechanics if necessary.
9. For S10, preserve private full fact text and command line but report sanitized: whether the actual expected source's conventional subject is recognized, whether the selected incidental git -C worktree transcript is procedural, answerType 1 vs 0, relative priority/overlap and final chosen exact source ref. Confirm result independent of input order through generic tests; do not hardcode known call IDs/source refs into ranking.
10. For S01–S16, record actual selected/expected source UUID/ref/evidence class, exact-source verdict, changed status from 12/16 control, S06 historical source precedence and any regression. N01/N03/N04 must remain PASS_NO_INJECTION; N02 retains its original FAIL_INJECTED same-group policy assessment, never misstate cross-group leakage. Record false claims/private/group violations as independent hard blockers.
11. Report new exposed exact-source n/16 and strict ratified >=13/16 result. If score still below target, return the one earliest proven remaining defect and stop; do not waive named-entity identity or stage another diagnostic.
12. Capture native/source-instrumented timing if directly available, otherwise separate p50/p95/max and sample population for Graphiti d24, get_episodes, curated source resolver and total Memory.search. Note first-call transient spikes and censored cases. Report HOOK_P95=UNVERIFIED unless native hook boundaries were instrumented. The 300ms hook allowance must remain unchanged and a persistent latency regression blocks review.

## Phase C — one sanitized publication and one handback

13. Read-only verify the existing 126-item operator precision packet/worksheet and ratified target; all human verdict fields remain null until real operator adjudication. HUMAN_PRECISION=UNVERIFIED.
14. Prepare ONE sanitized evidence packet under EVIDENCE_ROOT, for example:
    README.md
    source-and-tests.json
    16-case-replay.json
    s10-procedural-vs-subject.json
    remote-proof-and-latency.json
    safety-and-precision.json
    central-disposition.md
    command-shape-friction.json
    SHA256-MANIFEST.txt
   Consolidate files if helpful; no raw query/fact/excerpt/credentials/private worksheet or raw model messages in Git; preserve private full evidence at 0600/0700.
15. Re-read EVIDENCE_BRANCH immediately before publishing; require EXPECTED_EVIDENCE_HEAD exactly, or report STALE and retain private evidence. Non-force ONE evidence-only commit under EVIDENCE_ROOT; independent readback of remote branch SHA, commit parent, exact path inventory and manifest digests. No implementation branch write.
16. Return one compact but complete handback with:
    CAMPAIGN, RESULT, source commit/tree and file digests, focused tests true exit/count, trusted receipt; remote proof/corpus size; complete 16+4 source-correct verdicts and exact expected/selected source identities; S10 actual procedural and commit-subject predicates, original 12/16 vs new score, explicit 13/16 gate; S03/S05/S13 preserved named fences; N02, S06 and privacy/group checks; timing p50/p95/max and HOOK_P95; human precision status; PR89_HOST_REVIEW_READY yes/no; evidence commit/parent/readback; canonical GHDEV-10 COMMAND_SHAPE_FRICTION with actual event provenance and no masked producer exit; unexpected host changes and stop boundary.

If 13/16 is achieved with no test/safety/authority regression, report PR89_HOST_REVIEW_READY=yes and finish. This is permission for Central to begin independent exact-head PR review, NOT merge, installation or final native acceptance. If below target or performance/security gate blocks, report the demonstrated defect and finish. Do not start another subcampaign.

## Delivery

This GitHub file is the sole complete controlling agent handoff; the ChatGPT operator-facing kickoff must be short and refer to this exact branch/commit/path without reproducing this detailed text.
