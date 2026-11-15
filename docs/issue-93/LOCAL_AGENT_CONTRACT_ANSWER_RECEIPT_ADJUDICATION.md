# Issue #93 — bounded CPU-only adjudication of existing answer outputs

Purpose: resolve exactly the independent evidence gaps in
CENTRAL_OPERATOR_ANSWER_PROOF_AUDIT.md after the operator's
already-completed one-shot clean answer test. This is a
RETROSPECTIVE READ-ONLY audit, NOT a fresh model trial,
not another issue slice and not an opportunity to tune.
The approved comparative holdout stays PASS and unchanged.

LOCAL_AGENT_PRIMARY=build (fresh host session, read-only scope)
REPO_ID=fvanevski/opencode-operational-schema-guard
ISSUE_NUMBER=93
BRANCH=issue/93
REQUIRED_REMOTE_HEAD=<Central kickoff full SHA>
CENTRAL_AUDIT=docs/issue-93/CENTRAL_OPERATOR_ANSWER_PROOF_AUDIT.md
RELEVANT_PRIVATE_ROOT=/opt/filip/.hermes/cache/scratch/issue93f-ngY8kq/clean-answer-proof/
RELEVANT_PRIVATE_RESULTS=<root>/results/

NO_GPU_INFERENCE=yes
NO_OPENCODE_RUN=yes
NO_REPEAT_ORIGINAL_PROBE=yes
NO_SOURCE_OR_TEST_CHANGE=yes
NO_GRAPHITI_REVIEWSTORE_OR_INSTALLED_CONFIG_WRITE=yes
NO_FROZEN_COHORT_OR_HOLDOUT_REPLAY=yes
NO_NEW_BRANCH_OR_PR=yes
GITHUB_WRITE=at_most_one_sanitized_evidence_only_commit
OWNER_CHECKOUT_PRESERVED=yes

## 1. Authenticate private original results, never fabricate

Read exact current branch and governing approved
one-time comparator exception. Verify private runner,
relay, preflight, prompt/expected SHA256 and original
captured model-input.jsonl against existing packet
manifest. Do not alter the immutable run output or
rewrite old receipt.

Inspect actual original:
  results/off.answer.ndjson
  results/on.answer.ndjson
  results/off.exit
  results/on.exit
  results/off.model-input.jsonl
  results/on.model-input.jsonl
  results/off.session
  results/on.session
  original off/on configuration files and runtime traces
or return evidence unavailable. Capture each blob digest
and true exit code. Do not print private prompt, fact,
source UUID, raw model answers, config secrets or
unredacted LLM inputs to GitHub/chat.

## 2. Re-evaluate independently (CPU, no model calls)

Parse all captured completion requests in exact serial
OFF/ON order, distinguish auxiliary from answer requests,
and independently check:
- exact user-prompt digest and matched model/settings;
- expected source assertion appears ONLY in treatment
  outbound model-bound [GHDEV_GRAPHITI_CONTEXT] and matches
  the preregistered #92 proof; absent from control;
- no tool RESULT or alternate context supplied the
  credited fact in either arm;
- inspect actual answer NDJSON parts and tool-call event
  types: is any tool executed? Identify the offered
  "skill" function in both requests. Do NOT claim
  zero *offered* tools; if offered but provably unused
  report OFFERED_BUT_UNUSED and distinguish actual
  alternative channel exclusion from ideal isolation.
  If a tool was called, inspect its effect privately
  and fail closed if the credited fact could be supplied;
- independently compare actual OFF and ON answer text
  with frozen expected fact, not merely the archived
  runner's yes/no claim;
- verify OFF/ON exit statuses both zero, original
  session identity and true serial run order;
- verify any markers, model-request/system content,
  plugin/tool configuration and actual OpenViking/
  session-history components without relying on
  literal strings in the receipt.

Read the runner decision path and record its documented
defects (exit codes and ALT_CHANNEL not prerequisites
for ANSWER_PASS; inverse CONTROL_ANSWER_SOURCE_EXACT
naming; hard-coded plugin/tool inventory, stale
KNOWN_GAPS). Do not edit the existing runner or
claim it self-authenticates. Produce an INDEPENDENT
verdict from raw result artifacts.

Independent PASS requires:
  OFF/ON exits=0, source-exact selected and injected
  exclusively ON, no answer-bearing alternative channel
  used, OFF actual answer lacks the credited fact, ON
  actual answer supplies it correctly, no untrusted/
  secret/source leak and matching original fact/prompt/
  model/settings. A function schema offered but never
  invoked is a noted tool-exposure gap; classify any
  actual tool call by effect rather than guessing.
  If alternate context or response proof is missing,
  return UNVERIFIED or FAIL.

## 3. Single safe publication and handback

If existing outputs suffice, publish at most ONE
sanitized evidence-only commit under
docs/issue-93/evidence/clean-answer-adjudication/
to issue/93, with SHA256SUMS, exact-head parent/readback.
Do NOT publish original model-input.jsonl or answers,
raw prompts/facts, source refs, source UUIDs, configs,
tokens, API headers or private logs. A derived sanitized
verdict may include source digests, role/message/tool
counts, zero-call evidence and private receipt digests.
Do not replace original publication, edit production,
open PR, mutate Issue or change acceptance criteria.
If insufficient evidence remains, return precise blocker
without another model trial.

Typed handback:
RESULT=INDEPENDENT_ANSWER_PASS|INDEPENDENT_ANSWER_UNVERIFIED|INDEPENDENT_ANSWER_FAIL|BLOCKED_PRIVATE_EVIDENCE|STALE
REMOTE_HEAD_SHA=<full>
PRIVATE_RUN_ARTIFACT_DIGESTS=<safe sha256>
OPENCODE_BINARY_AND_PLUGIN_SOURCE=<verified digests>
REQUESTS_OFF_ON=<counts, prompt/model/settings identity>
GRAPHITI_SOURCE_CONTEXT_ONLY_ON=<yes/no>
EXPOSED_TOOL_SCHEMAS=<include skill>
TOOL_INVOCATIONS_OFF_ON=<actual counts and evidence source>
EFFECTIVE_PLUGIN_AND_SESSION_ISOLATION=<measured/unknown>
ACTUAL_ANSWERS_SOURCE_EXACT=<OFF absent/ON correct>
OFF_ON_PROCESS_EXITS=<real exit codes>
RECEIPT_GUARD_DEFECTS=<independent findings>
ALTERNATIVE_CHANNEL_BENEFIT_EXCLUSION=<yes/no/unknown>
SOURCE_PRIVACY_EX=<verified control status>
MODEL_ANSWER_INDEPENDENT_GATE=<PASS/FAIL/UNVERIFIED>
EVIDENCE_COMMIT_SHA=<full or none>
KNOWN_GAPS=<finite>
COMMAND_SHAPE_FRICTION=<canonical GHDEV-10 schema>

No work beyond inspecting existing evidence is authorized.
If result independently PASSES, Central proceeds to
single PR / exact-head independent review and trusted CI.
