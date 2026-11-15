# Issue #94 — C1 performance baseline and conditional C2 decision packet

Authority: [Issue #94](https://github.com/fvanevski/opencode-operational-schema-guard/issues/94), its parent #91, and `docs/issue-91/ADR-91-2026-11-09-GRAPHITI-OPENVIKING-MEMORY-ARCHITECTURE.md`. This directory is **not** a performance patch or a deployment instruction. Its first objective is an authenticated **pre-C2** measurement on current merged #92/#93 code. The installed stock-V2 service and its effective configuration remain independent host facts to reauthenticate.

## What Central has already decided

- Graphiti is a project-scoped, source-supported temporal **development knowledge graph**, not a session archive. OpenViking owns session/experience continuity.
- #92 may persist multiple independently useful atomic facts from one cluster, but **one fact per review record/Graphiti episode**, with separate review/CAS, index, terminal remote UUID and recovery proof. Do not reintroduce one-per-cluster filtering or bundle facts.
- #93 selector abstention/strict anchor changes are accepted predecessor behavior. Preserve source-exact/negative controls, `safeText`, group/workspace/project/temporal attribution, model-facing 1,400 selector JSON characters and <=5 facts.
- Interactive callback p95 remains <=300 ms measured across **all actual callbacks**; a search RTT, local scan, or task-turn duration cannot be labeled callback p95. On-time relevant context availability and real answer support are distinct quality measures.
- Local source indexes are derived only; before indexed-only context injection, fresh current **same-group remote membership** remains mandatory. No local cached UUID, search rank, or unproven new API shortcut can substitute.
- #94 C2 is **conditional**. If C1 proves a material growth cliff or performance failure, Central owns the architecture/code/tests on this working branch. If not, record `PROFILE_ONLY_ACCEPTED`; do not add speculative runtime indexing, daemon, datastore or graph rewrite.
- C3 is later, after independent exact-head review, applicable trusted CI and merged-main CI. It requires authentic merged source+base/generated config, reversible stock-V2 promotion and genuine *new service + client + native session* Graphiti/OpenViking use under EX. No live activation in C1.

## Source-confirmed existing limits (not host measurements)

- `docs/issue-78/v2-curator/curated-recall-candidates.mjs` uses `MAX_REVIEW_SCAN=4096`, `READ_BATCH=32`, local shortlist 24 strict + 24 semantic and source-index mapping. At review counts above 4,096 the entire curated query candidate inventory returns `[]`; this is fail-closed availability, **not safe scalable recall**.
- `docs/issue-75/v2-candidate/memory-core.mjs` optional indexed enrichment asks Graphiti `get_episodes` with `max_episodes:1000`, accepts only complete strictly fewer-than-1000 rows with all matching groups/UUIDs. It has an optional 70-ms enrichment budget and serialized MCP transport. No targeted episode lookup is assumed available.
- Current group is expected to be `development-knowledge`, but the agent must establish the effective live value rather than rely on this documentation.

## Pre-C2 host evidence requirement

Freeze one baseline report before modifying runtime source. Collect source/service/config/module identities, exact Graphiti MCP version and read-only `tools/list` shape, review/index/queue counts with per-state and per-cluster/per-fact distribution, native capture opportunity/drop categories if exposed, and existing deferred/unknown workload. Read raw private state only on host; publish **aggregates**.

Run local read-only current-source profiling and separate disposable synthetic scaling for empty/off-topic, source-exact, indirect/historical and high-group/near-cap inputs. Use private pre-identified query file (not a new tuned holdout) and report query source-pool/admission categories without raw question text. At least three timed iterations per case when safe, with first-run versus warm separately identified. Report independent durations for local curated scan/shortlist/index join, Graphiti search, `get_episodes` remote proof, native `prompt` prefetch, native `context` callback (all invocations including misses), full plugin chain if actually observable, model-bound availability and later model answer (when genuinely observed). Unknown stages remain **UNVERIFIED**, not zero. No inference from the synthetic stub to real Graphiti authority.

The Central-authored `retrieval-profile.mjs` measures **only** the current-source local curated inventory/shortlist/index-join work, with true CPU-only disposable scaling controls. It intentionally does **not** call Graphiti, alter review state, record raw queries in output, or claim native callback timing. `retrieval-profile.test.mjs` checks synthetic per-fact origin fanout and read-only metadata shape. The agent collects the nonlocal measurements through existing documented service-native/observer interfaces, never by altering production callbacks, changing request routing, displacing LiteLLM, trying `SO_MARK`, or exporting raw model requests. Confirm the actual Graphiti MCP `tools/list` before proposing a targeted remote episode lookup.

### CPU-only profiler invocation (from authenticated repository checkout)

```bash
node --check docs/issue-94/retrieval-profile.mjs
node --test docs/issue-94/retrieval-profile.test.mjs
node --test docs/issue-78/v2-curator/curated-recall-candidates.test.mjs

node docs/issue-94/retrieval-profile.mjs \
  --mode synthetic --sizes 512,4096,4097 --rounds 3 \
  --output /ABS_PRIVATE_0700_DIR/issue94-synthetic.json

node docs/issue-94/retrieval-profile.mjs \
  --mode local --state-dir /AUTHENTICATED_LIVE_GRAPHITI_STATE_ROOT \
  --group development-knowledge --workspace /ACTUAL_CANONICAL_WORKSPACE \
  --project /ACTUAL_PROJECT_NAME --queries /ABS_PRIVATE_0600_QUERY_FILE \
  --rounds 3 --output /ABS_PRIVATE_0700_DIR/issue94-local.json
```

These are literal CLI syntax patterns with symbolic absolute host paths that the agent must resolve from **effective current live config**. Output paths must not already exist; the profiler creates private 0600 files with `wx`, never overwrites or auto-cleans live data. The synthetic profiler alone creates and deletes a clearly marked `os.tmpdir()` disposable fixture. Do not run a full synthetic scan on the live state directory. Avoid duplicate volume-heavy profiler replays once baseline is sealed.

The `local` profiler has no remote Graphiti calls. The `synthetic` profiler uses generated metadata and a source-index resolver only. For both, a positive local shortlist is **not** a successful graph membership proof. Verify via independent host read-only Graphiti tools and the native callback when applicable.

## C2 decision and return boundary

After baseline receipt, distinguish these possible findings: (1) current local read/IO cost, (2) at- or above-4,096 query-source blackout, (3) remote list at/above-1,000 without a qualified targeted API, (4) genuine native prefetch/callback deadline and useful-context loss, (5) unrelated service/model latency. Report measured frequencies and relative contribution, not a single blended p95.

**Do not locally implement semantic runtime fixes** from an uncertain performance signal. Central will author a minimal algorithm/regression update on this **same branch** if and only if the baseline justifies it. The agent may repair a broken profiler or metadata-only host observer inside `docs/issue-94/`/private scratch if that repair is unambiguously bounded, self-tested and separately disclosed with a complete diff. No production `memory-core.mjs`, `curated-recall-candidates.mjs`, `sourced-recall.mjs`, candidate/index/review/queue format or runtime config changes in C1.

Handback `C1_RESULT=BASELINE_COMPLETE|PARTIAL|BLOCKED`, `C2_RECOMMENDATION=PROFILE_ONLY_ACCEPTED|MEASURED_OPTIMIZATION_CANDIDATE|UNVERIFIED`, and a stage-by-stage evidence matrix. This is a single meaningful CPU/read-only integration campaign; do not open another PR/issue or start unrelated services. Preserve private data and publish one sanitized packet on the issue working branch when safe.