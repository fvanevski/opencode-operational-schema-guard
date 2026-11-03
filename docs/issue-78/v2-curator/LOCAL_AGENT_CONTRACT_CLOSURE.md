# Issue #80 — one consolidated host closure qualification

**Repository:** fvanevski/opencode-operational-schema-guard
**Branch:** issue/79, **parent:** #78, **stage:** #80, **PR:** none requested.
**Host:** current Garuda Linux; the accepted stock OpenCode V2.2.5 native-capture receipt is a reference, not an assumption that host versions or services have remained unchanged.
**Authority:** latest explicit kickoff exact SHA + verified branch tree. Source and tests staged by Central. This document has no self-referential SHA; kickoff controls the exact target.
**Primary:** OpenCode **build** agent. One campaign, with a controlled post-harness continuation on the SAME campaign; do not split into micro-issues/PRs.

## Task Plan and closure objective

Explore current exact host bindings -> execute the three integrated acceptance lanes -> verify and return ONE sanitized evidence packet. Reuse the accepted #79 native source-event qualification and the #80 manual real-model persistence result. Do not repeat those campaigns or reimplement their source.

Closure requirements in this ONE campaign:
1. **Real Graphiti extraction**: inspect the already-persisted #80 episode, prove actual entities/facts/relationships by source- and group-scoped readback and distinguish true graph edges from display-only source associations. Show useful graph evidence or a typed deficiency; never invent edges or accept an unverified graph result.
2. **Real operator portal**: exercise current built React/Radix/React Flow GUI with Playwright + the local OpenCode model's image/vision abilities using REAL disposable, native-ID source events and actual persisted state. Use source-bound approval through graph persistence, check server-side CAS/CSRF, conflict/duplicate proposals, unknown-write lockout, filters, accessibility, refresh/restart and screenshots. This is a visual+API/browser qualification, not an agent design overhaul.
3. **Unattended normal post-exit wake**: a genuine OpenCode V2 native capture on a *disposable* group causes a user-systemd path wake, initially excluded while interactive harness is active; after the harness exits, the same accepted Python EX/idle/quiet-grace gate admits the worker without any manual drain, then status/Graphiti reconciliation reaches terminal states. Demonstrate portal-approved and at least one eligible local-model-reviewed record in this same host campaign.

Only #81 owns the frozen comparative memory-quality benchmark, installed production activation/rollback, and genuinely fresh installed stock-client/native-session recall; do not expand into these now.

### Accepted input facts (do NOT retest without cause)
- #79 native V2.2.5 capture accepted: user/tool/assistant native IDs, file writes/edit and shell fail/pass, private grouping, source classes; packet at docs/issue-78/evidence/79-capture-complete-v1.
- #80 local Graphiti/LLM proof, outside interactive harness: first DEFER failures safely rejected, then an exact extractive EMIT; 1 model call; exactly one queued Graphiti episode, 1 positive persisted readback, source index and wrong-workspace exclusion.
- Established exact remote episode: group **cur80_disposable**, UUID **27a67cb8-c880-40ea-af99-e5722dfc8693**, review cluster **c95c124acbb04e39adb46020e08d0f308c8c14a0e1ab5e370f507ed590e2969e**, state root **/home/filip/.local/state/ghdev-graphiti-issue80**. User's read-only confirmation proved 1 matching remote episode, 1 indexed original source, user-stated evidence class, wrong-workspace exclusion.
- Existing Graphiti loopback MCP: **http://127.0.0.1:8766/mcp**. Installed gate source: **/home/filip/.local/share/openviking-commit-gate/openviking_commit_gate.py**; config **/home/filip/.config/openviking/commit-gate.toml**. Previous private model env file: **/home/filip/.local/state/ghdev-graphiti-issue80/curator.env**. These are historical host observations; re-read before executing.
- The test worktree and packet root must NOT overwrite the accepted earlier evidence packet at docs/issue-78/evidence/80-first-integration-v1.

## Authority and permissions

LOCAL_AGENT_PRIMARY=build
SOURCE_REMOTE_UPDATE=forbidden
EVIDENCE_REMOTE_UPDATE=allowed (ONE evidence-only fast-forward commit)
EVIDENCE_ROOT=docs/issue-78/evidence/80-closure-v1
PR_CREATION=forbidden
ISSUE_CLOSURE=forbidden
MERGE=forbidden
PRODUCTION_ACTIVATION=forbidden
PRODUCTION_GRAPHITI_MUTATION=forbidden
OPENVIKING_GATE_OR_DATABASE_MUTATION=forbidden
AUTOMATIC_LLM_WHILE_INTERACTIVE=forbidden
LOCAL_HOST_VALIDATION=required
SERVICE_BACKED_VALIDATION=required
LOCAL_SUBSYSTEM_REMEDIATION=allowed only in disposable candidate state, disposable user-systemd units, private OpenCode config/package copies, host browser/probe scripts and local evidence tooling.
SOURCE_WORKTREE_EDITS=allowed only for root-cause demonstrated narrowly scoped corrections in docs/issue-78/v2-curator/** plus directly coupled #79 event/capture tests, kept **uncommitted** and returned in full source.patch. Don't offload a new design, replatform stack, or weaken deterministic authority checks.
SOURCE_GITHUB_MUTATION=forbidden; Central independently reviews/commits accepted local fixes.
NO_FORCE_PUSH; NO_PRODUCTION_STOP; NO_DELETE_EPISODE; NO_CLEAR_GRAPH; NO_GRAPHITI_FORK; NO_SECOND_INFERENCE_SERVER.

Choose fresh, collision-safe scratch paths; do not use broad rm -rf; don't overwrite existing private state/evidence. Never stage model keys, raw prompts/responses, private state, log secrets, unredacted screenshots, or a user home file in Git.

**Gate recovery boundary:** The accepted post-exit Python wrapper retains EX admission on a nonterminal Graphiti submission. Prior group isolation is NOT proof that the Graphiti *process* can be stopped independently. Authenticate whether :8766 is a shared worker or disposable. For the automatic wake use a truly isolated disposable Graphiti worker/endpoint if recovery would otherwise require quiescing shared production, or return a precise BLOCKED boundary with a safe narrow recovery plan. Do NOT stop the shared Graphiti process, kill the gate, disable canonical exclusion, or manufacture a terminal success.

## Phase A — source/host preflight and CPU/portal qualification

1. Confirm \`pwd\`, detached exact Git HEAD equals kickoff SHA, clean source before any edits, ref of origin/issue/79, exact #80 issue acceptance, installed OpenCode version, current provider/model bindings, installed gate source/config hashes, current Graphiti MCP tools/list shape and service topology. Never substitute KB history for live state.
2. Run once, from repository root:
   \`node --check docs/issue-78/v2-curator/{core,worker,model,curator-cli,portal-server,graph-evidence,graph-readback,graph-preview}.mjs\` (expand the brace list into individual file checks, do not assume node --check accepts multiple paths);
   \`node --test docs/issue-78/v2-curator/curator.test.mjs docs/issue-78/v2-curator/portal-api.test.mjs docs/issue-78/v2-curator/graph-evidence.test.mjs docs/issue-78/v2-curator/graph-preview.test.mjs docs/issue-78/v2-curator/activation/render-qualification.test.mjs docs/issue-78/v2-curator/activation/prepare-review.test.mjs\`;
   \`node --test docs/issue-78/v2-candidate/candidate.test.mjs\`;
   \`node --test docs/issue-75/v2-candidate/memory-core.test.mjs docs/issue-75/v2-candidate/plugin-behavior.test.mjs docs/issue-75/v2-candidate/relevance.test.mjs docs/issue-75/v2-candidate/relevance-observation-replay.test.mjs\`.
   Validate \`git diff --check\`. No bypass of failures. Source adapter fixes remain uncommitted with tests.
3. In \`docs/issue-78/v2-curator/portal\`, run \`npm ci\`, \`npm run check\`, \`npm run build\` using the committed lockfile. Do not check in dist/node_modules. Verify no runtime CDN requests or telemetry; use an available host Chromium via Playwright executablePath if bundled browser is absent (previous Chromium 156 behavior is an accepted bounded precedent). Do not install another browser platform unnecessarily.
4. Required before user-systemd activation: inspect \`docs/issue-78/v2-curator/activation/{ghdev-curator.path.in,ghdev-curator.service.in,render-qualification.mjs}\`. They produce disposable USER units only; verify \`systemctl --user\` works and the live gate is compatible. No \`sudo systemctl\`. The path watches both candidate-event AND review directories.

## Phase B — real read-only episode/graph and portal baseline

1. From the authenticated checkout, run the Central-staged read-only inspector:
   \`node docs/issue-78/v2-curator/graph-readback.mjs --group cur80_disposable --cluster c95c124acbb04e39adb46020e08d0f308c8c14a0e1ab5e370f507ed590e2969e --state-dir /home/filip/.local/state/ghdev-graphiti-issue80 --endpoint http://127.0.0.1:8766/mcp\`.
   Its only Graphiti calls are \`get_episodes\` and \`get_episode_entities\` (the latter uses \`episode_uuids: [UUID]\`, \`group_id\`). The inspector demands index+source+remote episode readback, rejects mismatched/unproven node/edge group, sanitizes displayed values, and labels extracted data as unverified. Do not call get_episode_entities on arbitrary UUIDs without exact episode/group proof.
2. Record observed entity count, edge count, individual sanitized IDs, node/edge group, actual source/target UUIDs, Graphiti temporal validity metadata, and whether relationships are technically coherent with the source. An empty graph is a **real quality finding**, not permission to create fake diagram links or to call add_triplet. If the installed MCP differs from the staged parser, inspect its current \`tools/list\` schema, capture a sanitized structural response, and repair in scope without undermining group checks.
3. Run portal in a private local port with a newly generated private 0600 token file (do not echo token), \`--group cur80_disposable --state-dir /home/filip/.local/state/ghdev-graphiti-issue80 --token-file ABS --dist ABS --port LOCAL_PORT --graphiti-endpoint http://127.0.0.1:8766/mcp\`. Authenticate and use Playwright to inspect the real persisted episode, remote graph status, source timeline, 1 source association, real nodes/edges (or empty result). The portal must not issue LLM or Graphiti writes. Capture screenshot(s) and actual Graphiti evidence in a sanitized result, not raw model text or keys. If no entities are shown, distinguish extraction-zero from a mapping/response defect.

## Phase C — one disposable normal-session automatic wake + real portal state

Use a separate **cur80_qual*** group and disposable private state root. Prefer one meaningful, ordinary coding task in a private scratch workspace that produces at least two native-ID related events (user + tool or completed assistant), and a second related cluster/session for unattended model selection. Do not manufacture IDs or cite fixtures as native evidence. Reuse the already-accepted #79 real-file plugin package technique: an XDG-isolated \`OPENCODE_CONFIG_DIR\` must copy the *current* actual provider/model and plugin map/order and override only the disposable capture plugin/group/state root. Real plugin entry file, not a symlink. Never change the live installed seven-plugin config. Ensure role tool permissions are correctly bound in the private config. No fresh model daemon.

1. Generate disposable user-systemd units with \`node docs/issue-78/v2-curator/activation/render-qualification.mjs --worktree ABS_REPO --state-dir ABS_PRIVATE_STATE --group cur80_qualNN --output-dir ABS_FRESH_SCRATCH --env-file /home/filip/.local/state/ghdev-graphiti-issue80/curator.env --gate-source /home/filip/.local/share/openviking-commit-gate/openviking_commit_gate.py --gate-config /home/filip/.config/openviking/commit-gate.toml --endpoint http://127.0.0.1:8766/mcp --unit ghdev-curator80-qualNN\` (choose a NEW literal group+unit suffix, same group in all commands). Review generated values, check private env file and current read-only gate binding. Output includes exactly one \`.path\` and one \`.service\`; the renderer does **not** install.
2. Install only these two disposable files into \`~/.config/systemd/user/\`, \`systemctl --user daemon-reload\`, \`systemctl --user enable --now ghdev-curator80-qualNN.path\`, then check \`systemctl --user status\` and \`journalctl --user -u ghdev-curator80-qualNN.service\` under a private sanitized receipt. Ensure the service executes as the current unprivileged user and source/review files remain writable by that user. Explicitly verify a path wake while OpenCode is active triggers **FAIL_CLOSED** and no local-model/add_memory call.
3. Capture actual native events into the same disposable state/group via the private native OpenCode run. Avoid a synthetic source producer. While the harness is still active, for the portal lane choose a coherent untouched cluster of 2+ \`new\` native-ID events and run \`node docs/issue-78/v2-curator/activation/prepare-review.mjs --state-dir ABS_PRIVATE_STATE --group cur80_qualNN\`. It writes a qualified **operator seed** in DEFER with an audit marker that says it is NOT a model decision. If no eligible native source cluster exists, capture further real events; do not weaken native-ID requirements or fabricate source envelope.
4. Run portal with same group and private token/port. Use Playwright (host browser) AND the model's vision capabilities to review actual screenshots, discover controls, reason about layout, and iterate selectors. Pair image interpretation with DOM/ARIA/API assertions. Demonstrate filter by source class/event kind/time, access control/token, exact Origin/CSRF, wrong-group refusal, stale-tab revision CAS, unsupported assertion rejection, real-source edit-and-approve (an assertion genuinely supported by one exact native source), deferred/discard and merge/supersession proposal only where independent case is supported. Avoid converting a real unsupported case to a passing assertion. Preserve/source-bound approval and confirm Graphiti writes remain zero while interactive.
5. Ensure a distinct, unreviewed cluster from normal native activity remains \`new\` to exercise automatic local-model curator as well as portal-approved promotion. Validate that the authenticated scheduler and gate are not bypassed; an unattended EXIT is the only positive admission path. Choose events meaningful enough to support an extractive EMIT, but accept a defensible DEFER and report the yield separately. Do not force the model's decision or weaken matching tests.
6. Before exiting the OpenCode harness, save a sanitized, durable \`continuation.json\` in private scratch with exact SHA/branch, disposable group/root/unit names, source event/cluster IDs, review revisions, pre-exit negative wake, Graphiti process topology and how to read journal/status, plus a single follow-up command for continued collection. No passwords/tokens/prompts. The same campaign continues after OpenCode terminates: **DO NOT invoke the manual Python drain.** Leave the armed systemd user path/service to retry under the canonical gate after the harness exits. The host user's systemd user manager must stay active; check this in preflight.
7. After harness exit, automatic user-systemd path/retry performs the admitted drain. Resume with a new OpenCode Build process in the prepared checkout (same assignment, not a new Central handoff), authenticate exact committed source and continuation receipt, and inspect systemd logs, gate admission/quiet grace/idle, candidate queue, review records, actual Graphiti remote episode readback, source index, number of submissions and extraction, runtime model calls/tokens/latency, service/worker timestamps. No manual \`drain\` can count as automatic PASS. If activation fails, diagnose and correct the disposable user-unit/source integration within the same campaign, then redo the actual exit test with a fresh disposable group only when necessary. Don't create a new issue for a normal host interface hiccup.
8. Show the real portal preview transitions only after confirmed Graphiti persistence; reload/Refresh to re-read verified state, verify real node/edge content or explicit empty extraction and that no fabricated relationship is displayed. Record sanitized screenshots from desktop and approximately 480-pixel viewport. Demonstrate portal can be down while automatic worker drains and that the headless CLI still reports state correctly.
9. After all terminal writes and successful readback, **disable/stop/remove only agent-owned disposable user units**, daemon-reload and verify absent, without deleting durable evidence. If any Graphiti operation is unresolved, never stop a shared worker or release EX unsafely; stop cleanup and return \`BLOCKED_UNRESOLVED\` with read-only recovery facts. No production service, production group, installed gate, or OpenViking DB mutation.

## Verification, evidence and handback

Acceptance requires real IDs: source event IDs, selected group, curated cluster ID, exact Graphiti episode UUID, 1+ validated source mapping, original evidence class retained, positive remote episode group/name/UUID, actual graph node/edge counts, no duplicate add_memory on retry, and proof of automated gate-admitted post-exit process. Zero privacy leaks, wrong-group exposure and verified-authority inflation. A real browser acceptance must include a DEFER -> operator approve -> approved -> queued -> persisted transition; simulated fixture-only screenshots do NOT satisfy it. If actual graph extraction is empty, mark that unmet for graph-quality acceptance, not retroactively PASS.

One packet at \`docs/issue-78/evidence/80-closure-v1/\`: \`manifest.json\` with exact tested SHA, host versions, sanitized paths/sha256, test-exit statuses and evidence scope; \`handback.md\` typed summary; \`cpu-tests.md\`; \`graphiti-extraction.json\`; \`activation-postexit.md\`; \`portal-real-state.md\`; \`source.patch\` (complete proposed source diff including untracked new files, empty only if truly unchanged); and a small number of **redacted** screenshots if defensible. The packet must distinguish initial real episode vs automatic new episode, native vs operator qualification seed vs model decision, and positive/negative/time-bounded observations. Never publish private app auth, internal IP credentials, full model text, full transcripts, private files, raw cookies, large logs, unsanitized screenshot pixels, or false PASS.

Check exact source HEAD and current remote branch before the **one evidence-only fast-forward** GitHub commit: stage ONLY packet paths, inspect staged names, commit, fetch origin/issue/79, assert remote is the original admitted head before \`git push origin HEAD:refs/heads/issue/79\`. No force, no stale local \`issue/79:issue/79\` refspec, no rebase/pull that overwrites siblings. If branch changed, return STALE and keep all local artifacts. Read back remote ref and every artifact hash. Do not push source/test fixes, which remain uncommitted for Central review, and never create a PR.

Required typed handback:
\`\`\`text
RESULT=PASS|PARTIAL|FAIL|BLOCKED|STALE|READY_FOR_POST_EXIT_OPERATOR_RUN
LOCAL_AGENT_PRIMARY=build
SOURCE_START_SHA=<exact kickoff>
SOURCE_TESTED_SHA=<SHA plus complete uncommitted diff hash>
EVIDENCE_COMMIT_SHA=<40 hex or none>
EVIDENCE_PACKET_REF=<exact path and remote SHA>
CPU_TESTS=<exits and test counts>
PORTAL_BUILD=<TypeScript/Vite exits>
LIVE_GRAPH_READBACK=<exact old UUID, node/edge counts, scoped IDs, evidence class>
REAL_PORTAL=<source ids, review CAS/approval, actual persisted UUID, browser+vision receipts>
AUTOMATIC_POST_EXIT=<path wake, FAIL_CLOSED pre-exit, admitted after exit, no manual drain, model/Graphiti/queue receipts>
GRAPHITI_PROCESS_RECOVERY=<separate disposable worker or safe bounded blocker>
SOURCE_CHANGES=<none or full source.patch>
PRODUCTION_MUTATION=none
OPENVIKING_MUTATION=none
GITHUB_MUTATION=<at most one evidence-only commit>
KNOWN_GAPS=<explicit>
NEXT=<Central review/PR decision or exact material blocker>
COMMAND_SHAPE_FRICTION=<canonical ledger>
\`\`\`

**Command-shape friction is mandatory** even if \`encountered=no\`. For each event report \`scenario\`, \`requested_shape\`, \`effective_shape\`, \`rewrite_provenance\`, \`event_kind\`, \`execution_effect\`, \`correction_or_annotation\`, \`replacement_shape\`, \`recipe_reference\`, \`resource_reference\`, \`contract_conflict\`, \`durable_gap_candidate\`, and sensitive-value omissions. Apply the accepted corrections: native real file V2 plugin package, no symlink, host Chromium executablePath, systemd USER units, fresh scratch roots, \`git push origin HEAD:issue/79\` from detached evidence commit. Do not relax a failed gate to make it green.

**Escalation:** A materially incompatible model/Graphiti API, violated source/authority/privacy invariant, unsafe shared-worker recovery boundary, irreversible production action, or source branch advancement merits immediate typed blocker; ordinary disposable session/Playwright/systemd debugging is within this campaign. Central owns all final semantic source integration, independent PR review, single #79/#80 PR creation, and eventual merge/closure decision. No second micro-handoff unless a material blocker is proven.
