<<< LOCAL_AGENT_CONTRACT_BEGIN >>>
PRIMARY_AGENT=build
REPO_ID=fvanevski/opencode-operational-schema-guard
ISSUE_NUMBER=75
BRANCH=issue/75
EXPECTED_HEAD_SHA=operator-authenticated SHA from kickoff
WORK_SCOPE=one final integrated host qualification of Central-staged relevance and existing extraction repair
GITHUB_WRITES=no
CREATE_PR=no
MERGE=no
PRODUCTION_CONFIG_OR_GRAPH_WRITES=no
DISPOSABLE_GRAPH_GROUP_AND_PRIVATE_CONFIG_WRITES=yes
LOCAL_FIXES=bounded host SDK/CLI/API/testing repairs only, preserve Central policy
SOURCE_DIFF_HAND_BACK=yes

MISSION: Qualify the CURRENT centrally staged Issue #75 Graphiti native-V2
capture/relevance code against real OpenCode, Graphiti, independent Jina
ONNX reranker, Qwen3.8 extraction path and existing shared EX admission.
This is ONE cohesive integration effort, not separate retrieval/extraction
issues. Read docs/issue-75/RELEVANCE_ADMISSION_REVIEW_20261101.md,
current Issue #75, docs/issue-75/v2-candidate/README_NEXT.md and all
current relevant modules/tests. Previously published 12-query evidence
is IN-SAMPLE for the new policy; the next holdout must be fresh.

1. Authenticate exact HEAD, origin, branch, installed OpenCode v2.2.5,
   effective stock V2 plugin SDK/config, Graphiti pinned MCP and FalkorDB,
   inference gate's EX lock and scheduler metrics, ninfer + liteLLM
   model/profile, and independent ONNX Jina reranker. Do not replace
   the current installation with any older #70 source. Preserve prior
   evidence/worktree. Use a new isolated config/state and disposable
   graph group only.

2. CPU-only FIRST: node --check on .mjs modules and node --test on
   memory-core.test.mjs, relevance.test.mjs,
   relevance-observation-replay.test.mjs, plugin-behavior.test.mjs;
   python3 -m py_compile post-exit-drain.py and
   python3 -m unittest discover -p test_post_exit_drain.py.
   Confirm source-selection purity, source anchors, opt-out,
   journal-only active capture, refusal of unsupported secrets,
   duplicate/restart behavior, and gate denial tests. Do not
   weaken or change the frozen benchmark expectations.

3. Read-only live retrieval against existing g_issue75_test.
   Use the CENTRAL \`benchmark-live.mjs\` and tracked
   \`benchmark-source-map.json\`, authenticated actual journal:
   --state-dir /tmp/opencode/issue75-b75/state-b75
   --graphiti-endpoint http://127.0.0.1:8766/mcp
   --rerank-endpoint http://127.0.0.1:8004/v1/rerank
   --group g_issue75_test
   --source-map ABSOLUTE_CHECKOUT/docs/issue-75/v2-candidate/benchmark-source-map.json
   --holdout-file ABSOLUTE_CHECKOUT/docs/issue-75/evidence/20261101-holdout-queries.json
   --output NEW_UNIQUE_PRIVATE_PATH/frozen-live-results.json
   Review output, run existing benchmark-evaluate.mjs
   against the published heuristic-only baseline and fresh frozen
   results; report P/R/coverage, latency p50/p95, negative abstention,
   source-trust and true cross-group leaks. Don't claim the static
   replay was a live test. Do NOT invoke add_memory in this step.

4. Freeze a small NEW disjoint adversarial query set BEFORE running it;
   8–12 questions: novel unrelated topics without named entities,
   choices about unknown systems, direct/paraphrased facts, real
   historical transition, causal-before relationship, missing named
   entities and underspecified asks. Ground their expectations in
   actual synthetic group facts; record the fixture SHA before
   scoring. Re-use the staged read-only benchmark harness, or make
   only narrow benchmark plumbing adaptations with tests to handle
   the new fixture. Avoid hand-picked post-hoc score thresholds or
   altering production policy merely to make frozen queries pass.
   If a candidate falsely injects an unrelated direct decision,
   return the exact source and scores; do not conceal the defect.

5. Fresh isolated stock V2 session: demonstrate prompt -> journaled
   decision and completed test receipt -> context containing only
   appropriately attributed, useful Graphiti facts; confirm zero
   add_memory during interactive harness and continued OpenViking
   recall/injection in a production-equivalent plugin list. Import
   success alone is NOT coexistence proof; use fresh-process
   outbound context/event/source identities.

6. Model-backed Graphiti extraction is POST-HARNESS ONLY.
   The host reported Qwen3.8 max concurrency 1, Graphiti thinking
   budget 16384 vs output limit 8192, and ten output_limit finishes.
   Use \`extraction-profile.md\` as the pre-authored strategy:
   non-thinking per-Graphiti request, preserving interactive chat,
   structured JSON schema and single-serving global model limits.
   Establish an isolated disposable Graphiti worker/model profile
   if needed, rather than changing production liteLLM/Graphiti env
   without explicit operator authorization. Gate post-exit write
   by the ACTUAL existing shared EX flock, model-idle metrics,
   30-second quiet grace and worker completion; not just add_memory
   queue ACK. Stage ONE new genuine decision in a disposable
   group/journal during this interactive session, but execute no
   model-heavy ingestion until this harness EXITS. Prepare ONE
   exact host-resolved command for the operator, with safe
   timeout/unresolved handling. If the shared MCP endpoint cannot
   be quiesced safely on failure, do not run a test that relies on
   stopping it; use a disposable worker or report the constrained
   blocker. Do not replay existing unknown/queued f4.

7. Exercise terminal graph readback: distinct local UUID vs remote
   UUID; source group/name, persisted status, no duplicate,
   ability to forget only explicitly authorized disposable memory,
   and no false terminal success. Inspect model usage/reasoning,
   finish reason and error classification. Preserve Graphiti
   production data/namespace and OpenViking standing capture.
   No general memory subsystem redesign or new daemon is allowed.
   The local Build agent may repair bounded host-binding and test
   bugs; if a substantive new relevance-selection redesign is
   truly needed, report exact reproducible counterexample for
   Central, not silently replace policy.

8. Hand back ONE complete report after host work. Exact candidate
   HEAD, changed-file binary diff/hashes (if any), test commands and
   results, live frozen + old replay + NEW holdout results/score
   evidence, opt-out/coexistence, resource admission, new extraction
   receipt or READY_FOR_OPERATOR_POST_EXIT exact command,
   limitations/counterexamples, production mutation audit and
   canonical GHDEV-10 COMMAND_SHAPE_FRICTION fields. Do not create
   GitHub commit, PR or merge. Central independently integrates
   tested source and performs exact-head semantic review.
   Stop only for actual safety/resource/architecture blocker, not
   routine source/API friction.

HAND_BACK:
RESULT=PASS|PARTIAL|BLOCKED|FAIL
SOURCE_HEAD_SHA=<full SHA>
HOST_IDENTITIES=<actual installed versions/source/config fingerprints>
CPU_TESTS=<literal commands, pass/fail counts>
LIVE_RETRIEVAL=<frozen and prior holdout files, P/R/coverage/p50/p95>
NEW_HOLDOUT=<fixture SHA, before/after order, raw facts and precise verdicts>
NATIVE_V2=<real source-hook events, context payload proof, privacy>
OPENVIKING_COEXISTENCE=<fresh-process source-backed evidence>
EXTRACTION=<new persisted episode or post-exit exact operator command>
INFERENCE_RESOURCE=<metrics/lease/quiet-grace/model usage/finish reasons>
PRODUCTION_SAFETY=<unchanged hashes/production groups>
LOCAL_FIXES=<diff path and SHA256; or none>
OPEN_DEFECTS=<none or exact failing source>
COMMAND_SHAPE_FRICTION=<complete GHDEV-10 fields including explicit none>
<<< LOCAL_AGENT_CONTRACT_END >>>
