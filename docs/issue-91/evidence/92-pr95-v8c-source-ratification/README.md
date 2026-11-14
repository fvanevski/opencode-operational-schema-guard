# Issue #92 / PR #95 — V8c source ratification + R2 provenance correction (sanitized evidence)

Branch `issue/92-v7c-accepted` | Hermes Build | CPU-only, no inference, no Graphiti writes, no source edits
CONTRACT=docs/issue-91/adr-acceptance/ISSUE92_V8C_SOURCE_RATIFICATION_HERMES.md

## RESULT = **V8C_SOURCE_RATIFIED**

The v8 cohort was re-sourced from the **canonical** native OpenCode store
(`opencode.db.session_message`, native `msg_…`/`ses_…` IDs) after the published v8
freeze was found to use OpenViking-archive IDs (`msg_<32hex>`) that are not in the
canonical store. Central's per-case dispositions were applied; one new complete
v8c 20-case private freeze + roster + staging receipt was created; the original
v8 freeze is preserved untouched.

## A. R2 provenance erratum (additive)
- The R2 receipt (daa5b7c) listed 6 of 7 execution-source blob hashes that did NOT
  match the immutable tree at `d3d66bb`. Authoritative 7 Git blobs at d3d66bb:
  events `041aab30…`, queue `b4e2df18…`, finite-batch `6d735b0e…`, fact-review
  `ee5350d5…`, claim-evidence `3c29c4ff…` (only correct one), core `5b1d33ef…`,
  ex-admission-proof `e63b8a36…`.
- The receipt's 8th input (it asserted 8, listed 7) is the **host-only EX
  admission gate** (`openviking_commit_gate.py` sha256 `c5d7f3f3…`,
  `commit-gate.toml` sha256 `06923f0d…`, transient lock) — a host artifact, NOT a
  Git blob. No Git blob was invented for it.
- CI: the receipt's cited run `43482932702` returned HTTP 404. Verified runs:
  `43486835871` at `d3d66bb` (success, 673/0) and `43489965011` at `daa5b7c`
  (success). The 404 run is not a source-head verification.
- Execution identity: the 7 authoritative Git blobs prove the R2 host execution
  matched the committed source; source-matching is **PROVEN**, not UNVERIFIED.
- The original R2 receipt is NOT modified (additive erratum only).

## B. Case revisions (v8 → v8c)
Original v8 sources were OpenViking-archive IDs not in the canonical store, so the
cohort was re-sourced to canonical native IDs. Central dispositions honored:
- RETAIN/requalify (re-sourced): v8-v-01 fzf-tab, v8-v-02 self-hosted Firecrawl,
  v8-v-03 proposed timeout, v8-v-04 Termux sshd, v8-v-06 plugin reinstall, v8-v-07
  GH MCP bump+readback.
- REPLACE: v8-v-05 (generic suspected misconfig), v8-v-08 (model-vs-config
  conflation), v8-v-09 (geolocation PII — **not copied**), v8-v-10 ("should be
  restored" false verification).
- Controls: v8-c-02/v8-c-10 were duplicates (text sha `80a62c1a…`); v8c uses 10
  distinct native controls.

## C. New v8c freeze (staged, no inference)
- Group `graphiti-adr92-a3-prospective-v8` (freshly shown **0 episodes**, 0 intents,
  no marker) staged to a NEW 0700 state root `/tmp/opencode/issue92-a3-v8c/state`.
- 20 cases (10 valuable single-predicate + 10 distinct controls), all
  `opencode.db.session_message` `type=user`, original bytes re-read, UTF-8 + raw-data
  SHA-256 recorded; 0 OpenViking echoes, 0 fabricated IDs.
- Digests: manifest `65348946…502a0b`, label-freeze `e0c9c9b1…c7195`, roster
  `d657cc55…548`. 20 events staged; once-only marker absent; no plan/model-calls/
  curation (scorer fail-closed).
- **No v8c inference executed.**

## EX precheck / ready launch
- Kernel-FLOCK inheritance via `GHDEV_MEMORY_POST_EXIT_LOCK_FD`; scheduler idle;
  harness-exit; no inference. Prepared one-shot launcher
  `/tmp/opencode/issue92-a3-v8c/ex-launcher.py` — **NOT executed**; Central
  authorizes the single untouched v8c prospective run after ratification.

## Historical integrity / source changes
- Original v8 freeze (manifest `dcd723a6…`, label `27159112…`, roster `b5293e8c…`),
  v7c corpus (`9356e663…`), r1/r2 records all **unchanged**; R2 evidence files
  unmodified. No production source edits (additive v8c evidence + private v8c
  freeze only).
