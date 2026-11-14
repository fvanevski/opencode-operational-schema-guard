# Issue #92 — v5 final four-case correction (sanitized evidence, evidence-only commit)

Branch `work/91-memory-utility-r1` | PRIMARY_AGENT=Hermes/Build | CPU_ONLY
INFERENCE=FORBIDDEN_UNTIL_CENTRAL_APPROVAL

RESULT = **FINAL_V5_FREEZE_CORRECTED**

Data correction only: 4 of the 20 v5 cases were replaced with previously-unused native
messages; the other 16, the source implementation, the functional test suite, and the EX
architecture are unchanged. No model inference, no Graphiti writes, no source mutation.

## HEADs
- **Current source HEAD (VERIFIED_HEAD):** `9d28f2f32d7c354e136f9cb7fbb82a408081a810`
- **Execution-source head (5d8fdcf binding, unchanged):** `5d8fdcf3aea63193a8b5b8f88148848944987c0d`
  (5d8fdcf is an ancestor of 9d28f2f; all 8 execution-source blobs + bridge `004188b1` still
  match on-disk — verified)

## The four replacements (previously-unused native messages)

| slot | kind | new native message | original locator | text-SHA-256 |
|---|---|---|---|---|
| v5-v-05 | valuable | `msg_1bd6887cb001jAMF85rVHjVIOq` | `opencode:ses_e42a0feb7ffe90FRSWNGErCIS0:message:msg_1bd6887cb001jAMF85rVHjVIOq` | `037dd9ada805adcaa1a184908585dd4fad018ba821ef04dedd7ef506ebe1d073` |
| v5-v-10 | valuable | `msg_1cbbe9804001A5xjZhjijK6uXR` | `opencode:ses_e3448adb5ffeA6IqqiDFUWxsd4:message:msg_1cbbe9804001A5xjZhjijK6uXR` | `939ca3530e3a27a4db0c94fca497fd179896fabcf8619a25d657568946844df6` |
| v5-c-03 | control | `msg_1c8a07cec0011cZH84v83wtc3H` | `opencode:ses_e376b3091ffeJGVfUjNgLXM650:message:msg_1c8a07cec0011cZH84v83wtc3H` | `0b868c4a9d1cad2e027678f8a7feaab99cb2f23c407d2d7c7f97ce784f0d64c1` |
| v5-c-10 | control | `msg_1b212b838001SQWceh3vixeBba` | `opencode:ses_e4ded47d5ffeT0SIqMxaXgP1pH:message:msg_1b212b838001SQWceh3vixeBba` | `83aeb39aa2652cade712335d1027a8485586bc21240773739176b14b86b4868d` |

All four verified against `opencode.db`: session_id, message_id, `opencode:` locator,
`session_v2` project + directory (workspace), observed timestamp, byte-exact full text,
privacy-clean, and unused (message ID + text digest disjoint from all v2/v3/v4/B3 + prior v5
+ `excluded_v4_roster`).

### Two new valuable predicates
- **v5-v-05:** "LITELLM_MASTER_KEY must be uncommented in the litellm config for litellm to start."
  Safe quote: `i had to uncomment LITELLM_MASTER_KEY for litellm to be able to start` (key NAME, no value).
  Replaces the confirmation-request v-05.
- **v5-v-10:** "opencode.db is pruned by deleting sessions archived or not updated in 7+ days, then cascading message/part/event deletes and VACUUM."
  Safe quote: `opencode.db was recently pruned using 'sqlite3 ... DELETE FROM session WHERE time_archived IS NOT NULL OR time_updated < (... -7 days ...); DELETE FROM message ...; VACUUM;'` (bounded).
  Replaces the speculative-location v-10.

### Two new control rationales
- **v5-c-03:** pure operator status chatter ("it appears the post-exit sequence has completed") — no technical requirement. Replaces the v2/v3-reused control.
- **v5-c-10:** nonvaluable weather question ("What is the weather in Tokyo right now?") — no technical requirement; not a prior valuable predicate. Replaces the v4-text-duplicate control.

## Corrected complete manifest + label-freeze digests (new, pre-inference)
| artifact | SHA-256 |
|---|---|
| **corrected 20-case native manifest (v2)** | `56f1dacc3c770e6650429d6cb37e4e7c61c13135ce9947ceb766cc7b7c75672a` |
| **label freeze (v2, 4 labels changed)** | `85b30fbde3a7cf43c1d16899c5820abdb6479529088304df2a809d9ff559cce4` |
| independent label ratification (v2) | `issue92-a3-v5-native-ratification-v2.json` (0600, `issue92-a3-ratification-v1`) |

## Staging + cluster count (fresh private state root)
- Staged with `issue92-a3-stage.mjs` into fresh 0700 root
  `/home/filip/.local/state/ghdev-graphiti-issue92/state-v5-native-v2`.
- Staging receipt (`issue92-a3-staged-v2`): 20 events @ 1/case, all `opencode:` native source_refs.
  Staging-receipt SHA-256: `f355cefaf8ab522cc6f44192f4fb2bcde25312203f45b165342bac8963f4772e`
- **Natural cluster count = 19** (distinct `(group,project,workspace,session_id)` under real native
  session IDs, via `core.mjs selectClusters`), **19 ≤ 24** bound. No shared-session synthesis.

## Empty-group readback (positive)
Graphiti `get_episodes {group_ids:[graphiti-adr92-a3-prospective-v5]}` → **No episodes found (0 episodes)**;
no once-only marker; no prior inference or ambiguous write intent for this group.

## EX / scorer / bindings (unchanged architecture, re-verified)
- EX preflight **PASS**: positive (inherited FLOCK → ADMITTED), negative marker-only → `missing_lock_fd`,
  negative non-inherited fd → `wrong_inode`.
- 8-arg fact-level scorer **fails closed pre-inference** at `insufficient_review_samples` (v2 inputs).
- Immutable source bindings: 5d8fdcf ancestor of 9d28f2f; 8/8 execution-source blobs + bridge match.
- Driver no-lease guard → `DRIVER_REQUIRES_ADMITTED_LEASE`; launcher gated preflight → `status:gated` (no inference).

## Historical manifests + remote groups unchanged (proof)
- Historical v5 manifest (efa72509) and native v1 manifest (14a25fa7) **unmodified** on disk.
- `graphiti-adr92-a3-prospective-v5` group empty (0 episodes); historical groups
  (exposed r1, a3-v3, a3-v4) and their markers/manifests/Graphiti episodes untouched.

## Exact prepared launch command (single prospective run, NOT started)
```
V5_HOST_APPROVED=1 python3 /tmp/opencode/issue92-a3/a3-v5-native-v2-ex-launcher.py
```
Treatment unchanged: `--finite-batch on --novelty-policy recall --source-recovery on --resilient-discovery on
--claim-evidence on --source-exact-complement on --source-quote-salvage on --balanced-dedup on
--max-clusters 24 --max-candidates 72 --max-seconds 3600`; model `chat-fast` @ `127.0.0.1:8002`.
State `state-v5-native-v2` (0700); state-scoped once-only marker `state-v5-native-v2/.v5-native-v2-ran`.
Acceptance thresholds unchanged (≥9/10 valuable, ≥90% grounded, ≥75% useful & ≥8 independent useful, zero breaches).
