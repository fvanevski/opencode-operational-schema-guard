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

## C.0. Final operator-run corrections (source-verified)

The first host evidence archive reported a blocked EX probe. It does **not** prove that the fixture events were staged, that the remote group is empty, or that the described Python command is executable. Before entering a maintenance window:

1. **Choose a fresh, purpose-named fixture** accepted by `parseFixtureGroup`, e.g. `graphiti-opencode-qualification-r02` only if not previously used. Inspect both (a) the target's empty local state and (b) actual group-scoped, read-only `GraphitiMcp.call('get_episodes',{group_ids:[GROUP],max_episodes:100})` response. The absence of local files is not proof of a remote-empty group. If remote lookup is unavailable or not an authoritative complete empty response, do **not** perform a remote write.
2. **Use a private directory as the *root***: e.g. `STATE_ROOT=/opt/filip/.hermes/cache/scratch/issue107-b2b3-live/state` mode `0700`. Both `CandidateQueue(STATE_ROOT,GROUP)` and `ReviewStore(STATE_ROOT,GROUP)` construct their own `candidate-events-v1/<group>` and `curation-v1/<group>` directories. Do **not** supply an already nested `.../curation-v1/<group>` as `--state-dir` unless that unconventional extra nesting was intentional and independently audited.
3. **Seed actual safe synthetic source events in the disposable queue before the first EX drain.** Invoke the exact-head `fromPromptCandidates({sessionID,messageID,prompt:{text},timestamp}, {group,project,workspace}, {admitted:true})` and `new CandidateQueue(STATE_ROOT,GROUP).stage(event)`, with benign original test statements, unique correctly shaped native IDs and consistent time/scope. Read back `queue.status().counts.new>=1`, exact event IDs and source refs. No model/Graphiti call at fixture-preparation time. An empty queue cannot satisfy model/Graphiti acceptance even if the drain exits zero.
4. **Authenticate the actual Python wrapper.** The exact repository source `docs/issue-75/v2-candidate/post-exit-drain.py` uses `argparse.add_argument('--autonomous-curation',action='store_true')` and `autonomous_curation_args` supplies `['--autonomous-curation','on']` to the Node curator in both initial and resumed drains. Thus **Python takes bare `--autonomous-curation`**; **Node takes `--autonomous-curation on`**. The historical installed Python wrapper may differ. If its inspected source/help lacks this option, prefer the exact-head repository Python wrapper with the same authenticated installed gate/config/child CLI, after comparing its safety and recovery contract; do not mutate the installed production copy or append `on` to the Python command.
5. Use the canonical wrapper under a genuine EX window, with current auth-bound model env, and verify its actual direct-child `node curator-cli.mjs drain ... --autonomous-curation on` argv. The command template is:

```bash
python3 "$PY_WRAPPER" \
  --gate-source "$GATE_SOURCE" --gate-config "$GATE_CONFIG" \
  --cli "$CANDIDATE_CLI" --group "$GROUP" --state-dir "$STATE_ROOT" \
  --endpoint "$GRAPHITI_MCP_ENDPOINT" --max-seconds 300 \
  --lock-timeout 120 --autonomous-curation
```

The wrapper's real EX check, kernel flock, excluded-harness observation, scheduler-idle check and quiet grace remain authoritative. Do not invoke the drain with a manually forged lease marker. A live success requires model calls, *one-fact-per-episode*, and positive remote `get_episodes` UUID + local episode-index readbacks, not a zero-work exit.

6. **Optional bounded second cycle for B3:** only after the first group's original fact has a positive exact-group/name/UUID and local index, stage a second authenticated native-shaped message with a *distinct* message origin repeating the same original assertion, then execute at most one additional canonical EX drain in the same otherwise-authorized maintenance window. If model selection differs, record the observed result; do not force/copy a model output or create a duplicate remote episode merely to meet a test. The deterministic mock B3 tests remain the source-behavior authority when the real model does not reproduce a same-text pair.

Use the exact same disposable state root/group for both cycles; verify there was no production source/config/Graphiti mutation and that services were restored. Do not start a fresh discovery-only handoff, another PR, or an unsolicited campaign to fix ordinary SHARED-lease behavior.

Prepare ONE disposable, isolated, freshly named source group accepted by the installed fixture-group contract. Avoid `development-knowledge`, `ghdev_gh_mcp` and any existing persisted/reused test group. Verify root/group remote and local initial emptiness before writes and preserve identities afterward. Use source-authenticated safe synthetic evidence; explicitly label it `synthetic_native_shaped`, not a real user session.

Re-use the authenticated canonical Python EX wrapper (or the reviewed exact-head repository wrapper when the installed Python copy lacks the required autonomous flag), real lock, candidate `curator-cli.mjs`, and current private `curator.env` provider bindings. The Python EX wrapper passes the same inherited locked FD to the Node child; the separate `ex_admitted_node_bridge.py` is for the earlier B1 model-only qualification route, not a replacement for the Python drain. Verify supported parser shapes as in C.0, and do not call `runAdmitted` directly outside inherited EX admission.

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
