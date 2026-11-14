# Issue #92 — final v5 native-authority & test gate (sanitized evidence, evidence-only commit)

Branch `work/91-memory-utility-r1` | PRIMARY_AGENT=Hermes/Build | PHASE=CPU_ONLY
LIVE_INFERENCE=FORBIDDEN | GRAPHITI_WRITES=FORBIDDEN | ONE_SANITIZED_EVIDENCE_COMMIT

RESULT = **FINAL_V5_NATIVE_AUTHORITY_READY** (with documented caveats below)

The corrected, fully native-bound v5 prospective cohort is staged, the group is empty,
the EX launcher + 8-arg fact-level scorer are prepared and fail-closed pre-inference,
and the single prospective run is ready for Central go/no-go. No model inference, no
Graphiti writes, no source mutation occurred in this assignment.

## A. Native tests at exact HEAD (real producer exits)

Auth: `git merge --ff-only de39406 -> f4def20` (3 Central commits: 805c938, 5d8fdcf, f4def20).
Evidence HEAD (full SHA): `f4def20e64ea8106848e4ca4462f2134dea87b72`
Execution-source head (contract C binding): `5d8fdcf3aea63193a8b5b8f88148848944987c0d`

| # | command | rc | counts |
|---|---|---|---|
| 1-7 | node --check (events, long-prompt.test, core, finite-batch.test, a3-native-source, a3-acceptance, a3-acceptance.test) | 0 | 7/7 |
| 8 | node --test long-prompt.test.mjs | 0 | 10 pass / 0 fail |
| 9 | node --test candidate.test.mjs | 0 | 17 pass / 0 fail |
| 10 | node --test finite-batch.test.mjs | 0 | 65 pass / 0 fail |
| 11 | node --test claim-evidence.test.mjs | 0 | 7 pass / 0 fail |
| 12 | node --test issue92-a3-stage.test.mjs | 0 | 3 pass / 0 fail |
| 13 | node --test issue92-a3-acceptance.test.mjs | 0 | 14 pass / 0 fail |
| 14 | python3 test_ex_admitted_node_bridge.py | 0 | Ran 1 test, OK |
| 15 | npm run check | 0 | 40 node --check |
| 16 | npm test | 0 | 524 pass / 0 fail |

All four focused RED cases that failed at `11c37c6` are now GREEN at `f4def20`
(805c938 aligned the legacy capture expectations; 5d8fdcf added the source-locator
binding invariant). Full exits preserved in `native-gates.log`.

## B. Original native-source authority (20/20 verified against opencode.db)

Source: `/home/filip/.local/share/opencode/opencode.db` (read-only).
Verified per case: session_id, message_id, source_locator, project_id, native
`session_v2.directory` (workspace), observed timestamp, and full message-text SHA-256.

- session_id / message_id / source_locator: **20/20 correct**, locator = `opencode:<session>:message:<msg>` (all `opencode:` native locators; the new 5d8fdcf commit-level binding holds).
- project_id: **20/20 match**.
- observed timestamp (time_created): **20/20 match**.
- workspace (native `session_v2.directory`): 15/20 matched the frozen roster; **5 global-project cases (v-06,v-07,v-08,v-09,c-09) recorded a generic `/workspace`** in the prior roster and were corrected to the native directory.
- full text SHA-256: 18/20 byte-exact; **v-02 and v-09** prior-manifest text was the live text truncated by its final character (non-substantive); corrected to the byte-exact native text.

6 of 20 cases required a derived-field correction (2 text + 5 workspace, v-09 in both).
The identity fields (session_id, message_id) were never altered. Full 20-row roster with
safe quotes, digests, temporal status and rationales: `v5-source-roster.json`.

### Nov / overlap
- **10 valuable cases: no prior-cohort overlap** (v2/v3/v4/B3 message-ids and text digests disjoint).
- Control duplicates (nonvaluable; do not threaten valuable novelty):
  - `v5-c-03` = `msg_1c1094fbe001Y0MxqVt91F5ZzD` — exact native message reused in v2 AND v3.
  - `v5-c-10` text byte-identical to v4 *valuable* case `i92-v4-08` (`msg_1a8003700001IR52JWG3RA476o`); different message ID.
- H2–H4 (gh_mcp private holdout) corpora are not on the host → byte-level crosscheck **UNVERIFIED** (stated, not assumed).

### Weak valuable targets (preserved as-is, per contract "preserve reported status")
- `v5-v-05` — "confirm if litellm was reverted…" is a confirmation **request**, not a source-stated fact.
- `v5-v-10` — "the setting **may be in** model-profiles.json" is a **speculative** location (contract: not a verified path).
These two are the weakest of the 10 valuable targets; 8/10 are solid source-stated durable facts.

## C. Shared-triple re-staging audit + corrected staging

- The prior v5 manifest already carried **16 real native session IDs** (not a shared triple).
- The historical "shared-triple → 3 clusters" workaround (from the maxClusters=8 exposed run)
  is preserved as historical evidence; it is NOT used here.
- **Natural cluster count under real session IDs = 16** (distinct `(group,project,workspace,session_id)`),
  verified with `core.mjs selectClusters` (maxClusters+1). **16 ≤ 24** prospective bound → no `COHORT_EXCEEDS_BOUND`.
- Rebuilt cleanly from byte-exact native messages in a fresh 0700 state:
  `/home/filip/.local/state/ghdev-graphiti-issue92/state-v5-native` (0700).
- Staging receipt (`issue92-a3-staged-v2`): 20 events @ 1/case, `events_staged=20`,
  all `opencode:` native source_refs, 16 real sessions.
  Staging-receipt SHA-256: `3397972fe727a861b643a411eb4d6a01e68cb2f7a1f86b0e674589ef5f4db986`
- **Empty-group proof (positive):** Graphiti `get_episodes {group_ids:[graphiti-adr92-a3-prospective-v5]}` → `No episodes found` (0 episodes). No once-only marker present.

## D. Digests (accepted v5 source/label SHA + corrected pre-inference manifest)

| artifact | SHA-256 |
|---|---|
| label freeze (20 labels, unchanged) | `37976c72071a483b978a6c1bd64b2e7ca57b5e841ea80ea5f2a0e7a452cacadd` |
| **corrected native manifest** (byte-exact text + native directory + real IDs) | `14a25fa7ba52dc5f1f4ff082662125c7a41edf06f89495468d35018fc1420574` |
| historical v5 manifest (preserved, unmodified) | `efa72509f0a74975e4d1f69695e9574009a8a9a95fc6b8dbe51c4eb95bd0124c` |
| staging receipt (state-v5-native/a3-v2-staged.json) | `3397972fe727a861b643a411eb4d6a01e68cb2f7a1f86b0e674589ef5f4db986` |

The corrected manifest re-binds the 20 unchanged labels/IDs to byte-exact native text and
native `session_v2.directory`; the label freeze is unchanged (labels are byte-identical).

## E. Launcher / EX / scorer readiness (no inference)

- Driver `a3-v5-native-driver.mjs` bound to execution-source head `5d8fdcf`; all 8
  execution-source blobs verified committed-at-5d8fdcf == on-disk at f4def20
  (`provenance.json`). Driver bounds: `maxClusters 24, maxCandidates 72, maxSeconds 3600`,
  model `chat-fast` @ `http://127.0.0.1:8002/v1` (unchanged).
- No-lease guard: driver throws `DRIVER_REQUIRES_ADMITTED_LEASE` (rc=1) — verified.
- EX preflight (`ex-preflight.json`): **PASS** — positive (inherited fdinfo FLOCK → ADMITTED),
  negative marker-only → `missing_lock_fd`, negative non-inherited fd → `wrong_inode`.
- State-scoped once-only marker: `state-v5-native/.v5-native-ran` (no v3/v4 collision).
- 8-arg fact-level scorer `issue92-a3-acceptance.mjs scoreProspective` — **fails closed
  pre-inference at `insufficient_review_samples`** (verified; `scorer-preflight.json`).
  Post-inference inputs (per-fact adjudications, remote readback, authority
  `first_model_intent_at`) are left as templates; not simulated.
- Launcher gated preflight (`V5_HOST_APPROVED` unset) → `status:gated`, no inference (rc=0).

## F. Exact prepared launch command (single prospective run, NOT started)

```
V5_HOST_APPROVED=1 python3 /tmp/opencode/issue92-a3/a3-v5-native-ex-launcher.py
```

Treatment (single, unchanged): `--finite-batch on --novelty-policy recall --source-recovery on
--resilient-discovery on --claim-evidence on --source-exact-complement on --source-quote-salvage on
--balanced-dedup on --max-clusters 24 --max-candidates 72 --max-seconds 3600`; `chat-fast` model.
Acceptance thresholds UNCHANGED: >=9/10 valuable hits, >=90% grounded precision,
>=75% useful-among-grounded AND >=8 independent useful facts, zero authority/privacy/EX/
false-verification/wrong-group breaches, positive UUID/source-index reconciliation, Wilson 95%.

## Privacy / temporal / rule compliance
- Private manifest / roster / ratification / staging state remain 0600 host-side (private/),
  state tree 0700; referenced here by digest only. No raw private manifest bytes, no raw
  session text beyond bounded 25–450-char quotes, no secrets/env values committed.
- 0 remote episodes in `graphiti-adr92-a3-prospective-v5`; 0 model inference in this assignment.
- Historical S1–S6, A3-v3/v4, exposed r1 groups, markers, manifests and Graphiti episodes
  are untouched. No PR, merge, deploy, or Issue #92 closure.
