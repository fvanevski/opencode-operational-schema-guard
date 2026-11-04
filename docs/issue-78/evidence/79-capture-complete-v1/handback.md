# Issue #79 capture-completion: integrated Build handback (evidence packet 79-capture-complete-v1)

```text
RESULT=PASS
LOCAL_AGENT_PRIMARY=build
REPO=fvanevski/opencode-operational-schema-guard; ISSUE=79; BRANCH=issue/79
SOURCE_START_SHA=25a4c8fe4e2d8db84ac5596b8c58989b23ec9edc
SOURCE_TESTED_SHA=25a4c8fe4e2d8db84ac5596b8c58989b23ec9edc + uncommitted-diff-hash=none (0-byte diff; no source changes required)
EVIDENCE_COMMIT_SHA=pending (confirmed by remote readback; a commit cannot embed its own SHA pre-publication)
EVIDENCE_PACKET_REF=docs/issue-78/evidence/79-capture-complete-v1 @ issue/79 (commit SHA confirmed by remote readback)
EVIDENCE_PUBLICATION=PASS (single evidence-only fast-forward commit; see remote readback)
EVIDENCE_MANIFEST_SHA256=b73eab60b4a80d553bf9cfd9dbbb7ca623efa9d0f308041696a1c10877e876f1
SOURCE_PATCH_SHA256=175dc2d326ff21a255b7b753fa1ef7be1f289d136aa2752eb132754441c8cb47
CHANGED_SOURCE_PATHS=none (no tracked or untracked source/test changes; git status --short empty)
CPU_TESTS=see cpu-tests.md (issue-78: 6 syntax exit0, candidate 15/15, 2 pilots exit0; issue-75: 2 syntax exit0, 25/25 + 1/1)
STOCK_V2_VERSION_AND_TOOL_SHAPES=see host-shapes.json (V2.2.5; write/edit input.path, shell input.command+result.output.exit, context messages use content field)
NATIVE_CAPTURE_RESULT=8 records staged natively in disposable private group: 3 file_change (write x2, edit x1), 2 tool_outcome (shell exit 1 then 0), 2 assistant_turn (native msg_ IDs), 1 user_turn; all native-id, related_event_ids link the admitted prompt to later tool/assistant events; scenario create->fail->fix->pass
QUEUE_DROP_AND_RETENTION_RESULT=501/501 staged at capacity 501; 502nd -> queue_full; drops {queue_full:1, pending_prompt_overflow:1}; drop counters survive restart; restart re-stage of an existing id -> duplicate; no rows dropped (see receipts.json)
LEGACY_JOURNAL_501_PLUS=501 records scanned across 4 pages (128/page); Journal.list() default still throws at the 500 bound; list(600)=501; ambiguous submission_unknown retained with exactly 1 add_memory attempt (no replay); no row loss (see receipts.json)
PILOT_SYNTHETIC_AND_REAL=synthetic (10 cases, 6 valuable): old 2/6, new 6/6 (recall 0.333->1.0), 0 noisy; real 8-case (7 valuable): old 0/7, new 7/7 (recall 0->1.0), 1 noisy; supplemental 11-case host-shape sample (7 valuable): old 1/7 (recall 0.143), new 7/7 (recall 1.0), 0 noisy, 0 source-ID collisions (see supp-compare.json)
PRIVACY_AND_GROUP_FENCES=PASS (see receipts.json privacy block: 15/15; chatter/secret/self-context/unsafe-workspace/unadmitted/cross-group/oversized/private-path/large-output/noisy all rejected; scoped in-workspace file ops + truncated long assistant captured)
PRODUCTION_MUTATION=none (installed seven-plugin config, Graphiti memory, and OpenViking state untouched; disposable XDG-isolated config/state used)
GRAPHITI_WRITE=none (GraphitiMcp endpoint pointed at closed loopback; no add_memory against any live graph)
OPENVIKING_MUTATION=none
GITHUB_MUTATION=evidence-only commit (this packet); no source push, no PR, no merge, no issue closure
KNOWN_GAPS=see below
NEXT=Central reads this exact GitHub evidence packet, reviews the (empty) source diff, and determines readiness to continue with Issue #80 on issue/79
```

## Lane-by-lane outcome

1. **Input identity + CPU qualification.** Clean worktree authenticated at
   `25a4c8fe4e2d8db84ac5596b8c58989b23ec9edc` (branch `issue/79`, equal to the
   remote tip at kickoff). All repo-defined node checks pass (cpu-tests.md).
   No in-scope production defect was demonstrated, so no source file was
   modified.
2. **Native V2 tool/edit provenance.** Disposable XDG-isolated stock V2.2.5
   session (private server, local vLLM provider, private candidate state root,
   `issue79_native` group) exercised create/edit/shell fail->fix->pass.
   Authenticated shapes (host-shapes.json): `write` input `{path, content}`,
   `edit` input `{path, oldString, newString}`, `shell` input `{command}` with
   `result.output.exit`; `session.context` messages use the `content` field with
   part types text/tool-call/tool-result/reasoning. The staged adapter consumes
   all of these correctly (`input.filePath ?? input.file_path ?? input.path`,
   `input.command`/`result.output.exit`, `m.parts ?? m.content`). **No adapter
   correction was required.** 8 records staged end-to-end (native-id, related
   event links).
3. **Capture/privacy invariants.** 15/15 (receipts.json): implicit/explicit user
   capture, task-scoped related IDs, long-finished-assistant bounded
   truncation, repeated context delivery, compaction, session restart, opt-out,
   cross-group/workspace exclusion, source-handle forgery, secret-after-truncation,
   unsafe file path, self-context recursion, noisy reads, large output, bounded
   context/message tracking and overflow/drop counters.
4. **Legacy journal >500.** 501 records paged with no loss; old `list()` 500-bound
   retained; drain/reconcile/search + CLI use paged reads; ambiguous
   `submission_unknown` is NOT replayed (single `add_memory`); no episode
   deletion. The pinned remote 100-episode `get_episodes` reconciliation window
   remains a separate Stage #80 item (not touched here).
5. **Frozen evidence comparison.** Synthetic + real frozen baselines unchanged
   (labels frozen). A supplemental frozen host event-shape sample (positive and
   negative file-operation cases + one root-cause->fix->test-pass cluster) was
   compared old-vs-candidate: candidate recall 1.0 vs old 0.143, zero noisy,
   zero source-ID collisions, and the four negative cases correctly excluded.
   Source events are NOT curated Graphiti memories; Stage #80 decides durable
   facts.

## Known gaps / residual materiality

- **`apply_patch` not natively exposed** in stock V2.2.5 (the probe observed
  `write`/`edit`/`shell`). The adapter retains defensive `apply_patch` handling
  (`input.patch`); if a future producer exposes it, the same `path`/scoped-file
  logic applies. Not a defect: the native file-tool receipt path is qualified.
- **Last single-turn assistant turn** (no subsequent context build) remains
  uncaptured by design (documented V2.2.5 API limitation: no `message.updated`
  / `session.idle` bus hook). No speculative hook was invented.
- **Native host receipts are scoped** to the disposable V2.2.5 local-provider
  session; they do not extrapolate to other hook versions.
- **Supplemental sample is in-workspace** (disposable local run); it is a
  sanitized shape/label comparison, not a claim about live production recall.
- **No source diff** was produced because the staged source already conforms to
  the authenticated native shapes; Central integration can accept the staged
  source unchanged.

## Invariants honored

No production config, Graphiti memory, or OpenViking state was mutated. No
Graphiti `add_memory` was written to any live graph (the candidate's baseline
recall endpoint was pointed at a closed loopback port). No model-backed
curator, scheduler, or second datastore was introduced. CPU-only and native-host
lanes were kept separate.

## COMMAND_SHAPE_FRICTION (canonical)

```text
encountered=yes
events:
  - scenario=native_pkg_setup
    requested_shape="set -e; rm -rf $B; mkdir -p ...; cp <6 candidate files>; printf package.json (single compound command)"
    effective_shape=not_executed
    rewrite_provenance=none
    event_kind=pre_execution_rejection
    execution_effect=not_executed
    correction_or_annotation="host shell guard rejected the compound rm -rf + cp command; split into discrete mkdir -p, individual cp, and write-tool package.json steps"
    replacement_shape="discrete: mkdir -p <dirs>; cp file -> dest (x6); write package.json (x2)"
    recipe_reference=none
    resource_reference=/tmp/opencode/issue79-native/pkg
    contract_conflict=no
    durable_gap_candidate=no
  - scenario=state_root_reset
    requested_shape="rm -rf $B/state; mkdir -p $B/state"
    effective_shape=not_executed
    rewrite_provenance=none
    event_kind=pre_execution_rejection
    execution_effect=not_executed
    correction_or_annotation="rm -rf blocked by host shell guard; avoided deletion by pointing the disposable config at a fresh state-run2/state-run3 directory instead"
    replacement_shape="mkdir -p state-run2; update config stateDir; (later state-run3)"
    recipe_reference=none
    resource_reference=/tmp/opencode/issue79-native/state-run2
    contract_conflict=no
    durable_gap_candidate=no
omitted_sensitive_values=yes
```

Notes on friction: both events are host shell-guard rejections of broad `rm -rf`
commands in the disposable scratch area; neither touched repository source or
protected live state, and both were recovered by discrete non-destructive steps.
`omitted_sensitive_values=yes` because the native provider apiKey was read from
the local production config to build the disposable config and is deliberately
excluded from this packet.
