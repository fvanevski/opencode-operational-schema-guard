# Issue #92 / PR #95 — Final v8d source-validity freeze (sanitized evidence)

Branch `issue/92-v7c-accepted` | Hermes Build | CPU-only, no inference, no Graphiti writes, no source edits
CONTRACT=docs/issue-91/adr-acceptance/ISSUE92_V8D_FINAL_SOURCE_FREEZE.md

## RESULT = **V8D_SOURCE_RATIFIED**

The v8c cohort's false "RETAIN" lineage, repeated predicates and unsupported
upgrades were corrected using original authenticated native messages. One new
complete v8d 20-case private freeze + roster + staging receipt was created; all
prior freezes (v8/v8c/v7c/r1/r2) are preserved unchanged.

## A. Native source audit
All 20 v8d cases read from the **canonical** `opencode.db.session_message` store
(native `msg_…`/`ses_…` IDs, `type=user`), original bytes re-read read-only,
UTF-8 + raw-data SHA-256 recorded, privacy-screened, 0 OpenViking echoes, 0
fabricated IDs. Ten privacy-safe verbatim valuable excerpts + ten control
rationales are in `summary.json`.

## B. v8c dispositions applied (lineage corrected)
- KEEP (requalified): v8c-v-01 Plex path (user-reported, observed time), v8c-v-02
  media-stable (task-state assumption, not a guarantee), v8c-v-04 NInfer artifact
  (FULL contiguous quote, no ellipsis, versioned/historical), v8c-v-05 Tdarr
  network (DESIRED naming policy, not deployment proof), v8c-v-06 rtk proxy,
  v8c-v-07 graphiti-MCP failure (source-REPORTED, not proven root cause).
- REPLACE: v8c-v-03 (queue_empty = v6-v-10 dup), v8c-v-08 (reboot "/tmp"
  conditional, not verified), v8c-v-09 (imposed-hook speculation + RTK exclusion,
  overlaps v8c-v-06), v8c-v-10 (task-bound sudo, not general permission).
- Replacements (new predicate families, not in any prior cohort): nekoBT/Prowlarr
  added, pairing-loop inescapable-repeat defect, P5M49 handoff materialized,
  P5M45C handoff location (distinct integration projects).

## C. Overlap proof
Every v8d technical proposition compared against all prior v2-v7/B/exposed/v8/v8c
families (129 recorded); **zero unapproved overlaps**. Distinct source-message IDs
alone do not establish independence; the technical propositions were compared.

## D. New v8d freeze (staged, no inference)
- Group `graphiti-adr92-a3-prospective-v8` (freshly shown **0 episodes**, 0 intents,
  no marker) staged to a NEW 0700 state root `/tmp/opencode/issue92-a3-v8d/state`.
- 20 events staged; once-only marker absent; no plan/model-calls/curation
  (scorer fail-closed).
- Digests: manifest `aa42941a…5440`, label-freeze `c9befd79…99c7`, roster
  `3414d767…809`.
- **No v8d inference executed.**

## EX preflight / ready launch
Kernel-FLOCK inheritance via `GHDEV_MEMORY_POST_EXIT_LOCK_FD`; scheduler idle;
harness-exit; source/host EX bridge binding (host-only commit-gate, not a Git
blob); scorer fail-closed. Prepared one-shot launcher
`/tmp/opencode/issue92-a3-v8d/ex-launcher.py` — **NOT executed**; Central
authorizes exactly one untouched v8d prospective run.

## Historical integrity / source changes
Prior v8 (`dcd723a6…`), v8c (`65348946…`), v7c (`9356e663…`), r1, r2 freezes and
group/UUID records **unchanged**. No production source edits; no inference
replay; no Graphiti writes. Additive v8d evidence + private v8d freeze only.
