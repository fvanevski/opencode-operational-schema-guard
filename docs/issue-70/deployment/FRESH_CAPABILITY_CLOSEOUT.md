# Issue #70 — Close the real stock-V2 capability acceptance gap

Status: **host promotion remains valid; independent public-capability acceptance PARTIAL**.
This is the sole bounded follow-up to the external fresh-process handback for PR #73.
It does not change the approved runtime, live configuration, services, protected
gate DB, live graph, or production Graphiti capture authorization.

## Authoritative identities and observed result

- Approved/installed runtime SHA: \`b126b6d415a3f8706e0c8c22b219cca2161a7465\`,
  tree \`dacb27120deef3e8bfa27b50222bf20cb60c450c\`.
- Previous PR evidence commit: \`6c22260c894dbfeec36ca41d8b3c07e30f416c86\`,
  tree \`cedd8fdb675a8b2625506b09d6b993625c9beb28\`.
- Installed source/config 15/15, gate/backend health, disabled Graphiti,
  V4 sibling static imports, protected-state preservation and backup readiness:
  accepted as **host-reported, independently corroborated by Evidence**.
- Original external run: \`opencode run\` returned exit 0 and \`ACK\`, but
  its captured native log had only one \`cli starting\` line, the stub was
  reportedly configured for \`ok\`, and no context/compaction event evidence
  was observed. Independent Evidence classified overall acceptance PARTIAL.

A single-line log does **not prove the V2 plugin failed to load**; it proves
the recorded trace did not demonstrate loading. \`ACK\` vs \`ok\` is a
**routing/response discrepancy**, not evidence of the intended stub request.
Compaction is not triggered by one short turn. Do not convert absent
observations to FAIL assertions about the implementation itself.

## One corrected external acceptance, without re-deployment

Conduct a **single new disposable run**, from the operator plane after the
Build/Evidence harness releases its shared admission lease. Do not start an
unleased \`opencode run\` to bypass the existing shared admission contract.

1. Authenticate \`opencode --version\`, \`opencode run --help\`,
   \`opencode debug paths\`, \`opencode debug config\` and the **actual**
   \`openviking-agent-run\` entrypoint in the intended isolated environment.
   Verify any \`--standalone\`, \`--model\`, \`--format json\`,
   \`--print-logs\`, \`--log-level DEBUG\` or equivalent flags are accepted
   by this exact installed executable. Do not silently substitute V1 flags.
2. Use a new collision-free HOME/XDG_DATA_HOME/XDG_CONFIG_HOME/XDG_CACHE_HOME
   and project directory. Deliberately provision the **actual installed**
   stock-V2 plugin discovery path and required relative
   \`openviking-context-v4\` sibling. Merely exporting a new HOME without
   carrying the plugin configuration/discovery path is insufficient.
   Authenticate this with \`opencode debug config\` in the *same* isolated
   environment and record sanitized configuration source paths and plugin
   enablement/order. Do not edit live config or install copies to live paths.
3. Set \`PHASE_B_OV_EVENT_TRACE\` to a fresh private JSONL file. This variable
   is already handled by the approved installed \`openviking-v2/index.mjs\`
   in the real context hook and event subscriber; no source patch or
   extra probe plugin is necessary. Successful \`context\` and
   \`session.execution.succeeded\`/\`session.idle\` trace records are
   direct plugin callback evidence.
4. Enable native DEBUG logging to an **actual isolated process log** and
   stdout/stderr; do not assume the background service log or one
   \`cli starting\` line is comprehensive. Accept a log signal only when
   it explicitly identifies loading the installed \`openviking-v2\`.
   Cross-check with the actual hook trace; a load log alone is insufficient.
5. Use a loopback-bound, separately identified disposable model stub.
   Capture a bounded, sanitized **wire receipt** from the stub containing
   a unique per-run nonce, HTTP route, request count, response text and
   response identity. Select that exact provider/model in the isolated
   runtime and assert the model URL/config points to this stub. Check
   the assistant's reply against the **stub response**, not against words
   repeated from the prompt or a zero exit. If a request never reaches
   the stub, report provider misbinding; if the stub returns \`ok\` but
   assistant says \`ACK\`, report a request/response inconsistency and
   preserve sanitized request/response hashes for Central investigation.
6. Use the actual admission-aware launcher with a validated executable
   command and shared-lock identity, not direct \`opencode run\` when its
   execution would circumvent admission. For test-only stub calls,
   ensure that no production inference backend is invoked and no live
   Graphiti write/persistent capture is possible.
7. Run \`verify_fresh_trace.py\` against the independently captured
   native DEBUG log and \`PHASE_B_OV_EVENT_TRACE\`. It fails unless the
   **same external run** has explicit V2 plugin load, context hook and
   subscriber events. Treat the stub network receipt and model response
   as **separate mandatory acceptance predicates** beyond this checker.

## Compaction and fail-closed: explicit evidence scope

The one-turn public-capability probe cannot establish compaction behavior.
This is **not a defect**. The previously qualified host V2 compaction
started/delta/ended events, Phase 3/4/gate tests and current disabled-Graphiti
state may be cited as **historical** evidence. If exact-current-host live
compaction is required by the final acceptance authority, exercise a manual
compaction **only on a privately owned disposable session/server** using the
current documented \`session.compact\` API and monitor its actual events.
Never issue a compact API request to the production background service or
a user session, and never allow the installed V2 plugin to commit
disposable session memory into the production OpenViking store. An isolated
private OpenViking backend or documented write-free stub is required for
this optional service-backed rehearsal.

Similarly, live gate \`harness_active\` is observed fail-closed admission;
busy/unavailable scheduler behavior is already covered in earlier
service-backed evidence and should not be represented as freshly exercised.
Do not perturb a live scheduler or imitate its metrics just to repeat
historical coverage. Record the precise historical test identity and
distinguish it from current health checks.

## Acceptance predicate and stop conditions

PASS requires ALL of:

- same-run isolated server/process startup and installed V2 plugin discovery;
- installed V2 context-hook invocation **and** subscribed session event;
- a trusted loopback model-stub request/response matched to the agent reply;
- admission-aware launch or actual lease ownership, with no bypass;
- unchanged installed source/config identity and disabled Graphiti policies;
- gate/backend remain healthy and no unexpected graph or gate state mutation.

The trace checker only proves three of these predicates. Compaction and
busy-scheduler service tests may be explicitly marked
\`HISTORICAL_QUALIFICATION\` if no new activation changes affect those
contracts. If a current native V2 API change invalidates that evidence, stop
with the exact mismatch. Do not broaden into product refactoring, unrelated
service/config changes or model tuning.

Keep a single private evidence root and source-assigned receipt hashes.
Publish **one evidence-only update on existing PR #73** after the corrected
external acceptance passes, with the exact installed SHA/tree, test run
identity, sanitized trace counts, stub wire identity, launch/lease identity,
readback hashes and any nonreproduced historical claims.

The PR is already draft and merged-main untouched. A new evidence commit
invalidates the previous head's formal approval for merge; Central performs
a final independent exact-head review and refreshes the approval before
operator-authorized ready/squash-merge. No new manual Codex request (2/2
already used), no new PR and no Issue #70 closure.
