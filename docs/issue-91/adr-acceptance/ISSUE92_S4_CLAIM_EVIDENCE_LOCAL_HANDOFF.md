# Issue #92 S4 — source-bound claim/evidence review, one exposed host qualification

## Authority, scope and key architectural distinction

Current live Issue #92 and `docs/issue-91/ADR-91-2026-11-09-GRAPHITI-OPENVIKING-MEMORY-ARCHITECTURE.md` govern. This is one development-only exposed qualification on branch `work/91-memory-utility-r1`, not an untouched A3 cohort, production enablement, merge/PR gate or reopening of S1/S2/S3 historical groups.

Historical S3, original execution head `626df9eace9e9b1b141466a5d69c20df06d0995e`, terminal evidence commit `9363e9b38f929e200273eeefeef6c70475285101`, retained **9/16 independent valuable targets**, **10/11 nonvaluable controls**, 18 persisted episodes, 45 entity nodes, 12 graph fact edges, 9 episodes with substantive extraction. The seven still lost: g1×2, g2, g3×2, g4, sp9. S2 also retained 9/16, S1 7/16. Denominators and source case labels remain unchanged. Published S3 control sp7 has a stale note contradicting its `lost` status; use recorded UUID/source identity, not that note, and do not silently amend historical evidence.

**S4 Central implementation**: `docs/issue-78/v2-curator/claim-evidence.mjs`, plus integration in finite-batch, tuning, CLI and focused tests. New explicit opt-in `--claim-evidence on` requires `--resilient-discovery on --source-recovery on --finite-batch on` and recall novelty policy. Discovery now proposes a **standalone normalized claim** with **separate exact original source_ref and JS UTF-16 offsets** (25..450-char quote). Deterministic source validation checks membership, original quote and scope first. A separate independently frozen `support` model stage must assess entailment and status with an exact supporting phrase. An independent `utility` stage then judges durable utility using the normalized claim + quote, not the task header. Support refusal, invalid source, temporal/authority uncertainty and utility refusal become review/DEFER. Only the **source-exact authenticated quote**, not the normalized candidate, may be automatically stored in ReviewStore/Graphiti. This is a conscious safety boundary: an LLM support verdict plus lexical overlap does NOT independently verify a paraphrase for automatic normalized Graphiti assertion, so no unsupported normalized claim reaches production Graphiti. The separate claim and its support hashes are captured as private model-call/plan evidence for independent human/source adjudication and later implementation judgment.

The opt-in path retains at most three discovery facts per cluster and one atomic fact per Graphiti episode with its own ID, ReviewStore/CAS, remote UUID, source index and non-replay. S1/S2/S3 frozen active/plan prompt identities are unaffected by default. Do not convert user reported defects, assistant statements or requested work into verified successes. Do not change the 85% prospective target or turn historical failures into passes. Retained quote grounding is NOT proof that a normalized claim is entailed or that Graphiti's extraction is useful.

## Build campaign authority

```text
LOCAL_AGENT_PRIMARY=build
REPOSITORY=fvanevski/opencode-operational-schema-guard
BRANCH=work/91-memory-utility-r1
REQUIRED_STARTING_SHA=<FULL_SHA_FROM_CENTRAL_KICKOFF>
SOURCE_GITHUB_WRITES=forbidden
LOCAL_HOST_MECHANICAL_FIXES=allowed
EVIDENCE_GITHUB_COMMIT=one_sanitized_commit_after_terminal_proof_only
PR_CREATE_MERGE_ISSUE_CLOSE=forbidden
PRODUCTION_ACTIVATION=forbidden
MODEL_HARNESS=opencode_build_cpu_then_operator_exclusive_post_exit_gpu
```

Fetch before checking newly staged local objects; verify the remote full SHA, all changed source/test/handoff blobs, exact worktree and nearest `AGENTS.md`. Preserve unrelated developer files and production services. No extra worktrees or subagents unless truly necessary. Do not delegate substantive source architecture/semantic changes to the local agent; report any RED source invariant with a smallest *proposed* full diff, without pushing it. Allow bounded autonomously repaired host scratch/controller/fixture mistakes (file enumerate, MCP session refresh, service endpoint discovery, private read-only scoring) and preserve genuine producer exits.

### Phase 1 — CPU-only verification (in authenticated repository root)

Run these directly as native producers and record exact exit code/test count, with complete retained logs, not merely a green `npm test`:

```bash
node --check docs/issue-78/v2-curator/claim-evidence.mjs
node --check docs/issue-78/v2-curator/claim-evidence.test.mjs
node --check docs/issue-78/v2-curator/finite-batch.mjs
node --check docs/issue-78/v2-curator/finite-batch.test.mjs
node --check docs/issue-78/v2-curator/finite-batch-tuning.mjs
node --check docs/issue-78/v2-curator/curator-cli.mjs
node --test docs/issue-78/v2-curator/claim-evidence.test.mjs
node --test docs/issue-78/v2-curator/finite-batch.test.mjs
node --test docs/issue-78/v2-curator/finite-batch-tuning.test.mjs
node --test docs/issue-78/v2-curator/fact-review.test.mjs
node --test docs/issue-78/v2-curator/curator.test.mjs
node --test docs/issue-78/v2-curator/issue92-source-fact.test.mjs
node --test docs/issue-91/adr-acceptance/adr-causal-audit.test.mjs
npm run check
npm test
```

The repository root `npm test` does NOT cover all focused curator suites. Verify the S4 positives and negatives: claim/quote separation, forged source and wrong offsets, hallucinated source vocabulary, false verified status and unsupported inference, support-review malformed/contradictory verdicts, 3 distinct model call stages, no normalized text in Graphiti episode, immutable S3/S4 active identity, unknown support result non-replay, S1/S2/S3 default compatibility. If any S4 tests are RED due to Central implementation logic, do not hide them or execute the S4 model/Graphiti campaign: return `SOURCE_REMEDIATION_REQUIRED` with failure and proposed diff; Central corrects the source.

### Phase 2 — one original-source-authenticated disposable S4 run

Read-only authenticate the original B3 24 native source records from `/tmp/opencode/b2-sources.json` (prior same source corpus, 24/24 native message-text identity verification), the original `opencode.db` source handles/time/project/workspace/evidence class, 16 valuable targets, 11 nonvaluable controls, and the ineligible privacy control. Source freeze SHA identity and native roster must be explicit. No reconstructed historical freeze bytes claimed as authenticated. Keep original S1/S2/S3 state and Graphiti groups immutable.

Create a fresh, private, collision-safe `/tmp/opencode/issue92-s4` workspace (0700; private contents/replies 0600) and new empty group:

```text
graphiti-adr92-s4-claim-evidence
```

Use the actual local `chat-fast` model and Graphiti MCP endpoint, default model settings, no tuning sweep, one bounded treatment. All 24 clusters (not 24 fact episodes), source evidence strictly identical to the frozen exposed eligible roster. New S4 run config:

```bash
--finite-batch on \
--novelty-policy recall \
--source-recovery on \
--resilient-discovery on \
--claim-evidence on \
--max-clusters 24 \
--max-candidates 72 \
--max-seconds 3600
```

Add exact `--group`, `--state-dir`, `--endpoint` and current `LOCAL_CURATOR_*` model bindings privately to the existing `curator-cli.mjs drain` syntax. Do not infer CLI positional arguments or paste secrets publicly. Refuse any already-used/nonempty remote group and all existing frozen batch replays.

Prepare a small once-only private EX launcher and self-validating receipt/scoring/postreconcile helpers based on proven S3 admission and reconciliation patterns. **Do NOT invoke inference, Graphiti add_memory, or `drain` while the interactive Build harness is active.** The operator command runs only after exit and must acquire actual canonical EX flock `/run/user/1000/openviking-agent.lock`, confirm real harness exit, 30s quiet grace, scheduler idle, no other canonical unresolved submissions and production drain serialization. Env marker alone is NOT admission. Freeze intent before each inference and preserve call/result identity; unknown model outcome means stop, not retry. Graphiti ambiguous submissions require repeated *read-only positive membership*, never blind resubmission. The reconciler may need separate delayed/one-shot EX admission after remote visibility, but no new model calls or Graphiti writes under that corrective path. Avoid S3's brittle scorecard `_episode-index` directory read and publisher allowlist ordering/readback bugs.

### Phase 3 — complete source-grounded scoring and relevance evidence

The EX post-exit action should finish once-only inference, bounded remote settlement/reconciliation, source attribution/scorecard regeneration and optional exact-head evidence publication when terminal. Avoid serial exploratory handoffs.

Produce an independently adjudicated per-target stage ledger, original 16+11 denominator unchanged, comparisons S1 7/16, S2 9/16, S3 9/16, S4 independently scored. For EACH of g1×2, g2, g3×2, g4 and sp9 and all previously retained cases, report:

1. authenticated original native source and actual visible input (source handle, hashes and source class, not raw private text in GitHub);
2. normalized claim proposed, exact source quote/offset validity, claim-to-quote lexical plausibility (not semantic proof), separately recorded support verdict and actual support quote;
3. independent human/source comparison of the normalized claim with original evidence, including reported vs verified, unsupported synthesis, temporal scope and meaningful technical predicate;
4. separate durable utility verdict, local duplicate suppression, one-fact ReviewStore/CAS and terminal Graphiti UUID/source-index/remote membership;
5. exact first remaining loss stage, including whether model submitted none, source offset invalid, critic denied entailment, utility rejected, deterministic authorization rejected, or Graphiti failed.

Crediting a valuable target requires original-source-supported independent target coverage AND terminal persisted fact, not a model's support verdict. Report model call totals by discovery/support/utility, token/latency if known, review volume, 11-control redundancy, 90% grounding and 75% usefulness prospective criteria as NON-PROSPECTIVE comparisons only. Preserve hard no-secret/wrong-group/fabricated source controls.

Separately assess Graphiti `get_episode_entities` actual fact edges, group-membership-only edges and source index. Do a tiny **read-only** relevant-question retrieval probe against representative persisted technical facts in the S4 disposable group if feasible, with group-scoped identity and question relevance; report unknown if unavailable. Do not conflate episode persistence, graph extraction and actual useful retrieval, or expand into Issue #93 retrieval optimization.

### Phase 4 — private receipt and one evidence-only publication

Before publication: retain complete private raw model calls/excerpts in 0600 files, forbid raw text, secrets, credentials, large logs or raw DB contents in public GitHub. Produce a sanitized self-contained `docs/issue-91/evidence/92-s4-claim-evidence/` packet documenting all source SHA/blobs, native test exits, frozen 24-roster/label digest, staged model-call pair counts/hashes, support/utility decisions, per-target 16+11 scorecard, UUID proof, extraction, retrieval probe, EX/no-replay/privacy/production nonmutation and complete GHDEV-10 friction. Publication: at most ONE non-force evidence-only commit on the existing branch with fresh remote-head equality/CAS and independent complete remote tree/blobs readback. A branch race or ambiguous push is a stop-and-inspect condition, not permission to force/re-push.

If the EX launcher cannot finish while the harness owns the lock, return `READY_FOR_FINAL_OPERATOR_RUN` plus **one exact tested post-exit command**. If model/source/Graphiti state is truly blocked, preserve all frozen intents and return `BLOCKED` with the first exact condition, not a generic retry request.

## Handback and acceptance

Return: `S4_RESULT=READY_FOR_FINAL_OPERATOR_RUN|EXPOSED_RECOVERY_SUPPORTED|FUNCTIONAL_NO_GAIN|SOURCE_REMEDIATION_REQUIRED|BLOCKED`, full fixed Git SHA, native producers/counts, original source identity and S1–S4 comparison, claim/support/utility stage counts, 16 valuable and 11 controls mapping, ReviewStore/remote UUID/source-index proof, extracted facts and actual retrieval evidence, no replay, untouched production and historical campaigns, evidence-only commit (if authorized), and all friction.

Required GHDEV-10 schema:

```text
COMMANDS_MATCH_HANDOFF=<yes|no>
COMMAND_SHAPE_FRICTION:
  encountered=<yes|no>
  events:
    - scenario=<short key>
      requested_shape=<literal submitted form>
      effective_shape=<executed/denied form>
      rewrite_provenance=<none|rtk_opencode_hook|shell_or_alias|other_harness_hook|unknown>
      event_kind=<pre_execution_rejection|execution_failure|successful_recovery|guard_annotation|harness_rewrite|runtime_misbinding|interface_discovery|other>
      execution_effect=<not_executed|executed_failed|executed_succeeded|recovered_after_retry|unknown>
      correction_or_annotation=<bounded evidence>
      replacement_shape=<corrected command|none>
      recipe_reference=<recipe|none>
      resource_reference=<resource|none>
      contract_conflict=<yes|no|uncertain>
      durable_gap_candidate=<yes|no|uncertain>
  omitted_sensitive_values=<yes|no>
```

No source/test validation weakening, no production deployment or Issue #92 closure. Central owns any follow-up semantic source remediation and prospective gate decision.
