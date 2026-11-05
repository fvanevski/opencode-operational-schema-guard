# Curator drain and Graphiti state — Issue #81 independent holdout (Phase B)

**Group:** `cur81_holdout_cc5349fc` · **22 staged events** (2 controls excluded:
`ho2-cred-fake` private-vetoed at capture; `ho2-wrong-scope` scope-fence).

## Post-exit drain (first run)

- **Unit:** `ghdev81-holdout-cc5349fc.service` — uniquely named disposable
  `systemd --user Type=oneshot` (no `Restart=`, no timer/path watcher), operator-started
  after the interactive harness exited; canonical Python EX gate as sole admission
  authority.
- **Timeline (UTC):** 23:47:45 unit start → 23:48:15 `EX admission proven; invoking
  candidate drain with lock retained` → 23:48:15 terminal summary → 23:48:15 finished.
- **EX admission→terminal:** ≈ 30 s (≤ 900 s target). This first-run window ended in
  **failure**, not in a successful model→Graphiti persistence; it is therefore
  reported as the admission window only, not as persistence latency.
- **Summary (journal):** `curated=3, deferred=3, skipped=0, approved=0, queued=0,
  persisted=0, unresolved=0, model_attempts=3, model_calls=0, model_errors=3,
  model_ms=0, prompt_tokens=0, completion_tokens=0, reasoning_tokens=0,
  length_limited_responses=0, status=review_required`.

## Model decisions and terminal states (reconciled)

| Cluster (review ID, 8-hex prefix) | Events | Decision | Reason | Facts | Terminal state | Remote episode |
|---|---|---|---|---|---|---|
| `1fdf0eed…` | 8 | DEFER | `curator_unavailable_or_invalid` | 0 | deferred (rev 1→2) | none |
| `8915afb0…` | 8 | DEFER | `curator_unavailable_or_invalid` | 0 | deferred (rev 1→2) | none |
| `9036df0a…` | 6 | DEFER | `curator_unavailable_or_invalid` | 0 | deferred (rev 1→2) | none |

- All 22 queue rows terminal `deferred` (0 new / 0 reserved / 0 queued / 0 persisted /
  0 unresolved). **No remote write was ever attempted** (`remote_episode_uuid` null in
  all 3 records) — the outcome is unambiguous, so the reconciliation contract is
  preserved as-is: no blind replay, no forced lease release.
- **Usage:** 0 successful model calls, 0 tokens, 0 ms model time; 3 fast-failing
  attempts (~30 ms apart).

## Root cause (identified, bounded, private fixture)

`curateCluster` requires the loopback endpoint URL to end in `/v1/chat/completions`.
The private unit env file carried `LOCAL_CURATOR_URL=http://127.0.0.1:8002` (path
omitted), so every attempt threw `Loopback model endpoint required` before any HTTP
call. All previously working campaign env files carry the full path. The LiteLLM
loopback server and NInfer backend were up during the window and were verified live
afterwards with the unit's exact credentials (HTTP 200, non-thinking `chat-fast`).

- **Fix (agent-owned private fixture; original preserved):** env file now sets
  `LOCAL_CURATOR_URL=http://127.0.0.1:8002/v1/chat/completions`.
  - original bytes: `curator-cron.env.orig-41840c38` · SHA-256
    `41840c383691d17f014bfc11d92a83ae25bfd69425ed2b4e928fe5bbf2a5043a`
  - fixed file SHA-256:
    `265a1dbe799566afab5a54dc0e62dbb24031233f8ff61c638243392bb54fc93c`
- No production source change, model-policy change, Graphiti change, or gate change.

## Graphiti receipts (group-scoped readback, read-only)

- **`cur81_holdout_cc5349fc`: 0 episodes** — no positive episode UUID, no source-index
  entry, no extracted nodes/edges. Consistent with 0 model calls.
  **Durable grounded precision: empty positive denominator ⇒ `UNVERIFIED`** (not an
  empty-set PASS); usefulness, `false_authority`, `wrong_scope` likewise
  `UNVERIFIED`/0 over 0 judged facts.
- **Production `ghdev_gh_mcp`: 4 episodes — unchanged.** Historical cohorts unchanged
  (see `source-and-host.md` nonmutation table).

## Operator fact verdicts and re-drain

- **Operator fact review (Phase B):** `FACTS_A_ACCEPT_EMPTY_FACT_SET` — the 0-fact
  state is ratified; durable grounded precision recorded `UNVERIFIED`; no fact-level
  verdicts fabricated (see `operator-signoff-status.md`).
- **One bounded re-drain authorized** (operator, with 7 conditions, all prepared):
  1. original run made no remote submission; all 3 records unambiguously deferred — verified;
  2. corrected env digest + endpoint compatibility + loopback auth + non-thinking
     `chat-fast` — verified (digests above; live 200 with unit credentials);
  3. revision-checked `ReviewStore.change(id, rev, 'reevaluate')` applied — 3 records
     now `reevaluate_requested=true`, revision 1→2, state `deferred`, source
     identities and audit history preserved;
  4. no restaging, no replacement clusters, no label/corpus/threshold changes;
  5. the **existing** one-shot unit is prepared for **one operator-initiated**
     post-exit execution (no retry loop);
  6. model inference and Graphiti writes only via the canonical EX wrapper after all
     interactive harnesses have exited;
  7. fail-closed for ambiguous remote outcomes; no blind `add_memory` replay.
- **Operator-only command (next post-exit window, after all inference-holding
  harnesses have exited):** `systemctl --user start ghdev81-holdout-cc5349fc.service`
- If the corrected attempt emits and persists real model facts, a **fresh**
  consolidated private fact-review packet (actual assertions, source excerpts,
  provenance, proposed verdicts) will be prepared for a single operator adjudication.
  If it fails, the observed failure is reported and no further model attempts occur
  without a new evidence-backed decision.
