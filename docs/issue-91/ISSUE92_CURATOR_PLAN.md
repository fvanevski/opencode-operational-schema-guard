# Issue #92 — prospective durable-utility selection and paired evaluation

Status: **pre-registered design**, not benchmark evidence. Parent #91; first shared work branch `work/91-memory-utility-r1`. Frozen, accepted #81 materials are **read-only controls**.

## Hypothesis and boundaries

Separate two independent predicates: (a) an assertion is a contiguous, precisely attributed 25–450-character extract and (b) its future reusable development value justifies durable retention. Curator-model `utility_class` is a *selection judgment*, never a source-verification or authorization claim. Accepted operator edits and historical records remain valid without this annotation. Graphiti source/group/temporal/UUID proof, one-fact automatic persistence, defer/recovery and the EX gate are unchanged. Do not rerun or rewrite production episodes.

## Rubric (fixed before collecting new model outcomes)

| Class | Operator criterion | Default model action |
|---|---|---|
| `durable_decision` | Explicit user/operator choice or enduring constraint that changes a future decision | EMIT if exact, attributable and currently relevant |
| `root_cause_fix` | Confirmed cause and correction/known resolution, not merely an error symptom | EMIT only the exact contiguous supported claim |
| `stable_architecture` | Stable component relationship/compatibility interface supported by source | EMIT when reusable |
| `reusable_procedure` | Reproducible step, required precondition or negative safety rule | EMIT when reusable |
| `useful_negative` | Well-scoped demonstrated non-solution or restriction likely to prevent repeated work | EMIT with original uncertainty/temporal status |
| `transient_result` | One-off passing count, status, launch result, progress acknowledgment, incidental observation | SKIP unless a separate durable supported conclusion exists |
| `repetition` | Essentially duplicated already-retained fact, same run repeated, redundant excerpt | SKIP / no replay |
| `superseded_stale` | Earlier failing state replaced by confirmed later state; obsolete configuration/claim | SKIP stale statement; preserve historical records |
| `uncertain_unattributed` | Speculative advice, incomplete cause, contradictory/conflicting source, weak provenance | DEFER for operator adjudication |

A failed test may be valuable if it establishes a reproducible root cause or enduring constraint; a green test may be valuable if it proves a stable compatibility rule. Judge *meaning*, not keyword counts. If a cause→fix relationship spans two source excerpts, do not synthesize it in automatic extractive EMIT; DEFER or retain a single accurate supported excerpt. MERGE/SUPERSEDE_PROPOSED remain operator-only proposals; **never** automatic Graphiti update or deletion.

## Corpus and leakage control

1. Reference the sealed #81 source-linked development and holdout manifests by SHA-256, without editing or retroactively changing their denominators, signed labels or adjudicated results. The known #81 14/14 valuable-event broad-capture and 2/2 grounded, 1/2 useful persisted holdout are baseline history, **not** this new holdout result.
2. Build a **new** prospective evaluation roster from genuinely different real or sanitized development events, with an explicitly documented development/holdout separation and materially distinct task families. Holdout material must not repeat the same underlying event/fix/fact family in different wording. Do not copy raw private transcripts or model requests to GitHub; retain private exact bytes locally with SHA-256 + restricted permissions and publish only sanitized ID/category/outcome matrices.
3. Freeze the holdout roster, case IDs, event provenance hashes, operator utility/capture labels, exclusion criteria, split identities, model/version/config and all metrics **before** either arm's output is revealed to adjudicators or candidate tuning uses the holdout. Record a time-ordered, immutable manifest/readback. Any case revealed before freeze becomes development/exposed material, not untouched holdout.
4. Use identical ordered **source inputs, cluster boundaries, model alias/version/settings and allowed runtime** for the paired previous-main and changed-policy arms. Avoid changing the model, temperature, thinking budget or upstream event filter between arms; log any unavoidable difference and mark comparability limited. A deterministic no-model replay can first check parser/logic. For genuinely private input, do not upload raw records.

## Prospective decision gates

The holdout target (provisional, to ratify with operator **before first result**) is **at least 20 independent event/cluster cases** spanning ≥3 substantive task families, including ≥10 prospectively judged useful cases and several negative/privacy/wrong-group controls. For a *descriptive* ≥75% usefulness-among-grounded-persisted estimate, require at least **8 independently judged, receipt-backed, grounded candidate facts**; any fewer produces `INSUFFICIENT_SAMPLE`, not PASS, and no forced EMIT. Eight is a modest operational floor, **not** statistical population precision; report Wilson intervals and counts. Never enlarge the holdout adaptively after unblinding to meet the count.

Ratified pre-output primary decision rule: the same-case candidate arm must (i) reduce absolute low-value/redundant persisted facts **and** lower their fraction among persisted facts when baseline has a positive denominator, (ii) preserve every baseline-retained *useful case family* or document each missed useful fact as a failure, (iii) retain ≥85% high-value cases in a newly frozen representative set and the untouched prior 14/14 **capture** control, and (iv) retain ≥90% source-grounded precision among actual persisted facts with zero observed secret, wrong-group, fabricated-source, falsely-verified or bypassed-EX events. The ≥75% candidate usefulness fraction is evaluated only with sufficient real persisted facts. If baseline low-value persistence is already zero, require a non-inferiority rather than inventing a reduction.

Per arm, report separately: selected/filtered candidate events, model proposals and code/reason counts, `EMIT/SKIP/DEFER/MERGE/SUPERSEDE_PROPOSED`, valid exact extracts, approved reviews, actual terminal receipt-backed Graphiti persisted facts, usefulness among *grounded persisted*, grounded among persisted, low-value persisted, redundant yield, useful-case coverage and misses, deferrals, operator adjudication count/minutes, duplicate/recovery/ambiguous submissions, model token/latency and extraction provenance. No Graphiti extraction-token estimate without direct attribution. Keep independent denominators and 95% descriptive uncertainty; never substitute emitted proposals for actual persisted facts.

Stop this acceptance if privacy, source/provenance, group, model EX gate or ownership invariants fail. Stop model tuning after frozen holdout is revealed. Record an honest `INSUFFICIENT_SAMPLE` or `INCONCLUSIVE` where necessary; do not fabricate or overfit the cohort.

## Regression families

Legacy source-exact, operator-CAS, group/secret, one-fact and retry tests remain intact. Additional targeted cases: obsolete green counts vs substantive enduring verification, initial failed then corrected outcome, source-stated decision, root-cause→fix, useful negative, speculative assistant statement, repeated excerpt, historical source, cross-group/private content, missing/invalid/non-durable model `utility_class`, legacy approved record compatibility and valid model response under controlled EX. Validate automatic decisions independently of Graphiti runtime; host-backed readback remains a separate EX-admitted boundary.

## Acceptance owner and next stage

Central assesses exact staged source/tests, prospective freeze, independent scoring, meaningful residual misses and current Actions receipt. Local Build owns host runtime, privately hashed corpora, disposable service/Graphiti evidence and non-secret GitHub evidence packet. #93 may continue on this working branch; do not create a PR for A1/A2/A3. Installed production activation and final end-to-end stock V2 acceptance belong to #94 and parent #91, not this host qualification.
