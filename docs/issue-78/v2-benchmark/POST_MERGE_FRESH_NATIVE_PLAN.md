# Issue #81 — approved sequence for **later** installed fresh-native acceptance

This is the Central-owned phase design, **not permission to deploy** at the current candidate head. Source deployment, merged-main CI, and genuinely new-process acceptance must occur **after** the single #81 PR receives independent review and is merged under the applicable GitHub gate.

## Phase A: operator + Build, controlled reversible deployment

1. Central independently reviews exact PR head and all source changes; trusted Verify and required CI must bind to that head. Obtain user merge authorization. After squash-merge, authenticate exact `main` commit/tree.
2. Operator snapshots the current **installed** stock OpenCode V2 Graphiti plugin bytes, effective options/opt-in scope, group and Graphiti MCP endpoint, systemd existing units and private curator env; record paths, SHA-256, known private credential pointers (not secrets). Confirm live OpenViking settings and original four production episodes, and that no pending legacy `submission_unknown` might be replayed.
3. Prepare and independently review a **reversible** install plan that uses the repo-owned installer/current active stock-V2 plugin route. Do not presume a legacy V1 plugin/config or promote from an arbitrary local worktree. Any required post-exit daemon/user unit must use the canonical OpenViking shared EX admission and quiet grace; no second scheduler, global LiteLLM thinking change, or uncontrolled `Restart=on-failure` polling.
4. Deploy only merged source/config pair, preserve prior plugin/config snapshot, and confirm loaded byte identity in a fully stopped/restarted stock V2 process. Test service health and opt-out. If an install interface is unknown or provenance differs, pause for Central exact contract correction instead of guessing or weakening the gate.
5. Emit `DEPLOYED_NOT_FRESHLY_ACCEPTED` evidence. Source activation alone is NOT #81 PASS. Operator explicitly ends Build harness before Phase B.

## Phase B: truly fresh Evidence process, natural recall and safety

1. Launch a **genuinely new** stock OpenCode V2 client, not a resumed session, using the just-installed exact source/config. `evidence` is the preferred primary role; any separate filespace projection and source/host read setup is an **operator-plane** preparation before launch. Do not relax Evidence permissions to make a proof run.
2. Create a new native session and ask registered **ordinary, paraphrased, indirect, relationship and historical** development questions drawn from the adjudicated/previously persisted source facts. Include wrong-project and privacy distractors. The test queries and expected source anchors must be fixed *before* running the newly installed retrieval behavior, not revised in response to bad answers.
3. Observe and preserve the **actual assembled model request** including `[GHDEV_GRAPHITI_CONTEXT]`, source ID, project/group and uncertainty fields. A successful answer or Graphiti search result alone is insufficient. Inspect concurrent OpenViking context and no duplicate Graphiti injections.
4. Measure p50/p95 interactive context latency against the retained 300 ms guard, normal coding work with no unexpected shared-model contention, and post-exit automatic admission→Graphiti readback timing. Confirm no accidental duplicate episodes, privacy leak, group crossover, unsupported `verified`, or blind replay under interrupted/ambiguous service response. Preserve early-stop controls and accepted legacy episode readability.
5. Test correction/forget through existing CLI/portal semantics with non-production disposable examples; do not erase the four established production episodes or silently delete source evidence. Use source-linked recall, not cherry-picked "it sounds right" output.
6. If acceptance fails, roll back installed plugin/config and private candidate unit to the exact saved sources, verify previous functional state, and return failure evidence. Do not make architectural fixes locally to force PASS.

## Gate ledger

- `SOURCE_REVIEW_EXACT_HEAD`: independent Central + approved formal review + exact trusted checks.
- `MERGED_MAIN_SOURCE_CONFIG`: same tree + merged-main CI.
- `HOST_DEPLOYMENT`: reversible actual installed source/config, byte readback, rollback.
- `FRESH_CLIENT_SESSION`: **new process + new native session**, actual request injection, source accuracy and OpenViking coexistence.
- `BENCHMARK_AND_QUALITY`: prior frozen operator-ratified corpus/target and honest PASS/FAIL.
- `PARENT_78`: remains open until all integrated requirements are evidenced.

Two separate host processes are **required** for the final deployment-to-fresh acceptance boundary. They are two operational phases, not two separate implementation PRs. No automatic issue closure or production activation is authorized by this design file alone.
