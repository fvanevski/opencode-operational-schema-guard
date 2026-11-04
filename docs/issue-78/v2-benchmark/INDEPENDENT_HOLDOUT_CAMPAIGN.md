# Issue #81 — Independent holdout and durable-memory qualification (consolidated host campaign)

**Central-authored execution authority.** Use this file on the exact \`issue/81\` commit specified by the operator kickoff, together with the live Issue #81, current repository interfaces, and the existing evidence at \`docs/issue-78/evidence/81-final-verification-v1/\`. One cohesive campaign with an unavoidable post-exit inference boundary; **do not create another PR**. The current PR is #83 (draft). This file supersedes the earlier #81 holdout instructions *only for this new campaign*. It does not supersede privacy/source identity/Graphiti/EX controls.

## Outcome and non-goals

Complete **one genuinely independent, prospectively frozen, human-adjudicated real-native holdout** through source capture → exact candidate selection → accepted post-exit local curator → scope-bound Graphiti persistence/readback → human fact review → honest three-path quality and selectivity results. Return **one self-contained sanitized evidence commit on \`issue/81\`**, unless an admissibility/safety block prevents publication. Cover the existing #80 portal/CLI only with a bounded status/inspection smoke for this cohort, not a GUI rebuild.

This is a **new factual cohort**, not a repeat of the exposed five-case “prospective” holdout (which was actually semantically overlapping), the nine-case frozen/exposed holdout, or any FSM/prime.js source. The prior prospective development 5/5 adjudicated recall and 13/13 source-grounded persisted facts are accepted historical measurements, not a substitute for independent holdout. The six of 13 non-durable-useful persisted facts remain a selectivity concern. Do not change past labels, threshold proposal, graph episodes, CI authority or installed production plugin.

**Not in scope:** new capture/retrieval architecture, production plugin deployment, production \`ghdev_gh_mcp\` group writes, Graphiti deletes, new model services, LiteLLM/NInfer global changes, EX-gate edits, Code-review request, new issue/PR, formal approval/merge, issue closure. Central owns substantive product, selector, evaluator, schema or permission changes. A discovered product bug gets a precise reproduction + complete proposed patch for Central, not a hidden local source repair.

## Binding known authority

- Repository \`fvanevski/opencode-operational-schema-guard\`; \`issue/81\` / draft PR #83, base \`main\`. Fetch and re-read both refs; **do not** use a historical SHA merely because this document mentions it. The operator kickoff supplies the full exact current branch SHA.
- Latest accepted source/test authority at writing: \`81f9c36ff4c62d474a080442db67db18df87eb39\`, with 42/42 focused tests and fixed multiline user-message recovery/source-identity mismatch; the later evidence-only commit \`6186bbbc47394977a3b8f933289080a8a6c822b2\` records operator ratification and a distinct full SHA. Neither is the next kickoff SHA unless GitHub readback says so.
- Fixed target proposal \`docs/issue-78/v2-benchmark/targets.proposed.json\`, SHA-256 \`17ffb60515f5f96f2d546fd3abf951d0bc008325e38d83145ec4f75a8c76f049\`. Already ratified in the existing private operator record; verify its original signed digest and contents. Do not re-ask the operator to approve the same unmodified targets. Candidate useful-event recall ≥0.85; **model-origin, remote-receipt-bound and independently judged** durable fact grounded/authority/scope precision ≥0.90; natural semantic recall ≥0.80 later on a freshly installed client; interactive context p95 ≤300 ms; post-exit terminal p95 ≤900 s; zero observed credential leakage/wrong group/false verified.
- Immutable previous results: frozen development \`22ae11e64a7a9c443d6f13a79c363115a28b43a27620e5383449bfe32d9fb5b4\`, historical recall 27/37 FAIL; exposed holdout \`f904411e51d0bd9674b7f756f3df5bf44452ca8f63362d75102ceb9df677fce4\`, 3/6 FAIL. Repaired counterfactual 29/35 and 4/6 do **not** replace original results.
- Existing later prospective 12-case development \`d3822a30ed906372679fc7d2f9ee2e9540279b92d04cda3e8656b628674f0cd7\`: operator-adjudicated 5/5 selected, 5/8 selection precision. Existing five-case prospective holdout \`2435236a249ba871ab9dff4f3060031cc6a4762d0ae1873689d363d3ac8bed2a\`: 4/4 exposed regression, **not independent**, zero persisted facts. Do not score it again as blind.
- Exact reusable CPU interfaces: \`docs/issue-78/v2-benchmark/{evaluate,adjudicate,stage-holdout}.mjs\`, \`docs/issue-78/v2-candidate/{events,plugin,queue}.mjs\`, \`docs/issue-78/v2-curator/{curator-cli,worker,core,model-policy}.mjs\`; existing canonical EX wrapper \`docs/issue-75/v2-candidate/post-exit-drain.py\`. Read the current source/CLI before calling, with the concrete shapes below taking precedence over older example contracts if source still agrees.
- The disposable unit renderer \`v2-curator/activation/render-qualification.mjs\` permits **only \`cur80_*\` groups** and \`ghdev-curator80-*\` units. Do **not** patch/bypass its guard to run a \`cur81_holdout_*\` cohort. Prepare one bounded \`systemd --user\` oneshot directly from the existing accepted service pattern without any \`Restart=\` or custom background scheduler. Never start it while the active OpenCode harness holds the shared inference lease.
- The accepted \`chat-fast\` alias is non-thinking: do not send \`reasoning_effort\`/reasoning override; preserve \`enable_thinking=false\` at the alias, and do not change global model config. Optional \`GHDEV_CURATOR_MAX_TOKENS\` is allowed only from validated current profile/usage; no reason to repeat the historical five-case probe.

## Independence specification — Central decision, not local model invention

**Source domain:** perform one ordinary, bounded coding session in a **fresh private disposable workspace** implementing a practical **WebVTT cue reader/validator** (not an FSM, prime checker, graph/memory controller, transition manifest or release readback tool). Work on meaningful real code and tests inside that fixture; do not change the GH repo. The natural requirements to exercise are WebVTT cue timestamps, cue identifiers/settings, multiline cue text, overlapping/nonmonotonic cue handling, and preserving exact input provenance. A legitimate failed test → explanation → fix → passing test, an implicit design decision, a later corrected/superseded rule and an observed negative finding should arise through actual work, not be fabricated as Git logs or as “verified” assertions. The fixture may be deliberately small; actual tasks and source are still real.

**Sampling contract:** preserve a complete native session event census before selecting the evaluation subset. Pre-register a target of roughly 16–24 distinct **source cases**, including ≥8 useful cases if organically available and several independent negative controls; do not invent or inject extra useful cases merely to make the fraction pass. Capture representative direct/implicit, multi-event, tool-reported, historical/supersession, error-fix and bounded long prose/code-plus-prose cases, and chatter/duplicate, synthetic credential-pattern, SELF-marker, read-only/wrong-scope controls. A native source case counts once regardless of how many candidate spans it generates. A session without enough genuinely relevant events is an honestly underpowered holdout; report it rather than synthesizing a perfect denominator or running adaptive replacement attempts after scores are exposed.

**Independence gate (before any selector score/model drain):** prepare one private source-complete operator briefing comparing each proposed fact/requirement to the historical FSM, prime.js, existing five-case holdout and prior dev semantic families. Distinguish domain-level substantive overlap from generic phrases like “tested” or “readback”. The operator must explicitly approve the case roster, independent subject/claim families, and labels *before* scoring. If the operator finds material overlap, mark the entire cohort diagnostic, or replace the *unscored* roster with freshly collected naturally occurring independent events before freezing; never quietly reclassify it as blind after outcomes. Keep the full semantic comparison and any edits private with an immutable hash; publish only a sanitized summary and binding hashes.

**Source truth:** every case must originate in an actual stock-V2 native event with authentic session/message/tool ID, timestamp, source text, evidence class, project/workspace and exact locator. Collect native events from the user's ordinary coding interactions, not a simulated event object passed off as observed. The corpus JSON follows \`v2-benchmark/README.md\`; for existing \`stage-holdout.mjs\` compatibility use schema \`split=holdout\`, \`label_status=provisional\`, \`scope.group=cur81_dev\`, a distinct real \`scope.project\`/absolute \`scope.workspace\`, and real native event fields. **The \`cur81_dev\` field is an evaluator source-scope convention, not a claim about the live capture group**; separately record the actual private live capture group and source event provenance. Case-level wrong-scope controls carry explicit mismatching scope and must be excluded. All full text, credentials and source/secret-adjacent data stay private (\`0700\` dirs, \`0600\` files). Use invented/known-fake credential-like tokens for negative controls; never create or display real secrets.

## Phase A — Build host preparation, real-native collection and pre-result operator sign-off

1. From the existing trusted checkout, **fetch the current \`issue/81\` ref before local exact-object proof**. Compare fetched ref to the kickoff full SHA and PR #83; if different return \`STALE\`. Create one unique, clean, disposable exact-SHA worktree without touching owner branches/worktrees. Workdir for all Node commands is that worktree root. Verify repo source and current installed stock-V2 hook/queue/graph interfaces; classify differences instead of relying on V1-specific legacy admission commands. Do not run an equivalent full root suite already covered by current trusted Actions receipt.
2. Create a unique private campaign root and new scratch WebVTT workspace and isolated native candidate group; no previous \`cur81_*\` directory reuse. Preserve exact source/native event IDs and the original raw-first event census. Under the normal interactive Build process, run the ordinary coding fixture. Stage only fixture source/test edits; native plugin capture is allowed in the isolated scratch group. No interactive curator/model or Graphiti write. Verify existing candidate hooks actually saw admitted prompt, \`execute.after\` and any meaningful edit/write events; a \`read\` observation must **not** be renamed \`file_change\`. Document p50/p95 capture latency and safe negative exclusions without reconfiguring the production plugin or \`ghdev_gh_mcp\`.
3. Freeze the **new** native corpus bytes before running \`evaluate.mjs\`, \`stage-holdout.mjs\` or any post-exit curator. Hash it, freeze an original complete event census and a human-reviewable, private 16–24-case (or honest smaller) roster. Validate exact native identities, no synthetic positive events, no source-case duplication, and independence comparison. If the dataset is an invalid overlap, regenerate only *before* score/selection results are inspected; record the aborted draft as invalid in the private log.
4. Generate the complete case worksheet and reuse the existing signed unchanged target-ratification (do not mint a new authority from AI text). Actual CLI:
   \`\`\`bash
   node docs/issue-78/v2-benchmark/adjudicate.mjs prepare \
     --corpus "$CORPUS" --expected-corpus-sha256 "$CORPUS_SHA" \
     --out "$PRIVATE_DIR/case-adjudication.json"
   \`\`\`
   Show operator **one consolidated** source-complete private packet: each verbatim native source, provenance, proposed valuable label/rationale, meaning of adverse/alternative label, full domain-overlap comparison, safety controls, rubric and unchanged thresholds. Present all decisions together, not 20 chat micro-prompts. Human must edit/ratify \`case_labels\` and \`operator_confirmation\` exactly as required by \`adjudicate.mjs\`; agent must not sign, silently supply \`source_checked=true\` or copy old signatures. If the operator cannot ratify now, return \`AWAITING_OPERATOR_CASE_REVIEW\` with prepared private packet, and **do not** stage or drain. A prior signed target is reusable only if its bytes and SHA establish the original unchanged proposed targets; never guess its path/digest.
5. After human attestation, hash worksheet/target receipt, independently verify all original source and negative-control hashes, and perform the sealed, **first** offline comparison with the existing real source adapter. Keep baseline and broad selection case-level counts; do not tune selection or truth after the score. For a cross-group post-exit run stage this exact supported CLI shape (substitute authenticated absolute paths, original SHA pins, and a fresh \`cur81_holdout_<8 lowercase hex>\` group):
   \`\`\`bash
   node docs/issue-78/v2-benchmark/stage-holdout.mjs stage \
     --corpus "$CORPUS" --expected-corpus-sha256 "$CORPUS_SHA" \
     --adjudication "$WORKSHEET" --expected-adjudication-sha256 "$WORKSHEET_SHA" \
     --proposal "$TARGETS" --expected-proposal-sha256 "$TARGETS_SHA" \
     --target-ratification "$SIGNED_TARGETS" --expected-target-ratification-sha256 "$SIGNED_TARGETS_SHA" \
     --group "$HOLDOUT_GROUP" --state-dir "$PRIVATE_STATE" --out "$PRIVATE_DIR/stage-receipt.json"
   \`\`\`
   The target group's \`candidate-events-v1\` and \`curation-v1\` paths **must be absent before staging**; output also must not exist. \`PRIVATE_STATE\` must be a mode-0700 directory. Do not re-stage after a success or ambiguous write; use readback.
6. Validate model policy via the actual existing \`curator-cli.mjs validate-config\` under the private environment file; use working loopback provider/model and authenticated current EX gate source/config. Inspect current Graphiti MCP endpoint, production episode baseline and other outstanding leases read-only. Prepare **one** uniquely named disposable \`systemd --user\` \`Type=oneshot\` service using actual absolute paths and \`EnvironmentFile=<private 0600 file>\`. It must execute:
   \`\`\`text
   /usr/bin/python3 <EXACT_WORKTREE>/docs/issue-75/v2-candidate/post-exit-drain.py
     --gate-source <AUTHENTICATED_INSTALLED_GATE_SOURCE>
     --gate-config <AUTHENTICATED_INSTALLED_GATE_CONFIG>
     --cli <EXACT_WORKTREE>/docs/issue-78/v2-curator/curator-cli.mjs
     --group <NEW_HOLDOUT_GROUP> --state-dir <PRIVATE_STATE>
     --endpoint <VERIFIED_LOOPBACK_GRAPHITI_MCP>
     --max-seconds 600 --lock-timeout 120
   \`\`\`
   This is a formatting projection of a **single ExecStart command**; do not paste newline-broken arguments into a unit. No \`Restart\`, path watcher, timer, superuser/service rewrite or new controller. \`systemctl --user daemon-reload\` and read back the exact unit and env/source bindings; **do not start it in the interactive OpenCode process**. Keep worktree, state, and unit intact through Phase B. Restore any incidental host settings or stop if safety/readiness cannot be proven.
7. Hand back \`READY_FOR_POST_EXIT\`, the exact full source SHA, private roster/corpus/worksheet/target hashes, honest preliminary selection matrix, fresh group, source/Graphiti preflight, exact unique unit name, exact **one operator-only command** \`systemctl --user start <verified-unit>.service\`, and safe post-exit readback commands. Explicitly end the Build session. Do not execute the start command yourself. An operator decline/incomplete review returns \`AWAITING_OPERATOR_CASE_REVIEW\`, not a fake PASS.

**Phase A operator transition (not local-agent execution):** Fully exit all inference-holding interactive harness processes. From an ordinary host terminal, run only the exact \`systemctl --user start <verified-unit>.service\` given in Phase A's handback. The existing Python EX wrapper is the sole admission authority; a failed pre-admission check is not permission to weaken the shared lock, grace, idle metrics or process denylist. A seemingly successful service exit alone is not a persisted Graphiti receipt. Do not re-run a service whose \`add_memory\` outcome is ambiguous. If EX remains held by an unresolved worker, preserve it and return diagnostic evidence rather than killing shared workers.

## Phase B — fresh Build evidence follow-through (same campaign, **after** the operator's post-exit run)

1. Start a genuinely new Build process from the same **verified exact-SHA worktree** after the post-exit unit has reached an inspectable state. Verify existing Phase A hash/roster/signatures, actual unit/run journal, group/queue/review/EX status and remote UUID/name/group readback. Reusing the same worktree is intentional; do not re-run Phase A, stage any event again or launch the model inside this interactive harness. If the post-exit work is still running/ambiguous, use read-only status/reconciliation and report the genuine blocker. Any new source SHA means \`STALE\`, not silent continuation.
2. Inspect all original source→selected candidate→curator \`EMIT/DEFER/SKIP\`→terminal positive Graphiti episode→source-index→extracted nodes/edges chains in this group. Bind each model call/token/latency to the correct worker and record unresolved/censored samples. Do not assume \`queued\` equals persisted or that a final result field proves remote absence; use accepted group-scoped Graphiti source/episode readback. Historical earlier cohorts and \`ghdev_gh_mcp\` must remain unchanged. One read-only review portal/CLI inspection is sufficient; do not rebuild portal functionality.
3. Prepare **one** second private evidence-complete fact-decision packet for the operator: each actual model assertion verbatim, exact cited native excerpt/omitted context, source provenance class, Graphiti UUID/edge, current vs superseded status, proposed grounded/useful/authority_correct/scope_correct with reason and the consequences for the existing ≥0.90 threshold. Include DEFER/SKIP and absent-fact notes (not as precision-denominator facts). Require genuine operator verdicts; the agent may format the file after explicit decisions, never self-sign. If operator cannot ratify, return \`AWAITING_OPERATOR_FACT_REVIEW\`, preserving graph history and private packet.
4. Score with the **same frozen corpus, signed source labels and unchanged targets**. After operator fact ratification, build a new versioned observations JSON from actual model/Graphiti receipts with exact qualification-group \`source_event_ids\`, cluster IDs, model provenance, terminal readback and fact verdicts. Use \`adjudicate.mjs score\` (absolute paths and matching hashes) and \`evaluate.mjs\` or the existing accepted scoring outputs; never adapt expected labels/thresholds to match what the model did. CLI:
   \`\`\`bash
   node docs/issue-78/v2-benchmark/adjudicate.mjs score \
     --corpus "$CORPUS" --expected-corpus-sha256 "$CORPUS_SHA" \
     --adjudication "$FACT_SIGNED_WORKSHEET" --expected-adjudication-sha256 "$FACT_SIGNED_SHA" \
     --proposal "$TARGETS" --expected-proposal-sha256 "$TARGETS_SHA" \
     --target-ratification "$SIGNED_TARGETS" --expected-target-ratification-sha256 "$SIGNED_TARGETS_SHA" \
     --observations "$OBSERVATIONS" --out "$PRIVATE_DIR/final-score.json"
   \`\`\`
   The fact-signed worksheet must retain the **original pre-run case labels** verbatim. Preserve original source-case scores and report all matrix terms and denominators. For holdout candidate recall, \`tp/(tp+fn)\`; for model-origin durable precision, judge only positive receipt-bound persisted model facts, including any false/unsupported assertions, never a seed/queue/empty denominator. Record \`UNVERIFIED\` instead of an empty-set PASS. Keep useful-persisted fraction **separate** from grounded precision; do not hide the known prior six transient EMITs.
5. Measure genuine CPU capture p50/p95, EX admission→terminal/unknown outcome, curator and Graphiti inference costs where separately attributable, duplicate/cluster/fact yield and negative guardrail leakage. Compare #75 heuristic, #79 broad and #80 curator on the **same exact holdout source cases**. Report genuinely independent acceptance separately from historical/exposed results. An isolated pre-merge native recall probe may be added *only* if it is simple, pre-registered and does not introduce another model/producer conflict; it is **not** a substitute for required post-merge installed fresh-client semantic recall.
6. Publish **one** self-contained sanitized evidence-only commit (or report publication BLOCKED) at:
   \`docs/issue-78/evidence/81-independent-holdout-v1/\`.
   Include \`manifest.json\` (source tested SHA, current evidence commit parent and all private source/label/target identities, file checksums excluding self), \`cohort-independence.md\`, \`source-and-host.md\`, \`case-matrices.json\`, \`curator-graphiti.md\`, \`selectivity-and-latency.md\`, \`operator-signoff-status.md\`, \`friction-ledger.json\`, \`handback.md\`, and any bounded sanitized tests or proposed source patches if material defects found. **No** full raw native transcripts, private worksheet, signed operator identity, real credentials, host home paths, model private reasoning or unredacted source text. Include exact full content/portable diff for any proposed source fix, with affected requirements/tests and \`UNCOMMITTED_SOURCE_CHANGES\` classification.
7. \`EVIDENCE_REMOTE_UPDATE=allowed\`; \`SOURCE_REMOTE_UPDATE=forbidden\`; \`EVIDENCE_PACKET_REQUIRED=yes\`; \`EVIDENCE_ROOT=docs/issue-78/evidence/81-independent-holdout-v1/\`. This is a **narrow exception** for exactly one sanitized evidence-only commit to the *same* \`issue/81\` branch, **not** general source/GitHub mutation authorization. Verify \`git diff --cached --name-only\` contains only the packet path, check public scrubbing, authenticate the remote branch at the admitted parent immediately before one non-force push, and verify new full SHA/remote ref/readback afterward. No force push/rebase/reset/auto-merge/new PR. A race is \`STALE\`; return portable packet/source diff and do not reconcile head movement automatically.
8. Preserve a complete **GHDEV-10 canonical** \`COMMAND_SHAPE_FRICTION\` record even when the result is PASS. Return \`PASS_QUALITY_ONLY|FAIL_QUALITY|PARTIAL|AWAITING_OPERATOR_FACT_REVIEW|BLOCKED|STALE\`, not \`ISSUE_CLOSED\`. Central owns exact-head independent review, Codex sequencing, merge decision, future reversible installed stock-V2 activation and genuinely fresh client acceptance, and final #81/#78 closure.

## Required handback and disposition

\`\`\`text
CAMPAIGN=ISSUE81_INDEPENDENT_HOLDOUT
PHASE=A|B
RESULT=READY_FOR_POST_EXIT|AWAITING_OPERATOR_CASE_REVIEW|PASS_QUALITY_ONLY|FAIL_QUALITY|PARTIAL|AWAITING_OPERATOR_FACT_REVIEW|BLOCKED|STALE
REPO_ID=fvanevski/opencode-operational-schema-guard
PR=83
TESTED_SOURCE_SHA=<full40>
REMOTE_HEAD_BEFORE=<full40>
REMOTE_HEAD_AFTER=<full40 or unchanged>
CORPUS_PRIVATE_SHA256=<64hex or missing>
HOLDOUT_INDEPENDENCE=operator-approved-before-results|diagnostic_overlap|UNVERIFIED
SOURCE_CASES=<real census and frozen case count>
CASE_LABELS=<operator attestation digest, pre-result timestamp or pending>
TARGETS=<original proposal SHA + reused genuine signed private digest>
COMPARE=<same-case baseline/broad/curator confusion, scores and denominators>
EX=<operator unit, admission outcome, terminal/reconciliation status>
MODEL=<alias, no-thinking, calls, usage, latency, censored>
GRAPHITI=<exact group episode UUID/source index/edges, pending/ambiguous, prod nonmutation>
HUMAN_FACT_VERDICTS=<complete signed digest or pending>
QUALITY=<recall, grounded durable precision, usefulness, negatives, p50/p95, PASS|FAIL|UNVERIFIED>
SOURCE_CODE_MUTATION=none|uncommitted proposed diff details
EVIDENCE_PUBLICATION=<one commit full SHA/path|BLOCKED>
REMAINING_GATES=<independent Central PR review; late Codex if available; authorized merge; main CI; fresh installed client + OpenViking coexistence>
NEXT=Central accepts evidence and adjudicates remaining Issue #81 gates on PR #83

COMMAND_SHAPE_FRICTION:
  encountered=<yes|no>
  events:
    - scenario=<scenario>
      requested_shape=<sanitized actual submitted invocation>
      effective_shape=<executed/rejected shape|same-as-requested|unknown>
      rewrite_provenance=<none|rtk_opencode_hook|shell_or_alias|other_harness_hook|unknown>
      event_kind=<pre_execution_rejection|execution_failure|successful_recovery|guard_annotation|harness_rewrite|runtime_misbinding|interface_discovery|other>
      execution_effect=<not_executed|executed_failed|executed_succeeded|recovered_after_retry|unknown>
      correction_or_annotation=<error/correction>
      replacement_shape=<corrected shape|none>
      recipe_reference=<GHDEV-10 key|none>
      resource_reference=<resource|none>
      contract_conflict=<yes|no|uncertain>
      durable_gap_candidate=<yes|no|uncertain>
  omitted_sensitive_values=<yes|no>
\`\`\`

When no friction occurred, return \`encountered=no\`, \`events=[]\`, \`omitted_sensitive_values=no\`. Check original command vs runtime rewrite, pre-execution denial vs actual failure, and any meaningful interface discovery. Use exact event evidence; do not normalize a recovered error away.

**Stop/escalate only for:** a genuine unratified human decision at a mandatory trust boundary; proved same-meaning prior-data overlap after exposure; pre-existing live/source/EX authority drift; potential secret/privacy failure; ambiguous Graphiti mutation requiring operator adjudication; a substantive selector/evaluator/model/permission/architecture change; non-fast-forward ref race; or an unrepeatable failure that materially blocks source/graph quality. Routine private fixture, test, unit, path, syntax, stdout parsing, environment and bounded admission-preflight friction is agent-owned, with rollback, evidence and precise readback. Keep this one campaign cohesive rather than spawning issue/PR/controller micro-slices.
