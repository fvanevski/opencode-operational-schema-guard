# Hermes host handoff: #107 B2/B3 exact-head candidate qualification

**Central-owned source is already staged on `issue/107`, continuing draft PR #110.** This contract is host verification, not a request to author an autonomous retry architecture. The operator kickoff supplies the exact full candidate HEAD SHA; stop on branch mismatch.

```text
REPO=fvanevski/opencode-operational-schema-guard
ISSUE=107
PARENT=105
PR=110
BRANCH=issue/107
BASE_MAIN=5efc2c27f9c95da67dfd750f3bcb7877b7d380d5
EXPECTED_HEAD=<EXACT_SHA_FROM_CENTRAL_KICKOFF>
HOST_HARNESS=hermes
PRIMARY=evidence_and_ex_supervision
PRODUCTION_SOURCE_OR_CONFIG_MUTATION=forbidden
GRAPHITI_PRODUCTION_GROUP_WRITES=forbidden
EX_DISPOSABLE_GRAPHITI_TEST=only_when_canonical_admitted
GITHUB_MUTATIONS=forbidden
REVIEW_OR_MERGE=central_owned
```

## Campaign objective

In one bounded campaign, independently validate the **new** source-owned format-sibling reconsideration and source-distinct local corroboration features, including actual host post-exit integration where the canonical lease permits it. Avoid re-running #106's already accepted capture/recall campaign or the #107 paired B1 model comparison. Do not create another PR or separate investigative projects.

## A. Source and host identity

1. Authenticate remote `issue/107` at the exact kickoff SHA; the local older `/workspace/opencode-operational-schema-guard-issue107` worktree was at `95b1944...` during B1. **Fetch before local Git object proof**. Use a separate clean worktree or safely fast-forward the candidate worktree after confirming no dirty user files, retained cohort or ongoing process. Do not reset the existing private frozen B1 data or historical evidence archives.
2. Read completely `docs/issue-107/B1_MODEL_ADJUDICATION.md`, `B2_B3_IMPLEMENTATION.md`, `docs/issue-100/autonomous-policy.mjs`, `docs/issue-78/v2-curator/{core,worker,curator-cli,ex-admission-proof}.mjs` and the existing Python EX wrapper/bridge. Prove candidate Git file blob hashes; do not equate the candidate with the installed live modules.
3. Read-only authenticate the live `development-knowledge` ReviewStore, queue/archive, Graphiti/index counts, source group, OpenCode service/config, OpenViking coexistence, EX/shared process owners, and current curator status. Note existing SHARED lease owners and any held `submission_unknown`/queued remote intents. No production write, replay, config regeneration or reset.

## B. CPU-only regression suite

Run the exact-head focused suites, first with no model/Graphiti access:

```bash
node --check docs/issue-100/autonomous-policy.mjs
node --check docs/issue-78/v2-curator/core.mjs
node --check docs/issue-78/v2-curator/worker.mjs
node --test docs/issue-107/qualification.test.mjs docs/issue-107/corroboration.test.mjs docs/issue-107/sibling-reconsideration.test.mjs docs/issue-107/sibling-worker.test.mjs
```

Reuse, rather than unnecessarily rerun, exact-head Actions CI. Inspect `git diff main...HEAD` and failure diagnostics independently. Required invariants: one parent native origin, distinct atomic child identities; recovered child cannot duplicate accepted assertion; stale revision and non-EX admission fail closed; crash between manifest/child writes restores from the existing bundle; crash after final model-only reservation exhausts; same-origin span not counted as independent corroboration; missing prior positive index refuses linkage; existing remote unknown cannot become automatic replay.

If an actual production defect is found, provide a bounded original-source reproducer and proposed violated invariant, not a local semantic patch.

## C. Real EX test: prepare once, run only when admitted

Prepare ONE disposable, isolated, freshly named source group accepted by the installed fixture-group contract. Avoid `development-knowledge`, `ghdev_gh_mcp` and any existing persisted/reused test group. Verify root/group remote and local initial emptiness before writes and preserve identities afterward. Use source-authenticated safe synthetic evidence; explicitly label it `synthetic_native_shaped`, not a real user session.

Re-use the installed canonical Python wrapper, real lock, accepted `ex_admitted_node_bridge.py`, candidate `curator-cli.mjs`, and current private `curator.env` provider bindings. Verify CLI option shapes from the actual current code: Python wrapper `--autonomous-curation` versus Node CLI `--autonomous-curation on` are not interchangeable. Do not call `runAdmitted` directly outside inherited EX admission.

Qualify a bounded model/Graphiti positive path with normal one-pass baseline:
- Current local `chat-fast` / actual authenticated alias, with source scope and untrusted source text strictly bound.
- One atomic fact per episode; positive exact-group/name Graphiti `get_episodes` UUID and local `_episode-index` readback, not an `add_memory` ACK alone.
- Model-validated original exact quote, evidence class, temporal status, retained provisional/established status, and no injected or wrong-scope promotion.
- At most one or two small fresh fixture origins and a bounded drain. Do NOT force model output or fabricate a successful malformed sibling. Separate model-output metrics from the deterministic mock regression exercising the exact B2 sibling branch.
- Read-only host comparator for one local same-source replay and one separate-origin normalized assertion where this can be done without additional Graphiti submissions; if not, report mock-backed B3 and host observation as distinct.

**Do not** test ambiguous remote retry by replaying real `add_memory`. Mock unknown/failed extraction regressions from CI are adequate unless a real ambiguity is encountered naturally; preserve and stop on any real ambiguous write.

EX/lease safety:
- Verify classified-harness absence, scheduler idleness, protected-model idleness, quiet grace and genuine exclusive kernel flock. Existing persistent OpenCode and concurrent agy SHARED holders are ordinary authority, not orphans.
- Do not kill those processes, force unlock, forge env, modify gate policies or seize model ports. If they prevent EX, prepare the exact verified private launch route using existing host mechanisms, return `READY_FOR_FINAL_OPERATOR_RUN` and stop the model/Graphiti phase. No second discovery handoff. An authorized safe service-quiescence window may use the already authenticated reversible procedure, only if active user work is absent and complete restoration is prepared.
- After any permitted window, restore OpenCode and curator services; read back bytes, queue/archive, lock, co-loaded plugin. Normal SHARED lease reacquisition after restore is not proof of autonomous drain progress.

## D. Evidence and stop

Produce one attachable, allowlisted sanitized `.tar.gz` with exact member hashes/manifest and complete archive SHA-256, distinct from private source/model records. No secrets, raw developer messages, provider requests, full Graphiti records, source-index files or rollback backup.

```text
ISSUE107_B2_B3_RESULT=PASS|PARTIAL|FAIL|BLOCKED
REPO=fvanevski/opencode-operational-schema-guard
PR=110
SOURCE_HEAD=<full exact>
SOURCE_TREE=<full exact>
FOCUSED_TESTS=<counts and exits>
TRUSTED_CI=<run, SHA and conclusion>
HOST_CURRENT_PRODUCTION_HASHES=<authenticated redacted map>
SOURCE_ORIGIN_BUNDLE_REGRESSION=<PASS|FAIL>
SIBLING_ONE_PARENT_TWO_CHILDREN=<PASS|FAIL>
SIBLING_BOUNDED_RETRY_RESTART=<PASS|FAIL>
CORROBORATION_DISTINCT_SOURCE_LINK=<PASS|FAIL>
SAME_ORIGIN_AND_INDEX_NEGATIVES=<PASS|FAIL>
REMOTE_UNKNOWN_NO_REPLAY=<PASS|FAIL>
EX_ADMISSION=<PASS|BLOCKED|UNVERIFIED>
LIVE_MODEL_PROVENANCE=<actual alias, attempt/tokens and errors>
GRAPHITI_DISPOSABLE_EPISODES=<count, one fact/episode, terminal proof>
LOCAL_EPISODE_UUID_INDEX=<positive/negative counts>
PRODUCTION_GROUP_MUTATIONS=0
PRODUCTION_QUEUE_AND_ARCHIVE_PRESERVED=<PASS|FAIL>
PRODUCTION_CONFIG_AND_MODULE_MUTATIONS=0
SERVICES_RESTORED=<PASS|NOT_TOUCHED|FAIL>
EX_LOCK_RELEASED=<PASS|BLOCKED|UNVERIFIED>
MISSING_OBSERVATIONS=<list>
EVIDENCE_ARCHIVE_PATH=<path>
EVIDENCE_ARCHIVE_SHA256=<full>
EVIDENCE_MANIFEST_SHA256=<full>
COMMAND_SHAPE_FRICTION=<canonical ledger>
NEXT_RECOMMENDATION=central_exact_head_review|focused_source_remediation|EX_final_operator_run
```

For `PASS`, distinguish deterministic mock-backed B2 (model and Graphiti synthetic responses) from actual EX-admitted live provider/Graphiti terminal proof; a test-generated source handle is never represented as a real OpenCode-native occurrence. If only CPU checks pass and EX is unavailable, return `PARTIAL` with the prepared operator invocation rather than a false live PASS. Do not merge PR #110 or close #107. Return the handback to Central and stop.
