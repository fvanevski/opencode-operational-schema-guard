# Issue #92 — S5 claim/evidence EX-kernel exposed-case evidence (evidence-only)

Sanitized, evidence-only record of the consolidated S5 completion campaign. No
model-inference source, no historical S1-S4 mutation, no production change.

## Identities
- Source execution SHA: `640f4a9a40b33d3efd230ff2c228bb4c5470f14e`
- Branch: `work/91-memory-utility-r1`
- S5 group: `graphiti-adr92-s5-claim-ex-proof` (fresh, 9 persisted)
- Corpus: original B3 24-cluster roster, SHA-256 `ebac7052...` (identical to S2/S3/S4)
- Denominators: 16 valuable targets + 11 nonvaluable controls (frozen, unchanged)

## Files
| file | content |
|---|---|
| `s5-handback.md` | consolidated handback (SHAs, native regression, EX chronology, scorecard, retrieval, A1/A3, friction) |
| `s5-scorecard.json` | 16+11 source-grounded scorecard + distinct durable-fact counts + loss-stage analysis |
| `s5-c1-c2-evidence.json` | 14/14 capture-control re-affirmation, A1 raw-native measurements, A3 prospective cohort freeze |
| `s5-execution-provenance.json` | S5 source-blob binding at HEAD 640f4a9a (40-char SHAs) |
| `s5-ex-kernel-proof.py` | EX kernel positive + negative proof (inherited flock, marker-only, non-inherited fd) |
| `ex-kernel-proof-output.txt` | proof output (ADMITTED / missing_lock_fd / wrong_inode) |
| `s5-driver-result.json` | admitted driver result (79 model calls, 9 approved, 9 queued) |
| `s5-reconcile-receipt.json` | terminal read-only reconcile-only receipt (9 queued -> persisted, 0 unresolved) |
| `s5-launcher.log` | EX admission chronology (flock, quiet grace, admission proven, job start) |
| `s5-reconcile.log` | terminal reconciliation chronology |
| `s5-command-shape-friction.md` | GHDEV-10 command-shape friction (inherited S4 + 3 S5 events, no safety incident) |

## Result
`FUNCTIONAL_REMEDIATION_REQUIRED` — S5 EX-kernel integration works end-to-end, but
valuable coverage is 6/16, below the S2/S3 9/16 baseline (lost sp8, py2, py3).
Per contract, no arbitrary prompt sweeps; this is the loss-stage analysis returned
to Central. Prospective A3 inference is gated on Central's review of this outcome.
