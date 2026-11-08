# Issue #81 / PR #90: consolidated final pre-merge release preflight

CAMPAIGN=ISSUE81_PR90_FINAL_PREMERGE_HOST_PREFLIGHT
PRIMARY_AGENT=build
REPO=fvanevski/opencode-operational-schema-guard
ISSUE=81
PR=90
BRANCH=issue/81-semantic-recall
SOURCE_COMMIT=b0c810edd8457302aed3cb6b23f2a708585e6843
CONTROL_MAIN=6e5695da91974447c718e99757bc8a84d9de3e9d
EXPECTED_GROUP=development-knowledge
EXPECTED_WORKSPACE=/workspace/mcp_servers/gh_mcp
EXPECTED_PROJECT=gh_mcp
GRAPHITI_ENDPOINT=http://127.0.0.1:8766/mcp
SOURCE_AND_CONFIG_MUTATION=forbidden
GITHUB_MUTATION=forbidden
GRAPHITI_MUTATION=forbidden
PRODUCTION_MUTATION=forbidden
EVIDENCE_PUBLICATION=private handback only

## Scope and already accepted evidence

The SOURCE_COMMIT is the immutable source-and-test identity for this handoff. A subsequent Central documentation/evidence commit contains THIS contract and the sanitized AI precision receipt; it must not alter any source/test blob. In the operator kickoff, the complete current PR head and tree bind the checkout. Ref changes or a source-blob mismatch invalidate this preflight.

Evidence already obtained at source-equivalent head: one full frozen 16-positive/4-negative serial shadow replay, semantic source-exact 13/16, strict source-exact 12/16, no strict→semantic regressions, N03/N04 0/0, and known N01/N02 same-group irrelevant-context cost. Native-hook p95 and assembled model request are NOT accepted. Focused Node 6-file suite 65/65 and exact source-head root Actions 524/524 have passed; do not rerun identical expensive work when source and test blobs and the trusted CI profile are unchanged. Central's private 126-item AI verdict ledger, based on the uploaded private source bundle, reports source-grounding/authority/scope 123/126 (conservative 119/126), with a user-authorized AI reviewer waiver; see evidence/issue81-semantic-recall/central-ai-operator/adjudication-receipt.json. Keep 33/126 potentially useful as a separate concern, not part of the original precision threshold.

Issue #81's *descriptive Graphiti fixture naming* is ALREADY in main via merged PR #83. Do not regenerate/relabel/migrate fixtures. Existing docs/issue-78/fixture-groups.mjs and FIXTURE_GROUP_NAMING.md are governing. The Node 26 '--private-env-file' correction and recovery-group consumers are already present. Preserve historical cur80_*/cur81_* persisted identities and the active development-knowledge production group; retire nothing.

## Execute one read-only, host-bound preflight

### 1. Authenticate one candidate and the current live host

- Verify local detached worktree at the exact kickoff PR commit/tree; the PR head must match GitHub branch and main must match CONTROL_MAIN (or report STALE and stop; no rebase, force push, checkout repair or alternate branch).
- Source diff from SOURCE_COMMIT to the kickoff document-only head must contain ONLY this Central contract and sanitized adjudication receipt. The eight module blobs below must be identical between those two commits.
- Read the current user-profile generated and source configuration, installed plugin file-tree and loader resolution, native OpenCode version, plugin activation status, running Graphiti endpoint and applicable user-systemd units; report current observations rather than extrapolating earlier runtime epochs. Do not expose credential values.
- Check currently installed group/workspace/project bindings and whether Graphiti plugin files are regular copies, links or release directories. Do not change config, units, services, EX admission, capture or drain.

### 2. Produce a minimal exact-blob deployment plan (NO promotion)

Candidate repository-relative module paths and Git blob IDs at SOURCE_COMMIT:

| File | Git blob SHA |
| --- | --- |
| docs/issue-75/v2-candidate/memory-core.mjs | bb2ed4e72e36396566c0fca9baad6bc263c2b297 |
| docs/issue-75/v2-candidate/plugin.mjs | c62fc0262b23998ae95a9e5184059b2d3c2b581b |
| docs/issue-75/v2-candidate/semantic-recall.mjs | 7cc1f511253993f3fe0984630121e35f7395b9fb |
| docs/issue-78/v2-candidate/plugin.mjs | 6fe22c38d6bef308c4fe47e73ba0137f789ed4c8 |
| docs/issue-78/v2-curator/curated-recall-candidates.mjs | b9541ee69c898ceb285bf8bc835dc275994dae41 |
| docs/issue-75/v2-candidate/relevance.mjs | 46749f1d8fbe37ac97b79ffba711e115897a07d6 |
| docs/issue-78/v2-curator/sourced-recall.mjs | 8fe809f73bd9435098a5a0f2fe130c1581fe63ec |
| docs/issue-78/v2-curator/core.mjs | c0cc7f9c15918e14598b3b8977288bf5338a9020 |

Distinguish CHANGED/NEW from unchanged dependencies, and identify the *minimal coherent deployed plugin tree* given actual installed imports/paths. The eight-blob list is a bound comparison inventory, not an instruction to overwrite all eight indiscriminately. Graphiti fixture-groups.mjs remains unchanged. Compare each relevant installed blob and identify required promotion, source path, destination path, restart/load boundary, generator/config source-of-truth, and backup/rollback action. Never touch unrelated plugins.

Treat source + config as one activation pair; determine how the host actually generates ~/.config/opencode/opencode.json from opencode.base.json/profile and whether the needed recallPolicy/curatedRecall/capture options are present. Do not hot-edit generated config or independently switch capture/EX policy.

Record a reversible same-filesystem staging/promotion approach for later authorization. Read existing *current* install tools/interfaces; V1 scripts/install-live-plugin.mjs is not presumed valid for stock V2. If an unfamiliar installed-tree layout or dirty state prevents a safe plan, return an exact scoped blocker rather than rewriting.

### 3. Host-specific native readiness, without changing installation

- Read-only check the actual Graphiti status and binding, production episode count, group isolation and the native transport's read-only get_episodes interface using current supported client/tool shape. Do not enumerate raw facts into public reports.
- Check OpenViking shim/launcher path, configured hook coexistence, service lifetime and how to start a GENUINELY fresh client/session after promotion. Confirm available Qwen/provider environment without starting a model or altering an inference scheduler.
- Identify a supported, nonsecret observability path for actual *assembled* outbound model request containing [GHDEV_GRAPHITI_CONTEXT], and a defensible measurement for 300ms native-hook p50/p95. Do NOT infer native performance from the 20 shadow Memory.search timing samples.
- Optional: when an already qualified isolated stock-V2 candidate-native smoke route is reusable WITHOUT mutating live plugin/config, run one read-only candidate-loading/context sanity smoke. It is NOT the required post-merged-main fresh-native acceptance. If that route does not already exist or resource contention blocks it, record NOT_EXERCISED and continue; do not invent another service or redesign a probe infrastructure.
- Inspect the existing post-exit curator EX gate and queue/worker service status READ ONLY. Do not start, stop, restart, run drain, clear locks, reconcile unknown writes, submit to Graphiti or increase model load.

### 4. Minimize unnecessary repeat tests

Verify prior exact SOURCE_COMMIT focused test evidence and main/root Actions validity. If source/test blob identity matches exactly, prior 65/65 focused suite and 524/524 source Actions may be reused as their historical proof; separately verify current PR-head (doc-only) Actions pass. Do not conflate those two exact SHAs. If equivalent evidence is missing, run only the six relevant focused Node files, in one invocation, using the current Node executable and a private scratch/log root. Never modify source/tests to make green.

### 5. Return one complete private handback

Report exact local PR commit and source tree, GitHub PR/main identities, current-head CI; actual installed file/config/loader identities; minimal file-by-file promotion manifest; rollback destinations and service restart boundary; native-client/session launch and assembled-request observation strategy; current group/provider/OpenViking/EX status; confirmed risks/drift; code/test equivalence and whether optional isolated smoke ran. Include the complete GHDEV-10 COMMAND_SHAPE_FRICTION ledger.

Produce a private JSON/Markdown report under a bounded 0700 scratch directory, report its absolute path/sha256 if created, scrub secrets and raw facts before handback. Do not publish this packet to GitHub. Do not perform source changes, install, activation, model-backed drain, Graphiti mutation, PR review/approval, merge, issue closure or service restart. Return a single consolidated handback, not a succession of micro-slices.

### Review and next authority boundary

Central owns independent exact-head semantic review, late Codex pass under the two-request PR lifetime cap, and any GitHub review/merge authority. Host preflight is NOT source approval. After the required independent review and explicit merge authorization, the next separately operator-launched Build handoff can activate the exact merged-main source/config pair, preserve rollback and stop. The genuinely fresh native client/session MUST be launched in a separate new acceptance process/session under GHDEV-06. Do not collapse those boundaries into this preflight.
