# Issue #94 — C2 bounded local-growth correction: integration contract

## Authority and scope

Working branch: `issue/94`, parent C1 evidence commit `1ba4ccbe1068b7a614bc0dedf780ab0e08e4bde0`.
Start from the exact staged C2 source commit supplied in the operator kickoff, not a local developer branch.
This is the same issue and the same eventual PR. **Do not open a second PR**, change Graphiti config, or deploy.

Central owns the two source/test changes:
- `docs/issue-78/v2-curator/curated-recall-candidates.mjs`
- `docs/issue-78/v2-curator/curated-recall-candidates.test.mjs`

The measured C1 failure at 4,097 total reviews was an availability blackout because
`readBoundedInventory` returned `[]`. This C2 change preserves the existing <=4,096 path
and, **only above it**, discovers eligible persisted candidates from existing
`_episode-index` files, re-reads each referenced review through `ReviewStore.get`,
and requires the original `sourcedEpisodeResolver` source check.
`Memory.search` continues to require fresh remote `get_episodes` group/UUID membership.
No local index becomes authoritative. The 1,000-row remote limit is intentionally
unchanged because `get_episode_entities` result schema did not prove the exact
required remote group membership under the live installed API.

## Authenticated host locations from C1 (verify current state before use)

| Surface | C1 observed path or address | Authority |
| --- | --- | --- |
| Isolated issue worktree | `/workspace/opencode-issue94-c1` | C1 observed; do not assume unchanged |
| Local review state root | `/home/filip/.local/state/ghdev-graphiti` | C1 effective curator state-dir |
| Review group directory | `/home/filip/.local/state/ghdev-graphiti/curation-v1/development-knowledge` | C1 observed |
| Episode index | `/home/filip/.local/state/ghdev-graphiti/curation-v1/development-knowledge/_episode-index` | C1 observed |
| Graphiti MCP | `http://127.0.0.1:8766/mcp` | C1 observed |
| OpenViking | `http://127.0.0.1:1933` | C1 observed |
| OpenCode launcher | `/home/filip/.local/lib/openviking-agent-shims/opencode` | C1 observed |
| Canonical workspace/project | `/workspace/mcp_servers/gh_mcp` / `gh_mcp` | C1 plugin config observed |

**`--state-dir` must point to `/home/filip/.local/state/ghdev-graphiti`,
NOT its `curation-v1` child**. Do not run broad recursive filesystem discovery;
authenticate effective config first and use targeted `test -d` calls.

## One consolidated local Build campaign: C2 verify, then handback

1. Work in a clean isolated issue/94 worktree (reuse the C1 worktree only if it
   remains isolated and clean). Fetch and authenticate the supplied exact source
   commit and tree; confirm current `main` still contains merged #92/#93.
2. Inspect the **full actual C2 diff**. Confirm the overflow branch is the only
   production change and the fast/legacy path is unchanged at <=4,096.
   Retain all group/workspace/project, source-index, privacy, <=5, 1400-character,
   300ms context and remote-membership safeguards.
3. CPU-only: `node --check` on both changed files, focused
   `node --test docs/issue-78/v2-curator/curated-recall-candidates.test.mjs`,
   `node --test docs/issue-94/retrieval-profile.test.mjs`, and run the staged
   read-only synthetic profiler with sizes `512,4096,4097`. Report test
   counts/exits; explicitly compare C1 baseline with C2 at 4,097.
4. Run `retrieval-profile.mjs --mode local` using the exact C1-known valid
   state root/group/workspace/project and a private 0600 query file, with no
   Graphiti writes or model inference. Existing C1 private query file may be
   reused if authenticated and unmodified. Do not publish its contents.
5. Preserve the existing C1 baseline evidence; publish only sanitized C2
   comparison, exact source/config hashes, test receipts, any qualified
   regressions and the canonical `COMMAND_SHAPE_FRICTION` block into
   `docs/issue-94/evidence/c2/` as **one evidence-only commit**, non-force,
   after exact-head remote CAS and readback. No source code changes without
   Central authority. If a material source/test defect is exposed, return
   a precise failing case and minimal reproduction instead of implementing
   a substantive redesign.
6. Return a typed `C2_RESULT=PASS|FAIL|PARTIAL`, current exact issue branch SHA,
   source commit SHA/tree, source diff verdict, all test statuses and numbers,
   C1/C2 matched workload observations, `C3_READINESS`, remaining gaps and
   `COMMAND_SHAPE_FRICTION`. **Stop at this checkpoint** without creating a
   PR, merging, deploying, restarting shared services, or claiming C3 acceptance.

After Central independent exact-head review, one PR and authorized merge,
use a separate operator continuation against **the exact merged main** for
C3 genuine fresh stock OpenCode + Graphiti + OpenViking validation with the
shared post-exit lease. The previously published C1 evidence is baseline, not
a substitute for fresh-process C3. User authorization is required for any
production deployment or merge.

## Guardrails and remediation authority

The local Build agent may repair **its private instrumentation, disposable
fixture setup and sanitized evidence files** inside `docs/issue-94/evidence/c2/`;
it may not alter the two Central-owned source/test files or unrelated production
paths, modify live review/Graphiti state, alter installed services, or bypass
tests. No extra PRs, branch reset, forced push, destructive cleanup or graph
migration. A reproducible source failure is a Central handback, not an invitation
to a broad architecture campaign.
