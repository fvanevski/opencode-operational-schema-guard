# Issue #70 — Final source-only integration and one-PR preparation

## Exact source authority

Central continuation branch: `issue/70-temporal-final`. Previous approved head `38b40bcf7b2794573b661f2c25faa7da25acd45f`; Central has staged the two previously identified review repairs on this branch. Actual branch head must be read live before local execution.

PR #71 (`issue/70`, head `033b5aae7282665f57700f131661bbd0d59b16ec`) is approved, still open, and not merged into `main`. The Phase 2–4 continuation diverged before the **single Phase 1 evidence-only commit** `033b5aae...` titled "add Codex P2 backend-dependency remediation qualification record"; that commit adds `docs/issue-70/source-home/CODEX_P2_QUALIFICATION.md`. Restore this one missing Phase 1 commit to the Phase 4 continuation **by a normal local Git merge of the exact `issue/70` head**, not a force reset, a blind rebase, or copying the file without ancestry. Merge does not authorize merging PR #71 into `main`.

## Central-authored corrections

1. `candidate/gate/shared_work.py` now looks at the internal candidate category when reporting temporal validation. An exclusive-state event with a missing required transition contract reports `UNVERIFIED`, never `not_required`, including when its ingestion status is already `completed`. The candidate JSON is not added to the public status response. Two focused regressions in `phase4/test_temporal_status.py` confirm this and preserve ordinary fact behavior.
2. The Phase 2 manual qualified Graphiti Core flow supports `custom_extraction_instructions`. Phase 3–4's awaited subprocess path previously rejected this optional parameter, losing a known way to request a canonical predicate. `phase2/graphiti_terminal.py` now constructs a **bounded deterministic instruction from the authenticated `transition_contract`**, explicitly asks for the canonical relationship predicate and historical invalidation boundary, and passes the instruction only for declared exclusive transitions. `phase3/graphiti_process_transport.py` and `graphiti_core_worker.py` now accept and bound-check that optional field and forward it to the installed Graphiti Core `add_episode` API. There is no caller-supplied free-form extraction prompt, no instruction for ordinary facts, no new inference scheduler, and no change to the pinned temporal validator. Phase 2/3 regressions cover source-derived instruction creation, unchanged ordinary episodes, real child request forwarding, and rejection of unapproved extra fields.
3. The prior Phase 4 host handback's suite list adds to **191 executions**, not 197. Actual re-execution counts govern this campaign. Do not rewrite historical result data to invent six missing tests; distinguish counts by suite and whether repeated fixtures are separate executions.

**No Central host tests have run on the new source.** Changes are staged on GitHub, not deployed.

## Integrated host qualification (one campaign)

- Authenticate installed stock V2, gate, Graphiti Core/driver, validator and source-base identities; verify exact source and current branch heads.
- Before any disposable gate startup, run `phase4/safe_test_paths.py CONFIG_TOML DISPOSABLE_ROOT`; every test config must set explicit `[gate].database` and `[gate].lock_file` inside its own disposable root. No production DB contact or live graph writes.
- Run focused CPU tests (phase4 27 expected if baseline 25 plus two; phase2 30 expected if baseline 28 plus two; phase3 23 expected if baseline 22 plus one; counts subject to actual discovery). Run all broader impacted gate/launcher/receipt, actual-backend and stock-V2 tests once on final source, preserving genuine command exit codes and identifying input/environment.
- Use one fresh disposable graph to perform a real operator-allowlisted `exclusive_state_transition` from an immutable Git fact, via native V2 nomination, one gate worker, direct awaited Graphiti Core child, exact episode readback, and independently validated persisted graph state. Inspect the generated (non-secret) predicate and the durable validator outcome. Canonical extraction instructions are an **instruction, not an authority**; never force the validator to PASS. Prefer one grounded test transition; allow one bounded second transition only when it isolates a real data/model variable without tuning or rewriting predicates. Record actual PASS or non-PASS and whether the extraction instruction reached Graphiti Core unchanged.
- Test read-only recovery and replay, source/canonical predicate mismatch, absence of contract, missing validator pin, status and recall dispositions, concurrency/lease integrity, OpenViking unaffected, no hidden interactive model calls. Existing historical evidence stays tied to its original source identities.
- Rebuild gate and stock-V2 patches from authenticated installed bases, forward/reverse byte proofs, source-bound `phase2`–`phase4` runtime mapping, validation identity, all current hashes, `SHA256SUMS`, package reproducer, `qualification-phase4.json`, README/HANDOFF/ROLLBACK, and structured GHDEV-10 friction.
- Fetch the exact `issue/70` head and reconcile its one evidence-only commit with the continuation using a normal **non-destructive branch merge**, then rerun affected manifest/qualification checks after merge. If concurrent changes or substantive merge conflicts appear, stop the PR creation boundary and return the concrete evidence rather than silently replacing conflicting evidence.
- Push the final integrated `issue/70-temporal-final` branch fast-forward only; re-fetch and verify its full commit SHA, tree, and correct ancestry from `issue/70`.
- Create **at most one new continuation PR**, base `issue/70`, head `issue/70-temporal-final`, with Phase 2–4 scoped description and exact source/evidence identities. This is a *stacked source-only PR* until PR #71 merges; **do not merge PR #71**, retarget it, or retarget the continuation without Central review. If the new PR would include Phase 1 duplication, cannot verify base ancestry, or has a stale/unsafe diff, do not create it. No production activation.
- Return the PR URL/number, base/head full SHAs, diff/CI status, test matrix, actual positive or non-PASS temporal outcome, patch/manifests proof, and any focused blockers. Source-only review readiness does not imply production acceptance.

## Boundaries

The source-capture/recall and nonexclusive Graphiti functionality already passed disposable qualification. Do not reopen Graphiti architectural redesign, optimize model reasoning/temperature, fork validator/upstream Graphiti, create one PR per component, or run extra unrelated infrastructure work.

The category `exclusive_state_transition` stays disabled in production. A true automatic validator PASS is a product confidence prerequisite for later enabling it, **not** a prerequisite to publishing honest, deterministic source-only tests of the fail-closed implementation.

Central retains independent PR review, Phase 1 merge authorization, final production activation, and issue #70 closure. The local Build agent owns this one host integration, bounded remediation, package reconstruction, and at most one scoped PR creation.
