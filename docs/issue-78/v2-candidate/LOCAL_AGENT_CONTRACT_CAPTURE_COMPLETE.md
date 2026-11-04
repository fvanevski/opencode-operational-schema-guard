# Local Build campaign: finish Issue #79 candidate capture integration

REPO_ID=fvanevski/opencode-operational-schema-guard
ISSUE=79
PARENT=78
RELATED_NEXT=80
BRANCH=issue/79
LOCAL_AGENT_PRIMARY=build
TASK_CLASS=caller-owned implementation integration and host-native qualification
STARTING_HEAD=PINNED_IN_KICKOFF
SOURCE_REMOTE_UPDATE=forbidden
EVIDENCE_REMOTE_UPDATE=allowed
REMOTE_UPDATE=evidence-only
EVIDENCE_PACKET_REQUIRED=yes
EVIDENCE_ROOT=docs/issue-78/evidence/79-capture-complete-v1
PR_CREATE=forbidden
MERGE=forbidden
ISSUE_CLOSE=forbidden
PRODUCTION_ACTIVATION=forbidden
MODEL_CURATOR=forbidden
GRAPHITI_WRITE=forbidden
OPENVIKING_MUTATION=forbidden

## Mission and authoritative inputs

Complete this **one coherent #79 capture-coverage campaign** against the
Central-authored branch source. Authenticate the exact SHA from the kickoff;
read Issue #79, parent #78, current repository/global AGENTS.md and
`docs/issue-78/v2-candidate/README.md`, these candidate modules/tests,
`docs/issue-75/v2-candidate/{memory-core.mjs,memory-cli.mjs,
memory-core.test.mjs,plugin.mjs}`, the frozen existing pilot cases, and
`docs/issue-78/REVIEW_EVIDENCE_PACKET.md`.

Earlier Nov 3 native stock V2.2.5 pilot qualified prompt, context,
execute.after, compaction and next-context assistant observations; see
`docs/issue-78/evidence/79-native-v2-20261103/`. Existing Issue #75
live seven-plugin Graphiti and OpenViking behavior are protected. Do not
rerun or rediscover unrelated successful phases. The present code is
Central-authored but NOT yet proven by Node/host tests in its final state.

## Work in a single Build campaign

1. **Exact input identity and CPU qualification (no GPU or Graphiti needed).**
   Verify clean worktree at the kickoff commit and source blobs before edits.
   Use ordinary repo-defined tests without altering independent CI or
   acceptance rules. In `docs/issue-78/v2-candidate` run:
   ```sh
   node --check events.mjs
   node --check queue.mjs
   node --check plugin.mjs
   node --check candidate-cli.mjs
   node --check pilot-evaluate.mjs
   node --check pilot-real-replay.mjs
   node --test candidate.test.mjs
   node pilot-evaluate.mjs
   node pilot-real-replay.mjs
   ```
   In `docs/issue-75/v2-candidate` run:
   ```sh
   node --check memory-core.mjs
   node --check memory-cli.mjs
   node --test memory-core.test.mjs plugin-behavior.test.mjs relevance.test.mjs
   node --test relevance-observation-replay.test.mjs
   ```
   Run `git diff --check` for current changes and inspect the repository's
   existing CI/test workflow for further relevant deterministic checks.
   Preserve failures and fix demonstrated in-scope production defects,
   their exact regressions, and useful fixture mismatch diagnostics in the
   **same** campaign. Do not edit frozen real/synthetic scoring labels.

2. **Native V2 tool/edit provenance (disposable, no production writes).**
   Use the installed public OpenCode V2 hooks in a truly isolated private
   stock V2 config, group and candidate state root; preserve normal provider
   mapping and plugin package-directory loader behavior. Authenticate
   `tool.execute.after` and actual `edit`/`write` (and `apply_patch` if
   exposed) tool names, `input.filePath|path|file_path`, `callID`,
   completion/error status and returned result metadata. Build a tiny
   disposable in-workspace test file; exercise create/edit/failure and
   paired shell test fail->fix->pass in one session. Capture only sanitized
   shape receipts and source handles, never raw prompts, diffs, output,
   credential values or private file contents. Fix **the narrow adapter**
   if the authenticated native shape differs from Central assumptions.
   Do not fabricate a `verified` source class from successful tool status;
   any independent filesystem readback is separate evidence.

3. **Capture and privacy invariants.** Exercise implicit and explicit user
   requirements, task-scoped user->tool->assistant related IDs, long finished
   assistant text, repeated context delivery, compaction, session restart,
   opt-out, cross-group/workspace exclusion, source-handle forgery, secret
   after excerpt truncation, unsafe file path, self-context recursion, noisy
   reads, large output, bounded context/message tracking and overflow/drop
   counters. Keep the last single-turn assistant-message limitation visible:
   there is no authenticated v2.2.5 direct final-message hook. Do not
   invent `message.updated`/`session.idle` or work around it by altering
   production session/history behavior.

4. **Legacy journal >500 without risky live migration.** Verify bounded
   `Journal.pages()`, source-preserving 501+ record scans, old/new API
   behavior, drain/reconcile/search and CLI listing against a disposable
   journal and **stub Graphiti**, including an ambiguous submission state.
   Make certain no caller drops rows, deletes episodes or replays
   `submission_unknown`. The pinned remote 100-episode reconciliation
   window is a separately identified Stage #80 item, not permission to
   rewrite graph submission here. Test accepted Issue #75 recall/opt-out
   in isolation; production seven-plugin bytes/config and historical journal
   are immutable during this campaign.

5. **One frozen evidence comparison.** Run supplied synthetic
   `pilot-evaluate.mjs` and real sanitized `pilot-real-replay.mjs` as
   immutable baselines. Freeze a small *additional* host event-shape sample
   before any adapter retuning, including positive/negative file-operation
   cases and one root-cause->fix->test-pass cluster. Report old selector
   versus candidate event selection, useful recall, noisy volume, source
   label/ID collisions, truncation/drop counts, and all noncaptured cases.
   Do not call source events curated Graphiti memories; Stage #80 decides
   durable facts, and #81 is integrated benchmark/real-use authority.

6. **Bounded autonomy and stop logic.** You may repair event mapping,
   path handling, cache bounds, scoped queue behavior, journal paging,
   focused regressions, readme discrepancies and native host fixture
   setup **only** within
   `docs/issue-78/v2-candidate/*` and the implicated
   `docs/issue-75/v2-candidate/{memory-core.mjs,memory-cli.mjs,
   memory-core.test.mjs}`. Reasonable small supporting test files are
   permitted. Keep implementation branch/source changes **uncommitted**
   for Central independent review; do not push source. Do not redesign
   candidate identity/schema, temporal authority, gate/lease mechanics,
   Graphiti ingestion, live deployment, security boundaries, OpenViking or
   the Stage #80 curator. Escalate material architecture or protected-live-
   state risks; otherwise resolve routine source/runtime mismatches and
   rerun focused + integration checks without requesting micro-handoffs.

7. **Mandatory public review evidence packet.** Package all required
   sanitized artifacts under the exact `EVIDENCE_ROOT` on this same issue
   branch, following `docs/issue-78/REVIEW_EVIDENCE_PACKET.md`.
   Include `manifest.json` with SHA-256 of each included file, starting
   SHA, source-tested identity and exclusions; complete `handback.md`;
   `source.patch` with *all* uncommitted tracked and untracked proposed
   source/test changes (or full complete changed-file copies);
   `cpu-tests.md` with commands/exits/counts and bounded failure text;
   `host-shapes.json`, frozen sanitized supplemental cases, per-case
   selection/rejection comparison and privacy/queue/legacy-journal receipts.
   Full canonical `COMMAND_SHAPE_FRICTION` belongs in handback, even if
   no friction. No raw transcripts, credentials, private code files,
   full stdout, hidden config, arbitrary host paths, or credential-bearing
   diffs may be staged. Document each omitted item with reason.

   **Publish in one evidence-only GitHub commit** on `issue/79`:
   generate/freeze/checksum the packet, review staged path list for exactly
   this evidence directory, re-fetch current remote branch and compare to
   the authenticated source-start SHA **immediately before commit/push**;
   use a non-force fast-forward push. The source diff must remain a local
   uncommitted change, not part of the evidence commit. Authenticate the
   pushed evidence commit, ref and manifest/files through remote readback.
   If remote head advanced or publication is denied, do not rebase, force,
   auto-retry, or claim success. Return `STALE` or
   `EVIDENCE_PUBLICATION=BLOCKED` with a complete sanitized portable
   packet fallback for Central. The evidence-only push is expressly
   authorized; it is **not** a source-write delegation.

## Execution lanes / invariants

CPU-only: all JS syntax/test/replay and fixture/journal/queue checks, source
inspection, packet audit and Git staging. Native host harness: disposable
stock V2 public plugin/hook execution only. The already running local
model/provider may serve the ordinary disposable client under existing
interactive admission; no separate GPU job, no post-exit Graphiti worker,
no Graphiti `add_memory`, no model-backed curator or lease bypass.
Use normal stock V2 directory plugins with a real entry file; symlinked
plugin entry files previously failed silently. Do not replace installed
production plugin or seven-entry config, restart service units, alter
OpenViking, delete any live memory/journal episode or clean other processes'
scratch. Keep work bounded to this feature, and report real failures.

## Required handback

```text
RESULT=PASS|PARTIAL|FAIL|BLOCKED|STALE
LOCAL_AGENT_PRIMARY=build
REPO; ISSUE; BRANCH
SOURCE_START_SHA=<full>
SOURCE_TESTED_SHA=<full source commit plus complete uncommitted diff hash>
EVIDENCE_COMMIT_SHA=<full|none>
EVIDENCE_PACKET_REF=<GitHub path plus full commit SHA|none>
EVIDENCE_PUBLICATION=PASS|BLOCKED|STALE
EVIDENCE_MANIFEST_SHA256=<hash|none>
SOURCE_PATCH_SHA256=<hash|none>
CHANGED_SOURCE_PATHS=<exact list, including untracked>
CPU_TESTS=<commands/results/counts>
STOCK_V2_VERSION_AND_TOOL_SHAPES=<sanitized>
NATIVE_CAPTURE_RESULT=<file edits, admitted prompt, tool, assistant, IDs>
QUEUE_DROP_AND_RETENTION_RESULT=<counts, recovery behavior>
LEGACY_JOURNAL_501_PLUS=<readbacks, reconciliation, no loss>
PILOT_SYNTHETIC_AND_REAL=<fixed labels, old/new per-case results>
PRIVACY_AND_GROUP_FENCES=<PASS|FAIL plus evidence>
PRODUCTION_MUTATION=none
GRAPHITI_WRITE=none
OPENVIKING_MUTATION=none
GITHUB_MUTATION=<evidence-only commit|none>
KNOWN_GAPS=<specific reproduction/materiality>
NEXT=Central reads exact GitHub evidence packet, reviews source diff
```

COMMAND_SHAPE_FRICTION (required canonical format):
```text
encountered=<yes|no>
events:
  - scenario=<short scenario key>
    requested_shape=<sanitized invocation actually submitted>
    effective_shape=<runtime invocation|same-as-requested|unknown>
    rewrite_provenance=<none|rtk_opencode_hook|shell_or_alias|other_harness_hook|unknown>
    event_kind=<pre_execution_rejection|execution_failure|successful_recovery|guard_annotation|harness_rewrite|runtime_misbinding|interface_discovery|other>
    execution_effect=<not_executed|executed_failed|executed_succeeded|recovered_after_retry|unknown>
    correction_or_annotation=<bounded decisive detail>
    replacement_shape=<corrected shape|none>
    recipe_reference=<GHDEV-10 key|none>
    resource_reference=<used resource|none>
    contract_conflict=<yes|no|uncertain>
    durable_gap_candidate=<yes|no|uncertain>
omitted_sensitive_values=<yes|no>
```
When no friction: `encountered=no; events=[]; omitted_sensitive_values=no`.
Do not suppress native tool shape discovery that was necessary, even if
subsequent retries succeeded. Return the handback in chat with the exact
published GitHub packet link; do not ask Central to inspect host-local /tmp.
