# Issue #81 — Final bounded source-selection qualification

CAMPAIGN=ISSUE81_COMMIT_IMPACT_SELECTION_V1
PRIMARY_AGENT=build
REPO_ID=fvanevski/opencode-operational-schema-guard
ISSUE_NUMBER=81
DRAFT_PR=89
WORK_BRANCH=issue/81-source-recall-correction
WORK_HEAD=authenticate the exact commit containing this handoff; operator kickoff supplies full SHA
MAIN_BASE=9a27b73de882c0af6fec4d86de81945338611479
PRE_CORRECTION_HEAD=57d25648bb73f86de84009e3f4ead98897d29370
EVIDENCE_BRANCH=issue/81-recall-acceptance
EXPECTED_EVIDENCE_HEAD=d531b1487b954e645ce53f54f62fcee6c2df861d
EVIDENCE_ROOT=docs/issue-78/evidence/81-commit-impact-selection-v1/
GRAPHITI_GROUP=development-knowledge
GRAPHITI_PROJECT=gh_mcp
GRAPHITI_WORKSPACE=/workspace/mcp_servers/gh_mcp
GRAPHITI_MCP=http://127.0.0.1:8766/mcp

## Goal and policy decision

Execute ONE cohesive host qualification of the Central-owned candidate at the exact PR #89 head. Do not start another exploratory campaign or split execution into tiny issue slices. The immutable historical result is original frozen 8/16, post-S06 native 9/16, and prior exact-head exposed offline 12/16. Ratified semantic source-correct target >=13/16, human grounded precision >=0.90, native hook p95 <=300ms, and zero wrong-group/private/false-verified injection remain unchanged.

The four-case causal evidence at commit d531b1487b954e645ce53f54f62fcee6c2df861d proved:
- S03/S05/S13 failed the NAMED_IDENTITY gate. In S05/S13, the requested named entity was ABSENT from both fact and its native event excerpt. S03 had two requested names with only one represented in the fact+excerpt. Therefore Central intentionally did NOT relax the hard named-entity coverage/identity fence; missing proper-name evidence must not be fabricated merely to obtain a benchmark PASS. The 0.34 ratio belongs to a separate on-demand helper, not automatic recall.
- S10 is a distinguishable proposition tie: one source actually states a commit's change, while an unrelated worktree-setup command mentions that same commit. This supports a generic answer-type distinction without source-ID/benchmark-specific preferences.

The new Central production change extends the already-existing answerTypeSupport(query,fact) function: when the user asks WHAT a commit/revision/patch changed, favor a factual description of its effect over procedural git worktree/checkout material. It modifies **ranking only**, after the same relevance/source/identity gates, and is used in both shortlist and final selector. It does not insert a new model, extraction engine, source store, or remote tool call; it cannot admit an otherwise rejected candidate.

Central also corrected one staged diagnostic regression test to verify the exact private-source validation exception, rather than matching an incorrectly capitalized substring. The rejection behavior was not weakened.

**Result may be BELOW target**. Do not forcibly reach 13/16 by relaxing a guard or choosing the frozen source ID.

## Authority / environment

Build primary through the existing OpenViking-managed local OpenCode shim. Fetch/authenticate exact remote branch commit before local worktree/object proof. Use a clean isolated worktree; preserve the primary checkout and untracked files.

CPU: source inspection, syntax, focused tests, original private roster/curated-index source identification, deterministic standalone Memory.search replay and evidence assembly.

Read-only service-backed: existing Graphiti search_memory_facts/get_episodes with the exact group. Serial remote MCP calls; local disk reads may overlap. Existing embedding service may use GPU internally. Do NOT launch a new GPU inference/model server, curator, remote write or full native 20-case campaign against this unmerged PR.

Allowed autonomous local tasks: bounded scratch preparation, private fixture/readback parsing, local launcher/shell correction, exact source-state collection, private replay runner mechanical corrections, and one sanitized evidence publication. Do not delegate substantive production code changes to the local agent.

Forbidden: source/test semantic edits on the PR implementation branch, pushes to that branch, changing installed plugin/config/service, Graphiti CRUD/queue actions, group migrations, EX lock bypass, redefining acceptance or expected refs, filling operator human precision verdicts, creating another PR, merging or closing Issue #81.

## A. Authenticate exact source and tests

1. Verify remote main MAIN_BASE, PR #89 OPEN/draft, remote WORK_BRANCH exact kickoff SHA, and exact immutable handoff blob. Re-fetch before detached worktree creation. Verify control base is ancestor, bound diff, and no protected control plane changes.
2. Read the final answerTypeSupport/relevanceFilter/shortlistQualifiedCandidates source and complete changed test diff. Reconfirm that Issue/numeric/name/source/scope/privacy fences and max 24 candidate/one-fact bound are unchanged. Confirm provenance and sourceContext never emitted as facts, S06 historical precedence still enforced, and no group/episode authority expansion.
3. Run Node syntax checks for all changed/new .mjs code and the COMPLETE focused test suite:
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
   Add only directly relevant existing suite tests for source-bound provenance. Capture raw producer exit/count, no piping that masks failures.
4. Independently assert a generic synthetic commit-change query ranks its "commit fixed/modified" source above a same-commit worktree setup command for BOTH input orders, and that a non-commit-change query does not get this bonus. Check adversarial wrong named product, Issue, numeric ID, secret and wrong-group regressions. No score shortcut based on named original S10 source ref.
5. Reuse the trusted exact-head repository-final-v1 receipt if it authenticates the precise kickoff SHA and remains complete; Central may dispatch it separately. Do not repeat broad profile just for duplicate evidence.

## B. One source-bound exposed offline replay and timings

6. Authenticate the original immutable frozen 16-positive+4-negative roster SHA256 47e141bdc81f1f2cdc2e98c7697162dbbf3250a5eb209a56361b358bc2441652, original selected source refs/UUIDs and existing operator precision packet. Do not modify any frozen input or expected source.
7. Confirm current curated root from effective config and exact group/workspace/project. Revalidate bounded, untruncated, same-group get_episodes positive UUID readback; count persisted local records, source-index UUIDs and actual live remote overlap. Natural index growth is recorded, not hidden. Reject missing/invalid current remote proof.
8. Run one complete serial exposed **Memory.search** replay, using the same trustworthy private runner/corpus/roster from the previous 12/16 campaign and exact staged modules. It must invoke actual source-resolving candidate selection, not a manually injected expected source or a relevanceFilter-only stand-in.
9. Record per case the observed graphiti/index candidates, source class/group, selected source UUID/ref, exact-source match, S06 temporal selection, sourceContext omission, choice reason and any unsupported injection. Report exact PASS numerator /16 and per N01-N04. Preserve original 8/16 and 9/16 and previous exposed 12/16 as historical measurements; this run is a NEW exposed offline diagnostic, not native production acceptance.
10. For S10 in particular, compare the new answerTypeSupport result on the actual expected and incidental worktree candidates. Verify generic commit-effect intent is triggered, positive source content actually contains an impact description, and the final selected source is exact expected regardless of input ordering. If not, report exact predicate/selection failure, do not locally rewrite production code.
11. S03/S05/S13 must NOT become eligible merely due to a relaxed missing-entity gate. Their prior NAMED_IDENTITY failures are correctly guarded unless a separate independently supported alias/source-evidence fact is discovered. Do not treat a mere name absence as a policy defect or artificially promote alternate source-equivalence.
12. Timing: record n/p50/p95/max/censored population for end-to-end Memory.search, Graphiti d24 search, remote membership, and curated index work. Explicitly distinguish process/combined timings from actual 300ms hook instrumentation. If native hook starts/ends are not directly observed, HOOK_P95=UNVERIFIED. A >300ms tail or persistent timeout is a candidate risk; never increase deadline to manufacture PASS.
13. Safety: existing single-fact output, exact source/remote/group/class checks, secret markers, N03/N04 safe-text blocking, N02 historical label, no false-verified claims. Any new wrong-group/private/authority-upgrade injection is a blocker independent of recall score.

## C. One evidence commit, then stop

14. Precision: read-only verify original 126-fact packet/worksheet and ratified targets, ensure all human verdicts remain null. Do NOT initiate another review worksheet or agent-authored adjudication. HUMAN_PRECISION=UNVERIFIED.
15. Prepare one sanitized packet under EVIDENCE_ROOT on the pre-existing EVIDENCE_BRANCH. Prefer:
   README.md
   source-and-focused-tests.json
   replay-matrix.json
   commit-impact-and-safety.json
   latency-and-remote-authority.json
   central-disposition.md
   command-shape-friction.json
   SHA256-MANIFEST.txt
   No raw prompts/assertions/event excerpts/credentials or full model requests in Git. Keep raw private evidence in 0700 dir with 0600 files.
16. Immediately before publication re-read EVIDENCE_BRANCH, require EXACT EXPECTED_EVIDENCE_HEAD (unless Central has explicitly updated it), publish at most ONE non-force evidence-only commit under EVIDENCE_ROOT, and read back remote head/parent/diff/inventory/all file hashes. A race is STALE; preserve private packet, no force/rebase.
17. Return one comprehensive handback with:
   CAMPAIGN/RESULT, SOURCE_HEAD/TREE, full tests/count/exits, trusted receipt, remote verified index count/identity, full 16+4 case matrix and exact source IDs, new offline n/16 and >=13 verdict, S10 intent/answer-type/source selection, unchanged S03/S05/S13 missing-name gate, S06, N02, no private/wrong-group/false-verified source, latency p50/p95/max/methodology and HOOK_P95 if actual, human precision status, concrete remaining defect if any, PR89_HOST_REVIEW_READY, one evidence commit/parent/readback, complete canonical GHDEV-10 command-shape friction and unexpected host changes.

If new exact-source score >=13/16 with no regressions, tests/fences clean and no blocking performance/provenance issue, report HOST_REVIEW_READY=yes. That authorizes Central to begin independent exact-head semantic PR review, **not** native acceptance, merge, or production installation.

If below target or new safety defect, report the exact root cause in this same handback. Do not start a new diagnostic campaign or weaken correctness requirements. One complete host campaign; stop after reporting.

## Delivery rule
This GitHub file is the full local-agent contract. The operator sees only a short kickoff with repository, exact branch/SHA and this file path. The kickoff is not a replacement for these instructions.
