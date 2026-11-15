# Issue #93 — Central independent audit of operator clean-answer packet

Status: **INPUT-SIDE ATTRIBUTION VERIFIED; ANSWER-SIDE PASS REQUIRES INDEPENDENT RECEIPT ADJUDICATION**.
No PR, merge, deployment, issue closure, production selector mutation,
frozen-source change, or new GPU experiment authorized by this memo.

## Source / evidence identity

Central inspected six operator-uploaded files from the single serial
2026-11-15 UTC experiment (private packet contents were not committed):
- packet-manifest.json
- run-clean-answer-proof.sh
- model-input.jsonl
- preflight.json
- model-capture-proxy.mjs
- receipt.json

Uploaded hashes independently recomputed:
- runner: f4303939980f3652724d41677fbe50e06a385f7df7fffd7f5546fb0d8ff5c780
- transparent relay: 888ffac0225093a9d480af16a72f220ac44b9c6498c213c1f6ea0ca0e4b093d8
- preflight: ce9632763569bea191ac05bd4ac5a036ac8d9598d0b61b1561829571f1f7cc42
- captured raw model request log: d905d6c548ddded308c5ff87b16d5359420ac5f8034b86b28f8b505e5718ee55
- runner receipt: bee4ddb361116aa5839dd91563d0dc8d3611ca86807b931ba0647cad21c55478

Manifest hashes match uploaded runner, preflight, relay. Shell
bash -n and relay node --check passed. This proves source identity
and static syntax only, not the missing private response evidence.

## Direct outbound LLM request proof

The uploaded relay capture contains FOUR HTTP POST
/v1/chat/completions requests in order, consistent with serial
memory-OFF then memory-ON, each including one auxiliary request
and one substantive answer request. Both substantive answer
requests use:
- exactly matching user-content SHA256
  9911cc24808ac15b33cfe96f8a15f0ff1f8aebdca8ddc67ec97bf8a5b9690aed;
- identical model ID, sampling arguments, tool schema, stream
  settings and completion-token ceiling;
- precisely one system and one user message each, with no
  tool-result message;
- the control system context lacks the Graphiti marker and
  credited answer token;
- the treatment system context contains ONE correctly bracketed
  [GHDEV_GRAPHITI_CONTEXT] block, the credited answer token,
  and an opencode: source attribution;
- no OpenViking/session-memory text markers in the captured
  answer requests.

That is strong evidence that the source-attributed Graphiti
context reached the actual treatment LLM input, and the
credited fact was absent from control LLM input. The relay
source is a straightforward HTTP forwarder with request-body
capture to JSONL and streaming response passthrough; it
contains no model inference or answer synthesis.

## Control-plane / verdict discrepancies requiring inspection

1. **The real model answer request ADVERTISES one tool**:
   function name "skill" is in both control and treatment
   request bodies. This does not prove tool execution or an
   alternate answer source; no tool-result message occurs in
   either captured answer request. But "zero exposed model
   tools" or "effective tools=0" cannot be inferred from a
   deny-all agent permission or hard-coded receipt claim.
   Independently examine the already-recorded answer events
   and effective permission logs to determine whether ANY
   tool call executed or produced content. Do not rerun GPU
   inference solely to investigate tool-advertisement.
2. The uploaded runner's ANSWER_PASS branch tests:
     TREAT_CTX=yes && CTRL_CLEAN=yes &&
     CTRL_SRC_EXACT=yes && TREAT_SRC_EXACT=yes
   but does NOT additionally require OFF_EXIT=0, ON_EXIT=0,
   or ALT_CHANNEL=verified. The alternative-channel regex
   and exit codes are written to its receipt but not included
   in its successful-verdict predicate. Current receipt
   REPORTS both exits 0; confirm using the original
   results/{off,on}.exit and associated response events.
3. CONTROL_ANSWER_SOURCE_EXACT=yes is MISNAMED: the script
   sets it to yes when the credited token is ABSENT from
   control output. It means "control did not reproduce
   credited answer", not source-exact positive.
4. LOADED_CONTEXT_PLUGIN_IDS_OFF_ON, EFFECTIVE_TOOLS_OFF_ON
   and ISOLATED_DB_CONFIG_STATE_PATHS are STRING LITERALS
   in the generated receipt, not an inspection of actual
   runtime-loaded plugins, exposed tools or DB roots.
   Validate independent effective config/inventory evidence,
   rather than cite these declarations as measured values.
5. Receipt CANDIDATE_SOURCE_SHA is populated from
   preflight.target_head, which is the GH issue branch
   documentation head 6e5c2ce61545d51c149279377e17668febba2d00.
   Actual B2.2 selector candidate source was fixed earlier
   at 4bc169cc59e8900f5dc3cd4d3c70a22d0fcfb9f4.
   Bind installed plugin module identities separately;
   do not equate these two repository SHA roles.
6. Uploaded receipt's KNOWN_GAPS still refers to trace-log
   model-input capture. The actual run uses the no-inference
   relay. This is stale prose, not source for rejecting the
   actual captured requests.

## Pending final acceptance claim

The uploaded packet does NOT include original
results/{off,on}.answer.ndjson, results/{off,on}.exit,
original arm-separated model-input files, or actual
effective config/permission inventory. Thus Central
cannot independently prove from these uploads that the
model OFF answer lacked the expected fact, that model
ON supplied it in its own answer, that the recorded exit
status was correctly bound, or that the advertised skill
function was uninvoked.

HOST_REPORTED_RESULT=ANSWER_PASS.
CENTRAL_INPUT_CONTEXT_RESULT=PASS.
CENTRAL_INDEPENDENT_ANSWER_RESULT=UNVERIFIED_PENDING_EXISTING_OUTPUTS.
HOLDOUT_COMPARATOR=PASS under the previously approved
one-time post-exposure exception; unchanged.
PR_CREATION=NOT_YET_AUTHORIZED.
ISSUE_93=OPEN.

Next step: CPU-only reconciliation of already-existing
private result artifacts under
LOCAL_AGENT_CONTRACT_ANSWER_RECEIPT_ADJUDICATION.md.
NO model rerun or new source/holdout changes needed if
those artifacts conclusively support the operator result.
