# Issue #94 — C2 bounded local-growth correction: integration evidence (evidence only)

Authority: [Issue #94](https://github.com/fvanevski/opencode-operational-schema-guard/issues/94),
`docs/issue-94/LOCAL_AGENT_CONTRACT_C2.md`, C1 evidence `1ba4ccbe`.

This is the **integration, execution, diagnostics, performance-comparison, and evidence-publication**
campaign for Central's C2 bounded-growth correction. No production source/test was modified by the local
agent (`SOURCE_DIFF=none`); the only repository change is this evidence packet under
`docs/issue-94/evidence/c2/`. No PR, merge, deployment, shared-service restart, live Graphiti mutation,
or issue closure.

## Preconditions / authentication

- Isolated worktree `/workspace/opencode-issue94-c1` on `issue/94`, clean, fast-forwarded C1 → C2.
- C2 source commit (the kickoff SHA, tip of `origin/issue/94`): `9418c97f6379090d8f7e8a1e811fcc7b1c3b2f7e`.
- C2 tree: `b0d14aa27e77920b313d0dbb086292c74aed10b4`.
- Parent is the C1 evidence commit `1ba4ccbe1068b7a614bc0dedf780ab0e08e4bde0`.
- `origin/main` = `5892ebac` (merged #93, ancestor of main) — main unchanged, still contains #92/#93.
- C2 source digests: `curated-recall-candidates.mjs` `5ee82b9c…6fdd4`, test `3b838fa4…799c2b`,
  `memory-core.mjs` unchanged `2adb75b6…6f5e5c`, `retrieval-profile.mjs` `664d01f2…12ef54`.

## C2 source diff verdict

- **Only production change**: `readBoundedInventory`'s `>4096` branch now calls
  `readIndexedInventory(store)` instead of returning `[]`.
- **New helper `readIndexedInventory`**: reads `_episode-index` (bounded `MAX_INDEX_SCAN=4096`), re-reads
  each referenced review via `ReviewStore.get`, returns only `persisted` reviews whose
  `remote_episode_uuid` equals the index UUID. The index is a source of candidate identities, never
  authority.
- **Fast/legacy path (≤4096)**: unchanged.
- **Safeguards retained**: `provisional()` persisted/1-fact/UUID/source_refs fences; `sourcedEpisodeResolver`
  + fresh remote `get_episodes` group/UUID membership; 1,400-char selector / ≤5 facts / 300 ms context in
  `memory-core.mjs`; the 1,000-row remote `get_episodes` fail-closed limit. No new local authority.

## Results (stage-attributed)

See `aggregate.json` (machine-readable) and `profile-synthetic.json` / `profile-local.json`
(sanitized: no raw query text, source refs, or UUIDs).

- **CPU-only tests**: `node --check` on both changed files → 0; `curated-recall-candidates.test.mjs`
  **14/14** (12 C1 + 2 new C2) exit 0; `retrieval-profile.test.mjs` **4/4** exit 0.
- **Synthetic scaling (matched C1/C2 workload)**:
  - 512 → target in shortlist (cold ~27 ms); 4096 → target in shortlist (cold ~146 ms) — fast path, unchanged.
  - **4097**: C1 = fail-closed blackout (`target_in_local_shortlist=false`, shortlist `[0,0,0]`, ~2.5 ms);
    C2 = **target recovered** via episode-index overflow (`target_in_local_shortlist=true`, shortlist
    `[1,1,1]`, cold ~177 ms). The 4097-record target now survives source-index discovery.
- **Local profile (live 565-review state)**: fast path (565 < 4096), inventory identical to C1
  (565 = 205/355/5; 355 persisted facts; 355 index files; 0 missing UUIDs; 0 non-atomic; max 1 fact/origin);
  shortlists bounded (0–30), secret fence caught `secret-negative`, off-topic → 0; cold 37–60 ms.
- **Source-index health** (metadata-only, bidirectional): 355/355 valid index→persisted-review mappings,
  0 bad maps, 0 orphan refs, 0 persisted reviews missing an index → **CONSISTENT** (no live record modified).
- **Remote group/membership + negative control**: `tools/list` = 13 tools; `get_episodes`
  (development-knowledge, max 8) → succeeded; `get_episodes` (bogus group) → `No episodes found`, `[]`
  (no false membership). The 1,000-row remote limit remains fail-closed (regression test).

## C2 decision

`C2_RESULT=PASS`. The C2 bounded-growth correction is correct and regression-tested: the ≤4096 fast path
is preserved, the >4096 overflow now recovers indexed persisted facts (4097 target survives), the
source-index is fully consistent, remote membership and negative controls are retained, and the
1,000-row remote fail-closed limit is unchanged. `CALLBACK_P95=UNVERIFIED` (harness-owned; not directly
measured; not inferred from Graphiti RTT).

## C3 readiness

`C3_READINESS=READY_PENDING_MERGE`. The C2 source is complete and consistent. C3 is a **separate
operator continuation against the exact merged main** (after Central independent exact-head review, one
PR, and authorized merge) performing a fresh stock OpenCode + Graphiti + OpenViking validation under the
shared post-exit lease. C1/C2 evidence is baseline, not a substitute for fresh-process C3. Not executed in
this campaign (stop at the C2 checkpoint).

## Known gaps

- Native `prompt`/`context` callback p95 and useful-context availability: `UNVERIFIED`.
- Model answer support: `UNVERIFIED` (no live model invocation; shared lease respected).
- The C2 overflow path was exercised with a synthetic 4097 fixture and the live 565-review state; a live
  store above 4096 reviews has not yet been observed on this host (the live store is far below the ceiling).

## Typed handback

```text
C2_RESULT=PASS
C2_SOURCE_SHA=9418c97f6379090d8f7e8a1e811fcc7b1c3b2f7e
C2_HEAD_SHA=<set on publish>
TEST_EXITS=node --check(src)=0; node --check(test)=0; node --test curated-recall-candidates=0 (14/14); node --test retrieval-profile=0 (4/4)
BASELINE_COMPARISON=C1 4097: target NOT in shortlist (blackout, ~2.5ms); C2 4097: target in shortlist [1,1,1] (~177ms cold). <=4096 fast path unchanged. Remote 1000-row limit unchanged (fail-closed).
SOURCE_INDEX_HEALTH=CONSISTENT (355/355 valid index->persisted-review mappings, 0 bad, 0 orphan, 0 missing)
CALLBACK_P95=UNVERIFIED
C3_READINESS=READY_PENDING_MERGE (separate fresh-process continuation on exact merged main)
KNOWN_GAPS=native callback p95; model answer; live >4096 store not yet observed
```

`COMMAND_SHAPE_FRICTION` — see `command-shape-friction.txt` (encountered=yes, 1 guard-annotation event).

## Agent source diff

`SOURCE_DIFF=none` — Central-owned source/tests and all production paths unchanged by the local agent.
Private scratch (C2 query reuse + profiler reports) stays under a private 0700 host dir and is not committed.
