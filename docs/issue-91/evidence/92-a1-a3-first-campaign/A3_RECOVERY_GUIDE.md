# Issue #92 A3 — restricted host recovery

Source candidate remains `270848aa108df22b9d12738cc6f4903ec45da9c1`; baseline remains `c8eb5260f2b10832346234b1b5d0cf28302ffba8`. This addendum **does not change curator production code or the original frozen cohorts**.

## Evidence-based diagnosis

The four-arm result is zero persistence because all 40 initial model attempts yielded `DEFER curator_unavailable_or_invalid` (20 baseline, 20 candidate). A 500 response to `GET /v1/models` proves the model-proxy listing endpoint was unhealthy, but it is **not itself direct proof** of the exception for every `POST /v1/chat/completions` request: the current worker catches and masks individual errors. Diagnose the 8002 proxy's actual unit/container, effective configuration, service logs, upstream route, and alias without changing the frozen model identity. No unrelated services or packages need upgrading as part of this campaign.

## Non-replay recovery path

Simply running `a3-post-exit-run.sh` again is a **no-op for these deferred records**: `runAdmitted` selects a prior `deferred` review only when `reevaluate_requested === true`. The supported route is `ReviewStore.change(id, revision, 'reevaluate', {reason})`, which keeps source/episode identities, audits intent, and does not call Graphiti. No queue reseeding, source-event rekeying, approval/edit shortcut or remote retry authorization is permitted.

The Central-authored `a3-request-reevaluation.mjs` scopes **only** the existing four disposable review stores. Default invocation is read-only. With `--apply`, it first authenticates each clean pinned source worktree and all 40 expected model-unavailable-only records (3+3+17+17); then checks `chat-fast` appears on the loopback LiteLLM `GET /v1/models` listing (no inference call); then records at most one audited, CAS-checked reevaluation per record. A partial process interruption can be resumed only for records already marked by *this* helper, without double-marking or widening scope. Any unexpected review state, remote UUID or divergence blocks the operation. The tests check the record eligibility predicate; they do not substitute for host integration.

Read-only preflight, from the staged evidence branch:

```bash
node docs/issue-91/evidence/92-a1-a3-first-campaign/a3-request-reevaluation.mjs
```

After the local endpoint has been diagnosed and healthy alias routing is confirmed, an operator-authorized disposable state update is:

```bash
node docs/issue-91/evidence/92-a1-a3-first-campaign/a3-request-reevaluation.mjs --apply
```

Do this without model generation in an active interactive harness. **Exit all interactive harnesses** before invoking the already-reviewed `a3-post-exit-run.sh` from an ordinary terminal so the actual model requests run under the native EX lease. If any arm reports unresolved remote submission, preserve its lock and receipts; no blind replay or cleanup.

The existing `gh_mcp` holdout remains diagnostic: one declared task family versus ≥3 pre-registered in untouched holdout, provisional operator labels and absence of acceptance-quality evidence. Healthy model results on the same cases cannot retroactively repair those limitations. Report useful output and any misses honestly. Do not claim Issue #92 acceptance until a separately valid prospective cohort plus terminal/groundedness evidence satisfies its gates.
