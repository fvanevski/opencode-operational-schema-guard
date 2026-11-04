# Issue #81 — second consolidated qualification campaign

**Central source authority:** this file, the exact `issue/81` head supplied by Central's kickoff, and live issue #81. **Goal:** finish operator-ratified source/fact quality and a genuinely post-exit *sealed holdout* three-path comparison, with source-backed Graphiti receipts and a review-ready evidence packet. This is one cohesive campaign; the post-exit continuation belongs to the same work item.

## Source and safety boundary

- Current production `main@d7c32f503eaa4cf4c52bb055b434e0ac71b76f45`; new #81 work remains on `issue/81`. Do **not** deploy any candidate branch source, change production Graphiti group, delete prior episodes, mutate the EX gate, launch a second LLM server, or open/multiply PRs.
- Accepted previous quality: 57 development cases, provisional recall #75 3/37 vs broad 27/37 (73%, below 85% proposal). 9-case holdout is externally pinned and unscored. Prior EX-admitted cohort: 13 decisions, 9 Graphiti persists, zero unresolved, 9 facts still without independent usefulness/authority verdicts.
- Existing post-exit optimizer probe: 5/5 valid model decisions, `none/768`, 7,991 total tokens and 2.394 s vs original same-five 13,398 and 22.405 s. Three new assertions differ or became EMIT and require actual source-grounded human evaluation. No additional exploratory model replay is needed.
- The **root factual blocker** is independent human label/fact judgment. A local AI may assemble/source-link and display proposed labels and excerpts, but MUST NOT decide or sign human verdicts, claim to have personally ratified thresholds, or score the sealed holdout before the operator acts.
- Maintain baseline/thresholds without reweighting provisional misses; missing shell stdout/exit in stock V2 cannot be invented. Correct actual source-backed defects only after Central reviews them.

## Frozen authority and local-only files

| Item | Pinned original identity |
|---|---|
| Development source corpus | `/tmp/opencode/issue81-qual/corpus/development.json`, 57, SHA-256 `22ae11e64a7a9c443d6f13a79c363115a28b43a27620e5383449bfe32d9fb5b4` |
| Sealed holdout source corpus | `/tmp/opencode/issue81-qual/corpus/holdout.json`, 9, SHA-256 `f904411e51d0bd9674b7f756f3df5bf44452ca8f63362d75102ceb9df677fce4` |
| Pre-result target proposal | `docs/issue-78/v2-benchmark/targets.proposed.json`, SHA-256 `17ffb60515f5f96f2d546fd3abf951d0bc008325e38d83145ec4f75a8c76f049` |
| Development curator observations | `docs/issue-78/evidence/81-qualification-post-exit-v1/observations.json`, 13 decisions / 9 facts; trace the earlier report to the correct `81-qualification-post-exit-v1/graphiti-readback-v2.json` receipt, not the historical typo `81-qualification-first-v1/graphiti-readback-v2.json` |
| Efficient model probe | Private `/home/filip/.local/state/ghdev-graphiti-issue81/qual81/probe-out.json`, model-only, five previously staged reviews |

If frozen source bytes are absent, verify the exact original byte-identical backup. **STOP rather than fabricate/reconstruct a new corpus with a reused SHA.** Use a new private `0700` campaign root and `0600` evidence files. Do not put raw native events, secrets, model thinking, or unsigned human worksheets in Git.

## A. CPU preflight + close prior efficiency result

1. Fetch `origin/issue/81` and `origin/main` first. Prove the fetched branch matches the exact kickoff SHA; use a unique disposable detached worktree. Do not reset or clean another agent's worktree.
2. Run: `node --check` and `node --test` for `v2-benchmark/{evaluate,adjudicate,stage-holdout}.test.mjs`, `v2-curator/{curator,model-policy,efficiency-probe}.test.mjs`, and existing relevant #79 capture tests. Run complete trusted Actions only if separately necessary; avoid repeating previously qualified #80/Graphiti GUI campaigns.
3. Independently read the original five-case `probe-out.json`, validate model/provider usage and compare three different EMIT assertions against their exact sources. Capture **fact quote, source ID, evidence class, temporal status, useful?** per case, in a private operator worksheet. Do not print private source excerpts to remote/public logs. Analyze NInfer request IDs after 883, LiteLLM active `drop_params=false` readback and 0-reasoning metadata if available; mark effective forwarding `UNVERIFIED` if only inferred. Confirm `ghdev_gh_mcp` still has exactly four baseline episodes and `cur81_dev_ce555621` exactly nine. Do not rerun the five-call probe.
4. Prepare a sanitized immutable `efficiency-final.json` containing 5 case IDs, aggregate usage/caching/latency, decision validity, evidence-reviewed conclusion and proxy-forwarding status. If semantic quality is not accepted, leave new `GHDEV_CURATOR_*` overrides unset. `model-policy.mjs` and `curator-cli.mjs validate-config` provide an opt-in group-specific experiment only, not a global LiteLLM/NInfer setting.

## B. Human adjudication + target ratification (before holdout scoring)

1. Check original corpus and proposal SHA-256 byte-for-byte. Prepare two **private** worksheets with `adjudicate.mjs prepare` using `--corpus`, `--expected-corpus-sha256`, `--out`; for development also use `--observations` for all 9 persisted model facts. Generate `--target-out` from original `--proposal` and `--expected-proposal-sha256` once. None of these commands score the holdout.
2. Show the operator the **complete 57+9 case table** (source type, source locator, direct/implicit/history/negative/secret flags, proposed valuable label and actual private source), together with the 9 persisted dev facts (actual verbatim assertion, source refs/class, graph episode/node/edge). The operator reviews and approves/corrects each case's `valuable`, marks `source_checked=true`, and independently gives each fact `grounded/useful/authority_correct/scope_correct` with a specific real `evaluator_id`. Build may format/edit JSON mechanically **only after** the operator's explicit decisions; do not sign for the operator.
3. The operator explicitly ratifies the **unchanged** threshold proposal, or declines. Operator sets both worksheet and target attestation statuses to `OPERATOR_RATIFIED`, enters their actual identifier/time, and acknowledges the prescribed human confirmation strings. Preserve the original frozen corpus and original target proposal bytes. Compute separate SHA-256s of the completed *private* label and ratification files; keep the timestamp and confirmation evidence outside Git. If approval/ratings cannot be obtained, return `AWAITING_OPERATOR_RATIFICATION` with the ready-to-review packet and no model/holdout work.
4. Score **adjudicated development** using `adjudicate.mjs score` with original corpus+digest, operator worksheet+digest, original proposal+digest, signed targets+digest, and the verified `observations.json` derivative. Confirm 9 source-matched fact verdicts, 9 remote episode receipts, no privacy/wrong-group promotion, and genuine quality numerator/denominator. The code computes the in-memory adjudicated view; it never edits the frozen source bytes.
5. Run `adjudicate.mjs score` on the human-ratified *holdout* **without observations** only after operator signature and before post-exit model inference. That is the sealed **selection** comparison (baseline/candidate); curator durability will be `UNVERIFIED_NO_MODEL_OBSERVATIONS`, not an invented PASS. If the goal or integrity contract fails, stop before any Graphiti processing.

## C. Actual post-exit holdout curator, one disposable cohort

1. Stage the nine exact, already-ratified holdout cases through `stage-holdout.mjs stage` into a **new** group `cur81_holdout_<8 hex>`, under an **absent**, private `0700` state directory. Supply original source SHA and operator label/target attestation digests. This stage command replays actual #79 capture adapters, records exclusions and stages only strong source IDs. It does not call Graphiti or infer facts. Verify candidate identities and privacy/scope exclusions.
2. Bind the accepted `curator-cli.mjs` to a **new disposable** `cur81_holdout_*` group and retained loopback services. For this holdout qualification choose the previously tested curator-only `none/768` policy **only if** the three changed EMIT excerpts passed the operator's source/utility judgment and NInfer observed settings agree; otherwise use unchanged default. Run `node curator-cli.mjs validate-config` with the final exact env file **before** arming the service. No changes to production LiteLLM config or global model flags.
3. Stage a **single delayed user-systemd one-shot with NO restart loop** using the existing `post-exit-drain.py` Python EX gate and the current `curator-cli.mjs drain`. Keep the Python wrapper's 30-second quiet grace and its late remote reconciliation; do not bypass an occupied lock or forcibly stop shared Graphiti. Allow sufficient bounded max-seconds for asynchronous extraction. Then **exit the active OpenCode Build harness** and observe the run from an ordinary terminal. This is the operational continuation of this same handoff, not a fresh design phase.
4. Capture actual worker model-call counts, tokens including missing reasoning metadata, prompt/completion/cache, p50/p95 and elapsed admission→readback latency; group `get_episodes` UUID/name/source index, extracted nodes/linked edges (not simply portal preview), no replay/unknown write, source-class and group fencing. Record any DEFER/SKIP/failed-extraction without forcing a model EMIT to raise recall. Do not retry a remotely ambiguous write or call `add_memory` directly.
5. After the remote work reaches an inspectable safe terminal state, stop/remove only the disposable `cur81_holdout_*` unit(s), preserve private state and the original 9 dev / 4 production episodes, and collect the private Graphiti/source readback. If the run holds EX due to unresolved remote writes, return that evidence **without** a forced exit, replay or cleanup-for-green.
6. Add the new holdout observations (if any) to a separately versioned private observations file. Generate a **new private** operator fact worksheet bound to the same frozen source/digest and new observation/episode identities. Preserve the original case labels from the operator's pre-run worksheet; the operator only supplies/ratifies new fact-level verdicts, not revisions of source truth post-outcome. Re-pin the final worksheet; score holdout with `adjudicate.mjs score` using original source and target hashes and the new observation receipt. Any rewritten outcome-responsive labels or thresholds INVALIDATE holdout acceptance. If source/readback is insufficient, report the relevant metric UNVERIFIED.

## D. Close the measurement loop and produce one evidence packet

- Compute the three-path comparison on identical adjudicated cases, with real TP/FP/FN/TN and denominators; reported fact precision only for human-judged, remote-bound EMITs; category confusion (implicit, historical, tools, privacy/wrong group); model DEFER/SKIP, duplicate/graph growth, token costs, and actual p50/p95. Report the final 85% candidate and 90% fact proposals as PASS/FAIL/UNVERIFIED, not tune them. A 9-case holdout is a small diagnostic sample; declare this limitation.
- Confirm source accuracy and protocol parity: `source → captured event → post-exit model → approved/DEFER → verified episode → extracted graph relationship`. Compare the no-thinking and default case judgments; don't count benign metadata nodes as durable useful facts. Include a bounded read-only portal/CLI status check only for the new cohort, reusing previously accepted #80 browser controls.
- Identify Graphiti's **separate extraction-model token/time** via actual provider logs if possible. If request metadata does not unambiguously identify the worker, report `UNVERIFIED` without allocating the old ~277 s wall gap to LLM time. Include any new process-wake anomalies, avoiding >200 pointless retry loops.
- Required packet `docs/issue-78/evidence/81-adjudicated-quality-v1/`: `manifest.json` (all exported bytes except self; trusted SHA pins), `quality-report.md`, `development-score.json`, `holdout-score.json` if scored, `efficiency-final.json`, `graphiti-holdout.json`, `native-gap-analysis.md`, `host-identity.md`, and `handback.md`. Do **not** publish original private corpora, raw fact strings/labels, tokens, host usernames, prompt history, unredacted test commands, operator identifiers or credentials. Aggregate results and anonymized event IDs are acceptable.
- Allowed GitHub mutation is **one evidence-only fast-forward commit** to `issue/81`, after checking remote exact head and verifying scrub/hashes. No product-source edits, new issue, PR, merge or closure. Do not rewrite source after tests; return a bounded source defect/patch to Central for substantive repair.
- Candidate recall below 85% is a **real negative result**. Distinguish native host capture not exposing shell stdout from correctable #79 adapter bugs. Do not relax accepted source admission/authority or massage labels. A confirmed product code defect goes back to Central with input↔output proof and minimal regression proposal.
- A successful packet is **review-ready evidence**, not proof of installed post-merge fresh-native session acceptance. Central will form one #81 PR and then perform the separate merged-main deployment/fresh-process gate, already designed in `POST_MERGE_FRESH_NATIVE_PLAN.md`.

## Autonomous host authority and stop conditions

Build may repair disposable systemd unit syntax, private directory permissions, tokenization, benchmark local fixture paths, source locator display, browser bindings, environment-variable routing, and evidence scrubbing within the allocated scratch root. Do not create new model services. CPU-only work (data preparation, hashing, model policy tests, source regressions) runs with the interactive harness active; GPU/LLM work runs **only** after the EX gate admits post-harness. Prefer one one-shot for the whole holdout, not an agent inference call per fixture.

Stop/return only when (a) operator declines/has not ratified, (b) original frozen hashes fail, (c) admitted EX or source authority is unverifiable, (d) an ambiguous Graphiti write cannot be reconciled, or (e) production/API/provenance standards need substantive revision. Report insufficiency truthfully. Avoid side-quests.

## Typed handback (with GHDEV-10 canonical command ledger)

```text
RESULT=PASS_REVIEW_READY|PARTIAL|AWAITING_OPERATOR_RATIFICATION|BLOCKED
SOURCE_SHA=<40-hex>
FINAL_REMOTE_HEAD=<40-hex>
DEV_FROZEN_SHA=<original pinned sha>
HOLDOUT_FROZEN_SHA=<original pinned sha>
OPERATOR_DECISION=ratified|declined|pending; exact private hash receipts
RATIFIED_TARGET_SHA=<digest of signed private ratification, unchanged proposal>
CPU_TESTS=<exact-head suites/counts/exit codes>
PRIOR_PROBE=5/5 baseline comparison; 3 changed EMIT source verdicts
PROVIDER_FORWARDING=PROVEN|UNVERIFIED; relevant direct evidence
DEV_SCORE=<TP/FP/TN/FN; quality denominators; PASS/FAIL>
HOLDOUT_STAGE=<new group, admitted candidate count/exclusions>
EX_ADMISSION=<gate, quiet grace, terminal/reconcile>
HOLDOUT_MODEL=<decision counts, model calls/tokens/reasoning metadata>
HOLDOUT_GRAPHITI=<episodes+nodes+edges, sources, duplicates, unknown status>
HOLDOUT_SCORE=<TP/FP/TN/FN; useful durable facts; FAIL/UNVERIFIED where applicable>
GRAPHITI_EXTRACTION_COST=<attributed source or UNVERIFIED>
PRODUCTION_UNCHANGED=<exact production group and source/config facts>
EVIDENCE_COMMIT=<fast-forward sha or BLOCKED>
SOURCE_REMOTE_MUTATION=none
REMAINING_GATES=<source repair if target fails; single PR/review/merge; installed fresh native acceptance>
COMMAND_SHAPE_FRICTION=<GHDEV-10 canonical schema>
NEXT=Central independent adjudication
```
