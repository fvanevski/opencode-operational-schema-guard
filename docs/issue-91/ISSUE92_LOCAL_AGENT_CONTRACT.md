# Issue #92 A1–A3 — one cohesive local Build integration and qualification campaign

**Owner:** Local OpenCode primary `build`. **Repository:** `fvanevski/opencode-operational-schema-guard`. **Branch:** `work/91-memory-utility-r1`. **Accepted source baseline:** `c8eb5260f2b10832346234b1b5d0cf28302ffba8`. **Current candidate:** use the full exact branch SHA given in the kickoff and authenticate it by authoritative remote fetch/readback before editing/qualifying. First inspect `docs/issue-91/ISSUE92_CURATOR_PLAN.md`, then changed core/tests.

## Task and autonomy

Complete **A1 + A2 + A3 together**, not three micro-handoffs. The central-authored source adds an enumerated model `utility_class` and a deterministic additional EMIT gate while leaving operator-approved review/CAS and exact excerpt/source restrictions intact. Implement **no new curation pipeline** and do not make broad performance changes (#94) or recall-ranking changes (#93).

You own setup and test execution, prospective corpus/case freeze, host interface diagnosis, bounded scratch-only fixture/adapter correction, real model/Graphiti qualification and sanitized evidence publication. You may repair *obviously nonsemantic* source/test formatting or broken fixture wiring locally and return the complete patch; production semantic changes remain **proposed only** for Central to adjudicate. Do not modify `main`, change the production Graphiti group, approve/merge/close GitHub issues, create a PR, or rewrite historical episodes. Reuse this branch when #93 follows.

**Permission fields:** `LOCAL_AGENT_PRIMARY=build`; `SOURCE_REMOTE_UPDATE=forbidden`; `EVIDENCE_REMOTE_UPDATE=allowed`; `EVIDENCE_PACKET_REQUIRED=yes`; `EVIDENCE_ROOT=docs/issue-91/evidence/92-a1-a3-first-campaign`; `SEMANTIC_REMEDIATION=central-owned`; `HOST_MUTATIONS=disposable-scoped-only`; `PRODUCTION_DEPLOYMENT=forbidden`; `PR_CREATION=forbidden`; `MERGE=forbidden`. The narrow evidence-only publication allowance is **one sanitized non-force branch commit**, not source publication or graph mutation authority.

## Step 1 — exact identity and no-surprises integration

1. From your existing local checkout or a new isolated Build-owned workspace, fetch exactly `main` and `work/91-memory-utility-r1`; prove their current full SHAs against GitHub and the kickoff. Do not reset, rebase, clean or switch an owner's dirty checkout. A branch/head mismatch is `STALE`; do not auto-reconcile. Materialize exact baseline and candidate in separate disposable worktrees if needed; remote fetch must precede local proof for new commits.
2. Inspect effective project instructions (nearest `AGENTS.md` if present), current Node/npm repo check and test scripts, current OpenCode v2.2.x effective role policy, Graphiti installed interface, post-exit worker and shared inference lease/gate. Treat historical V1 guard recipes as inapplicable without current requalification. Use Serena/GitNexus for bounded code navigation, Probe for supplemental retrieval, native Git/GitHub for exact authority; RTK only where output reductions preserve diagnostic evidence.
3. Check only impacted edits and their consumers. Validate the candidate code's missing/invalid/non-durable EMIT deferral, persisted `utility_class` metadata, SKIP/DEFER/proposal compatibility, operator approval, old review records, exact source/class/temporal/one-fact/group/secret gates and no hook-side LLM calls. Run first:
   - `node --check docs/issue-78/v2-curator/core.mjs`
   - `node --check docs/issue-78/v2-curator/curator.test.mjs`
   - `node --test docs/issue-78/v2-curator/curator.test.mjs docs/issue-78/v2-curator/model-policy.test.mjs docs/issue-78/v2-curator/efficiency-probe.test.mjs`
   - `node --test docs/issue-78/v2-candidate/candidate.test.mjs`
   These are implementation diagnostics, **not** the authoritative trusted exact-head final Verify.
4. If a meaningful defect is found in central-authored semantics, localize and reproduce it, write a *full applicable proposed patch* in private scratch / sanitized packet, and return `CENTRAL_SEMANTIC_REMEDIATION_REQUIRED` with tests. Continue safe unaffected checks rather than multiplying handoffs. For scratch-only fixtures and known-safe wiring, repair and rerun inside the same campaign. Never weaken tests, source validators or inference admission.

## Step 2 — freeze evaluation BEFORE looking at candidate outputs

1. Read the #81 original adjudicated source-linked evidence and freeze a **new, genuinely independent** development/untouched holdout roster, with manifest SHA-256 and pre-output signed/recorded operator judgments. Do not overwrite old frozen corpora or relabel their denominators. Existing #81 exposed material may be reused as *development* only. Distinct real/sanitized source-family records for new holdout; never synthesize private source or invent a graph receipt.
2. Record `source_case_id`, family/split, immutable original source locator digest, class, temporal/evidence provenance, operator durable-useful/non-useful classification, pre-registered expected case coverage and exact model policy/version/settings. Freeze pre-result thresholds from `ISSUE92_CURATOR_PLAN.md`, document any operator ratification/limitations and chronology; withhold untouched holdout decisions from tuning. The 20-case/8-persisted minimum is an **operational descriptive floor**, not a claim of statistical power. If real independent facts cannot be gathered within a bounded campaign, report `INSUFFICIENT_SAMPLE` and continue functional testing; do not manufacture EMITs or increase the holdout adaptively after results.
3. Retain raw/sensitive source and real request/response in private access-restricted host storage only; GitHub packet gets hashes, category/decision tables and sanitized or synthetic examples. Do not publish a raw model prompt, GitHub credential, transcript, assembled request or exact private source excerpt.

## Step 3 — paired CPU selection and bounded post-exit host campaign

1. With identical frozen inputs, first do **CPU-only deterministic source/schema evaluation**. Separately record legacy `main` source decision/parser baseline and the changed-policy candidate. Existing #81 14/14 high-value **candidate-capture** control is untouched; rerun the established capture test rather than refabricate a score.
2. For **real** model-backed comparison, authenticate the existing local model alias/endpoint and the current Graphiti MCP API and group/readback protocol. Use separate disposable state roots and valid fixture group names: development base `graphiti-curator-utility-development-r01`, development candidate `graphiti-curator-utility-development-r02`, untouched holdout base `graphiti-curator-utility-holdout-r03`, untouched holdout candidate `graphiti-curator-utility-holdout-r04` (choose an unused permitted `rNN` per run). Before any source/group remapping, prove it is permitted by `docs/issue-78/fixture-groups.mjs` and actual current producer APIs; never relabel existing remote groups/episodes or silently change source identities. Retain exact project/workspace/source identity within each arm. Do not use active production `development-knowledge` for writes; do not overwrite or replay historical episodes. Use existing EX/shared lease, scheduler idle/quiet grace and post-exit unit/wrapper. No interactive OpenCode hook may trigger `curateCluster`, Graphiti `add_memory`, model probing or inference drain.
3. If an interactive local-Qwen harness owns the shared lease, finish preparatory Build work **without executing model-backed extraction**. Check the current native unit/CLI's exact route; prepare the two-arm configuration and one minimal, operator-run post-exit action using the *existing* worker/gate. Exit the interactive harness before that action. If the existing worker cannot process both arms in one admission, use a bounded, clearly delineated native sequential operator action under separate genuine admissions with non-replay readback; do **not** create a standing new daemon or bypass lease gating merely for convenience. The same campaign may be resumed for receipt inspection; no new Central implementation handoff is required for ordinary host-specific diagnostics. Record which phase was run, the shell/CLI status and source SHA. Do not mistake a queued acknowledgement for persisted Graphiti fact.
4. Observe model policy, valid JSON, per-case decisions, selected excerpts/provenance (private), `ReviewStore` state/revision/CAS, remote Graphiti UUID + group match, source-index membership, duplicate/no-replay and terminal extraction or typed failure. Repeat the same source-case selection with prior and new code, keeping model/version/config identical where possible. Use actual terminal remote readback, not search similarity or local index alone. Include at least one safe real source-grounded decision and a transient/redundant abstention if naturally present; never fabricate a write to make the acceptance look successful.
5. Treat a failing post-exit result as within this single campaign when the diagnosed correction is confined to authorized disposable harness configuration or a small fixture bug. Preserve original receipts; do not reissue ambiguous Graphiti writes. The only escalation triggers are a real source-semantic defect requiring Central, lease/security boundary conflict, destructive state risk, identity drift, or genuine inability to complete the objective without extending the defined subsystem.
6. Restore all temporary service overrides, timers and scratch config to their earlier state; verify source/production Graphiti groups, other services and active model posture unchanged. Do not stop/restart unrelated Qwen/embedding services to make tests pass. Retain rollback preimages through proof.

## Step 4 — paired scorecard and publish one bounded handback

For every frozen case, report prior vs new decision, sanitized `utility_class`/reason, excerpt/source validation result, useful-source case retained/missed, terminal/receipt status, and operator usefulness verdict independent of groundedness. Totals must explicitly separate candidate selection, proposed EMIT, approved review and actual persisted fact; record missed useful facts, duplicates, deferred cases, redundant/low-value persisted facts, grounded precision, utility among grounded persisted, source/group/secret/authority failures, bounded model tokens/time and operator labor. Include absolute numerators/denominators and 95% descriptive Wilson intervals for proportions. Flag `INSUFFICIENT_SAMPLE` when frozen minimum unattained, without relabeling a zero denominator PASS.

Run relevant project broader CI only if trusted GitHub Actions exact-head receipt is absent/non-equivalent; Central will dispatch/consume trusted profile `repository-final-v1` at the final source head. Do not re-run equivalent full suites as a ritual. Include native full-output log digests and primary exit/TAP count from unfiltered producer; recover truncated display from saved logs rather than repeating remote actions.

Create a **single sanitized self-contained GitHub evidence packet** under `docs/issue-91/evidence/92-a1-a3-first-campaign/`: `manifest.json` (base/head/tool/model/host provenance and file digests), `scorecard.json` (sanitized per-case and aggregate paired outcomes, frozen split IDs, baseline/current comparison), `verification.md` (tests/CI identity and native exits), `host-evidence.md` (EX admission, disposable Graphiti UUID proof, source-readback and no-side-effect assertions), `limitations.md` (unverified/small sample/misses), `friction.md` (canonical friction), and portable full patches/source diff manifests for **any** proposed local source change including untracked files. Do not include source payloads when sensitive; reference private SHA-256 and omit with reason. Authenticate only those packet paths staged; one non-force evidence-only commit whose parent is exactly the admitted existing remote branch head, with refreshed remote CAS check before push and authoritative ref/file readback. On a race or rejected write, return `EVIDENCE_PUBLICATION=BLOCKED` with local sanitized packet ready, without force/rebase/retry.

### Handback (direct conversation; concise, typed)

```text
ISSUE92_A1_A3_RESULT=PASS|PARTIAL|FAIL|BLOCKED|STALE|INSUFFICIENT_SAMPLE
REPO_ID=fvanevski/opencode-operational-schema-guard
SOURCE_BASE_SHA=<full 40>
SOURCE_CANDIDATE_SHA=<full 40>
SOURCE_WORKTREE_CLEAN=yes|no
EXACT_SOURCE_DIFF=<paths and full patch/hash reference>
A1_HOLDOUT_FROZEN=yes|no|insufficient
FREEZE_BEFORE_OUTPUT_PROVEN=yes|no
SPLIT_DENOMINATORS=<development, holdout and task-family counts>
A2_UTILITY_POLICY=<pass|fail + focused tests>
A3_POST_EXIT=<pass|blocked|not_run + admission/lease>
GRAPHITI_TERMINAL_EVIDENCE=<uuid/source-index/group proof or none>
BASELINE_PERSISTED=<grounded/useful/nonuseful/redundant counts>
CANDIDATE_PERSISTED=<grounded/useful/nonuseful/redundant counts>
MISSED_BASELINE_USEFUL=<count and sanitized case IDs>
CANDIDATE_CAPTURE_CONTROL=<actual 14/14 or qualified unverified>
GATE_UTILITY=<pass|fail|inconclusive|insufficient_sample>
GATE_GROUNDEDNESS=<pass|fail|unverified>
GATE_PRIVACY_GROUP_AUTHORITY=<pass|fail|unverified>
MODEL_POLICY_IDENTITY=<version/alias/settings/digest, no secrets>
HOST_MUTATIONS=<exact disposable changes / rollback>
PRODUCTION_MUTATION=none|unexpected
TRUSTED_ACTIONS_RECEIPT=<exact id|central_pending>
EVIDENCE_REMOTE_UPDATE=allowed
SOURCE_REMOTE_UPDATE=forbidden
EVIDENCE_PUBLICATION=<PASS|BLOCKED|NOT_ATTEMPTED>
EVIDENCE_COMMIT_SHA=<full 40 or none>
EVIDENCE_ROOT=docs/issue-91/evidence/92-a1-a3-first-campaign
UNCOMMITTED_SOURCE_CHANGES=<paths + hash or none>
CENTRAL_SEMANTIC_REMEDIATION_REQUIRED=<none|bounded findings>
NEXT_CONCRETE_ACTION=<one action or none>
COMMAND_SHAPE_FRICTION:
  encountered=<yes|no>
  events:
    - scenario=<repository/task key>
      requested_shape=<sanitized submitted shape>
      effective_shape=<actual executed/rejected|same-as-requested|unknown>
      rewrite_provenance=<none|rtk_opencode_hook|shell_or_alias|other_harness_hook|unknown>
      event_kind=<pre_execution_rejection|execution_failure|successful_recovery|guard_annotation|harness_rewrite|runtime_misbinding|interface_discovery|other>
      execution_effect=<not_executed|executed_failed|executed_succeeded|recovered_after_retry|unknown>
      correction_or_annotation=<bounded fact>
      replacement_shape=<corrected shape|none>
      recipe_reference=<GHDEV-10 key|none>
      resource_reference=<resource|none>
      contract_conflict=<yes|no|uncertain>
      durable_gap_candidate=<yes|no|uncertain>
  omitted_sensitive_values=<yes|no>
```

Do not claim `PASS` for a mere accepted model JSON, accepted queue stage or ACK without live terminal evidence. The safety/utility gates and residual sample uncertainty remain separate. Return after completing the bounded campaign or on a demonstrably material blocker; do not generate new issues/PRs or initiate a different optimization campaign.
