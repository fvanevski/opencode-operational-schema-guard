# Issue #81 — consolidated capture-coverage closeout (Central → local Build)

**Controlling authority:** live issue #81 and this exact-head branch, the ratified benchmark identities, and GHDEV-00..10. This is one host campaign, not a new PR, new issue, or broad model/Graphiti campaign. A source-level policy change and a fail-closed capture diagnostic have **already been staged by Central**. Do not redesign either.

## A. Immutable baseline and scope

- Repository: `fvanevski/opencode-operational-schema-guard`; branch `issue/81`; base `main@d7c32f503eaa4cf4c52bb055b434e0ac71b76f45`. Authenticate the exact kickoff SHA by Git fetch before materialization.
- The first #81 campaign and current human-adjudicated holdout packet are at `docs/issue-78/evidence/81-adjudicated-quality-v1/` (evidence commit `87bdc7320c2e291e55c882bef1b190b501644886`). Human attestations stay private; do not print, rewrite, regenerate, or publish private source texts.
- Original frozen development corpus, 57 cases: SHA256 `22ae11e64a7a9c443d6f13a79c363115a28b43a27620e5383449bfe32d9fb5b4`.
- Original holdout corpus, nine cases: SHA256 `f904411e51d0bd9674b7f756f3df5bf44452ca8f63362d75102ceb9df677fce4`.
- Original ratified targets: proposal SHA256 `17ffb60515f5f96f2d546fd3abf951d0bc008325e38d83145ec4f75a8c76f049`; signed ratification SHA256 `ced9b984b17c1131984184b1bd9c666df3bdca9f20a3a067ee79763f4a05f3d4`.
- Acceptance is **not green**: candidate useful-event recall 27/37 = 0.730 (development) and 3/6 = 0.50 (holdout), against unchanged predeclared threshold ≥0.85. Durable grounded precision 9/9 and 1/1 passed, but natural fresh-client recall and installed p95 still UNVERIFIED.
- The holdout has already been exposed and scored. Retain it as a **fixed diagnostic/regression corpus**, never rename an outcome-aware rerun "blind holdout" or alter its labels/targets to force PASS. The exact pre-tuning result must remain visible beside any post-correction replay.

### Authoritative inference-profile decision (operator 2026-11-04)

`chat-fast` is the **non-thinking** alias. Its effective LiteLLM alias must set `extra_body.enable_thinking=false` and the curator MUST NOT attach `reasoning_effort`, including `none`. Its output `max_tokens` may be bounded explicitly. **Thinking required** → separately select `chat-review` or `chat-audit` with thinking enabled and permitted `reasoning_effort` (including `low` for review); never switch `chat-fast` thinking back on.

The previously provided local YAML shows `chat-fast.enable_thinking=false`, `drop_params=false`; an earlier host epoch had `enable_thinking=true` and produced 3× 400 "reasoning_effort conflicts with enable_thinking". These are different epochs, not a runtime-independent NInfer contradiction. The new `model-policy.mjs`, `model.mjs`, and tests implement this scope. Do not make a global NInfer setting or rely on alias as an immutable security enforcement boundary.

## B. CPU/source verification and evidence audit

1. Fetch `origin/issue/81` and `origin/main`; assert exact SHA from kickoff. Make a collision-safe detached disposable worktree, do not reset/clean existing developer trees.
2. Run Node 22+ `--check` + focused `--test` for:
   - `docs/issue-78/v2-benchmark/{diagnose-capture,evaluate,adjudicate,stage-holdout}.test.mjs`;
   - `docs/issue-78/v2-curator/{curator,model-policy,efficiency-probe}.test.mjs`;
   - relevant unchanged #79 `v2-candidate/*.test.mjs` source/ID safety cases.
   These are **actual host tests** at the exact current head, not retroactive credit from earlier 66/66 tests. Run other project-required static/verify checks where they apply; trusted final Verify requires a real PR and is reserved for Central's single later PR.
3. Inspect effective currently loaded LiteLLM `chat-fast` settings read-only (source path/mtime/hash, actual process loaded-config epoch if provable) and the alias-to-NInfer outbound parameters available in read-only logs/receipts. Record that the user-provided file and effective service configuration are **separate evidence**. Never infer backend think suppression solely from the alias name; no new model calls are necessary.
4. Run `node docs/issue-78/v2-curator/curator-cli.mjs validate-config` using a **private disposable env** with `LOCAL_CURATOR_MODEL=chat-fast` and no `GHDEV_CURATOR_REASONING_EFFORT`. Test optional `GHDEV_CURATOR_MAX_TOKENS=768`; verify emitted model-options JSON has maxTokens only. Verify a deliberate `GHDEV_CURATOR_REASONING_EFFORT=none` configuration fails **before inference**. Verify explicitly selected `chat-review` or `chat-audit` permits a supported thinking effort; no GPU or live client required for this check.
5. If the running `chat-fast` alias differs from the operator-authoritative `enable_thinking=false`, reconcile **only** the existing alias config through a scoped backup/edit/reload/parameter readback when no active EX/serving client is disrupted. Do not change other aliases, global proxy settings, NInfer boot flags or credentials. If uncertain about safe reload or loaded-config identity, retain production and report the exact blocker; a matching file on disk without loaded-service proof is not PASS.
6. Verify the published #81 packet's manifests/receipt hashes and the arithmetic addendum below. Do not edit the immutable evidence files or their manifest in place. The holdout worker reported 2,913 prompt and 1,677 completion, with 1,454 **reasoning included within completion**. **Correct total = 4,590**, not 6,044. Record the original wording as historical and use the corrected number in the new additive audit. Graphiti extraction-model costs remain UNVERIFIED without per-worker provider attribution.

## C. Exact 13-case capture miss diagnosis (no inference)

1. Open the two **original private frozen corpus files** and verify their exact SHA256 values before processing. Verify published, human-adjudicated `development-score.json` and `holdout-score.json` source identities against the same originals. No copying raw source text or secret-bearing inputs into Git.
2. Run Central's new offline `diagnose-capture.mjs` once per split (see `--help` not implemented; literal shape below). It replays **the actual accepted #75 selector and #79 capture adapters**, compares every captured/missed row against ratified published score rows, and emits source-safe gate/field-presence summaries. It does not alter any source or Graphiti/LLM state.
   ```bash
   node docs/issue-78/v2-benchmark/diagnose-capture.mjs diagnose \
      --corpus /ABSOLUTE/PRIVATE/development.json \
      --expected-corpus-sha256 22ae11e64a7a9c443d6f13a79c363115a28b43a27620e5383449bfe32d9fb5b4 \
      --score /ABSOLUTE/WORKTREE/docs/issue-78/evidence/81-adjudicated-quality-v1/development-score.json \
      --out /ABSOLUTE/PRIVATE/FRESH/development-miss-diagnosis.json
   ```
   Repeat once for holdout using its original SHA and `holdout-score.json`. Output path must be **absent** (create-exclusive, 0600). Never print raw corpus or native events into logs.
3. Independently inspect the **13 explicit missed IDs** in private: development `dev-median-testfail`, `dev-median-testpass`, `dev-sum-test`, `dev-c81-prompt`, `dev-c81-fetch`, `dev-c80-prompt`, `dev-c80-survey`, `dev-c75-prompt`, `dev-dup-b75-1`, `dev-conflict-keep`; holdout `ho-prime-test`, `ho-gui-prompt`, `ho-gui-read`. For each identify the **actual producer's** native session/call/message identity, source event status/inputs and bounded metadata, admission/scope, adapter gate and rejection, whether the exclusion is an intentional safety/boring-read veto, whether a required native field is truly absent, and whether a production adapter invariant is violated. Distinguish independent `tool status` from independently verified shell exit/code. Avoid source-unknown claims of validated fixes.
4. Interpret `reason_code` cautiously. `explicit_precondition` records identify a visible gate; `shape_indicator` / `needs_private_path_inspection` / `unresolved` require more private source inspection. The prior accepted #79 native pilot observed `result.output.exit` and captured two tool outcomes. **Do not assert stock V2 never exposes shell exit/output universally**. The current corpus could be a different native event shape, incomplete retrieval or intentional filtering.
5. Create a small **requirement → source field/gate → actual miss → accepted privacy/authority constraint → proposed narrow correction → focused RED/GREEN test** matrix. Consolidate repeated root causes into **one coherent adapter patch proposal**, not 13 microtasks. When evidence shows a real production adapter defect, produce a minimal `source.patch` and directly runnable focused tests in the private disposable worktree; **do not push substantive source changes**. Central implements and adjudicates the diff and stage tests at exact head.
6. Recalculate expected useful-event coverage for each **defensible fix** only as a *counterfactual* on original ratified cases, with clearly stated numerator and unsafe-exclusion denominator. Do not mark a fix PASS before actual source implementation and tests. Development ≥85% requires ≥32/37; the nine-case exposed holdout requires ≥6/6 under its six positive labels. Some labels may correspond to intentionally unavailable or unsafe source; report an inherent coverage tradeoff rather than loosening provenance standards.

## D. One complete evidence handback; PR count remains zero

Prepare `docs/issue-78/evidence/81-capture-closeout-v1/` with:
- `manifest.json` with SHA-256 of every other published artifact, immutable source/target/label identity and exact Git source;
- `recall-miss-matrix.json` with **only sanitized case IDs**, categories, per-gate reason, classification certainty and outcome counters;
- `root-cause-report.md` distinguishing missing native data, safe intentional exclusions, adapter code defects and unknowns, plus one consolidated possible fix with regression mapping;
- `profile-authority.md`: operator-authoritative no-thinking policy, actual loaded alias evidence and `validate-config` results, default-vs-effort conflict test; no raw credentials/env;
- `quality-evidence-addendum.md`: corrected 4,590 holdout tokens, unchanged 73%/50% failures and provenance boundaries; extraction cost remains UNVERIFIED;
- `cpu-checks.md`, `handback.md`, optionally a narrowly bounded `source.patch` with private raw literal snippets **scrubbed** or a functional pseudopatch if it cannot be published safely.
Use per-file write-once and scrub. Omit raw native excerpts, operator worksheet bytes, transcript contents, private absolute paths, tokens, credentials, actual reasoning traces. Confirm the output actually enumerates all 13 misses and reconciles 10+3 categories. Preserve published `81-adjudicated-quality-v1` unchanged.

GitHub publication: **one evidence-only CAS/FF commit to existing `issue/81`** if safe, no product-source push by Build, no new branch, PR, merge or issue closure. Do not begin a new GPU/Graphiti campaign merely to diagnose input capture. CPU + read-only host inspection is sufficient.

### Stopping and autonomy

Build may resolve normal terminal/Node/fixture/process/config-path problems, including a bounded reversible correction to the **single effective chat-fast alias** when proven divergent from operator authority and safe to reload, then verify by readback. It may prepare local scratch code and tests to demonstrate a production capture bug but must not quietly push semantic source edits. Escalate only if source authenticity is stale, the configured external group/EX boundary changes materially, an unresolved remote Graphiti write exists, required ratified source is missing, or an adapter fix demands changing authority/safety standards. Do not invent confidence.

## Typed return

```text
RESULT=DIAGNOSIS_COMPLETE|PARTIAL|BLOCKED
TESTED_EXACT_HEAD_SHA=<full>
FINAL_REMOTE_HEAD_SHA=<full>
CPU_TESTS=<count/exits by suite>
CHAT_FAST_POLICY=NONTHINKING_OWNER_CONFIRMED|CONFIG_DRIFT|UNVERIFIED
CHAT_FAST_REQUEST_FIELDS=<none reasoning_effort; bounded max_tokens if used; actual effective readback>
THINKING_ALIASES=<chat-review/chat-audit preflight evidence>
DEV_FROZEN_SHA=<pin>
HOLDOUT_FROZEN_SHA=<pin>
RATIFIED_SCORES=dev 27/37; holdout 3/6 (no relabel)
MISSED_CASES=10 dev + 3 holdout; classification counts and cases
CAUSE_GROUPS=<admission/scope/native fields/intentional filters/real bug/unknown>
DEFENSIBLE_FIX=<minimal consolidated source diff+tests or none>
EXPECTED_COVERAGE_AFTER_FIX=<counterfactual, not PASS>
CORRECTED_HOLDOUT_CURATOR_TOKENS=4590
GRAPHITI_EXTRACTION_COST=UNVERIFIED unless worker-attributed
PRODUCTION_NONMUTATION=<proof>
EVIDENCE_COMMIT=<40hex|BLOCKED>
PR_CREATED=no
COMMAND_SHAPE_FRICTION=<GHDEV-10 literal requested/effective schema>
NEXT=Central independent source fix adjudication then single #81 PR
```
