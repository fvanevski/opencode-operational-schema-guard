# Issue #81 — three-path quality and installed-memory qualification

**Source:** merged #79/#80 at `main@d7c32f503eaa4cf4c52bb055b434e0ac71b76f45`. This folder is **new #81 measurement infrastructure**, not a replacement selector, scheduler, Graphiti database, memory-platform implementation, or deployment permission.

## Cohesive campaign and authority split

**First qualification campaign** prepares the immutable benchmark/rubric, checks the #75 baseline versus #79 broad capture on the **same source events**, captures and scores genuine #80 model decisions on a development split, and exercises one realistic post-exit admitted Graphiti episode and operator review against a disposable group. It prepares a sealed holdout; it does **not** consume an unadjudicated holdout or change live production.

**Later final campaign** uses an operator-ratified frozen holdout, publishes the comparative precision/recall/latency results, controls reversible activation against the merged implementation and actually installed config, and proves natural source-attributed recall in a genuinely new stock-V2 client/native session with OpenViking context present. Do not characterize a disposable model test as fresh-client production acceptance.

The repository source is Central-owned. The local Build agent owns actual host/runtime observations, native sample acquisition, data sanitization, the disposable post-exit service, test execution and complete evidence publication. A newly demonstrated material product defect returns for Central correction; routine harness, fixture, browser, unit rendering and private service-interface friction belongs to Build within its designated disposable scope.

## Evaluator semantics

`evaluate.mjs` imports and executes the current **actual** `selectUserDecision` and `selectCompletedTest` (#75) and `fromPrompt`, `fromTool`, `fromFinishedTurn` (#79). It does **not** classify cases through precomputed guesses. It verifies #80 decisions using `validateModelDecision` for model-origin records and `validateDecision` for other review-origin records.

- The **source event** is not a durable fact. `candidate_recall` is *event-selection recall*, not durable precision.
- A `curation` record is not terminal Graphiti persistence. `remote_episode_uuid`, entity/edge and source-index facts require independently captured group-scoped host readback. The JSON evaluator only reports local validation and the supplied terminal state as unverified observations.
- Model decisions may only receive source-grounded fact credit after separate **human** `fact_verdicts` are supplied under an `operator_adjudicated` corpus. A model's opinion is not a ground-truth label.
- `null` means **UNVERIFIED**, not zero or PASS. The evaluator never assesses fresh native session recall from an offline fixture.
- `privacy` and `wrong_group` selected candidates are explicit guardrail failures. Keep such cases sanitized, using synthetic dummy-looking negative tokens where needed; never publish real credentials.
- A `holdout` comparison requires all labels human adjudicated, **external SHA-256 pinning** of both corpus and targets, and targets `status=operator_ratified`. The evaluator refuses a self-asserted, unpinned or partially labelled holdout.

### Corpus JSON schema, v1

The input JSON file is private/sanitized. Required shape:

```json
{
  "schema_version": 1,
  "split": "development",
  "label_status": "provisional",
  "scope": {
    "group": "cur81_dev",
    "project": "qualified_project",
    "workspace": "/tmp/opencode/safe_workspace"
  },
  "cases": [{
    "id": "dev-implicit-001",
    "category": "implicit",
    "source_type": "prompt",
    "source_locator": "sanitized native event and privately anchored source receipt",
    "native_event": {
      "sessionID": "ses_native",
      "messageID": "msg_native",
      "timestamp": "2026-11-03T23:00:00.000Z",
      "prompt": {"text": "The previously confirmed parser fails on nested keys; the bounded change must preserve the existing API."}
    },
    "label": {"valuable": true}
  }]
}
```

`source_type` is `prompt`, `tool`, or `assistant`. Use the **actual qualified V2 event fields**; an assistant requires `status=completed`, `role=assistant`, stable message ID and `text`, while a tool requires its actual command/status/result or write/edit file-operation fields. Do not invent a native event ID, timestamp, output, or source anchor. For historical sanitized #79 samples that omit native timestamps, use a clearly documented **reconstruction fixture** only for development-selector comparisons; never present the reconstructed timestamp as an observed native timestamp. A `label` can be null during draft collection; scoring remains UNVERIFIED until every event is labelled. `source_locator` is a sanitized trace pointer, not private transcript contents or an unredacted path.

Categories: `direct`, `implicit`, `error_fix`, `tool`, `negative_finding`, `chatter`, `duplicate`, `privacy`, `wrong_group`, `conflict`, `historical`. Scope can be overridden on a case to test fencing (it must not be selected as part of this target scope); `capture_admitted=false` tests opt-out. All reported case ids are source-unique. A valid corpus is not automatically a human-adjudicated gold set.

### Curator observations JSON schema, v1

```json
{
  "schema_version": 1,
  "records": [{
    "cluster_id": "<SHA256 of sorted newline-joined real captured event IDs>",
    "source_case_ids": ["dev-implicit-001"],
    "source_event_ids": ["<exact captured event ID for qualification scope>"],
    "origin": "model",
    "decision": "EMIT",
    "reason": "source-grounded",
    "facts": [{
      "assertion": "<exact contiguous source excerpt 25..450 characters>",
      "kind": "implementation",
      "source_refs": ["opencode:ses_native:message:msg_native"],
      "temporal_status": "observed"
    }],
    "prompt_tokens": 0,
    "completion_tokens": 0,
    "model_ms": 0,
    "post_exit_ms": 0,
    "terminal_state": "persisted",
    "remote_episode_uuid": "<uuid if independently confirmed>"
  }]
}
```

Replace the placeholders with **readbacks**, never guessed values. If the separately captured disposable model qualification uses a different group than the frozen corpus, put its actual `scope` (group, project, workspace) on the top-level **observations** object; project/workspace must agree with the corpus, and the group must be the matching `cur81_dev_<8-hex>` disposable group. Each observation then **must** include `source_event_ids` of the actual qualification-group capture, which are recomputed and matched; the original frozen corpus bytes and labels remain untouched. Missing, mismatched or production-group event identities fail closed. `origin=model` enforces the exact-extractive #80 adapter. `fact_verdicts` with boolean `grounded/useful/authority_correct/scope_correct` and independent `evaluator_id` belong only in a truly operator-adjudicated corpus. If a record has no actual model usage, omit tokens or latency fields: do not write zero. Model DEFER/SKIP and service failures are important outcomes and must remain in the dataset. Use `ReviewStore`/queue/Graphiti source identities, not text similarity, to associate host receipts.

### Commands

From an authenticated exact-head checkout (requires Node available):

```bash
node --test docs/issue-78/v2-benchmark/evaluate.test.mjs
node --check docs/issue-78/v2-benchmark/evaluate.mjs
node docs/issue-78/v2-benchmark/evaluate.mjs \
  --corpus /ABSOLUTE/PRIVATE/development.json \
  --targets docs/issue-78/v2-benchmark/targets.proposed.json \
  --observations /ABSOLUTE/PRIVATE/development-curation.json \
  --out /ABSOLUTE/FRESH/PRIVATE/summary.json
sha256sum /ABSOLUTE/PRIVATE/development.json
```

Omit `--observations` until the actual admitted curator run has generated accepted observations. Output uses `wx`, never overwrites an existing artifact. Pass an **absolute** target path too only if the live CLI requires it; the current evaluator accepts a normal repository-relative `--targets`. For holdout, add `--expected-corpus-sha256` and `--expected-targets-sha256` using immutable externally verified values, and require a separately ratified targets file. A `central_proposal` is **not ratified** merely because its SHA was recorded.

### Pre-result target proposal

`targets.proposed.json` is a **Central preregistration proposal**, not an approved holdout release. It preserves #81's proposed **candidate recall ≥85%**, **grounded durable precision ≥90%**, zero observed secret/wrong-group/false-verified claims, semantic recall ≥80%, installed context p95 ≤300 ms and post-exit terminal p95 ≤900 s. If data shows these targets are infeasible, report that; do not retroactively change targets or dilute evidence. Never count an unresolved terminal job as an observed fast success. For p95, distinguish number of samples and censored/unresolved jobs.

### Historical controls and evidence

Reuse without altering:
- `docs/issue-78/evidence/79-native-v2-20261103/host-sample-frozen.json` (8 event summaries, previously accepted valuable labels).
- `docs/issue-78/evidence/79-capture-complete-v1/supp-sample-frozen.json` (11 sanitized host events including tool/file and privacy negatives).
- `docs/issue-78/v2-candidate/pilot-cases.json` (synthetic regression control, **never** human holdout).
- `docs/issue-78/evidence/80-first-integration-v1/` and `80-closure-v1/` (real prior model/Graphiti/portal receipts, not evidence that new #81 samples already passed).

#81 benchmark source files may be adjusted by Central for source-confirmed bugs. Do not change the accepted #75 selector, #79 capture, #80 deterministic validator, admissible lease, OpenViking/plugin, frozen source labels or threshold gates simply to obtain a positive score.

## Evidence boundaries

Keep real raw event text, tokens, model responses, secrets and host config outside Git. Stage only a sanitized, manifest-covered packet and external SHA-bound corpus/label/targets identities; scrub model excerpts and private paths. Publish the exact aggregate confusion matrices with numerator/denominator, the case-level IDs/outcomes, model/provider/quantization, duration/token summaries, group-scoped Graphiti episode/edge/source-index receipts, and typed failure/DEFER counts. Unsupported metrics stay `UNVERIFIED`; do not mark the campaign PASS by omitting weak cases. Preserve OpenViking and legacy #75 evidence, and record every CLI/host interface observation rather than silently rewriting the tool contract.
