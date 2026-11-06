# Issue #81 post-merge fresh-native acceptance — V1 evidence packet

**Campaign:** `ISSUE81_POSTMERGE_FRESH_NATIVE_ACCEPTANCE_V1`
**Class:** evidence-only. No source/config/Graphiti mutation, no service
restart, no PR/merge/issue closure. Single evidence-only commit under this
directory.

## What this proves

1. **Activation** — the S06-corrected production plugin injects the
   `[GHDEV_GRAPHITI_CONTEXT]` block into genuinely new native sessions
   (`opencode run --standalone --agent build --format json "<frozen question>"`,
   stock V2.2.5, OpenViking shim; no `--session`/`--continue`/`--attach`).
   S01 is both the activation proof and the first positive case.
2. **Source-correct recall** on the frozen 16-positive roster, scored with
   the preserved Phase A method (PASS iff GHDEV block present AND expected
   base source ref among injected refs), extended verdict labels
   (`PASS_SOURCE_CORRECT` / `WRONG_SOURCE` / `MISS_NO_CONTEXT` /
   `WRONG_PROPOSITION` / `UNSUPPORTED_CLAIM` /
   `PROCESS_OR_OBSERVER_FAILURE`); N02 keeps its historical
   `FAIL_INJECTED` label. Baseline: Phase A 8/16.
3. **Injection/latency/coexistence** — per-case end-to-end block latency
   (upper bounds; p50/p95 over the uncensored population, censored cases
   listed separately), OpenViking coexistence, no duplicate blocks.
4. **Safety** — no legacy-group bleed (`ghdev_gh_mcp` remote episodes stay
   0), no duplicate identities, admission gate probed read-only before
   every launch (bounded 15s×3 retry on `blocked_reconcile` only, no lease
   bypass).
5. **Precision review readiness** — consolidated 126-fact operator review
   packet staged (all human verdicts null); `HUMAN_PRECISION=UNVERIFIED`
   until operator verdicts are supplied.

## Files

| file | purpose |
| --- | --- |
| `execution-identities.json` | 20 native session IDs, pids, rc, frozen-input hashes, deployment/remote identities |
| `fresh-native-results.json` | full per-case scoring output (schema `issue81-pmnv1-fresh-native-results.v1`) |
| `recall-case-matrix.json` | sanitized verdict matrix (no raw traces) |
| `activation-and-health.json` | Phase A admission: client auth, deployed digests, service state, target ratification |
| `context-and-latency.json` | latency measurement basis + p50/p95 + censored population |
| `graphiti-pre-snapshot.json` / `graphiti-post-snapshot.json` | read-only Graphiti state before/after |
| `graphiti-source-readback.json` | pre/post diff + invariant checks |
| `precision-review-readiness.json` | 126-fact packet status (UNVERIFIED) |
| `central-diagnostic-disposition.md` | anomaly dispositions (port 9091, Bad Gateway history, S01 provenance, N04 attribution) |
| `command-shape-friction.json` | friction ledger (`encountered`, `commands_match_handoff`) |
| `SHA256-MANIFEST.txt` | digest manifest over the sanitized packet files (non-circular) |

## Frozen inputs (unmodified; digests re-verified at assembly)

- roster `47e141bd…` (`issue81-merged-promotion/evidence/phase-b/semantic-recall-roster.json`)
- Phase A results `57c78463…` (`semantic-recall-results.json`, 8/16)
- negative controls `2a1c4122…` (`negative-controls.json`)
- precision packet `c110acd3…` (`precision/operator-review-packet-126.json`)
- inventory `3f62d11d…` (`precision/adjudication-inventory-126.json`)

Raw per-case JSON streams and the litellm trace slice are kept private on
the host (`fresh-native-v1/raw/`, mode 600) and are not part of this commit.
