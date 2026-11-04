# Issue #81 — first consolidated Build campaign

This file is authoritative **for this delegated host campaign**, subordinate to live #81 and GHDEV-00..10. First run the short agent kickoff from Central, then work through this file end-to-end. The handoff is a **single meaningful campaign** with CPU, model/service and post-harness continuation phases, not a list of micro-issues.

## Identity / authority

- REPO_ID: `fvanevski/opencode-operational-schema-guard`
- ISSUE: `#81`; parent `#78`; predecessors `#79/#80` CLOSED.
- BRANCH: `issue/81`, pinned to the exact SHA in the kickoff; base `main@d7c32f503eaa4cf4c52bb055b434e0ac71b76f45`.
- PRIMARY_AGENT: **Build**, launched by operator in a fresh stock OpenCode process; do not relaunch OpenCode from inside itself.
- OBJECTIVE: create an independently inspectable **development + sealed-holdout quality packet** for the three-path benchmark; demonstrate one new authentic implicit multi-event source chain through the real local-model curator and disposable Graphiti persistence after automatic admission, preserving CLI/portal review and OpenViking safety. Do not attempt installed production/fresh-native acceptance in this campaign.
- SOURCE_REMOTE_UPDATE=forbidden; EVIDENCE_REMOTE_UPDATE=allowed; EVIDENCE_PACKET_REQUIRED=yes; EVIDENCE_ROOT=`docs/issue-78/evidence/81-qualification-first-v1`; no PR creation, merge, #81 closure or GitHub workflow/policy edits.
- MECHANICAL_REMEDIATION=allowed **inside a disposable worktree only**; SEMANTIC_PRODUCTION_REMEDIATION=forbidden. Bounded bench-only source/fixture adjustment is allowed to diagnose a concrete issue; return proposed patch and tests in the evidence packet, do **not** push product source. Production source changes or benchmark methodology alterations return to Central.
- LOCAL_SUBSYSTEM_REMEDIATION=allowed only for disposable `cur81_*` units, private scratch instrumentation and temporary portal binding; no canonical gate/config modification.

## A — Fetch and authenticated worktree

1. Verify live issue #81 and branch/base, then `git fetch origin issue/81 main`. Prove fetched `origin/issue/81` equals the kickoff's full SHA before checking local objects.
2. Allocate a fresh, previously absent disposable worktree, for example `/tmp/opencode/issue81-first-<head8>-build` (SW-01). Use `git worktree add --detach <path> <SHA>`, no reset/clean/rebase or `rm -rf`. Keep developer worktrees intact.
3. Record Node/stock OpenCode version, local provider/model/quantization, Graphiti MCP endpoint/group ID, active private 0600 env binding, existing gate source/config/exclusive lease topology, V2 plugin/loaded bytes and systemd wake structure. Read only; never print credentials. If a planned executable/interface differs from the source contract, diagnose and adapt **disposable** instrumentation without weakening authority.

## B — CPU benchmark and frozen evidence

1. Run `node --check docs/issue-78/v2-benchmark/evaluate.mjs`, `node --test docs/issue-78/v2-benchmark/evaluate.test.mjs`; run relevant unchanged #79 candidate and #80 curator tests only where current CI cannot prove the implicated host-bound behavior. Do not repeat entire previous #80 qualification campaign without a specific need.
2. Reuse the accepted #79 frozen samples **only as historical development controls**, with their original labels and explicit `reconstructed_from_sanitized_receipt` status where timestamps/fields were not captured. Test actual #75 selector and #79 capture logic on the same inputs. Do not relabel to improve scores.
3. Assemble a **representative new sanitized native event corpus** from bounded real stock-V2 coding activity (e.g. an ordinary error→fix→test sequence and implicit architecture decision). Seek at least 24 candidate/negative events spanning the categories in `v2-benchmark/README.md` and at least 4 meaningful multi-event evidence clusters, as the host can support; do not generate repetitive synthetic turns to hit a count. Include genuine low-value, duplicate, private-pattern (synthetic dummy payload), wrong-group, historical and contradiction negatives where observable. Use native event IDs/timestamps/actual source pointer identities and exact group/project/workspace scope. Distinguish `actual_live_native` from `reconstructed_fixture`.
4. Freeze `development.json` and a separate **sealed** `holdout.json` *before* model evaluation/tuning. Use a nonoverlapping held-out native session/source cluster split (target ~25% by **cluster**, not random events from the same source chain). Store SHA-256 externally and in a manifest before any scoring. Prepare evidence-proposed event/fact labels with case IDs and source anchors. **Do not claim a human-adjudicated holdout**: only operator can ratify labels/thresholds. Do not feed sealed holdout through model, selector scoring or Graphiti before that decision.
5. Record the Central targets proposal `docs/issue-78/v2-benchmark/targets.proposed.json`, hash, definitions and target-gate status (`central_proposal`), without editing its thresholds. Report developer-split baseline-vs-candidate confusion matrices, unselected high-value source cases, noise/privacy/wrong-group mistakes and source coverage; mark incomplete labels UNVERIFIED. Retain counts (TP/FP/TN/FN), denominators and category stratification.

## C — Development model + Graphiti integration (host service/GPU)

1. Use a **new disposable group** `cur81_dev_<suffix>` and private mode-0700 source/review/queue root, never `ghdev_gh_mcp` or the installed production group. Use actual native candidate events from the development split, including a source-supported implicit multi-event discovery #75 misses. Do **not** invent a native ID or manufacture a fact: the model is permitted to `DEFER`.
2. Bind to the existing authenticated loopback LLM provider and Graphiti MCP; no second daemon/scheduler/paid API. Record model/provider/quantization, documented model/request settings, the actual `usage` and measured time per curated cluster, and deterministic structured validation outcome. Use the existing #80 `model.mjs`, `ReviewStore`, `CandidateQueue`, `curator-cli.mjs`, and approved Python EX gate wrapper, not an alternate Graphiti write script.
3. Exercise prompt, tool and assistant source authority; duplicate candidate and test fail→fix progress; malformed/unsupported, conflicting or stale observations must `DEFER`, `SKIP`, or remain a proposal under existing validator. No authority inflation, private data capture, blind replay or direct in-process `add_memory` from Build. Do not adjust frozen labels, validator lexical/extractive thresholds or prompt merely to force EMIT.
4. Verify the #80 portal/CLI against new deferred and persisted review states on a private 0600 token and loopback-only listener. Reuse already accepted 35/35, 26/26 browser evidence for invariant controls; new browser tests should target the new cohort/real graph/difference, not retest the whole visual suite. Collect genuine source timeline, decision audit, graph node/edge distinction and no-replay action lockout.

## D — Genuine automatic post-exit gate (one campaign continuation)

1. Determine the actual shared EX/quiet-grace/idle interface first. Stage a **disposable user-systemd path+oneshot** wake using `docs/issue-78/v2-curator/activation/render-qualification.mjs` and existing `ghdev-curator*.in` templates, adapting `cur80_*`-only *disposable renderer checks* in a private scratch copy for `cur81_*` if needed; do not edit authoritative production gate or bypass that renderer's safety rules. Never touch the shared `mcp-mux.service` or OpenViking admission configuration.
2. Confirm pre-exit gate refusal while Build harness holds EX: record `FAIL_CLOSED`, zero model/Graphiti write. Arm the genuine event wake with sufficient private service logging and an automated post-exit result receipt. Do not execute the drain yourself while OpenCode is active.
3. Return `READY_FOR_POST_EXIT` only if the operator must exit the current Build harness to admit real inference. This is **the continuation of this same campaign**, not a new implementation design task. Once exited, the existing post-exit unit may process the queued dev cohort. Capture exact `approved → submission_unknown → queued → persisted` or typed unresolved states. **Never replay** a Graphiti write after a timeout; retain EX and report uncertainty until positive readback or separate operator-adjudicated evidence permits recovery. Do not stop shared services to accelerate cleanup.
4. Positive acceptance requires an authenticated `get_episodes` readback for the disposable group, matching episode UUID/name, exact native source index, at least one **real extracted** entity and relationship (not merely portal association) and zero duplicates, for an actual model-curated implicit cluster. If the model appropriately defers every case, report it as a measured deficit/constraint; do not substitute an operator seed for model-based acceptance.
5. When Graphiti is terminal and EX safe to release, stop/disable/remove **only** disposable `cur81_*` units, restore any temporary private host bindings, leave existing production services and old episodes untouched. A failed/unknown extraction must remain inspectable, not deleted to make cleanup green.

## E — Data, report and evidence publication

Prepare one compact reproducible packet at `docs/issue-78/evidence/81-qualification-first-v1`:
- `manifest.json` with actual exact source/host/runtime IDs, SHA-256 for **every** exported evidence artifact, timing/source authority, missingness; no self-hash claim;
- `benchmark-plan.md` with frozen case/cluster inventory, per-split SHA, category coverage, proposed labels/ratification status, Central target SHA, and methodology **without changing thresholds**;
- `development-results.json` (aggregates, confusion matrices, per-case IDs/flags; no private text), `curator-results.json` (model decisions, source-validations, tokens/time, type/scope, DEFER/SKIP), `graphiti-readback.json` (positive UUID/source-index/entity/edge or typed unresolved); optional sanitized screenshots and `portal-acceptance.md`;
- `host-identity.md` recording configured source/loaded plugin path, admission/gate/Graphiti/group readbacks and preserved production service state; `handback.md` exact results, known gaps, evidence classes, independent/source-vs-host limits, accepted #79/#80 reuse and `COMMAND_SHAPE_FRICTION`;
- any source corrections proposed in the benchmark tool as `source.patch` **not committed to source branch** without Central adjudication.

Scan **all** packet files/screenshots for tokens, credentials, private raw transcripts, unwarranted IDs/paths and forgotten helper files. Include a complete exported-file inventory and per-file hashes. Only if sanitized and authorized, publish **one evidence-only non-force fast-forward** commit to existing `issue/81`, verifying current branch CAS/head after push. If an API or branch permission blocks publication, preserve a portable scrubbed packet and return `EVIDENCE_PUBLICATION=BLOCKED`; never force or open a PR to publish it.

Avoid separate PRs or issue branches; Central will keep #81 implementation/qualification on the same branch, review any necessary substantive product fixes and target a **single #81 PR** after the later final installed acceptance.

### Stop/escalation

Continue autonomously through ordinary path/CLI/browser/package/fixture friction and local disposable component recovery. Stop only on: demonstrably stale Git/source authority, missing canonical EX safety, need to alter production gate/source/credentials or Graphiti group, real secret exposure requiring protection, unknown-submission risk that cannot be safely reconciled, need to alter rubric/holdout labels/thresholds, or a material code/architecture defect in the #75/#79/#80 product implementation. Do not weaken validators/tests, spoof real model or native observations, or expand into an unrelated service or GUI campaign.

### Typed handback

```text
RESULT=PASS|PARTIAL_READY_FOR_POST_EXIT|BLOCKED
ISSUE=81
SOURCE_SHA=<full exact Git SHA>
FINAL_REMOTE_HEAD=<full exact SHA>
STAGED_SOURCE_CHECKS=<count/exit>
CORPUS_DEV_HASH=<sha256>
CORPUS_HOLDOUT_HASH=<sha256, sealed, NOT SCORED>
CORPUS_LABEL_AUTHORITY=provisional|prior_accepted|operator_adjudicated
THRESHOLDS=central_proposal (not ratified)
BASELINE_VS_CANDIDATE=<TP/FP/TN/FN, denominators, category coverage>
MODEL_CURATOR=<real validated decisions/DEFER/SKIP, tokens, latency, no invented authority>
POST_EXIT_EX=<pre-exit exclusion and actual admitted transition or remaining continuation>
GRAPHITI=<remote UUID/source index/entity-edge readback or typed unresolved>
PORTAL_CLI=<focused observed results>
PRODUCTION_UNCHANGED=<actual post-run service/config evidence>
SOURCE_REMOTE_UPDATE=none
EVIDENCE_PUBLICATION=<commit SHA or BLOCKED>
REMAINING_GATES=<ratification/holdout/installed fresh-session acceptance>
COMMAND_SHAPE_FRICTION=<GHDEV-10 full requested/effective ledger>
NEXT=<Central adjudication of cohesive packet>
```

Return one comprehensive handback and a separately identified **post-harness automatic receipt** if the actual EX admission cannot occur until Build exits. Keep the campaign's identity and frozen artifacts stable across this operational continuation; do not request a new conceptual task breakdown.
