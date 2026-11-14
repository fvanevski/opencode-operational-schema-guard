<<< LOCAL_AGENT_CONTRACT_BEGIN >>>
LOCAL_AGENT_PRIMARY=build
TASK_ROLE=one consolidated Issue #92 host integration and closure-ready handback
REPO_ID=fvanevski/opencode-operational-schema-guard
ISSUE=92
PR=95
BRANCH=issue/92-v7c-accepted
REQUIRED EXACT HEAD: obtain the full 40-hex SHA from the accompanying Central kickoff, not from a historical note inside the repository
CONTROL_FILE=docs/issue-91/adr-acceptance/issue92-final-host-integration-contract.md
CPU_STAGE_HELPER=docs/issue-91/adr-acceptance/issue92-exposed-v2-smoke-stage.mjs
REPOSITORY_CODE_EDITS=forbidden
SEMANTIC_REMEDIATION=forbidden
MECHANICAL_REMEDIATION=forbidden
LOCAL_SUBSYSTEM_REMEDIATION=allowed only for disposable state, secure runtime environment, model/Graphiti routing, scheduling and post-exit launcher preparation
REMOTE_UPDATE=forbidden for production source or policy
EVIDENCE_REMOTE_UPDATE=allowed once, sanitized JSON only, to this existing PR branch using exact-head CAS and readback; otherwise secure handback
MERGE_DEPLOY_ISSUE_CLOSE=Central-owned, forbidden in this handoff

MISSION
Complete #92's remaining **host-specific** acceptance in this campaign, not another research or implementation campaign. Central already owns and staged the architecture, source changes, source-atomic V2 recovery, scorer, revised >=70% prospective policy and regression tests. Exact-head trusted CI covers repository deterministic checks. The previously validated v7c prospective 9/10 PASS is historical acceptance evidence; the later V11-R1 7/10 and V22 8/10 FAIL scorecards remain immutable. V22's 13/13 source-faithful/useful facts and zero controls are corroborative, not retroactively rescored. Do not start a new 20-case cohort or retune model/scorer. The updated >=70% policy leaves >=90% grounded precision, >=75% useful among grounded, >=8 independent useful facts, zero controls/authority/privacy/EX breaches, and source/UUID integrity unchanged. The new V2 clause path does not create a new evidence unit: each persisted fact remains one original exact subspan independently reviewed and one Graphiti episode.

WORK PLAN (single handoff, no interleaved Central decisions)

A. MATERIALIZE & VERIFY (CPU, Build process)
- Before work, fetch the existing branch from verified origin, compare `FETCH_HEAD`, remote PR head and the full Central-supplied SHA, and create/reuse one clean detached worktree (e.g. `/tmp/opencode/issue92-final-<shortsha>`) at that commit. Do not reset/clean/change the primary checkout, rebase, force-push, open a new PR, or use a stale local ref. Stop STALE on remote movement.
- Verify exact-head node-contract SUCCESS for the required GitHub commit and that CI ran the four curator suites, A3 scorer tests, Python EX launcher and broad `npm test`. Do not duplicate the 524-test repository suite locally without a source/environment reason. Do syntax check the CPU stage helper and inspect the current `post-exit-drain.py` finite V2 flags, including `--source-message-isolation on`, `--source-subspan-recovery on`, and `--source-subspan-recovery-v2 on`.
- Locate the EXISTING V22 private evidence TAR by digest (SHA256 `9694ef58224930a50e16615c83d81c3fee2ffca07d94a53d1381b02260253d31`). Previous host evidence located it under `/tmp`, not the previously misreported `/home/filip/.issue92-v22` path. If needed inspect `/tmp/opencode` and the operator-supplied archive location. Extract ONLY `issue92-v22/private-manifest.json` and `issue92-v22/frozen-roster.json` to a private 0700 scratch directory, ensure 0600 files, verify the original full manifest digest `1e9f0bb550b67f40413470fe69521f5eb2e457c5590413650978141ac89d54a0` and label digest `a13b52f539b561837ffa42ba430546967ab937b498e7fd8c31913d72a376e1ed`. Do not copy old V22 state, queue, plan, intents, or episodes into the new experiment.
- Use prior host source-identity/provenance evidence without running another historical DB mining scan. Spot-check the two missed original cases (`v22-v-07`, `v22-v-10`) against their frozen source handles if fresh source ambiguity arises. Treat old results as exposed regression data, not a new holdout.

B. STAGE ONE SMALL EXPOSED REGRESSION (CPU, Build process)
- Generate a never-used, safe group matching `graphiti-adr92-exposed-v2-<unique-id>` and an empty, unrelated 0700 state root. Verify `get_episodes` for the EXACT new group returns zero with max_episodes>=500, the local ReviewStore and queue are empty, and there are no prior model intents. Never delete/reuse a populated group.
- Run the Central-authored CPU stage helper using the absolute private manifest, roster, state root and new group. It authenticates and stages exactly six original native messages: the two V22 misses (`v-07`, `v-10`), two previously useful positives (`v-01`, `v-02`), and two controls (`c-01`, `c-02`). It verifies full text/locator hashes, original labels, every emitted native event and one-time queue creation. Expect six source cases, >=6 native events, with exact count determined by the unchanged `fromPromptCandidates`; this is a **disposable exposed-case smoke**, NOT a prospective A3 scorecard. Never call the full `issue92-a3-stage.mjs` on the old V22 group or rerun its historical scorer.
- Prepare a single canonical EX-gated post-exit invocation using the current installed gate source/config, source-checkout `curator-cli.mjs`, verified Graphiti MCP endpoint (previously `127.0.0.1:8766/mcp`), and verified `chat-fast` model route (previously `127.0.0.1:8002`). Revalidate live settings rather than assuming the old ports. Use the existing `post-exit-drain.py --finite-batch-v2`, `--max-seconds 3600 --lock-timeout 120 --scheduler-wait 180`; do not direct-call the model or Graphiti for writes. Restore LOCAL_CURATOR_URL/MODEL/API_KEY in the actual clean launcher environment through secure existing configuration; never print/publish credentials. Preserve temp=0, 1600 output tokens, 90s request timeout unless current verified model policy differs materially, in which case report the deviation before execution.

C. EXECUTE ONCE AFTER EXIT (real host/model/Graphiti)
- The interactive Build/OpenCode/Hermes process must EXIT before canonical EX admission. If needed prepare one private executable or user transient unit as a minimal operator post-exit continuation; don't install a daemon or change the production plugin. Hold the **kernel-backed canonical flock** on `/run/user/1000/openviking-agent.lock`, observe the configured quiet grace and zero running/waiting scheduler load, and inherit the lock FD into the child. Do not bypass an occupied/unknown harness or EX guard.
- Perform one admitted finite-V2 drain and its canonical reconcile-only continuation to uniquely confirmed remote UUID/source-index terminal state. Do not replay a model intent or add_memory after ambiguity. A conclusively pre-intent clean environment failure may be repaired in the same campaign and run once after admission is re-proven; an unknown or remote-ambiguous submission must retain EX and use positive readback, not blind retry. Only the new exposed group may receive writes.
- Return both deterministic pre-model source-atomic candidate evidence for `v22-v-07` and `v22-v-10`, and the real model pipeline's discovery/support/utility/subspan-recovery outcomes. A model may still reasonably defer a particular source; do not force acceptance, modify source excerpts, relax atomicity or alter the existing three-fact bound. Minimum host-positive functional smoke: at least one independently grounded/useful native-source fact obtains a unique remote positive Graphiti UUID, all six source cases are inspected, no control-origin fact persists, zero privacy/authority/wrong-group/EX breaches, source index intact, and terminal reconciliation settles. This is NOT a 4/6 or 2/2 coverage replacement for the approved A3 metric.

D. HAND BACK ONE CLOSURE-READY PACKET (CPU after EX released)
- Independently adjudicate all new persisted facts against original cited spans and original label/temporal scope. Report every source case as `persisted`, `reviewed_deferred`, or `not_represented`, with first consequential loss and narrow source reason. Preserve the full model responses and local Graphiti records privately (0700/0600) with SHA256SUMS and an attachable private TAR; do not place original source messages, secrets, private absolute paths, raw logs, or model replies on public GitHub.
- If PR HEAD is still exactly the code SHA admitted in A, optionally publish one SANITIZED summary `docs/issue-91/evidence/92-pr95-post-v22-host-smoke/qualification.json` by non-force exact-head CAS with host-only hashes/counts/UUID-count/authority verdict and limitation statement; verify remote readback. Do not create a new PR or change code. If the guard requires a publication Fresh-review/Verify, satisfy that guard without altering policy; if publication is denied/stale, return a private handback and mark EVIDENCE_PUBLICATION=BLOCKED, not an engineering FAIL.
- Record `COMMAND_SHAPE_FRICTION` for actual shell/gh/OpenCode permissions, without launching a separate tooling cleanup campaign. No further corpus mining, new held-out packet, scorer revision, opportunistic threshold changes, or repeated adversarial review. Return one final handback to Central with exact source SHA and evidence commit SHA, current PR/CI state, host runtime identities, EX admission and settlement, source events, group/UUID count, V2 case outcomes, negative controls, test evidence already trusted, failure/variance if any, private artifact path+SHA, and all unresolved material blockers. One ordinary recoverable host friction remains part of this same assignment.

STOP / AUTHORITY RULE
Return `BLOCKED` only for real source or PR drift, inability to authenticate the V22 private sources, unresolved kernel EX/Graphiti safety, a material semantic/source/temporal defect, or an actual violation of a required gate. Do not weaken safety or CI, forge a PASS, delete historical state, or carry out production deployment. Central independently reviews the exact terminal PR diff and host proof, then makes the merge/main-CI/issue-closure decision in the existing PR. The fresh installed Graphiti + OpenViking coexistence milestone stays with #94 under the approved roadmap; #92 host smoke does not falsely claim #94 completion.

TERMINAL FIELDS
RESULT=HOST_EXPOSED_V2_PASS|HOST_EXPOSED_V2_FAIL|BLOCKED|STALE
SOURCE_HEAD_SHA=<full 40-hex code commit>
PUBLIC_EVIDENCE_HEAD_SHA=<full 40-hex or none>
PR_95_HEAD_AT_HANDBACK=<full 40-hex>
EXACT_HEAD_CI=<run ID, exact SHA, verdict>
HISTORICAL_V7C=9/10 PASS preserved
HISTORICAL_V11R1=7/10 FAIL preserved
HISTORICAL_V22=8/10 FAIL preserved
PROSPECTIVE_POLICY=issue92-a3-coverage-70pct-2026-11-14
SMOKE_GROUP=<exact never-used group>
STAGED_CASES=6
STAGED_EVENTS=<captured native event count>
MODEL_CALLS=<count/errors/unknown>
SOURCE_SUBSPAN_RECOVERY_V2=<frozen active+plan true; opportunities, approved, deferred>
V22_EXPOSED_V07=<result/source-grounded reason>
V22_EXPOSED_V10=<result/source-grounded reason>
REMOTE_UUIDS=<count, unique, positively reconciled>
CONTROL_ORIGIN_FACTS=<count>
AUTHORITY_PRIVACY_EX_BREACHES=<count>
HISTORICAL_GROUP_MUTATIONS=0
REPLAY=NO
PRIVATE_ARCHIVE=<path/SHA256>
EVIDENCE_PUBLICATION=<published exact sha|blocked+reason|not attempted>
UNRESOLVED=<none or material blocker>
COMMAND_SHAPE_FRICTION=<none or minimal factual details>

<<< LOCAL_AGENT_CONTRACT_END >>>
