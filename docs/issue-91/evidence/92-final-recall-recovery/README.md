# Issue #92 — Final recall-recovery verification (sanitized evidence)

Branch `work/91-memory-utility-r1` | PRIMARY_AGENT=Hermes/Build
REQUIRED_HEAD `cc6461de40cb63ce536ec88fbf00fe2744c93a55` (tested source)

## RESULT = **READY_FOR_V6_FINAL_PROSPECTIVE_APPROVAL**

One consolidated campaign: CPU verification (A), one bounded exposed functional proof (B),
and one genuinely-untouched prospective freeze (C). All evidence published together.
No new source work, PR, merge, deployment, or Issue #92 closure.

## A. CPU verification — PASS (with one disclosed host-bound test-scope fix)
- HEAD `cc6461de` authenticated; modified blobs `finite-batch.mjs`=`ceb81740`,
  `finite-batch.test.mjs`=`a3063276` (Central's salvage broadening + new regression tests).
- `node --check` ×2 rc=0. Focused native regressions green: finite-batch 68/0,
  claim-evidence pass, long-prompt pass, a3-stage pass, a3-acceptance pass.
- Python EX bridge OK; `npm run check` rc=0; `npm test` 524/0 PASS.
- **One real source regression, host-bound test-scaffolding (disclosed, not a semantic change):**
  the 3 new tests (malformed claim-support, dense-SQLite source, operator-chatter rejection)
  referenced `config`/`command`/`status` in the `fixture(fn, order)` second argument *outside*
  the callback where those consts were declared → `ReferenceError`. Hoisted the three consts into
  the test body (assertions unchanged). Applied locally to unblock; **not a source write** —
  Central should apply the same 3-line hoist to the committed `finite-batch.test.mjs`.

## B. One exposed functional run (GPU + local model + Graphiti) — v-05 recovered
- Disposable group `graphiti-adr92-exposed-final-recall-r1`; 4 authenticated v5 sources
  (v-05 litellm, v-10 opencode.db, v-06 rtk known-positive, c-10 weather control).
- 1 inference call, reconcile-only settle, 19 model calls (discovery 10 / utility 5 /
  specificity 1 / arbitration 1 / support 2), 0 errors. 5 candidates → 2 approved, 3 deferred.
- **v5-v-05 (LITELLM_MASTER_KEY): RECOVERED** — persisted (was `claim_support_invalid` in v5;
  the salvage broadening recovers the terse-config fact).
- **v5-v-10 (opencode.db prune): NOT recovered** — deferred `source_only_utility_not_substantive`
  (dense-SQLite command block; the extraction gap the contract anticipated — a larger dense-command
  source change, not in this slice).
- Known positive (rtk) persisted; duplicate rtk span deduped (`source_quoted_semantic_duplicate`);
  **nonvaluable control (weather) rejected → 0 pollution.**
- Positive Graphiti UUID reconciliation: `78fc7b09-…` (litellm), `80e37302-…` (rtk) in the
  disposable group.

## C. Next untouched prospective cohort — frozen, not executed
- New 20-case natural developer cohort: **10 valuable source-stated facts + 10 controls**, all
  native-authenticated (session/message, full text, timestamp, locator, project, workspace),
  privacy-clean, excluding every previously-exposed technical predicate + OpenViking echoes.
- Fresh group `graphiti-adr92-a3-prospective-v6` (empty, 0 episodes).
- Corpus SHA-256 `70f02cefdb0cfeb92340a17a1b63203cb894b4645132e5796c29d4a9e5f3b715`,
  label freeze `ceebf3f2fbde21cc1c601d997b5736bed9f2e88144da4c13f46aeced7711eecd`.
- Private 0600 corpus/roster/ratification; staged into fresh 0700 `state-v6`
  (20 events, 20 natural clusters ≤ 24 bound).
- EX preflight PASS (positive admitted; `missing_lock_fd` + `wrong_inode` fail-closed);
  scorer fails closed at `insufficient_review_samples` pre-inference; state-scoped once-only
  marker `state-v6/.v6-ran` (absent). 24/72/3600 bounds. **Not executed** — deferred to
  Central's source-label ratification.

## 10 valuable v6 predicates (source-stated, independently useful)
TBA-titled imports need manual acceptance · opencode plugin is `@opencode-ai/plugin` ·
mcp-mux-2.0-dev is a local clone of the gh repo · openviking commit gate works after root-API-key
removal · FALLBACK_2 source dir manually deleted (maintenance) · fsm81 pilot state map in
`states.json` · dovi-tool + libdovi 3.4.0-1 installed · opensubtitles creds in `~/temp/opensubtitles` ·
probe MCP config → port 8002 vLLM · commit-gate `queue_empty` allows operator commands.

## Exact prepared v6 prospective launch command (for Central approval)
```
V5_HOST_APPROVED=1 python3 /tmp/opencode/issue92-a3/a3-v6-prospective-launcher.py
```
(frozen treatment: `chat-fast` @ 127.0.0.1:8002, source recovery / claim-evidence /
source-exact-complement / source-quote-salvage / balanced-dedup, 24/72/3600, EX bridge,
Hermes exempt supervision, once-only marker, reconcile-only recovery.)

## Invariants honored
No source GitHub writes (the test-scope fix is local + disclosed, not committed). No PR, merge,
deployment, or Issue #92 closure. Historical v2/v3/v4/v5 + B3 + exposed groups/manifests preserved.
One sanitized evidence-only commit.
