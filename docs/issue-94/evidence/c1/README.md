# Issue #94 — C1 pre-optimization baseline and C2 decision packet (evidence only)

Authority: [Issue #94](https://github.com/fvanevski/opencode-operational-schema-guard/issues/94),
parent #91, `docs/issue-91/ADR-91-2026-11-09-GRAPHITI-OPENVIKING-MEMORY-ARCHITECTURE.md`,
`docs/issue-94/LOCAL_AGENT_CONTRACT_C1.md`, `docs/issue-94/README.md`.

This is a **read-only, metadata-only C1 baseline** on the merged #92/#93 architecture. It is not a
performance patch and not a deployment instruction. No production source, review, queue, Graphiti,
host-config, or service was mutated. No PR, issue, or deployment.

## Preconditions / authentication

- `REPO_ID=fvanevski/opencode-operational-schema-guard`, `WORKING_BRANCH=issue/94`.
- Isolated worktree at `/workspace/opencode-issue94-c1` on branch `issue/94`, clean tree.
- Staged commit (the kickoff SHA, and the tip of `origin/issue/94`): `5df362ec665d213098549da20135f22df4684b86`.
- Pinned base `main` (merged #93): `5892ebac26894ca895dde235916da33d437c3ba9` — the staged commit descends from it.
- `docs/issue-94/{README.md, retrieval-profile.mjs, retrieval-profile.test.mjs, LOCAL_AGENT_CONTRACT_C1.md}` all present at the staged SHA.
- Toolchain: node v26.13.1.

## Source / host identity (nonsecret digests)

| identity | value |
|---|---|
| OpenCode binary | `/home/filip/.local/lib/openviking-agent-shims/opencode`, **v2.2.7** |
| OpenCode binary sha256 | `0105a81dfcbdc82349b871c657adda54d6250e52c3a2f8bf32c3f3addaac2c6b` |
| Graphiti MCP endpoint | `http://127.0.0.1:8766/mcp` (config `group_id=graphiti_live`) |
| Curation group (live) | `development-knowledge` |
| Live state root | `/home/filip/.local/state/ghdev-graphiti` (parent of `curation-v1/`) |
| Canonical workspace / project | `/workspace/mcp_servers/gh_mcp` / `gh_mcp` |
| OpenViking | v0.5.5, healthy at `127.0.0.1:1933`, coexisting; shared-lease admission via `openviking-agent.lock` |
| Plugin | `opencode-v2-candidate-graphiti` v1.1.0 (`docs/issue-78/v2-candidate/plugin.mjs`) |
| Plugin main sha256 | `f9a7ca6671b46ef0c6b2b7485c276d405d3a7c734c4397e1da36d3102aaf1b50` |
| Repo `memory-core.mjs` sha256 | `2adb75b6ae437156a96343ba346e1c5d94a31338e2ec1afa2646da6ffd6f5e5c` |
| Repo `curated-recall-candidates.mjs` sha256 | `3f22652129dadec585d6e7901c638fa38d9466a5cb82d5d2ccd709ae24ba802f` |
| Repo `core.mjs` sha256 | `24c99a92a4282f3e818016b1cf447e56e25d50f513177d8c1fb4375f6640b8be` |

## Invariant preservation

- **#92 one-fact-per-episode** — PRESERVED: 355 persisted reviews → 355 facts, `max_persisted_facts_per_origin=1`, 0 non-atomic records, 0 missing remote UUIDs, 355 `_episode-index` files (one index per persisted episode).
- **#93 semantic/strict abstention** — PRESERVED in staged source: `search(query,{limit=5,maxChars=1400})`, `safeText` fences, `strictControlAnchor` requalified strict anchor present.
- **Source-confirmed limits** revalidated: `MAX_REVIEW_SCAN=4096`, `get_episodes max_episodes=1000` + strictly-fewer-than-1000 rows + 70 ms `INDEX_ENRICHMENT_MAX_WAIT_MS`, 1,400-char selector / ≤5 facts.
- No new local cache, datastore, scheduler, graph rewrite, or new service introduced.

## Method (CPU-only + read-only)

- `node --check` on the profiler; two focused `node --test` runs; one disposable `--mode synthetic`
  (512/4096/4097, 3 rounds, `os.tmpdir()` fixture, created+deleted); one `--mode local` on the
  authenticated live read-only state with a private 0600 query file (7 representative cases:
  source-exact, paraphrase, stale/historical, wrong-group, secret-negative, high-group, off-topic-empty).
- Live inventory is metadata-only (states, fanout, index counts). Graphiti `tools/list` + 2 read-only
  `tools/call` probes (`get_episodes`, `get_episode_entities`). No Graphiti writes, no request
  rerouting, no `SO_MARK`, no model-proxy change, no native-callback interception.

## Results (stage-attributed)

See `aggregate.json` for the machine-readable aggregate and `profile-synthetic.json` /
`profile-local.json` for the raw profiler reports (sanitized: no raw query text, source refs, or UUIDs).

- **CPU-only tests**: `node --check` exit 0; `retrieval-profile.test.mjs` 4/4 exit 0;
  `curated-recall-candidates.test.mjs` 12/12 exit 0.
- **Synthetic scaling**: 512 → target in local shortlist (cold ~30 ms); 4096 → target in shortlist
  (cold ~149 ms); **4097 → fail-closed blackout** (over_4096, target not in shortlist, shortlist
  counts `[0,0,0]`, ~2.5 ms — the entire curated inventory returns `[]`). Growth cliff confirmed,
  safe (fail-closed, not silent recall loss).
- **Local scan (live 565-review store)**: cold 38–67 ms, warm p95 36–47 ms per query; all shortlists
  bounded (0–30) under the 48 pre-proof pool and the 300 ms callback budget; secret fence caught
  `secret-negative`; off-topic → 0; wrong-group still topical (not group-proven); `remote_membership_proven=false` by design.
- **Graphiti remote**: 13 tools. `get_episodes` has **no** targeted single-UUID param (group-wide,
  `max_episodes`); `get_episode_entities(episode_uuids, group_id)` is a read-only **targeted per-UUID**
  read (observed to succeed). Read-only probes succeeded. Timings are local RTT, **not** callback p95.
- **Native callback / model answer**: `UNVERIFIED` (owned by the active harness plugin; not
  intercepted; not inferred from Graphiti RTT).
- **EX post-exit posture**: read-only observation of the existing `post-exit-drain` supervisor; no
  EX work run inside the active harness.

## C2 decision

`C1_RESULT=BASELINE_COMPLETE`, `C2_RECOMMENDATION=PROFILE_ONLY_ACCEPTED`.

At the live 565-review / 355-persisted scale there is ample headroom below both the 4096 local-scan
ceiling and the 1000 remote-episode ceiling; local scan is fast and bounded with no material runtime
loss observed. The measured 4096→4097 fail-closed blackout is a real, **safe** growth boundary and
does not itself authorize an unreviewed new local cache or a relaxation of remote proof. A source-backed
C2 lever, **if** the store approaches the ceiling, is the observed read-only targeted
`get_episode_entities(episode_uuids, group_id)` capability (a per-UUID provenance read) that the
current `get_episodes(max_episodes=1000)` group-wide fetch does not use. No speculative C2 is forced.

## Known gaps / UNVERIFIED

- Native `prompt`/`context` callback p95 and useful-context availability: `UNVERIFIED` (harness-owned;
  not intercepted read-only).
- Model answer support: `UNVERIFIED` (no live model invocation; shared-lease respected).
- Queue ingress/loss counters: `UNVERIFIED` (no public read-only counter exposed by the current producer;
  the openviking commit-gate supervisor is the producer and was observed, not instrumented).

## Typed handback

```text
REPO_ID=fvanevski/opencode-operational-schema-guard
ISSUE=94
C1_RESULT=BASELINE_COMPLETE
C2_RECOMMENDATION=PROFILE_ONLY_ACCEPTED
SOURCE_BASE_SHA=5892ebac26894ca895dde235916da33d437c3ba9
C1_SOURCE_SHA=5df362ec665d213098549da20135f22df4684b86
SOURCE_TREE_SHA=0fe7e02b6fbc2632ffa455fe4faf821bf54cb51b
MAIN_SHA_OBSERVED=5892ebac26894ca895dde235916da33d437c3ba9
PRODUCTION_SOURCE_CHANGED=no
HOST_BINARY_VERSION_HASH=opencode v2.2.7 sha256:0105a81dfcbdc82349b871c657adda54d6250e52c3a2f8bf32c3f3addaac2c6b
ACTIVE_PLUGIN_CONFIG_PAIR=plugin.mjs sha256:f9a7ca6671b46ef0c6b2b7485c276d405d3a7c734c4397e1da36d3102aaf1b50 ; graphiti config.yaml sha256:06e9e37a30fcd59f3da77e9fda89ff110fce3acf8de986e3973753d97745eef9
GRAPHITI_ACTUAL_API=13 tools; get_episodes(group_ids,max_episodes) has NO targeted single-UUID param; get_episode_entities(episode_uuids,group_id) IS a read-only targeted per-UUID read (observed working)
LIVE_REVIEW_AND_EPISODE_COUNTS=development-knowledge: 565 reviews (deferred 205 / persisted 355 / skipped 5); 355 persisted facts; 355 episode-index files; 0 missing UUIDs; 1 fact max per origin; under 4096 local ceiling and under 1000 remote ceiling
QUEUE_BACKLOG_CAPTURE_LOSS=UNVERIFIED (no public read-only counter on the current producer; supervisor observed only)
SYNTHETIC_4096_4097=512 target-in-shortlist (cold 30.1ms); 4096 target-in-shortlist (cold 148.7ms); 4097 over_4096 blackout, shortlist [0,0,0], cold 2.5ms; producer exit 0
ACTUAL_LOCAL_SCAN=cold 38.2-66.7ms, warm p95 36.0-46.7ms, 7 cases, shortlists bounded 0-30, producer exit 0
NATIVE_PREFETCH_AND_CALLBACK=UNVERIFIED (harness-owned; not intercepted; not inferred from Graphiti RTT)
REMOTE_PROOF_TIMINGS=get_episodes(max_episodes=8) read-only succeeded; get_episode_entities(1 uuid) read-only succeeded; local-endpoint RTT (not callback p95); no failures
INJECTION_AND_MODEL_ANSWER=UNVERIFIED (no live model invocation; shared-lease respected)
EX_POST_EXIT_POSTURE=read-only observation (existing post-exit-drain supervisor running; no EX work in active harness)
TEST_COMMANDS_AND_EXITS=node --check=0; node --test retrieval-profile=0 (4/4); node --test curated-recall-candidates=0 (12/12); profiler --mode synthetic=0; profiler --mode local=0; graphiti tools/list+2 read-only tools/call=succeeded
SOURCE_DIFF=none
EVIDENCE_PACKET_GITHUB_PATH=docs/issue-94/evidence/c1/
EVIDENCE_COMMIT_SHA=<set on push>
EVIDENCE_PUBLICATION=PASS
MATERIAL_BLOCKERS=none
KNOWN_UNVERIFIED=native callback p95; model answer support; queue ingress/loss counters
```

`COMMAND_SHAPE_FRICTION` — see `command-shape-friction.txt` (canonical block; encountered=yes, 2 events).

## Source diff

`SOURCE_DIFF=none` — no production source, review, queue, config, or test file was modified. The only
repository change is this evidence packet under `docs/issue-94/evidence/c1/`. Private scratch (query
file, profiler reports) remains under a private 0700 host dir and is not committed.
