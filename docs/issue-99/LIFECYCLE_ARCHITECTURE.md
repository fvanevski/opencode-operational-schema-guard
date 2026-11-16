# Issue #99: A1/A2 source and architecture checkpoint

Authority: roadmap #98 and child #99 supersede the earlier routine-operator utility policy for new code. Source baseline: main 61f00c25bef8cbc5517b067f77823a4aef8a4da9. This increment is read-only lifecycle instrumentation plus disposable design comparison, **not** final migration or production acceptance.

## Source-backed keep / simplify / replace / retire

| Component | Decision for #99 | Reason |
|---|---|---|
| v2-candidate/events.mjs | Keep hard source, group, scope and privacy checks; later refine bounded-span recall | Source identity is occurrence, not claim content |
| v2-candidate/queue.mjs | Replace universal file-count admission | Current 4000 cap counts new, approved, deferred, skipped and terminal states equally |
| v2-curator/core.mjs ReviewStore | Keep per-fact durable revision/remote provenance in first change | Preserves source/fact sibling relationships, unknown remote intent and per-episode UUID/index |
| v2-curator/worker.mjs | Simplify duplicated queue/review status; keep EX and no-replay | Review owns actual extraction work; source queue states are not independent Graphiti work |
| _episode-index | Keep until equivalent source-qualified UUID lookup verified | Positive persisted state requires UUID/readback |
| portal | Optional diagnostics, not routine admission unblocker | #100 will remove routine human utility arbitration |
| finite-batch modes | Do not treat as installed production default | CLI source says opt-in; inspect effective host invocation before retiring |

Important non-equivalence: source records, fact reviews and terminal remote episodes are different populations. Multiple sibling reviews can share one original source and origin cluster. The 3117 approved source events reported in #98 are not 3117 unprocessed facts.

## Design comparison and central decision rule

F: retain original source JSON and exact event IDs, but split bounded *actionable* pending work from a durable, source-preserving addressable archive. Never delete evidence to gain capacity; crash after review CAS but before archive must converge; duplicate submission of an archived source remains a duplicate. Archive only source with authenticated durable review ownership; wrong-scope, cross-origin, unowned, corrupt and ambiguous remote situations require explicit recovery classification. Archive movement alone is not remote terminal proof.

S: one SQLite transactional evidence/work ledger with unique source IDs, fact ownership and exact remote UUID/index. It must **replace** redundant JSON review/queue authorities, not become a permanent competing mirror. Preserve revision CAS, no replay, EX and rollback through migration. Current SQLite prototype is deliberately NOT production schema/migration code.

Prefer F if measured bounded active work plus source-preserving archive solve capacity with materially lower operational complexity and migration risk. Prefer S if scans, joins or cross-file crash boundaries materially defeat F and migrating all consumers into one ledger is justified. Synthetic benchmark is a screen, not production crash/load qualification; Central makes the final choice after real read-only host ownership inventory. Anomalous retained events must not be silently orphaned, deleted or converted to terminal.

## Next stage

After the A1/A2 handback, Central implements A3 in the **same issue/99 branch**, including exactly-scoped source/ReviewStore linkage, restart/duplicate/crash/fairness regressions and consumer compatibility. Then trusted Actions exact-head Verify, Central review, merged-main CI, a separate reversible host activation and fresh native capture + post-exit EX proof. #100 AI utility policy and #101 final shared recall are not silently included in #99.
