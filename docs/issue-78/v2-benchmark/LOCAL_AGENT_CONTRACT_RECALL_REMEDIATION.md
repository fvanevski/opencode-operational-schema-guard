# Issue #81 — single host campaign for substantive capture remediation

**Use this exact-file contract, not an abbreviated chat-generated implementation specification.** Central has staged production changes and focused tests to the existing `issue/81` branch / draft PR #83. The local agent's primary role is to run current-source CPU regressions and demonstrate native V2 capture, retained safeguards, prospective data quality and the resulting acceptance evidence. No second implementation PR.

## Input authority and required setup

- `REPO_ID=fvanevski/opencode-operational-schema-guard`; `ISSUE=81`; `PR=83` (draft); `BRANCH=issue/81`
- `REQUIRED_SOURCE_SHA`: supplied in operator kickoff; authenticate against `origin/issue/81` after fetch.
- `BASE_SHA=d7c32f503eaa4cf4c52bb055b434e0ac71b76f45` until reverified.
- Preserve original 57-case dev SHA256 `22ae11e64a7a9c443d6f13a79c363115a28b43a27620e5383449bfe32d9fb5b4`, nine-case exposed holdout SHA256 `f904411e51d0bd9674b7f756f3df5bf44452ca8f63362d75102ceb9df677fce4`, original targets, and human attestation files. Do not relabel historical outcomes. The **85% candidate useful-event recall** remains blocking until a genuinely qualified benchmark meets it; former dev 27/37 and exposed holdout 3/6 remain visible failures.
- Project KB: GHDEV-00/01/02/03/04/07/08/10. Prefer repository-native commands, GitHub exact SHA readback, collision-safe disposable worktree and the supported `OSG-01` workflow. Use Build as primary for host integration; a second Evidence primary is justified only for genuinely independent later installed-process acceptance.
- Original user decision: `chat-fast` must **never request thinking**; alias `enable_thinking=false`, no `reasoning_effort` on it. Thinking tasks use separate `chat-review`/`chat-audit` profiles. Do not mutate LiteLLM or NInfer for this campaign.

## Work package 1 — source and CPU evidence (interactive-safe)

1. Fetch exact branch and base, record full SHAs; use a new disposable detached worktree. Inspect full source and test diff relative to #83 previous head. Do not reset/clean developer worktrees.
2. Run `node --check` on updated `events.mjs`, `plugin.mjs`, `core.mjs`, `evaluate.mjs`, `stage-holdout.mjs` and all newly added tests. Run `node --test docs/issue-78/v2-candidate/{candidate,long-prompt}.test.mjs` and `docs/issue-78/v2-benchmark/{evaluate,stage-holdout,adjudicate,diagnose-capture}.test.mjs` and `docs/issue-78/v2-curator/{curator,model-policy,efficiency-probe}.test.mjs`. Run any unchanged native source/queue/portal tests the project requires; record exit codes and precise tested SHA. Do not weaken a failing test or authority guard for green; return root-cause evidence where a substantive correction is needed.
3. Replay immutable original dev and exposed holdout privately against new source; report **historical 27/37 and 3/6 alongside** new counterfactual confusion matrices and exact case/segment IDs. This is exposed regression analysis, not a fresh blind holdout and not a waiver for missing original `result` bytes.
4. Verify whole-source private marker and SELF suffix veto, bounded source excerpts, original native-ID + span-offset handles, queue event-id validation and multi-span binding, no cross-scope event, source textual exactness and no fake `verified` outcome. Read-only file tool must remain distinct from file_change.

## Work package 2 — actual native stock-V2 product integration

1. Establish actual installed OpenCode V2 version, API shapes, loaded plugin version and current active source/config. **Use isolated temporary group, workspace and state root**, not production `ghdev_gh_mcp` or earlier `cur81_*` groups. Confirm no EX-colliding model process launches while the interactive Build harness remains active.
2. Exercise an ordinary coding session on the **current branch candidate plugin source** through an authorized isolated native plugin-loader route. Do not substitute reconstructed SQLite data for actual events. Collect read-only private evidence for: one >1,100-character user decision with significant information near its tail; one long source with separate code/narrative regions; one long message containing a secret marker late in the input; one SELF-marked text negative; one completed shell failure→fix→success sequence; one out-of-workspace read-only file observation; plus chatter/duplicate/wrong-project negatives. Capture the real `prompt`, admitted `context` and `execute.after` identities, bounded source event excerpts, queue stage/readback and source index. Verify no source-class inflation.
3. Measure admitted native source coverage, candidate fanout, queue growth, p50/p95 *interactive capture latency*, and source span loss. Keep full raw inputs and local credentials only in private `0700` host files and the sanitized public output only event hashes, counts and classifications.
4. Use actual source-first failures to find any defect in Central's staged code. You may repair a **disposable test fixture, native loader interface, scratch harness or private service unit**. For substantive candidate adapter changes, supply a minimal complete diff and failing regression to Central; do not silently implement new source architecture or push product changes.

## Work package 3 — prospective independent quality (one cohesive continuation)

1. Prospectively register a representative real-native development+holdout benchmark **before new result inspection or tuning**. Ensure independence from earlier exposed #81 sources and from each other. Provide full roster with direct, implicit/multi-event, historical, long-user decision, code+prose, shell fail/fix/pass, superseded, negative, secret, SELF, read-only and wrong-group controls. Set source-case-level truth and **span-level source index** identity separately; do not count six spans as six useful original user events.
2. **Human operator briefing is mandatory and must be SELF-CONTAINED.** For any genuine judgment, assemble a private, easy-to-review worksheet/UI showing, for EACH source case or proposed durable fact:
   - actual relevant native source text (or sufficient exact context), event/session/message/call identity, time, project/workspace, source evidence class and any known uncertainty;
   - source-to-candidate and candidate-to-Graphiti lineage where applicable, what was captured/omitted, old vs new behavior, and the reason;
   - proposed useful/irrelevant/privacy/historical label and why; which outcome affects the threshold, risks of accepting a fact, and the recommended disposition;
   - the original acceptance target and relevant denominators, plus alternative decisions and their consequences;
   - direct private local hyperlinks/files or inline excerpts so the operator need not hunt through logs or prior messages.
   Present **one consolidated decision packet**, grouped by shared cause and with suggested defaults, not a stream of decontextualized yes/no questions. An AI may prepare recommendations but cannot sign human verdicts. Explicit operator approval/edits remain required for labels/fact judgments and ratification. If the operator is unavailable, return `READY_FOR_OPERATOR_REVIEW` plus complete briefing, and do not leak or invent verdicts.
3. Freeze original real-native corpus, independently adjudicated labels, registered targets and all hashes. Do not change target ≥0.85 or ≥0.90. The previous holdout is exposed; **do not reuse it as blind**. Do not tune the new holdout after seeing results. If an earlier trained/operated host behavior means independence is impossible, label dataset as diagnostic and provide a new prospective holdout roster before running acceptance.
4. Run a **single bounded** post-exit model/Graphiti qualification on isolated groups, only after EX admission using the existing canonical post-exit wrapper; no unadmitted LLM calls while Build harness active, no second always-on retry loop. Use the non-thinking `chat-fast` alias with no `reasoning_effort` client field, optionally a source-justified bounded `max_tokens`. Record actual model requests/tokens, DEFER/SKIP/EMIT, remote readback with real extracted nodes+edges and exact native cited source refs; preserve ambiguous write/no-replay rules. Post-exit completion may be automatically armed once as part of THIS campaign, not a new design handoff.
5. Independent operator fact-level verdicts after remote extraction must use a second **complete, context-rich** private briefing (verbatim proposed fact, quoted native cited span, omitted context, actual graph episode/relationship, current/historical status, useful/factuality/authority/scope rationale). The operator must not be asked to locate Graphiti records manually. Return before final quality scoring if true human review is unavailable.
6. Compute three-path baseline/broad/post-exit comparison with source-case confusion, per-span selected counts, durable fact precision and recall, source authority, negative-control leakage, duplicate rates, token time and p50/p95. Mark each registered target PASS, FAIL or UNVERIFIED. Do not promote one passing output into full-system PASS without actual fresh native retrieval.

## Work package 4 — one consolidated return

Produce an evidence packet `docs/issue-78/evidence/81-recall-remediation-v1/`: `manifest.json` (SHA pins), `source-and-runtime.md`, `cpu-tests.md`, `native-capture.md`, `prospective-benchmark.md`, `quality-results.json` if human ratification completed, `model-graphiti.md` if EX-drain completed, `operator-decision-summary.md` (only scrubbed verdict counts/identities; private source+signatures stay local), `risks-and-unmet-gates.md`, `handback.md` and GHDEV-10 `COMMAND_SHAPE_FRICTION`. All public artifacts sanitized. Private original sources and human signatures stay on host with sha receipts, never GitHub.

If source, CI/host tests and an independently adjudicated prospective result satisfy pre-merge acceptance, publish **one evidence-only CAS commit** to `issue/81` and return a review-ready handback. If they fail, publish the honest negative/partial evidence (one commit), including a bounded proposed repair with focused regression. **Do not** create a new PR, merge #83, change production aliases/Graphiti/EX, or close #81/#78. Central re-reviews source, refreshes trusted CI on exact new PR head and owns the merge decision after the user authorizes it. **The final installed merged-main fresh-client acceptance remains a separate required post-merge evidence gate**, although an isolated pre-merge native-client probe can be helpful.

## Autonomy and decision boundary

Allowed without new Central round: normal safe readbacks, scratch/fixture repair, private permission updates, bounded local unit/loader correction, source metadata collection, sanitized report formatting, reruns of deterministic tests after test harness issues, and *one* post-exit disposable model campaign. Do not impose arbitrary small ceilings on ordinary source inspection or safe testing. Stop for a demonstrated substantive source invariant violation, irreversible mutation, unknown EX ownership, nonratified operator truth, private data leakage, or an ambiguous remote Graphiti write. A human decision must be requested only after an evidence-complete briefing with explicit recommended choice and consequences. Preserve user agency and never silently ratify.

## Required typed handback

```text
RESULT=REVIEW_READY|PARTIAL|READY_FOR_OPERATOR_REVIEW|BLOCKED
TESTED_FULL_SHA=<full sha>
FINAL_REMOTE_HEAD=<full sha>
CPU_TESTS=<full command/count/exit>
NATIVE_V2_IDENTITY=<binary/source/config and load proof>
LIVE_CAPTURE=<real admitted prompt/tool IDs and span coverage>
SAFE_EXCLUSIONS=<privacy/SELF/scope/read-only>
OLD_FROZEN_RESULT=<dev 27/37 holdout 3/6; immutable>
NEW_DEV_AND_HOLDOUT=<new honest recall numerator/denominator and precision>
HUMAN_REVIEW=<ratified or pending; linked private packet and SHA>
MODEL_POST_EXIT=<EX admission, actual calls/usage/decisions>
GRAPHITI=<episode UUID, source-index, nodes/edges, ambiguity status>
SOURCE_INVARIANTS=<privacy/authority/source identity>
PRODUCTION_NONMUTATION=<readback>
EVIDENCE_COMMIT=<exact SHA or reason absent>
REMAINING_GATES=<actual>
COMMAND_SHAPE_FRICTION=<GHDEV-10 exact ledger>
NEXT=Central independent adjudication on existing PR #83
```
