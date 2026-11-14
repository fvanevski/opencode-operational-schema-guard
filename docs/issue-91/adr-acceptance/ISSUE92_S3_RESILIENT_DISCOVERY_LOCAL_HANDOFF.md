# Issue #92 S3: resilient discovery, one consolidated local Build campaign

## Authority and next-slice boundary

Governing: live issue #92; the approved ADR-91-2026-11-09; prior S1 and S2 source/terminal reports; GHDEV-02/07/10 and applicable AGENTS.md. This is an EXPOSED development iteration, **not** A3 prospective qualification or a new PR. Use branch `work/91-memory-utility-r1` at the exact kickoff SHA. S2 was terminally reconciled: 50 discovery/utility calls (27/23), 19 separate Graphiti episodes, 9/16 useful independently labeled targets covered, 7/16 missed; 11/11 nonvaluable controls retained, 10/19 episodes had no substantive extracted edges. The S2 root and group remain immutable historical evidence.

**New Central implementation:** opt-in `--resilient-discovery on` requires `--finite-batch on --novelty-policy recall --source-recovery on`. Only this opt-in path validates each discovered candidate independently and records per-candidate strict failure diagnostics. It allows exactly one source-specific correction pass for all-invalid `invalid_fact_fields` candidates, or when a mixed batch contains such invalid candidates alongside valid siblings. Existing S1/S2 prompts, calls, active/plan identities and default behavior are unchanged; S3 uses new distinct call identities and frozen active/plan flags. Recovery prompts require valid kinds, observed-time qualifiers, source-ref membership, UTF-16 start/end and intact technical predicates. A repaired quote receives normal source validation plus independent utility review, one ReviewStore child/CAS and one Graphiti episode/UUID. Original invalid source snippets are NOT authorized as graph facts and their safe failure reason/index remains in the private plan.

**The seven S2 missed targets**: g1×2 (SKIP/weak discovery), g2 (utility non-substantive), g3×2, g4, sp9 (discovery invalid_fact_fields). S3 directly addresses the invalid-field first-loss mechanism and offers improved source/utility prompts to address g1/g2; it does NOT claim recovery before seeing real host evidence. Avoid optimizing duplication by a new semantic novelty veto. A reported bug or technical requirement must never be upgraded to a verified fix.

## Build authority and single campaign

LOCAL_AGENT_PRIMARY=build
SOURCE_REMOTE_UPDATE=forbidden
EVIDENCE_REMOTE_UPDATE=allowed, one sanitized commit at most, only after terminal evidence
LOCAL_HOST_VALIDATION=required
EXCLUSIVE_POST_EXIT_INFERENCE=required
PRODUCTION_DEPLOYMENT=forbidden
PR_CREATE_MERGE_ISSUE_CLOSE=forbidden

Build integrates Central source, runs native checks, stages one new isolated disposable source/call/ReviewStore group, read-only authenticates the original 24 B3/S1 native sources and 16 valuable / 11 nonvaluable labels, preflights a single once-only EX post-exit launcher, and returns **one** executable operator command. The live group `graphiti-adr92-s2-source-recovery`, S2 frozen batch, remote episodes, local receipts and previous operator launchers must not be mutated or replayed. Seed fresh `graphiti-adr92-s3-resilient-discovery` and private 0700/0600 scratch state with the same source identity/scope, without inventing text or rewriting historical labels.

Build may repair shell, fixture, scratch, service-routing or preflight mechanics in the disposable host campaign. It must return a precise reproducible proposed diff for genuine substantive source/test defects to Central, not make unauthorized GitHub source commits or weaken validation/tests. Use current APIs, avoid second agents/projects/campaigns and no broad prompt/model/backend sweep.

## CPU verification (repo root)

Fetch, authenticate exact HEAD, blob identities and worktree state (fetch **before** local object checks for the newly remote head). Keep untracked developer files intact. Preserve real test producer status, in Zsh do not use Bash PIPESTATUS. Run:

```bash
node --check docs/issue-78/v2-curator/fact-review.mjs
node --check docs/issue-78/v2-curator/finite-batch.mjs
node --check docs/issue-78/v2-curator/curator-cli.mjs
node --check docs/issue-78/v2-curator/fact-review.test.mjs
node --check docs/issue-78/v2-curator/finite-batch.test.mjs
node --test docs/issue-78/v2-curator/fact-review.test.mjs
node --test docs/issue-78/v2-curator/finite-batch.test.mjs
node --test docs/issue-78/v2-curator/finite-batch-tuning.test.mjs
node --test docs/issue-78/v2-curator/curator.test.mjs
node --test docs/issue-78/v2-curator/issue92-source-fact.test.mjs
node --test docs/issue-91/adr-acceptance/adr-causal-audit.test.mjs
npm run check
npm test
```

Check RED→GREEN for malformed+valid sibling (one bad item does not veto good), all-invalid field recovery, forged source no retry/write, frozen opt-in mismatch, ambiguous correction no replay, default S1/S2 compatibility. Root `npm test` excludes curator-focused suites.

## Prepared fresh EX qualification

Use only the new S3 group and state. Same prior S2 `chat-fast` default model settings, no tuning profile or temperature sweep, current authenticated local vLLM/router and Graphiti MCP endpoints. One finite-batch run with bounds `--max-clusters 24 --max-candidates 72 --max-seconds 3600 --finite-batch on --novelty-policy recall --source-recovery on --resilient-discovery on`. Original source event identities and 24-cluster roster; record native source digest, 16 valuable and 11 control labels; preserve ineligible privacy source as excluded.

Prepare a once-only, disposable, host-local EX launcher. It waits for **actual interactive harness exit**; acquires canonical OpenViking commit-gate exclusive flock and verifies actual 30s quiet grace, scheduler idle, no unrelated unresolved work and production-drain serialization; no model or Graphiti write while Build is active. The lease env token alone does not count as admission. Keep submitted Graphiti outcomes under the lease until positively reconciled, with bounded server-latency allowance; use read-only `get_episodes` on the exact group and local ReviewStore identity, never blind retry/clear intent. EX admission/remote ambiguities fail closed with source/attempt identifiers.

## Scoring and evidence boundaries

Once the operator post-exit command completes, produce private original-source anchored per-target ledger comparing S1, S2 and S3 **with original denominators**. Individually score g1×2, g2, g3×2, g4 and sp9, plus previously retained targets. Report first loss stage, safe invalid candidate diagnostics, final utility reason, original-source predicate support, source class/temporal qualification, ReviewStore/CAS, UUID + source index + MCP episodes, and separate graph extraction `get_episode_entities` / FalkorDB edge evidence. Count informative extracted development relations separately from trivial group membership. Count 11 nonvaluable sibling controls, duplicate yield, fragmentary headers/midword spans, 7 S2 operator-review records, and no privacy/group/injected/context leaks. Do not call existence of an episode proof of extracted facts or of usable retrieval; report retrieval usefulness as unverified unless actually tested.

The exposed 9/16 S2 target baseline must remain an independent measured comparison, not an arbitrary quality threshold or retroactively rewritten label. A meaningful S3 improvement includes recovery of invalid-field targets without suppressing existing valuable targets; if improvement is not demonstrated, report the first-loss evidence without another prompt sweep. Do not run untouched/prospective A3 until Central accepts exposed source quality. Preserve 85% prospective starting requirement; do not overclaim S3 as acceptance.

## Publication, handback and stop

Deliver results directly in the conversation with the exact full source SHA, all native exits/counts, frozen/remote identities, positive UUID/source-index evidence, 16+11 scorecard, actual S3 per-stage invocation counts, model usage if reported, post-exit EX trace, no-replay/production nonmutation evidence and full GHDEV-10 COMMAND_SHAPE_FRICTION. Retain raw private texts and model replies only in 0600 private files, never GitHub. If post-exit requires an operator command, return `READY_FOR_FINAL_OPERATOR_RUN` and **exactly one** tested command after Build exits. A later evidence-only sanitized packet may be published in one non-force commit to `docs/issue-91/evidence/92-s3-resilient-discovery/` after head CAS/readback, no PR. No unauthenticated branch rewriting or repeat of an ambiguous GitHub write.

On substantive source-authorization failure, preserve model intent, halt further writes, return `REMEDIATION_REQUIRED` with smallest portable proposed diff. Do not mask native red tests by root test PASS.
