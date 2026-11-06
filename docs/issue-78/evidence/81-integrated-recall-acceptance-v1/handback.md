# Handback — Issue #81 integrated recall-acceptance (Build campaign)

**Packet:** `81-integrated-recall-acceptance-v1` ·
controlling contract `docs/issue-78/v2-benchmark/LOCAL_AGENT_CONTRACT_INTEGRATED_ACCEPTANCE.md`

```text
CAMPAIGN=ISSUE81_INTEGRATED_RECALL_ACCEPTANCE
RESULT=READY_FOR_POST_EXIT_OPERATOR_RUN
REPO_ID=fvanevski/opencode-operational-schema-guard
WORKING_BRANCH=issue/81-recall-acceptance
SOURCE_STAGE_COMMIT_IDENTITY=52863aed0498521b181f44bbb454ce314d60fa8c
SOURCE_STAGE_BASE_COMMIT_IDENTITY=ef1d62de1942061bb4441fc3606996a6faa7d327
UNCOMMITTED_SOURCE_CHANGES=none (evidence-only packet; no source file modified)
TESTED_INSTALLED_ACTIVATION_PAIR=none in shared production (branch bytes must not be activated pre-merge); disposable probe pair = issue-78 wrapper e54884ba... + fixed issue-75 baseline 7550f0b6... (branch), installed production pair = e54884ba... + issue-75 baseline 1c76f36e... (merged-main)
NATIVE_SESSIONS=ses-issue81-probe-seq / ses-issue81-probe-lat / ses-issue81-probe-neg (disposable probe; disposable DB)
NATIVE_MESSAGE_IDS=msg_1af17edf6001iMo2DH0NvTHVeX (P1 real) / msg_1af19ca8e0013V3UOXBtlXOSK2 (P2 long-aux) / msg_1af1a6210001nAj9KVvYRMfUCQ (P3 short-aux) / msg_1af1a719e0016DASx4V6ZQlI4F (P4 repeat) / msg_1af1c06d70017d9ueufM5ulZ4o (L1) / msg_1af1c360b001oCbOuFBE3deV8o (L2) / msg_1af1c4a9b001MrYsJ727PR3UsT (L3)
GRAPHITI_EPISODE_IDENTITY=877a5de5-d3fe-4540-93f4-30d5b9182f8c (curated-v1:f97780f5..., terminal receipt for the probe-injected fact; 116/116 persisted records have 1:1 terminal episodes)
PRE_EXIT_ACTIONS=CPU validation (7/7 exit 0); native hook-shape + recall-association probe; negative controls; latency population (p50=0.03ms, p95=256.92ms); EX/wake/queue/receipt inspection (read-only)
POST_EXIT_ACTIONS=model-backed post-exit curator drain of 61 'new' candidate events (EX-gated); post-exit admission-to-terminal-readback timing vs 900s target; installed-post-merge fresh-client semantic-recall population
EVIDENCE_PUBLICATION=<recorded on push: one non-force evidence commit on issue/81-recall-acceptance from 52863aed...>
```

## Why READY_FOR_POST_EXIT_OPERATOR_RUN, not PASS

Everything that the active Build harness can evidence is evidenced above
and in this packet. The remaining gates are excluded by the current
lifecycle boundary, exactly as the contract anticipates:

1. **Post-exit curator drain (model-backed).** The production
   `ghdev-curator-prod` unit is healthy and fail-closed on the
   agent-held EX lease (`FAIL_CLOSED: shared agent/gate lease held`)
   while this interactive Build session runs. Its model-backed drain of
   the 61 `new` candidate events (candidate → review → terminal
   Graphiti receipt + source index) can only be admitted after the
   interactive harness releases the lease. No competing local LLM,
   extractor, post-exit worker, or nested model client was launched by
   this campaign beyond the disposable recall-only probes.
2. **Fresh-client semantic recall.** The branch bytes are not (and must
   not) be activated in the shared production service pre-merge; the
   `FRESH_CLIENT_SESSION` gate requires a genuinely new client/session
   on the merged-main deployment.
3. **Durable grounded precision scoring** of the receipt population is a
   model-backed step pending the post-exit drain.

No repository semantic blocker was found: all CPU validation passed on
the frozen source; the native fields match the staged matching contract
(no redacted-shape return to Central); the host state is healthy
fail-closed with no demonstrated wake/config defect requiring
correction; and no labels, thresholds, baselines, or frozen corpus were
modified.

## Minimal existing operator commands (post-exit, no new controller)

```sh
# 1. Let the existing 30s oneshot auto-retry take over after the Build
#    harness exits, or trigger the existing unit explicitly:
systemctl --user start ghdev-curator-prod.service

# 2. Read back drain outcome (expect completion, not FAIL_CLOSED):
journalctl --user -u ghdev-curator-prod.service -n 50

# 3. Verify terminal identities:
#    - curation-v1/development-knowledge: 61 'new' candidate events
#      transitioned through review states
#    - new terminal episode UUIDs in Graphiti group development-knowledge
#      (get_episodes) and matching _episode-index entries
#    - post-exit admission -> terminal readback duration <= 900 s
```

## Rubric summary (frozen targets, unmodified)

- CPU validation: **PASS** (7/7 exit 0; 506/506 root; 31+24+24 focused)
- Native hook-shape compatibility: **PASS** (genuine stock-V2 fields match the staged contract; block bound to the correct real user request; long/short auxiliaries do not steal it)
- Zero secret / wrong-group / false-verified: **PASS (observed)** in negative controls
- Graph duplication: **none observed** (116 episodes ↔ 116 persisted records)
- Context latency p95: **256.92 ms ≤ 300 ms** (network included; cold-process worst case)
- Useful candidate coverage (holdout): **PASS 1.00** (inherited, frozen Stage H corpus)
- Semantic recall: **UNVERIFIED_UNTIL_FRESH_CLIENT** (pre-merge boundary)
- Durable grounded precision: **UNVERIFIED** (post-exit model scoring pending)
- Post-exit terminal receipts for the 61 pending candidates: **READY_FOR_POST_EXIT_OPERATOR_RUN**
