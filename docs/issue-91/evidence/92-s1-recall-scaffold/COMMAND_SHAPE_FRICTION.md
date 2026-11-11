# GHDEV COMMAND_SHAPE_FRICTION ledger — S1 recall-scaffold qualification
friction encountered: yes
COMMANDS_MATCH_HANDOFF: yes (agent-phase commands, workdirs, tool-routing classes, and lifecycle boundaries matched the contract; the focused suite list, validate-tuning shape, and post-exit EX window were honored)

## Events
1. [pre_execution_rejection / agent-command] zsh `PIPESTATUS[0]` empty (bash-ism). The first focused-test run used `EXIT=${PIPESTATUS[0]}` which is a no-op in zsh. Effect: producer exit not captured on that display. Correction: re-ran each producer into a log file and captured `$?` (tuning-test EXIT=0, finite-batch-test EXIT=0, etc.). Outcome: producer exits independently retained thereafter.
2. [interface_discovery / agent-command] `basename "$t" .mjs` in zsh returned `fact-review.test` (strips only `.mjs`), not `fact-review`. Effect: log filenames were `*.test.log`, not `*.log`. Correction: read the actual `*.test.log` names. No acceptance impact.
3. [interface_discovery / agent-command] Inline `node -e` SQL with nested single-quote escaping got mangled by the shell (unrecognized token). Effect: first B3-ref verification returned ERR for all 24. Correction: wrote the verifier to a file (verify-b3-refs.mjs) and ran it.
4. [interface_discovery / host-tool] `opencode.db` `message` table had 0 rows; legacy `message`/`session` tables empty. The V2 schema stores messages in `session_message` (60997 rows). Effect: initial 24/24 ref check against `message` returned 0 present. Correction: queried `session_message` (id+session_id+type='user') -> 24/24 present. This is the correct native source table for V2.
5. [interface_discovery / agent-command] Python gate module `@dataclass` load failed when `sys.modules[spec.name]` was not set before `exec_module`. Correction: set `sys.modules[spec.name]=module` before `exec_module` (matches the B3 launcher). Gate then loaded; `harnesses_active` correctly reports the live opencode session.

## Harness rewrites
- None observed (no trusted-harness hook rewrote an acceptance-bearing command).
- `setsid nohup` used only to detach the post-exit EX launcher from the interactive session process group (transparent; required so the launcher survives harness exit and is not a substitute for a prohibited operation).

## Phase C/D/E events
6. [guard_annotation / host-tool] FalkorDB raw readback: the FalkorDB-on-Redis module's Cypher command is `GRAPH.QUERY <graph> <cypher>` (not bare `QUERY`); each group is its own FalkorDB graph (e.g. graph `graphiti-adr92-b3-specificity`), not a single `graphiti` graph with a `group_id` filter. Correction: `GRAPH.QUERY <group-graph> "MATCH (e:Episodic) ..."`. First `GRAPH.QUERY` against the wrong graph name returned 0; the per-group graph names give the true 18/1/4/355 counts.
7. [interface_discovery / agent-command] ReviewStore `state` field is not always a plain string in the Node 26 eval context (`r.state.pad is not a function`); wrapped with `String(r.state)`. No acceptance impact.
8. [interface_discovery / agent-command] `opencode.db` legacy `message`/`session` tables are empty in the V2 schema; messages live in `session_message`. (Same root cause as event 4; re-confirmed during Phase D source-support check.)

## Producer exits (independently retained)
- All Phase A producers: rc=0 (node --check x6, node --test x6 focused, npm run check, npm test 524/524, validate-tuning)
- Graphiti MCP get_episodes: specificity=0 (pre), previous=4 (status ok)
- chat-review medium preflight probe: HTTP 200, 16 reasoning tokens
- EX launcher (post-exit): recovery rc 3->3->0, smoke rc 3->0, S1_SETTLED 2026-11-11T03:19:46Z (marker .s1-ran written)
- Post-EX readback: Graphiti MCP get_episodes specificity=18, s1-smoke=1, production=355; raw FalkorDB GRAPH.QUERY 18/1/4/355; ReviewStore 18 persisted + 9 deferred (b3-spec), 1 persisted + 3 deferred (smoke); production latest created_at 2026-11-08 (no drift)
