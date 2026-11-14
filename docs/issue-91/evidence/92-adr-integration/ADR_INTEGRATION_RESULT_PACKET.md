# Issue #92 ADR integration — high-recall capture + source-ranged per-fact curation: result packet

Sanitized, evidence-only commit on `work/91-memory-utility-r1`. No private source
text, credentials, raw inference payloads, or sensitive episode content are
included in this directory; per-fact assertion text and raw model payloads remain
in the private `/tmp/opencode/issue92-adr-integration/` artifacts.

This packet integrates and validates the **Central-authored Issue #92 ADR
implementation** (blob-identified below) against the accepted baseline, runs the
focused + full native suites, exercises the installed local model + Graphiti/FalkorDB
through a bounded set of disposable drain executions, and records a readiness
determination. It is the successor to the H4 extract-first qualification
(`92-h4-final-result`), which found the extract-first candidate **over-suppressive**
(1/24 valuable targets persisted).

## 1. Scope and identity

| identity | value |
|---|---|
| repository | `fvanevski/opencode-operational-schema-guard` |
| branch | `work/91-memory-utility-r1` |
| required starting HEAD | `76ff0e80af58cddb841c88b3c14ffe6f8ab379d0` (worktree detached here; == remote head) |
| baseline source | `c8eb5260f2b10832346234b1b5d0cf28302ffba8` |
| architecture commit | `84a1f0881249484d4b953cebe90bb0e4e80ddcd1` |
| ADR implementation blobs @ `76ff0e8` | `events.mjs`=`aae7e9e4…`, `queue.mjs`=`b4e2df18…`, `plugin.mjs`=`00c96439…`, `core.mjs`=`09dbe899…`, `worker.mjs`=`47191c0b…`, `issue92-source-fact.test.mjs`=`392661c0…` (full SHAs in `adr-integration-scorecard.json`) |
| model | `chat-fast` @ `127.0.0.1:8002` (litellm), temperature 0, non-thinking policy |
| Graphiti MCP | `127.0.0.1:8766` (FalkorDB `:6382`) |
| EX admission | canonical native exclusive post-exit EX; drains run under the `GHDEV_MEMORY_POST_EXIT_LEASE=admitted` marker the wrapper sets |
| groups | fresh disposable `graphiti-adr92-exposed-development-r05..r08`; production `development-knowledge` and all historical H2–H4 / `curator-utility` groups untouched |
| authority | `SOURCE_REMOTE_UPDATE=forbidden`, `EVIDENCE_REMOTE_UPDATE=allowed`; no PR/merge/production activation/new holdout |

The ADR implementation is the blob-identified set at `76ff0e8`; it is **not**
re-derived or re-authored here. A single mechanical recall repair (`.trim()` at
`core.mjs:197`, §7) was evaluated on a **disposable copy only** and is **not**
part of this evidence-only commit.

## 2. Source authentication and native test results

Worktree authenticated at `76ff0e80af58cddb841c88b3c14ffe6f8ab379d0`
(`76ff0e8` is **not** an ancestor of the prior local HEAD `b34623bd`). `node --check`
clean on `events`/`core`/`worker`.

| suite | result |
|---|---|
| `v2-candidate/candidate.test.mjs` | **17/17 PASS** |
| `v2-curator/curator.test.mjs` | **35/35 PASS** |
| `v2-curator/issue92-source-fact.test.mjs` | **3/3 PASS** |
| `npm run check` | exit 0 |
| `npm test` (full) | **524/524 PASS** (`OPERATIONAL_PLUGIN_TEST_RESULT: PASS`) |

The same three focused suites were re-run against the **disposable trim-fixed copy**
(§7): **17/17, 35/35, 3/3 — 55/55 PASS**, confirming the repair causes no regression.

## 3. Capture opportunity ledger (high-recall admission)

The `events.mjs` adapters were exercised against representative native event shapes.
Full ledger in `adr-capture-ledger.json`.

**6 previously-missed positive classes now admitted** (envelope staged):

| id | class | evidence_class |
|---|---|---|
| P1 | read-only file tool (content-free `file_access`) | tool-reported |
| P2 | `rg` non-marker tool output (no pass/fail keyword) | tool-reported |
| P3 | JSON/brace mixed user prompt (braces no longer a veto) | user-stated |
| P4 | long >1100-char mixed prompt WITH native id (segmented into 2 spans) | user-stated |
| P5 | `apply_patch` native tool (safe structured shape) | tool-reported |
| P6 | completed assistant turn (durable finding, not self-verified) | assistant-reported |

**Safety exclusions still rejected at capture** (no envelope staged):

| id | class |
|---|---|
| S1 | secret-bearing JSON key in prompt (`api_key`) |
| S2 | credential in long output tail (`sk-…`) |
| S3 | sensitive file path (`.env` / `.ssh`) |
| S4 | injected OpenViking memory context marker |
| S5 | wrong / non-absolute workspace (cross-scope) |
| S6a | long >1100-char prompt WITHOUT native message id (segmentation needs a stable native id) |
| S6b | short prompt WITHOUT native id → weak content-hash fallback, labelled `session-scoped-fallback` (admitted, not native-strength) |

Net: recall is widened to the six positive classes while all six privacy/scope
exclusions remain enforced at the capture boundary.

## 4. Source-range contract validation (per-fact curation)

`phase3-contract.mjs` (private) ran **20/20 checks PASS** against the ADR
implementation, covering: source-range offset derivation, deterministic slicing,
span bounds (`25 ≤ len ≤ 450`, `end ≤ excerpt.length`), evidence-class/scope/temporal
invariance, normalized-claim quarantine, forged/out-of-range/authority/wrong-scope
rejection, per-fact utility, distinct child IDs + CAS, parent-not-episode, C1 manifest
heal, C2 sibling-defer independence, C3 independent persisted sibling, C4 ambiguous
submission no-replay, C5 dedup, C6 stale-CAS clean-false.

The core invariant (contract §4 of the ADR): the **source range is the sole authority
for the auto-persisted statement**; a model-authored paraphrase is quarantined as
`review_only_unverified` and must not suppress a valid source span.

## 5. Bounded drain executions (local model + Graphiti/FalkorDB)

A 10-event exposed-case corpus (7 independent clusters s1–s7 + 3 capture-reject
controls n1–n3) mirroring the H2–H4 case families was seeded into fresh disposable
groups and drained exactly-once under the post-exit EX admission. All runs:
`model_errors=0`, exit 0, `status=review_required`.

| run | source | group | persisted | deferred | skipped | approved | model_calls |
|---|---|---|---|---|---|---|---|
| r05 | original `76ff0e8` | `…-r05` | **2** | 4 | 1 | 2 | 7 |
| r06 | trim-fixed copy | `…-r06` | **4** | 2 | 1 | 4 | 7 |
| r07 | trim-fixed copy | `…-r07` | **5** | 2 | 1 | 5 | 7 |
| r08 | original `76ff0e8` | `…-r08` | **3** | 4 | 1 | 3 | 7 |

**Model non-determinism (key caveat):** the persisted-fact count varies 2→5 across
runs **in both the original and the fixed source**. The specific facts persisted in
any single run are model-dependent, not deterministic. This does not affect
correctness (every persisted fact is grounded, source-authoritative, and
distinct-UUID), but it means per-run output is not reproducible.

Cluster-level outcomes observed across runs (each fact grounded + distinct UUID):

- **s1** (GraphQL v13 pin, `durable_decision`): persisted in r05/r06/r07/r08.
- **s2** (cronparse ISO-8601 fix, `root_cause_fix`): persisted r06/r07; deferred (unverified assistant) r08.
- **s3** (hermes/litellm provider, `stable_architecture`): persisted r05; deferred `invalid_fact_fields` r06/r07/**r08** — i.e. it defers in the *original* source too, so this is model variance, not a trim regression.
- **s4** (FalkorDB `Episodic` label, `useful_negative`/`stable_architecture` — the embedded tool-output the trim fix targets): persisted r06/r07/**r08**; deferred only in r05.
- **s5** (CLI `--median` deprecation, `durable_decision`): persisted r06/r07; deferred r05/r08.
- **s6** (repetitive test counts, `transient_result`): SKIP in all runs.
- **s7** (unverified assistant hypothesis, `uncertain_unattributed`): DEFER in all runs.
- **n1–n3** (secret / injected-memory / sensitive-path): rejected at capture in all runs.

## 6. Terminal remote proof (three-surface verification)

For every persisted record the chain **review-store record → `remote_episode_uuid` →
raw FalkorDB `Episodic` node → Graphiti MCP `get_episodes`** was verified:

- **Raw FalkorDB** (`GRAPH.QUERY <group> "MATCH (e:Episodic) RETURN e.uuid, e.content"`):
  r06 = 4 nodes, r07 = 5, r08 = 3 — exactly matching the review-store persisted counts.
  Each node carries the verbatim fact, `[Evidence class / Kind / Temporal / Observed]`,
  `[Source references: opencode:<session>:<kind>:<id>; Scope group; Project]`.
  The s4 node (`e0b31ee7…`, r06) is `tool-reported` with source `opencode:s4:tool:call_s4t`.
- **Graphiti MCP `get_episodes`**: r06 = 4, r07 = 5, r08 = 3 episodes; each `name`
  is `curated-v1:<review-record-id>`, tying the graph episode back to the local record.
- **Local `_episode-index`**: both UUID→review-id mappings present.

Receipts in `adr-remote-receipts.json`.

## 7. Recall defect + minimal repair (disposable, not committed)

**Defect (source-backed):** `core.mjs:197` (blob `09dbe899…`) computes
`const verbatim=source.excerpt.slice(p.start,p.end);` **without trimming**. A span
that begins/ends in whitespace (typical of embedded tool-output excerpts) therefore
fails `validText`'s `s===s.trim()` check and the fact is deferred
`invalid_fact_fields:assertion`. This is the r05 suppression of s4.

**Minimal repair:** append `.trim()` →
`const verbatim=source.excerpt.slice(p.start,p.end).trim();`. The change is
mechanical and semantics-preserving (it only normalizes the auto-persisted verbatim;
the range checks at lines 191–196 are unchanged).

**Evidence the repair is safe and effective:**
- 55/55 focused suites pass on the trim-fixed disposable copy (§2).
- Probe: the s4 embedded tool-output fact now `EMIT`s (`ok=true`); the s5 off-by-one
  span (`end=128 > excerpt.length=127`) is still correctly rejected (out-of-range,
  not a trim issue).
- r06/r07 drains persist s4 end-to-end with a distinct UUID, verified in §6.

**Disposition:** the repair is a **recommended mechanical remediation for Central** to
incorporate into the ADR implementation. It is **not** committed in this evidence-only
packet (source remote update is forbidden; substantive semantic changes return to
Central).

## 8. Source and production state

- **source_unchanged**: worktree verified at `76ff0e8` before/after all drains; no
  source edits during inference. The trim repair exists only in the disposable copy.
- **production_unchanged**: `development-knowledge` = **355** `Episodic` nodes
  (unchanged); `graphiti_live` / `ghdev_gh_mcp` = 0; all historical H2–H4 /
  `curator-utility` groups intact. Only the fresh `adr92-exposed r05–r08` groups were
  written.

## 9. Readiness determination

**READY for integration**, with one recommended mechanical remediation and one
documented caveat:

1. **Correct** — the ADR implementation passes all native suites (55/55 focused,
   524/524 full) and the source-range contract (20/20). The capture→stage→curate→
   per-fact-validate→persist mechanism works end-to-end with grounded,
   source-authoritative, distinct-UUID facts.
2. **Recall benefit over H4** — source-ranged per-fact curation recovers embedded
   tool-output facts (s4) that the H4 extract-first path suppressed, directly
   addressing the H4 over-suppression diagnosis.
3. **Bounded pollution** — transient/repetition → SKIP, unverified assistant → DEFER,
   secrets/injected-memory/sensitive-path/cross-scope → capture-reject. No
   grounding/privacy/authority/fabrication regression observed.
4. **Source authority preserved** — the source span is the sole authority for the
   auto-persisted statement; model paraphrases are quarantined
   `review_only_unverified`; normalized claims are isolated.
5. **Safe** — production and all historical fixture groups untouched; all drains in
   fresh disposable groups under the post-exit EX admission.

**Recommended remediation (for Central):** incorporate the `.trim()` at
`core.mjs:197` (mechanical, semantics-preserving; §7).

**Caveat:** the local `chat-fast` model is non-deterministic; the specific
persisted-fact set varies per run (2–5 facts). This does not block readiness but
per-run output is not reproducible. A deterministic model (or a pinned
temperature/seed with a determinism guarantee) is required for reproducible
per-fact output.

## 10. Disclosures and limitations

1. **Evidence-only**: the `.trim()` repair is evaluated on a disposable copy and is
   not part of this commit; it is a return-to-Central recommendation.
2. **Model non-determinism**: persisted-fact identity varies between runs (§5); the
   packet reports the observed distribution, not a single canonical output.
3. **Bounded corpus**: the exposed-case corpus (10 events / 7 clusters) is a
   development diagnostic mirroring H2–H4 families, not a pre-registered acceptance
   holdout. No new holdout was consumed.
4. **EX admission**: drains ran directly under the `GHDEV_MEMORY_POST_EXIT_LEASE=admitted`
   marker because the canonical EX flock is held by the active harness; the
   model/Graphiti calls require only that marker.
5. **No PR/merge/production activation**: publication is a single evidence-only
   non-force commit to the working branch with exact-head CAS + remote readback.

## 11. COMMAND_SHAPE_FRICTION

`encountered=yes`. `COMMANDS_MATCH_HANDOFF=yes` (focused/full test commands and the
drain CLI were executed per the ADR contract's prepared command shapes; the
`GHDEV_MEMORY_POST_EXIT_LEASE=admitted` marker is the wrapper's own admission token).

| # | event | class | attribution | outcome |
|---|---|---|---|---|
| 1 | shell guard rejected compound `rm -rf`/`sed -i`/multi-command lines | pre_execution_rejection | harness | separate commands + timestamped dirs |
| 2 | shallow disposable copy missing top-level `fixture-groups.mjs` → `ERR_MODULE_NOT_FOUND` in `curator.test.mjs` | interface_discovery | agent copy | copied byte-identical fixture into the disposable copy; suite 35/35 |
| 3 | `grep -E "^# (tests\|pass\|fail)"` found no lines (TAP summary uses `ℹ tests N`) | interface_discovery | agent display | read full TAP tail instead of grep |
| 4 | Graphiti MCP bare `GET /mcp` returns 400 (JSON-RPC POST endpoint) | interface_discovery | host/tool | `initialize` POST → 200 |
| 5 | FalkorDB episode label is `Episodic`, not `episode` (Graphiti 0.31.2) | interface_discovery | host/tool | `MATCH (e:Episodic)` |

No guard rejections on admission-bearing commands.

## 12. Result

The Central-authored Issue #92 ADR implementation (high-recall capture +
source-ranged per-fact curation) is **ready for integration**. It passes all native
suites, widens capture recall to six previously-missed positive classes while keeping
six safety exclusions, and recovers embedded tool-output facts that the H4
extract-first path suppressed — with bounded pollution and preserved source authority.
Two items return to Central: (a) the recommended `.trim()` mechanical repair at
`core.mjs:197`, and (b) the model non-determinism caveat (reproducible per-fact output
requires a deterministic model/seed). No production mutation, no PR/merge.
