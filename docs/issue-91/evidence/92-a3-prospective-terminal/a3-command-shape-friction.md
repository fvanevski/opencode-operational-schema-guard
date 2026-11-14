# GHDEV-10 — command-shape friction log (A3 prospective execution)

## 1. First launch attempt fail-closed on scheduler busy
- The first `A3_HOST_APPROVED=1` launch acquired the EX flock, then found the vLLM scheduler
  busy (running/waiting nonzero) through the 30s quiet-grace and **failed closed**
  (`FAIL_CLOSED: scheduler busy`), running **no** inference (no marker, no result). This is the
  canonical admission behaviour. Re-running with the scheduler idle (running=0, waiting=0)
  admitted and ran the single inference.

## 2. Driver reports persisted=0 while the group holds 13 episodes
- The driver result's `persisted` field is the count persisted *before the driver exited*; the 13
  Graphiti writes were **queued** by the driver and committed by the launcher's **reconcile-only**
  corrective path (rc=3 → reconcile-only rc=0). So `persisted=0` in the driver result coexists
  with 13 committed episodes in the group — the reconcile is what made them durable. The
  authoritative count is the ReviewStore `state==='persisted'` records (13) + the positive
  `get_episodes` readback (13 UUIDs).

## 3. Adjudication keying: ReviewStore record id, not Graphiti UUID
- The scorer's `persisted` set is `records.filter(state==='persisted')` keyed by the
  **ReviewStore record id** (the content-hash filename), whose `remote_episode_uuid` is the
  Graphiti UUID. The first adjudication pass keyed on the Graphiti UUID and failed with
  `missing_fact_adjudication`; keying on the record id resolves it.

## 4. Stage source-ref span-suffix mismatch
- The stage receipt stores single-span cases without a `:span:N` suffix and multi-span cases with
  it, while episode source refs always carry `:span:N`. The excerpt-sha lookup normalizes to the
  base locator (`opencode:<ses>:message:<msg>`) to match both forms.

## 5. Recall floor is the binding failure
- 7/10 valuable targets were persisted (v3-01/03/04/06/08/09/10). v3-02, v3-05, v3-07 were
  deferred by the treatment and not persisted, so valuable recall 0.70 < 0.90. Useful-among-grounded
  (8/13 = 0.615) is also below 0.75 due to 5 duplicate episodes. Grounded precision (1.0) and
  zero-authority-breach both pass.
