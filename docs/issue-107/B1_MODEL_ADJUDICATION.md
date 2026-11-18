# #107 B1/B2 model-only adjudication (2026-11-18)

## Exact authority

- Baseline `main@5efc2c27f9c95da67dfd750f3bcb7877b7d380d5`; tested issue branch `95b1944d48cbdad4e6f3a9a92b3f08bc0e70abf0`.
- Privately retained host cohort SHA-256 `9b47f6a97c3c11364d64d16557940512046f2054a6c131f8d985ca27e87bbfc7`. Seven synthetic cases and one historically exposed case; **no independent unexposed live source holdout**.
- Host-attested final EX-admitted, model-only paired run archive SHA-256 `d8877bc07b6c2f9a861759cecfce62fbd6253dd66e633a75561e2a4eaae057cd`; SHA-256 manifest `c75576289ae03f6e8313b12d2a5185507e39f9ebe823e1ac2ca113f4fe197df5`. Central independently inspected archive and verified all eight members. Sensitive originals and model replies remain private on host.
- Exactly 16 reported calls (8 accepted #100 baseline, 8 opt-in compact) with equivalent source payload/model, zero provider errors. This was a dry model-output evaluation, **not** Graphiti writes or terminal fact retention.

| Metric | Accepted baseline | Compact candidate |
| --- | ---: | ---: |
| Pre-adjudicated useful source references recovered | **9/9** | **8/9** |
| Accepted source-valid fact proposals | 11 | 10 |
| Valid decisions | 8/8 | 7/8 |
| Established/provisional | 10/1 | 7/3 |
| Prompt/completion tokens | 5,775 / 1,590 | 5,271 / 1,536 |
| Total tokens | 7,365 | 6,807 |
| Tokens per recovered useful source reference | **818.33** | **850.88** |
| Total observed model latency | 5,232 ms | 5,074 ms |
| Integrity-blocked proposed siblings | 0 | 1 |

The compact protocol saves 7.6% aggregate tokens but **loses one independently graded useful reference**, fails one source-span validation (`c3_negative_result_tool`), and consumes approximately 4% more tokens per recovered useful reference. The strict validator correctly blocked that unsourced proposal. Do **not** promote compact to production. Retain original one-pass autonomous prompt/validator and opt-in measurement artifacts only until issue closeout; no extra model campaign to rationalize a weaker candidate. The unadjudicated extra proposals (two each) are not proven useful merely because validly quoted.

## Accepted B1 structural findings and bounded next actions

- A format-rejected sibling may disappear from durable `ReviewStore` while another valid sibling consumes the shared original source. The current bundle/recovery model preserves accepted fact children but not a resumable technical retry for rejected siblings. Implement B2 only with one bounded, durable, per-sibling reconsideration tied to the **same** source-owner/bundle identity. Never replay the parent model decision or Graphiti write to recover a sibling.
- The production local `duplicateState()` matches normalized assertion text without first distinguishing exact source replay from separately authenticated native source origins. Seven observed `LOCAL_REPEATED_ASSERTION` deferrals are therefore **not evidence** that seven identical sources replayed. Preserve identity and recognize independently sourced corroboration without uncontrolled duplicate Graphiti episodes; keep `submission_unknown` and `failed_extraction` fail-closed.
- Fifty observed `duplicate_check_unavailable` deferrals are remote check unavailability, **not confirmed duplicates**. Do not convert them to SKIP or allow remote writes past a failed check.
- B4 selective consolidation currently appears dormant (read-only host reported approximately zero eligible source-trigger pairs, two provisional review-level rows but zero fact-level provisional matches). Recall benefit remains **UNVERIFIED**. No speculative consolidation expansion.
- Existing OpenCode/another agent shared-lease steady state blocks EX attempts until the shared owners actually release the lock. During the final controlled maintenance window the OpenCode unit had already exited, EX was acquired, then service and curator were restored. Ordinary post-restore curator progress remains blocked by the again-held shared lease; classify as an operational scheduling limitation, not a successful ongoing drain.

## Gate semantics

This artifact documents measured source-linked model-proposal yield and an evidence-backed KEEP decision, **not** a terminal Graphiti useful-fact gain, native-answer improvement, solution to EX steady-state scheduling, or issue #107 completion. Subsequent B2/B3/B4 changes stay on the same issue branch/PR. Require focused exact-head trusted Actions, independent source review, and host-gated terminal episode/UUID/index verification for remote-path changes.
