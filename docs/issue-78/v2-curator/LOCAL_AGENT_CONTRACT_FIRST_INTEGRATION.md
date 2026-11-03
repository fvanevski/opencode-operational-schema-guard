# Issue #80 — first integrated local Build campaign

REPO_ID=fvanevski/opencode-operational-schema-guard
ISSUE_NUMBER=80
PARENT_ISSUE=78
PREDECESSOR_ISSUE=79
BRANCH_NAME=issue/79
LOCAL_AGENT_PRIMARY=build
TASK_CLASS=caller-owned source-integration, deterministic CPU, real host inference,
  Graphiti and private portal qualification
SOURCE_START_COMMIT_IDENTITY=see kickoff exact full SHA
SOURCE_REMOTE_UPDATE=forbidden
EVIDENCE_REMOTE_UPDATE=allowed
REMOTE_UPDATE=evidence-only
EVIDENCE_PACKET_REQUIRED=yes
EVIDENCE_ROOT=docs/issue-78/evidence/80-first-integration-v1
PR_CREATION=forbidden
MERGE=forbidden
ISSUE_CLOSURE=forbidden
PRODUCTION_ACTIVATION=forbidden
PRODUCTION_GRAPHITI_MUTATION=forbidden
OPENVIKING_MUTATION=forbidden

## Goal, source authority and material scope

Complete **one coherent #80 integration/qualification campaign** for the
Central-authored candidate-curation -> deterministic validation -> admitted
Graphiti -> native source mapping and local operator review path. Start from
the exact SHA declared in the kickoff; authenticate GitHub remote and local
worktree identity before making a change. Read Issue #80 and the existing
accepted #79 packet, nearest repository and global AGENTS.md, current
stock-V2/gate source and:
- docs/issue-78/v2-curator/README.md and the core/model/worker/CLI/
  sourced-recall/portal-server/activation and test files.
- docs/issue-78/v2-candidate/{events,queue,plugin,candidate.test}.mjs.
- docs/issue-75/v2-candidate/{plugin,memory-core,post-exit-drain}.*
- docs/issue-78/REVIEW_EVIDENCE_PACKET.md.

Preserve accepted #79 host findings, frozen fixtures, Issue #75 legacy journal,
seven-plugin production configuration, source-attributed recall and OpenViking.
Do **not** rerun the #79 discovery campaign or launch a new general GUI
project. Central owns the architecture/source design, and has staged
the initial implementation and deterministic regressions. You own host
integration, host-only compatibility diagnosis, bounded in-scope repair,
tests and evidence export.

## One campaign, complete this objective in order

1. **CPU-only source admission and regressions.** Run each command in the
   README's repository-deterministic block. Do not claim PASS merely from
   V8 syntax parsing. Record Node version, commands, exit, test names/counts,
   bounded failures, exact source tree/SHA and `git diff --check`.
   Fix demonstrated in-scope defects in the existing curator/queue/recall
   boundary in one cycle, rerun the relevant focused and legacy suites.
   Do not edit frozen #79 benchmark labels. Build errors are diagnosis,
   not grounds to weaken assertions, source checks, authorization or
   privacy rules. Prefer a meaningful combined fix over serial micro-edits.

2. **Portal build and actual functional browser/API qualification.** In
   `docs/issue-78/v2-curator/portal`, do `npm install`, `npm run check`
   and `npm run build`. Read/retain the resulting `package-lock.json` as
   uncommitted proposal evidence, not a source commit. Run
   `node --test docs/issue-78/v2-curator/portal-api.test.mjs`.
   Use a fresh disposable group/state root, a new 0600 random local portal
   token, a private loopback port and the built `dist`; exercise the actual
   browser or available browser automation, not only a static screenshot.
   Verify: login/token rejection, origin/CSRF rejection, live refresh,
   state filtering, source timeline, graph pan/zoom and source associations,
   source-bound edit-and-approve, rejected fabricated/verified/wrong-group
   assertion, revision conflict on two tabs, DEFER/re-evaluate and
   discard, duplicate/merge/supersession proposal, `submission_unknown`
   lockout, positive episode-only persisted badge, responsive layout,
   keyboard navigation, dark/light, no browser model/Graphiti API calls.
   A native Playwright/Firefox/browser integration already available on
   host is suitable; do not introduce a separate browser-testing platform
   if not needed. If browser automation is unavailable, do the admitted
   manual browser actions and report precisely which were observed vs
   unverified, with sanitized screenshots and UI/API receipts.

3. **Real local-model and Graphiti qualification, separate host lane.**
   Check the actual installed gate source/config, existing shared EX
   lock, active-harness detection, quiet grace, inference-idle metrics,
   current model inference backend/API and Graphiti MCP endpoint. Reuse
   the **accepted** `post-exit-drain.py` wrapper with this staged
   `curator-cli.mjs`: it takes `--gate-source`,
   `--gate-config`, `--cli`, `--group`, `--state-dir`,
   `--endpoint`, `--max-seconds` and `--lock-timeout`;
   the child receives `GHDEV_MEMORY_POST_EXIT_LEASE=admitted`
   only inside the wrapper. Set `LOCAL_CURATOR_URL`,
   `LOCAL_CURATOR_MODEL`, `LOCAL_CURATOR_API_KEY` as
   private host environment inputs; never copy secrets to the repo.
   Use the already-running local model/Graphiti services, with
   a **disposable Graphiti group** and private #79 candidate state.
   No second model server/scheduler or actual production-group writing.
   Confirm real OpenAI-compatible JSON response shape and model ID,
   namespace, timeouts, token counts and model latency.
   Demonstrate one ordinary implicit user+tool+assistant cluster that
   produces a grounded EMIT, exactly one `add_memory` episode under
   group-scoped admitted execution, positive exact Graphiti episode UUID
   readback and the new `_episode-index` confirmation.
   Demonstrate the existing native recall source mapping with exact
   group/workspace/evidence class and the already accepted injection
   budget (not just a plausible model answer). A genuine post-merge
   installed **fresh-client/native-session** acceptance belongs to #81;
   the disposable candidate still needs authentic native context proof
   where feasible.

   **Important process boundary:** do not run model curation or Graphiti
   extraction in the active OpenCode Build harness. Perform CPU/UI work
   during Build. Prepare the disposable post-exit instance/wake; then
   terminate the interactive harness for the genuine model-backed run.
   If the currently active harness cannot collect the terminal result,
   return `READY_FOR_POST_EXIT_OPERATOR_RUN` with one exact native
   wrapper/systemd command, bound private group/state, and expected
   evidence path. The necessary post-exit continuation belongs to
   this same campaign; do not weaken the gate, pretend a same-process
   test proves exit, or spin off a new architecture slice. Any
   operator-run result must be captured and returned for Central
   adjudication as an authenticated separate receipt.

4. **Recoverability, negative scenarios and automatic wake.** Using
   deterministic stub Graphiti before real service if necessary,
   exercise `SKIP`, valid/invalid EMIT, duplicate equality deferral,
   MERGE/SUPERSEDE proposals only, unsupported/weak-ID and
   group/workspace exclusion, malformed/timeout model -> DEFER,
   `approved -> submission_unknown -> queued -> persisted`,
   unknown ACK without blind replay, restart, and failed/denied portal
   review actions. Keep a real unknown write observable, do not
   use recent-window absence to authorize resend. Exercise the
   disposable systemd PathModified -> oneshot wake from staged
   `activation/*.in` against real gate identity, including
   pre-exit exclusion and one post-exit admitted run, if the current
   gate supports this routing. You may correct template/environment
   bindings and event-wake behavior within this **disposable** scope,
   without changing the canonical external gate or installing a
   standing production unit. An unknown remote submission may require
   retaining EX; never bypass this or stop production Graphiti workers
   merely to make a test terminal.

5. **Bounded autonomy and the stop boundary.** Source corrections are
   allowed locally **only** inside
   `docs/issue-78/v2-curator/**`,
   `docs/issue-78/v2-candidate/{plugin.mjs,candidate.test.mjs}`,
   and the narrow #75 `{plugin.mjs,memory-core.mjs,memory-core.test.mjs,
   plugin-behavior.test.mjs}` needed for source-mapped recall. Additional
   narrowly scoped tests or portal package-lock are permitted. Fix
   demonstrated bugs to root cause and rerun relevant CPU and isolated
   integration tests; preserve all security and evidence controls.
   Do not ask Central to decide ordinary parsing, runtime shape,
   package resolution or disposable UI fixture bugs. Escalate only
   material semantic/identity redesign, protected service/data mutation,
   external gate authority change, unrecoverable unknown Graphiti send,
   genuine source authority drift or a scope-changing requirement.
   Do not create another PR, issue, independent scheduling service,
   general memory GUI or Codex/Antigravity adapter.

6. **Publish the actual evidence bytes on GitHub.** The entire packet
   goes in `docs/issue-78/evidence/80-first-integration-v1`
   on the *same issue/79 working branch*, per
   `docs/issue-78/REVIEW_EVIDENCE_PACKET.md`:
   `manifest.json` with exact starting source SHA/tree, tested source
   identity including local diff, artifact file SHA-256 hashes and
   omissions; `handback.md` with complete typed results and canonical
   `COMMAND_SHAPE_FRICTION`; full `source.patch` including
   untracked portal lockfile and all changed files (or exact changed
   bytes); `cpu-tests.md`; `model-curator.json` with **sanitized**
   response structure/reasons/tokens/timing and exact source handles,
   not raw private prompts; `graphiti-receipt.json` with group-scoped
   episode UUID, unknown/queued/persisted readback, lease/gate
   receipts; `portal-api-browser.md` and sanitized screenshot(s)
   of actual browser UI if available; `activation-receipt.md`
   and durable state/CLI status including failures and recovery.

   Audit EVERY staged evidence file/patch/screenshot for private
   content, credential names/values, endpoint tokens, raw transcripts,
   protected files, raw model output and arbitrary host logs.
   Stage exactly and only the designated evidence directory;
   `git diff --cached --name-status` must show no source/config
   changes. Before remote write, re-fetch and authenticate the
   remote branch still equals the original exact source SHA.
   Make **one evidence-only fast-forward commit** on issue/79.
   Verify remote ref and all artifact paths/hash readback, return the
   exact full evidence commit SHA plus direct GitHub directory URL.
   Do not push source changes, commit a new PR, merge, force-push,
   rebase a moved branch or deploy a production plugin. Remote
   STALE/denied -> `EVIDENCE_PUBLICATION=STALE|BLOCKED`,
   complete sanitized portable packet fallback, no false PASS.

## Required typed handback

```text
RESULT=PASS|PARTIAL|FAIL|BLOCKED|STALE|READY_FOR_POST_EXIT_OPERATOR_RUN
LOCAL_AGENT_PRIMARY=build
REPO_ID; ISSUE_NUMBER=80; BRANCH_NAME=issue/79
SOURCE_START_SHA=<exact full SHA from kickoff>
SOURCE_TESTED_SHA=<full commit plus complete uncommitted diff SHA256>
EVIDENCE_COMMIT_SHA=<full|none>
EVIDENCE_PUBLICATION=PASS|BLOCKED|STALE|UNATTEMPTED
EVIDENCE_PACKET_REF=<GitHub direct path@full SHA|none>
EVIDENCE_MANIFEST_SHA256=<SHA256>
SOURCE_PATCH_SHA256=<SHA256, including new files>
CHANGED_SOURCE_PATHS=<exact paths, including untracked>
CPU_TESTS=<all commands/exits/test counts>
PORTAL_BUILD_AND_BROWSER=<actual build and real UI/API receipts>
HOST_MODEL=<version/model/endpoint type, no keys, timing/tokens>
POST_EXIT_GATE=<real source/config identities, lease, idle, quiet grace, exit>
GRAPHITI=<private group, remote id, exact positive persistence evidence>
NATIVE_SOURCE_RECALL=<source/group/authority/assembled-context evidence>
UNKNOWN_SUBMISSION=<reconciled|retained|not_exercised>
AUTOMATIC_WAKE=<qualified|blocked|not_exercised>
LEGACY_ISSUE75_AND_ISSUE79=<regression outcomes>
PRODUCTION_MUTATION=none
OPENVIKING_MUTATION=none
SOURCE_GITHUB_MUTATION=none
GITHUB_MUTATION=<one evidence-only commit|none>
KNOWN_GAPS=<bounded, materiality and next owner>
NEXT=Central independent review and accepted source integration on issue/79
```

COMMAND_SHAPE_FRICTION (mandatory, even when RESULT=PASS):
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
If no friction: encountered=no; events=[]; omitted_sensitive_values=no.
No raw logs/secret values. Material recovered tool-shape discovery remains
recorded even if the final run succeeds. Return handback in chat alongside
the authenticated GitHub packet URL; a host-local /tmp path alone is
not a valid Central review artifact.
