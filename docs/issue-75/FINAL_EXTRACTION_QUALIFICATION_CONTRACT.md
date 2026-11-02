# Issue #75 — final bounded extraction qualification

START_SOURCE_HEAD: use the full 40-hex issue/75 SHA supplied with the kickoff.
AGENT: build. REQUIRED CODE: docs/issue-75/v2-candidate/.
PURPOSE: finish actual new Graphiti episode persistence and recall; NOT
another reranker/tuning/benchmark campaign.

**Read first:** docs/issue-75/PRAGMATIC_RETRIEVAL_DISPOSITION.md,
docs/issue-75/ARCHITECTURE_REASSESSMENT.md and current candidate
`post-exit-drain.py`, `memory-cli.mjs`, `memory-core.mjs`,
`plugin.mjs`, `extraction-profile.md`, tests. Use the **installed**
gate/source/config as runtime authority, not old #70 reference files.

## Authority

- One coherent local execution with a post-agent operator step as needed.
- CPU tests, read-only host diagnostics, isolated local config and
  disposable Graphiti worker/group/files permitted.
- Bounded host-specific corrections to candidate and tests permitted,
  with full patch and hashes returned; substantive redesign belongs
  to Central. Do not push, create a PR, merge or promote.
- No production Graphiti/OpenCode/LLM alias/service/config/database
  changes without explicit operator approval. No new scheduler.
- No unrelated Issue #70 migration, extra benchmarking, reranker
  calibration or model replacement. **Retrieval quality is accepted
  with the documented 9/12 new-holdout limitation.**

## Integrated execution

1. Verify exact issue/75 head and installed native stock V2 plugin shape,
   `rtk pytest` tool receipt, encoded prompt search/capture. Run existing
   focused Node tests (including `plugin-behavior.test.mjs`,
   `relevance-observation-replay.test.mjs`, `relevance.test.mjs`,
   `memory-core.test.mjs`), Python gate tests and static checks at
   the **new head**. No test weakening, fixture edits or dropping
   failed cases. The historical holdout results need not be rerun.
   Resolve any straightforward host API mismatch within these modules.

2. Inspect private journal `/tmp/opencode/issue75-b75/state-b75`,
   disposable group `g_issue75_test`, current five pending rows, and
   Graphiti remote episodes read-only. Do not replay the old
   `g_other_repo` queued f4 record, unrelated unknown/queued rows
   or already persisted events. Preserve original artifacts.

3. Authenticate current installed Graphiti MCP backend and
   LiteLLM/ninfer model parameters. The host evidence indicates
   `:8001` Qwen3.8 concurrency 1, Graphiti MCP `:8766`,
   LiteLLM `:8002`, rerank `:8004`, OpenViking gate
   EX lock `/run/user/1000/openviking-agent.lock`.
   The Graphiti-only `enable_thinking:false` strategy documented
   in `extraction-profile.md` must be exercised **through Graphiti**,
   while retaining the interactive `chat` configuration.
   Prefer isolated disposable Graphiti worker/model alias.
   If the installed client requires changing production LiteLLM or
   a shared Graphiti MCP worker to enable that strategy, STOP for
   that specific approval with exact minimal reversible config
   diff; do not silently mutate production.

4. Use the SAME existing gate EX lock and real scheduler idle /
   waiting metrics, harness exit and quiet grace. Any new Graphiti
   extraction must occur only after the active Build harness exits.
   Prepare ONE exact runnable operator command using actual host
   paths/isolated endpoint and a bounded post-exit workflow. If the
   existing five pending candidates cannot all safely be submitted,
   use ONE separately journaled genuine user decision in a new
   disposable group to prove one clean end-to-end path; do not
   duplicate or erase the older queue. If Graphiti fails terminally,
   reconcile by exact group/name/remote episode and preserve error
   evidence; no blind retries. Avoid an unresolved EX lease while
   a shared Graphiti service remains in operation.

5. After the operator post-exit run, obtain the stdout/exit status,
   Graphiti worker logs, model finish reason/usage, local
   journal before/after, remote group/name/UUID readback and one
   fresh-process Graphiti search or V2 context recall of the newly
   persisted event. No assertion that a queued ACK is success.
   Preserve sources and privacy. Make no unrelated deployment.

6. Return ONE handback: current source full SHA, test passes/failures,
   exact extraction identity and status progression, model profile
   with evidence of Graphiti `enable_thinking:false`, resource
   exclusivity, fresh recall, OpenViking non-regression, production
   config/group unchanged, error recovery if any, binary diff/hashes
   of any narrow local fixes, and canonical GHDEV-10 command-shape
   friction (or explicitly none). Do not claim PASS for just a
   pre-existing `settled/persisted` count. If a post-exit command
   must be executed after this Build session exits, return
   READY_FOR_OPERATOR_POST_EXIT and the fully resolved command.

## Exit criteria

PASS requires **one newly submitted source-attributed memory**
persisted with a remote episode UUID and recalled from Graphiti in
a fresh process, with no shared-model contention or production mutation.
Existing frozen retrieval acceptance and opt-in/secret/group protections
remain intact. No requirement for a perfect reranker, an arbitrary
number of successful episodes, or another holdout campaign.
