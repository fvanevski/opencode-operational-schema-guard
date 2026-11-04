# Local Build integration contract: first coherent #79 capture unit

REPO=fvanevski/opencode-operational-schema-guard
BRANCH=issue/79
ISSUE=79
PARENT=78
NEXT_ISSUE=80
TARGET=isolated Stage-1 candidate event capture and durable queue
PRIMARY_AGENT=build

## Authoritative inputs
Read #79 and #78, the repository's nearest AGENTS.md, current host V2 SDK
and docs/issue-78/v2-candidate/{README.md,events.mjs,queue.mjs,plugin.mjs,
candidate.test.mjs,pilot-cases.json}. Authenticate the exact fetched GitHub
branch SHA against the start identity supplied in the kickoff. Preserve the
accepted Issue #75 installation, legacy journal/episodes, the current
OpenViking integration and shared inference admission.

## Execute as one campaign
1. Inspect repository status and exact branch identity, then CPU-check the
   centrally staged files. Run node --check on the four JS modules,
   node --test candidate.test.mjs and node pilot-evaluate.mjs in the Stage-1
   candidate directory; run the three Issue #75 focused regression modules
   in docs/issue-75/v2-candidate. Resolve bounded test/fixture mismatches
   whose correct remedy is established by source. Do not weaken tests or
   policy/validation controls to get green.
2. Authenticate actual installed stock-V2 prompt, context, execute.after,
   compaction and finished-turn/session/bus event surfaces from current SDK
   and a disposable native session. Capture only sanitized type, field-name,
   presence and stable-source-ID metadata. Never dump private prompts,
   tool stdout, credentials, raw transcript or user files. Confirm if
   completed assistant messages can be observed only after completion.
3. In the isolated candidate, wire the *already authored*
   fromFinishedTurn adapter to the real supported completion event only if
   authenticated. Make the narrow adapter signature/registration correction
   plus corresponding focused tests. If the native API cannot prove
   completed-turn provenance, leave it intentionally unregistered, label
   that acceptance predicate BLOCKED and return the decisive interface proof.
   Do not invent a V1 or speculative bus hook.
4. Exercise one disposable opt-in session producing implicit user request,
   test failure, subsequent fix/pass, and associated assistant completion
   when supported. Repeat delivery and session restart/compaction. Confirm
   the queue retains scoped source anchors, stable event IDs, correct
   authority labels, bounded excerpts, separation from legacy episode
   journal, and no interactive Graphiti add_memory/LLM call. Exercise
   opt-out, different group, private content, noisy read, large output,
   queue overflow and read-only CLI status. Capture failure/drop status
   even if overall behavior passes.
5. Freeze a small real/sanitized host sample *before making selector
   changes*. Run the old Issue #75 selectors and the broad candidate
   adapter over the same evidence; report explicit include/exclude map,
   candidate useful-event recall, false/noisy candidate count and weak-ID
   collisions. Keep the supplied synthetic pilot immutable. A discrepancy
   is diagnosis, not license to relabel fixtures to force a PASS.
6. Where a demonstrated host mismatch is wholly confined to these new
   candidate adapter files or tests, fix and rerun within this campaign.
   Correct parser/type/event mapping, race, bounded queue defects or
   source-attribution loss; retain the v1 envelope shape and mandatory
   privacy/fail-closed rules. A material redesign of identity, storage,
   security policy, legacy Issue #75 source or live deployment is Central
   authority. Do not add a separate scheduler, datastore, model client,
   API server, production capture or unscoped refactor.
7. Preserve the validated diff/receipts. Remote branch writes are NOT
   delegated in this campaign: give Central the complete changed-file
   diff or exact changed file bytes, tests and source observations for
   review and staging on the SAME issue/79 branch. Do not create a PR,
   merge, deploy, close an issue or write Graphiti facts.

## Subsequent campaign evidence publication (not retroactive)
This first pilot correctly used `GITHUB_MUTATION=none` and returned uncommitted
source edits because remote writes were explicitly forbidden at that time.
**Future Build campaigns**, including Issue #80 and the integrated Issue #81
qualification, must additionally follow
`docs/issue-78/REVIEW_EVIDENCE_PACKET.md`. Their new handoffs must explicitly
set `EVIDENCE_REMOTE_UPDATE=allowed`, `SOURCE_REMOTE_UPDATE=forbidden` (unless
separately authorized), and a concrete `EVIDENCE_ROOT` on the same issue/79
working branch. The local Build agent must package and publish a sanitized
self-contained evidence packet with source diff, frozen fixtures, tests,
receipts, checksums and full handback, via one scoped evidence-only commit and
non-force push with exact-head readback. If publication is denied or the head
moves, return the complete portable packet and report `BLOCKED` or `STALE`;
never claim evidence is GitHub-staged without readback.

## Host environment and safety
CPU-only: JS syntax/tests, event fixtures, selector comparison, queue races,
source/code/SDK inspection and CLI status.
Native harness: one disposable stock-V2 client/session with private config,
private group/state, normal provider mapping and plugin coexistence.
GPU/model/Graphiti write: NOT REQUIRED or authorized for #79.
No production plugin/config replacement, gate bypass, privileged service
restart, Graphiti replay, secret exposure, database mutation or destructive
cleanup. The local agent may create/delete only its own disposable test
workspace and explicit isolated candidate output.
If OpenCode itself is using the exclusive inference lease, never start a
second inference-producing post-exit drain concurrently. A native probe
may use the current interactive session only within admitted host policy.

## Required handback
RESULT=PASS|PARTIAL|FAIL|BLOCKED
REPO; START_SHA(full); END_LOCAL_SHA(full); HOST_OPENCODE_VERSION
HOST_V2_HOOK_SHAPES=(types/field presence; no private payloads)
NATIVE_MESSAGE_ID=present|absent|conditional
FINISHED_TURN_HOOK=qualified|not_supported|UNVERIFIED
FILES_CHANGED=(exact paths, diff or complete bytes); UNCOMMITTED_DIFF_ID
CPU_TESTS=(commands, exits, counts)
HOST_SESSION=(disposable group, session and time boundaries)
INVARIANTS=(source identity, user/tool/assistant labels, scope/privacy,
no Graphiti writes, no OpenViking mutation, restart/compaction, queue cap)
PILOT=(baseline/new per-case metrics; synthetic versus real clearly marked)
STATUS_CLI=(counts, drop reasons)
KNOWN_GAPS=(with reproduction and materiality)
PRODUCTION_MUTATION=none
GITHUB_MUTATION=none
NEXT=Central review/stage corrections on issue/79; continue #80 on same branch

COMMAND_SHAPE_FRICTION:
  encountered=<yes|no>
  events:
    - scenario=<short task scenario key>
      requested_shape=<sanitized submitted invocation>
      effective_shape=<runtime invocation or same-as-requested|unknown>
      rewrite_provenance=<none|rtk_opencode_hook|shell_or_alias|other_harness_hook|unknown>
      event_kind=<pre_execution_rejection|execution_failure|successful_recovery|guard_annotation|harness_rewrite|runtime_misbinding|interface_discovery|other>
      execution_effect=<not_executed|executed_failed|executed_succeeded|recovered_after_retry|unknown>
      correction_or_annotation=<decisive bounded detail>
      replacement_shape=<corrected shape|none>
      recipe_reference=<GHDEV-10 key|none>
      resource_reference=<used resource|none>
      contract_conflict=<yes|no|uncertain>
      durable_gap_candidate=<yes|no|uncertain>
  omitted_sensitive_values=<yes|no>
When no friction occurred: encountered=no; events=[]; omitted_sensitive_values=no.
