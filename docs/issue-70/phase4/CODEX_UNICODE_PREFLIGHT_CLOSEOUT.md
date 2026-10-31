# Issue #70 / PR #72 — Unicode instruction-bound closeout

## Exact source identity

Previous independently reviewed head: `5aa62b709ed686d6b3ddfabc7d5d203350cc447a`.
Central correction head at contract creation: `19c19e9fa1b65da0231cf1e31d8d3b9ac73cf632`.
Existing continuation: `issue/70-temporal-final`, PR #72 on `issue/70` (`033b5aae7282665f57700f131661bbd0d59b16ec`).
The two manual Codex requests for PR #72 are exhausted. No further Codex request is part of this campaign.

## Last current-head Codex defect

Thread `PRRT_kwDOULzk_M6yOQoN`, `phase2/graphiti_terminal.py:87`:
`validate_contract()` accepts a legal 256-character CJK subject, but `transition_extraction_instructions()` uses `json.dumps(ensure_ascii=True)` and can emit **2073 bytes** against a **2048-byte** transport maximum. Previously this deterministic input exception happened inside `_execute()` after the ingestion journal was marked `processing`; the resulting `blocked_reconcile` had no possible graph receipt, indefinitely blocking admission.

## Central-owned production correction already staged

- `phase2/graphiti_terminal.py:EpisodeEnvelope.validate()` now validates the **exact fully generated instruction** against the existing transport limit. It is called in `AwaitedCoreAdapter.submit()` **before** `IngestJournal.reserve()`. The original check in `transition_extraction_instructions()` and the child transport limit remain unchanged.
- `phase3/git_source_authority.py:GitFactResolver.__call__()` explicitly validates the returned authenticated `EpisodeEnvelope` **before** it is returned for `SharedWorkQueue.admit_attested()`. An oversize source is rejected during CPU-only source verification while the original nomination remains `deferred_unverified`; no attestation, temporal contract, queued work, ingest receipt or Graphiti call is created.
- `phase2/test_graphiti_terminal.py` adds oversized-CJK pre-reservation and short-CJK positive tests.
- `phase4/test_temporal_source_contract.py` adds a real disposable Git-source/SQLite nomination regression. It checks oversized CJK deferred with no work promotion or Graphiti receipt and a separately identified valid Unicode nomination admitted afterward. **The valid follow-up uses its own `candidate("unicode-valid-followup")` source event identity**, preserving canonical source uniqueness.

No extension of Graphiti instructions, validator behavior, queue scheduler, retry machinery, or service interfaces is authorized.

## Host execution: one small CPU-first Build campaign

1. Materialize/authenticate exact Central branch head and clean checkout. Confirm unchanged Phase 1 PR #71 ancestry and PR #72 base. No main/merge/live writes.
2. Run focused Phase2 `test_graphiti_terminal.py` and Phase4 `test_temporal_source_contract.py` regressions with repository documented `PYTHONPATH`, then full Phase2/Phase3/Phase4 and affected candidate gate CPU discovery once. Repair **within-scope** source/test problems without weakening tests. Verify both valid Unicode and ASCII do not regress, oversized candidate leaves no ingest journal or blocked coordinator state, later valid nominee can be admitted, and ordinary Graphiti episodes unchanged.
3. Re-authenticate source package and rebuild **only changed artifacts**: Phase2/Phase3/Phase4 evidence hashes, `source-base-manifest.json`, `SHA256SUMS`, changed-file/evidence inventory and `qualification-phase4.json`, reproduction/HANDOFF/README/ROLLBACK as necessary. Gate/V2 patches and installed bases are unchanged in this correction: independently recheck their integrity; do not regenerate unchanged patches gratuitously. Re-run source package manifest and checksum verification. Preserve previous genuine disposable positive transition + retry evidence at its original SHA, without claiming it was re-executed on this head.
4. Publish one fast-forward source+qualification update to **the same** `issue/70-temporal-final` branch. Update **existing PR #72** only. No new issue/PR, no approval/merge/deployment. Re-fetch exact head/tree, check `node-contract` and `issue/70` ancestor, ensure no new unreviewed changes or regression-failing gates.
5. Return one structured handback with exact new head/tree, branch PR diff/checks, focused and broader CPU suite counts/exits, both Unicode boundary cases, no-graph/no-block proof, complete changed source and package hashes, unchanged patch proof, GHDEV-10 `COMMAND_SHAPE_FRICTION`, and separate note of any host-dependent work omitted as unnecessary.

This is a deterministic input-preflight fix; **no fresh GPU inference or real Graphiti episode** is required unless CPU evidence demonstrates an actual integration failure that cannot otherwise be verified. Do not repeat prior full real-service qualifications as an ornamental gate.

Stop only for unexpected changes to protected branch ancestry, source ownership, a genuine need for live state, or an architectural disagreement. Otherwise repair bounded defects and finish in one campaign.

## Review and activation boundaries

`CODEX_REVIEW=WAIVED_REQUEST_CAP` is **not** formal approval. Central will independently inspect the refreshed exact head, adjudicate the latest thread, and decide whether to use its formal independent review action. Production exclusive-state capture remains disabled. PR #71 merge, PR #72 merge, production activation, and Issue #70 closure are separately authorized actions.
