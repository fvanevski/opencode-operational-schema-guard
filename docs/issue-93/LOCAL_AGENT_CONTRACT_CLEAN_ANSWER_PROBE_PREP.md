# Issue #93 — CPU-only preparation for final clean answer proof

This is a LOCAL-AGENT handoff that prepares a narrowly scoped
OPERATOR-OWNED one-shot GPU run. The local agent MUST NOT invoke
opencode run or other interactive GPU inference. It must STOP
after producing one ready-to-execute, verified private runner
and the CPU-only evidence packet. Operator execution occurs
ONLY AFTER the agent/harness has fully exited.

LOCAL_AGENT_PRIMARY=build
TASK_ROLE=host-bound CPU config / execution-prep (not source development)
REPO_ID=fvanevski/opencode-operational-schema-guard
ISSUE_NUMBER=93
BRANCH=issue/93
REQUIRED_REMOTE_HEAD=<full SHA supplied in Central kickoff>
CENTRAL_DISPOSITION=docs/issue-93/CENTRAL_B2_2_FINAL_DISPOSITION.md
SOURCE_ACCEPTANCE=docs/issue-93/APPROVED_PROSPECTIVE_ACCEPTANCE.md
HOLDOUT_EXCEPTION=docs/issue-93/APPROVED_LIMITED_HOLDOUT_COMPARATOR_RECOVERY.md
LATEST_EVIDENCE=docs/issue-93/evidence/final-comparator-qualification/
PRIVATE_SOURCE_PACKET=/opt/filip/.hermes/cache/scratch/issue93f-ngY8kq

MUTATION_AUTHORITY=private scratch only
REPO_SOURCE_TEST_CONFIG_WRITE=forbidden
GITHUB_WRITE=forbidden (this prep must not create an evidence commit)
HOST_GLOBAL_CONFIG_WRITE=forbidden
SERVICE_GRAPHITI_REVIEWSTORE_WRITE=forbidden
NO_NEW_DAEMON_OR_MODEL_SERVER=yes
NO_HOLDOUT_REPLAY_OR_TUNING=yes
NO_PR=yes
NO_HOST_GPU_INFERENCE_INSIDE_AGENT=yes

## A. Readback and runtime isolation analysis (CPU)

1. Authenticate the full issue/93 GitHub branch head, the
   original/current semantic source and exact installed plugin
   source. Inspect actual stock OpenCode binary --version,
   binary digest, opencode run --help and the version-appropriate
   documented config/plugin discovery paths. Do not rely on
   stale v1 flags or invent alternate CLI spellings. Inspect
   original failure's PRIVATE control/treatment effective
   config, source-bound input traces and session/agent provenance.
   Determine WHERE the disabled control got the 35-node value
   if the retained trace permits; classify cause as verified or
   UNVERIFIED, without reproducing the failed model turn.

2. For this host OpenCode version, establish which locations
   are discovered for user, project, system-managed, global
   plugins, implicit instruction files and persisted sessions.
   Distinguish OPENCODE_CONFIG_DIR (potentially ADDITIVE),
   OPENCODE_CONFIG, OPENCODE_CONFIG_CONTENT, XDG_CONFIG_HOME,
   XDG_DATA_HOME, XDG_STATE_HOME, XDG_CACHE_HOME and OPENCODE_DB.
   DO NOT assume OPENCODE_CONFIG_DIR alone hides global plugins.
   Inspect installed support for OPENCODE_DISABLE_PROJECT_CONFIG
   and the actual CLI's standalone/private-server semantics.
   Use absolute plugin directory paths. Model provider config
   must still bind local/chat to the existing inference server,
   but no provider auth token or user secret may be published.

3. Build TWO private, fresh, non-repo, non-git, isolated
   configurations/workspaces/state/session stores (off/on).
   The only INTENTIONAL effective difference is Graphiti
   plugin option enabled=false in control and enabled=true
   in treatment. Capture=false in both; match original
   Graphiti endpoint, development-knowledge group, #92
   persisted stateDir, gh_mcp workspace/project and real
   V2 B2.2 source. Do NOT mutate the existing source state.
   Disable/avoid OpenViking, host system-message injection,
   operational-schema memory injection, compaction memory,
   project/global AGENTS.md, implicit MCP answer sources and
   all built-in/custom tools. Preserve unavoidable
   non-content security policy plugins and attest they do
   not add context. No disabled policy gate bypass.

4. In a CPU-only preflight, prove for BOTH configurations:
   - effective runtime config, config/DB/state paths and
     plugin discovery inventory, not just written files;
   - no extra memory or assistant-history context plugins;
   - deny-all tool permissions with zero available answer
     channels, no MCP tools exposed to the answer agent;
   - model exact ID, endpoint, max context/settings and
     primary short answer-only agent are identical;
   - fresh session IDs with no existing messages or
     inherited context; distinct DB/data/state directories;
   - no custom/project instructions, AGENTS.md or restored
     compaction/history containing the target information;
   - exact plugin enabled flag is applied, and baseline
     DISABLED genuinely bypasses the Graphiti hook;
   - the installed plugin implementation is B2.2 or a
     source-exact native qualification projection.
   If proof is impossible, DO NOT generate a "ready" runner.
   Return BLOCKED_CONFIG_ISOLATION, explicit missing evidence.

## B. One frozen fact/prompt, independent pre-adjudication

5. Privately choose exactly ONE currently remote-proven,
   #92 persisted source-attributed development fact from
   legitimate, already-stored Graphiti memory. It must be
   nontrivial and genuinely private to the graph, NOT
   inferable from Git commits/PR heads/docs, prior chat,
   source code, target prompt, the model's general
   knowledge, prior OpenViking/session memory or an
   external tool channel. Avoid the 35-node count already
   leaked in the disabled control. Avoid the prior
   unselected edge-count fact.
   Read SOURCE assertion, its specific persisted source
   identity/evidence class, temporal status, group and
   same-group remote episode proof. Privately adjudicate
   a precise expected answer/allowed paraphrases before
   either model run.

6. Query/read B2.2 Memory.search path using the exact
   intended question and read-only source index and
   remote proof. Prove the predeclared specific fact
   WILL BE SELECTED within <=5 and <=1400 selector-JSON
   chars and the exact source attribution; do not
   assume raw Graphiti search match implies model-facing
   selection. Capture an immutable PRIVATE digest for
   prompt, expected source assertion, selected context,
   configs and test definition BEFORE treatment. No
   model inference in this preflight. Keep raw assertion,
   query, ref and expected answer private.

7. Privately prepare ONE executable OPERATOR-OWNED
   shell script, e.g. PRIVATE_SCRATCH/run-clean-answer-proof.sh.
   It must use the proven, version-correct environment and
   paths from A, check immutable preflight fingerprints
   again before work, then run a MEMORY-OFF standalone
   OpenCode process first and a MEMORY-ON standalone
   OpenCode process second, serially, using the same
   local model and identical prompt/agent/tool config.
   Include safe timeouts and /dev/null stdin to prevent
   script/heredoc prompt contamination. Never use a
   shared OpenCode session/server. If an invocation exits
   nonzero, hits an unintended tool, loads an extra
   context plugin or cannot capture model input, STOP.

8. The runner must retain the PRIVATE effective
   config/plugin inventory, prompt digests, session IDs,
   tool-call counts, outbound assembled model system/
   user message envelopes, source marker + fact digest
   and model answers. Do not print raw private prompt,
   answer, UUID/ref, credentials, env or full model
   traces to stdout/GitHub. Verify actual outbound
   model input: the disabled arm has NO Graphiti marker,
   NO target answer and NO OpenViking/session/other
   hidden memory context; enabled arm has a source-
   attributed Graphiti marker with the correct expected
   assertion, no leaked private source excerpt, same
   canonical user prompt, no alternative answer channel.
   Check the model responses against privately frozen
   expected answer: disabled must NOT supply the fact;
   treatment must supply it correctly and attributable
   to the injected Graphiti context. If treatment does
   not retrieve the fact/answer, return UNVERIFIED or
   FAIL, do not reselect or repeatedly prompt.

9. Generate a private sanitized typed receipt producer
   (or safe redaction procedure) using:
   RESULT=ANSWER_PASS|ANSWER_UNVERIFIED|ANSWER_FAIL|BLOCKED_CONFIG_ISOLATION
   CANDIDATE_SOURCE_SHA=<full>
   OPENCODE_VERSION_AND_BINARY_SHA256=<verified>
   OFF_ON_CONFIG_DIGESTS=<sanitized>
   ISOLATED_DB_CONFIG_STATE_PATHS=<no secrets>
   LOADED_CONTEXT_PLUGIN_IDS_OFF_ON=<actual>
   EFFECTIVE_TOOLS_OFF_ON=<zero proven>
   FACT_PROMPT_EXPECTED_SOURCE_DIGESTS=<private; report digest only>
   SOURCE_RETRIEVED_AND_SELECTED=<verified>
   OUTBOUND_CONTROL_CONTEXT_CLEAN=<yes/no/unknown>
   OUTBOUND_TREATMENT_GRAPHITI_CONTEXT=<yes/no/unknown>
   MEMORY_ON_ONLY_TARGET_CONTENT=<yes/no/unknown>
   CONTROL_ANSWER_SOURCE_EXACT=<yes/no>
   TREATMENT_ANSWER_SOURCE_EXACT=<yes/no>
   ALTERNATIVE_CHANNEL_EXCLUSION=<verified/failed/unknown>
   MODEL_RUN_EXITS_AND_SERIALITY=<true exits and timestamps>
   SOURCE_PRIVACY_EX=<invariants>
   RAW_PRIVATE_PACKET_LOCATION=<path only>
   KNOWN_GAPS=<finite>
   COMMAND_SHAPE_FRICTION=<GHDEV-10 canonical block>

## C. Prepare clean handback only — NO GPU run in agent

10. Return the verified PRIVATE runner path (no invented path),
    its source digest, all CPU-only proof predicates and a
    one-line exact OPERATOR SHELL invocation to run after
    this Build agent has exited. Do not execute the script,
    even to smoke-test its model invocation, while Build
    is running. Syntax-check runner and perform bounded
    CPU-only checks of generated JSON/private manifests.
    Do not copy raw private content into the chat or repo.

STOP conditions: no validated provider/model mapping,
hidden extra plugin/instruction/session context cannot
be excluded, unsupported flag, no Graphiti-selected
unique source fact, unavailable outbound model-input
trace, source/proof/authority mismatch, existing model
workload not quiet, or no genuine isolated runner.
No fallback that loosens privacy/EX/permission gates.

Return typed prep handback:
RESULT=PREPARED_FOR_OPERATOR|BLOCKED_CONFIG_ISOLATION|NO_ELIGIBLE_FACT|PARTIAL|STALE
TARGET_HEAD_SHA=<full>
LOCAL_RUNTIME_VERSION=<exact>
EXACT_PLUGIN_SOURCE_IDENTITIES=<sha256 or git blob>
ISOLATION_INVENTORY=<effective plugin, config, DB, instructions, tools>
SOURCE_FACT_PRECOMMIT=<digest only; source/proof>
SELECTOR_PRECONDITION=<fact selected, cost, cap>
PRIVATE_RUNNER_PATH=<exact or none>
RUNNER_SHA256=<full or none>
OPERATOR_COMMAND=<literal shell command if prepared>
GPU_RUNS_PERFORMED_BY_AGENT=0
GITHUB_WRITES=0
OWNER_CHECKOUT_PRESERVED=<yes/no>
KNOWN_GAPS=<finite>
COMMAND_SHAPE_FRICTION=<complete canonical GHDEV-10 schema>

This prep is not answer acceptance. After the Build
harness has exited, the OPERATOR decides whether to
run the single prepared script from a normal host
terminal. No operator-only action belongs inside
the local-agent execution phase.
