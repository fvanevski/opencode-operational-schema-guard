# Issue #81 — bounded curator efficiency qualification

## Purpose and accepted boundary

This is a **model-only, source-preserving A/B probe** of the accepted #80 curator, not a production default change or a repeat of Graphiti qualification. Current default wire request remains `max_tokens=1600`, `temperature=0`, `response_format=json_object`, with **no** reasoning-effort override.

The November 4 disposable cohort consumed 28,538 curator tokens for 13 calls over 33 source events: 14,407 prompt, 14,131 completion, 51.813 s model time. Four calls used >=1,500 completions; two used 1,600. Three EX-admitted drain passes did not re-curate earlier cluster identities; 9 model EMITs resulted in 9 Graphiti episodes, 3 DEFER and 1 SKIP. The 07:06:14–07:11:43 post-exit interval was 329 s, of which ~277 s is not accounted for by **recorded curator model_ms**. Backend Graphiti extraction LLM usage is **UNVERIFIED**; do not attribute it to the 28,538 curator tokens. Earlier fail-closed service retries under the active harness are separate **systemd process attempts with zero admitted model calls**, not extra LLM completions.

NInfer documents request-level `reasoning_effort: "none"`, output-token and per-request reasoning usage, but the live `chat-fast` LiteLLM proxy's forwarding semantics are **UNVERIFIED**. The repository now exposes those fields in `model.mjs` only through explicit opt-in arguments and aggregates ordinary run usage with missing reasoning detail recorded separately. No change to the standard post-exit drain parameters is implied.

## Locked experimental design

- Use the **existing** isolated group `cur81_dev_ce555621` and **existing** 13 curated review records, read-only. The preserved model baseline is the separately authenticated `curator-model-results.json` receipt from `81-qualification-post-exit-v1`. Do not call the baseline model again just to establish a control.
- Run at most **five** model-only requests under the canonical, pre-existing EX admission gate, with `reasoning_effort=none`, `max_tokens=768`. No model-origin Graphiti writes or source mutations are authorized. Use the read-only `docs/issue-78/v2-curator/efficiency-probe.mjs` through the accepted `post-exit-drain.py` gate wrapper.
- Use exactly five preselected review IDs from the published cohort, including two multi-event model-EMIT, two model-DEFER and one model-SKIP. The list below is not a new corpus or holdout and does not change labels:
  1. `f584c1bfba64afdaeda0bc595f3bf63c59c13e4e34be77964dcdcf8671d2f0d5` — 7-source prior implicit EMIT
  2. `4ab73c43df15e0141b535cf1bcda1047e23545d31a590a1c93084a7549b487bd` — 8-source prior implicit EMIT
  3. `8c44c2ffecccb16418d736391e04ca6204cfdece233216c84090f90b10f09cdd` — 5-source DEFER, 1,600-token prior completion
  4. `9f8612665eaada1346d2c054517d552da05471b47a1f3f79a5940d99d10867ee` — 3-source DEFER, 1,600-token prior completion
  5. `492668aa62f948b92729f6ac10e5e4c5e497e3ebb2b9e0462fc8f6338b494716` — prior SKIP
- Never score the sealed human holdout or modify the #75/#79 selector, #80 validator, confidence/evidence class, remote episode index, production group or shared gate.

## Execution, one host continuation only

1. Fetch `origin/issue/81` and prove the exact required SHA **before** making a disposable worktree. Run CPU syntax/test checks: `node --check` for `model.mjs`, `worker.mjs`, `efficiency-probe.mjs`, `evaluate.test.mjs`; `node --test` the existing `curator.test.mjs`, corrected `evaluate.test.mjs`, and `efficiency-probe.test.mjs`. Record actual individual exit codes. No source edits to get green.
2. Collect read-only baseline statuses: candidate queue new/reserved/unknown 0, the 13 review records unchanged and nine remote `cur81_dev_ce555621` episodes, four `ghdev_gh_mcp` production episodes. Note the current NInfer and LiteLLM model identity, client/proxy config, and observable reasoning controls **without modifying the server**.
3. Prepare **one** private 0600-only output destination under the already retained issue81 state root, and a disposable transient user-systemd one-shot invoking the same Python post-exit gate wrapper with `--cli` set to `efficiency-probe.mjs`. Supply the existing private curator env file and the probe-specific environment:
   - `GHDEV_CURATOR_PROBE_IDS`: the five comma-joined exact IDs above
   - `GHDEV_CURATOR_PROBE_EFFORT=none`
   - `GHDEV_CURATOR_PROBE_MAX_TOKENS=768`
   - `GHDEV_CURATOR_PROBE_OUTPUT`: a new, absent absolute private JSON path
   - existing `LOCAL_CURATOR_URL`, `LOCAL_CURATOR_MODEL`, and optional API key from the existing private 0600 env file
4. **Only after exiting the interactive OpenCode harness**, launch the scheduled one-shot through the canonical EX/quiet-grace/idle gate. Prefer a **single bounded delayed transient timer/service** with no `Restart=on-failure` loop rather than reinstating a continuously retrying path watcher; check the host's actual systemd interface before staging. Do not run an unadmitted model request directly. An EX denial makes the probe **BLOCKED**, not permission to bypass the lease. `PROBE_BLOCKED` is an explicit failure, even though the model-only CLI's process exit is 0 to let EX safely release (no remote writes exist).
5. Read back exact structured output, each `usage.reasoning_tokens` (or UNVERIFIED), `finish_reason`, `output_chars`, validation status, source-bound fact hashes and old-vs-new decision; compare to previously recorded baselines for the **same five review IDs**. Record aggregate total/completion token and wall-time reduction. Missing reasoning detail does **not** prove the LiteLLM proxy disabled thinking. Include read-only available NInfer/LiteLLM request counters/log identities to bound other requests or caching; no raw prompts, private tokens or reasoning traces.
6. Verify no new Graphiti episodes, unchanged review-store files/state, four-episode production baseline, restored services/EX, and cleanup of only disposable probe units. Publish one sanitized evidence-only packet on current issue branch if exact-CAS authorization and safe scrub allow it; otherwise return a portable handback. No PR, merge or issue closure.

## Interpretation

- This is a **diagnostic**, not a rollout. A favorable result requires no malformed or truncated previously source-grounded model EMIT, no evidence-class/source/scope inflation, and material token reduction across the registered cohort. A changed exact quote may still be independently source-valid; compare actual utility, not only hashes.
- If `reasoning_effort=none` is rejected, ignored, or degrades source-grounded results, report that exact behavior; do not silently change the proxy or fall back to the baseline mode. A second carefully justified bounded variant can be centrally designed later if necessary.
- One small probe cannot certify global curation precision. The existing nine saved Graphiti facts remain **provisional quality claims** until independent human fact verdicts and sealed-holdout acceptance.
- The larger missing metric is **Graphiti's own extraction LLM token/time consumption**. Reconcile available read-only provider metrics and historical logs for the 07:06–07:12 interval by source if possible. If provider metadata cannot attribute the model calls to the Graphiti worker, mark that workload UNVERIFIED rather than treating the 277 s wall-time gap as wholly LLM time.
- The ~275 pre-admission systemd restart attempts are a separate process-wake efficiency problem. They incurred no accepted curator model calls. Avoid perpetuating this loop in final activation; prefer a bounded event/lease-release wake and check actual path semantics before any standing service change.

## Typed return

```text
RESULT=PASS|PARTIAL|BLOCKED
TESTED_SOURCE_SHA=<40 hex>
FINAL_REMOTE_HEAD=<40 hex>
CPU_TESTS=<counts/exits>
EX_ADMISSION=<readback>
PROBE_VARIANT=reasoning_effort:none max_tokens:768
MODEL_ONLY_CALLS=<0..5>
MODEL_ONLY_TOKENS=<prompt/completion/reasoning reported/missing>
MODEL_ONLY_TIME_MS=<measured>
FINISH_REASONS=<counts>
VALIDATED_DECISIONS=<case-by-case previous vs new without private text>
SOURCE_AUTHORITY_GUARDS=<exact>
ORIGINAL_5_CASE_BASELINE=<token/time denominator>
GRAPHITI_INFERENCE_USAGE=<observed attribution or UNVERIFIED>
REMOTE_WRITES=0
GRAPHITI_COHORT_EPISODES_BEFORE_AFTER=<9 / 9 or failure>
PRODUCTION_EPISODES_BEFORE_AFTER=<4 / 4 or failure>
GATE_AND_SERVICES_UNCHANGED=<evidence>
PUBLICATION=<evidence commit or private handback>
COMMAND_SHAPE_FRICTION=<GHDEV-10 ledger>
RECOMMENDATION=<retain default|propose opt-in change|blocked>
```

Keep the request count bounded and return one consolidated readback. No extra model replay campaign is authorized by this diagnostic.
