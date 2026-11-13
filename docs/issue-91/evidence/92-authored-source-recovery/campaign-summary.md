# Issue #92 — Authored-source recovery & completion campaign (evidence)

Branch `work/91-memory-utility-r1` | Source HEAD `11c37c6be83aa393fcdab26976ace9b96e8db767`
Primary agent Hermes/Build. SOURCE_GITHUB_WRITES=forbidden; EVIDENCE_GITHUB_WRITES=one sanitized commit.

## Result direction
**READY_FOR_FINAL_PROSPECTIVE_APPROVAL** — exposed mechanism proof complete; fresh v5 prospective cohort
frozen, staged, group-empty, launcher/scorer ready and EX-preflight PASS. Awaiting Central go/no-go for the single final run.

## A. CPU-only native gates (Part A)
Auth: `git merge --ff-only` d06b1d1 -> 11c37c6 (7 Central commits). See `parta-native-gates.md`.
- Syntax 5/5 pass. Focused suites 4/6 (2 documented: 1 NEW test-only field-name defect, 3 PRE-EXISTING source limitations at d06b1d1).
- Python EX bridge pass. `npm run check` pass. `npm test` 524/0.

## B. v4 failed-target diagnosis (Part B)
See `partb-v4-diagnosis.md`. All three (v4-04 FileFlows ABI, v4-06 ffdeps ref, v4-10 durable-segment sealing)
share the same loss signature: **staging/candidate-availability** — captured native event was 100%
`<openviking-context>` block, no authored text (`withoutInjectedOpenVikingContext` => ""). The predicate is a
genuine authored fact that lived in a *different* native message, not the captured one. Loss is upstream of
salvage; not a model-selection bug. No v4 re-score; no historical record modified.

## C. One exposed functional qualification (Part C)
See `partc-scorecard.md`. Group `graphiti-adr92-exposed-authored-r1` (fresh, 0 episodes pre-run).
- EX admitted (inherited fdinfo FLOCK, holder PID == parent); single inference (reconcile-only, no re-inference).
- candidates 9 / approved 4 / deferred 5; model_calls 22, model_errors 0.
- **4 persisted facts, all VALUABLE, 0 control false positives** (v4-07, v4-05, v4-08, v4-09).
- 0 dupes (4 distinct facts/refs/UUIDs); 4 queued -> 4 reconciled-persisted, all UUIDs present.
- 6 valuable not persisted (incl. the 3 Part B targets) — authored text absent from staged input; expected, not a defect.

## D. Fresh prospective cohort (Part D)
See `partd-fresh-cohort.md`. Group `graphiti-adr92-a3-prospective-v5` (fresh, 0 episodes).
- 20 independent cases (10 valuable + 10 controls), new native identities/text/predicates vs v2/v3/v4/B3/H2-H4.
- private_manifest_sha256 `efa72509…0124c`; label_freeze_sha256 `37976c72…cacadd` (0600 host).
- Staged 20 events @ 1/case; full-input privacy scan clean; EX preflight PASS (positive + 2 fail-closed negatives).
- Launcher `V5_HOST_APPROVED=1 python3 a3-v5-prospective-ex-launcher.py` + 8-arg scorer ready, NOT started.

## Historical state (unmodified)
Old Graphiti groups S1-S6, A3-v3/v4, their markers, and source/label manifests untouched. v4 batch
`01b37e05…41c6f` (8 episodes, 7 useful) permanent. No group cleared, no marker moved, no manifest overwritten.

## GH-dev10 friction (concrete)
- `COHORT_EXCEEDS_BOUND` (finite-batch.mjs:566): 20 events spanned 17 sessions -> 17 clusters > maxClusters 8.
  Resolution: re-stage under one shared (project,workspace,session_id) triple -> 3 clusters; native provenance
  preserved in `native_source_locator`.
- `FAIL_CLOSED: scheduler busy` (transient Graphiti extraction after MCP probes). Resolution: confirmed vLLM
  scheduler idle (running/waiting/paused all 0), then launched.
