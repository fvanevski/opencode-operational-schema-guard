# Issue #75 — reconcile unknown OpenViking commit before maintenance

**Status:** ACTIVE continuation of the previously authorized inference-maintenance contract. This file is a preflight/receipt-reconciliation *gate*, not a replacement Graphiti design and not new approval to replay, clear or mutate OpenViking state.

## Actual accepted state and new blocker

Previous authorized direct-Codex maintenance preflight (host handback, agent-reported, **not centrally independently inspected**):
- Source \`issue/75@94d3fa35114970137ccb44b97535134efb56a6e7\` checked; worktree unchanged; no GitHub writes.
- Native direct Codex CLI controller observed an **unresolved submitted commit from an earlier CLI session**, task UUID unavailable, and an authenticated receipt lookup returned **HTTP 404 "receipt unavailable"**. Installed gate could not prove quiescence. Controller effective inference URL remained unverified.
- Consequently: **no competing clients paused, no GPU experiment, no Graphiti episode submitted, no source modifications**.
- Agent reports 19 Node tests, six Python drain tests, ten mocked extractor cases PASS; 17 protected files and forensic graph state unchanged, production health PASS; 151 sealed artifacts verified. These are *reported facts* pending independent artifact inspection.
- Preserve and read all four host-local artifacts *before any runtime action*:
  \`/tmp/opencode/issue75-direct/maintenance-KspwwJT3/HANDBACK.md\`;
  \`/tmp/opencode/issue75-direct/maintenance-KspwwJT3/BOUNDARY.md\`;
  \`/tmp/opencode/issue75-direct/maintenance-KspwwJT3/MAINTENANCE_LEDGER.json\`;
  \`/tmp/opencode/issue75-direct/maintenance-KspwwJT3/EVIDENCE_MANIFEST.json\`.
  Preserve predecessor artifacts under \`/tmp/opencode/issue75-direct/campaign-mRAN53f8/\` and earlier Issue #75 archives.

Canonical GHDEV-08/10 distinction: an unknown commit plus \`blocked_reconcile\` may indicate a crash between backend acceptance and durable task-ID persistence. Backend \`404\`/\`410\` handling, broker-spool \`unknown\`, a missing receipt, terminal backend task, and a queue lease are **different facts**. Do not infer safe replay from any missing identifier/404. Use actual installed gate and backend public schema, including observed QueueFS \`queue_messages\`, not historical field names or a script that assumes a stale schema.

## Scope and authority

<<< LOCAL_AGENT_CONTRACT_BEGIN >>>
REPO_ID=fvanevski/opencode-operational-schema-guard
ISSUE_NUMBER=75
BRANCH=issue/75
REQUIRED_HEAD_SHA=pinned in Central's kickoff; verify before work
EXECUTION_PLANE=existing-direct-Codex-CLI-controller; Antigravity direct only if current actor independently qualified
OBJECTIVE=read-only exact unknown-commit reconciliation, verified controller transport, then conditional authorized maintenance
OPERATIVE_MAINTENANCE_CONTRACT=docs/issue-75/AUTHORIZED_INFERENCE_MAINTENANCE_CONTRACT.md
OPERATOR_AUTHORIZATION=temporary reversible pause of specifically identified competing inference clients (already granted)
OPENVIKING_STATE_REPAIR_AUTHORIZATION=no
UNKNOWN_COMMIT_REPLAY_AUTHORIZATION=no
GATE_CLASSIFIER_OR_LOCK_MODIFICATION=no
REMOTE_GITHUB_WRITES=no
PRODUCTION_GRAPH_MUTATION=no
NEW_EPISODE_BEFORE_GATE_ADMISSION=no
SIMULTANEOUS_SOURCE_WRITERS=1
CENTRAL_INDEPENDENT_REVIEW=required

**Task:** Own this evidence collection and bounded resolution through one continuous host-local process. Do not request individual operator shell readbacks, spawn an unrelated multi-agent campaign, or restart Issue #75 retrieval benchmarking. The Codex App may supervise/passively collect output, but must not independently edit the worktree or issue model requests. Favor targeted host-native diagnostics over extra orchestration.

### A. Rehydrate and authenticate the exact blocker (READ ONLY)

1. Verify the *current* source/head in an isolated caller-owned checkout; read the complete prior typed handback, BOUNDARY.md, maintenance ledger, manifest, and the earlier controller handback/related artifacts; validate SHA-256 coverage and evidence provenance. Inspect original complete records, not only the summarized claim. Record exact version, process identity, config source hashes and which records actually establish an unresolved *submitted* event. Preserve preexisting private artifacts unchanged. Treat absent fields explicitly as UNVERIFIED, not guessed.
2. Inspect the installed OpenViking gate and backend **read-only**: exact source/config and status endpoints, active service processes/argv, lock owner/inode, scheduler running and waiting metrics, current admission reason, broker spool/SQLite schema and rows, transaction/attempt timestamps, task/receipt APIs, backend QueueFS task schema, logs for the exact time window and relevant identities. Derive live table names/columns via actual schema or current code; historical \`queue_messages\` is a lead, not automatic schema authority. Use read-only SQLite connections and a WAL-consistent snapshot as necessary; NEVER edit the live DB, truncate WAL, remove lock paths, vacuum, or delete journal/queue state. Credentials stay private and out of evidence exports.
3. Resolve exactly which original operation is ambiguous. Correlate the **same** authenticated account/user/peer/session (and physical segment, generation, idempotency key, body fingerprint if present) across client handoff, gate spool, service logs, backend task/QueueFS rows and receipts. Record a collision/duplicate check before concluding. A missing task UUID on one side may require correlation via stable request identity, acknowledged backend request ID, timestamp, queue message ID, session generation and payload digest. Use narrow time and identity filters, not unbounded log dumping. Do not accidentally read sensitive session content into publicly sharable artifacts.
4. Distinguish these possible outcomes, with independent evidence:
   - **TERMINAL_PROVEN:** authenticated exact task/session/generation readback shows completed/failed/skipped terminal state, no async work remains, receipt semantics and release proof are understood;
   - **NEVER_ACCEPTED_PROVEN:** a complete authoritative ingress/spool/backend correlation establishes nonacceptance and no outstanding work; mere 404/absent task UUID cannot prove this;
   - **IN_FLIGHT:** backend request/task or queue ownership may still be active;
   - **UNKNOWN:** evidence incomplete, 404 ambiguous, retention/route mismatch, missing identity or conflicting durable views;
   - **RECOVERY_ACTION_REQUIRED:** the outcome is established but the gate remains blocked because its durable state was not automatically reconciled, and clearing it requires a live state transition.
   Preserve every distinct generation and historical terminal failure. A terminal newer generation does not automatically clear an older unresolved failure. Do not regenerate a commit/task to "test" the original request, call the submit/commit endpoint, rerun pending drain, or force a fresh receipt into existence.

### B. Prove controller transport and actual admission condition (READ ONLY)

5. Establish the native Codex controller's effective model provider and inference endpoint from authoritative process argv/config, supported status, actual API request identity or safely attributable endpoint telemetry. Inherit neither a name nor an assumption that a remote provider is used. Do not print secrets, intercept unrelated application traffic or generate a local inference request merely to prove routing. If already captured evidence cannot establish the endpoint, use a permitted non-GPU model transport check that cannot reach the protected \`:8001\`; otherwise stop at \`CONTROLLER_TRANSPORT_UNVERIFIED\`.
6. Observe the gate under its **existing unmodified policy**: original receipt state/barrier, current quiescence indicator, canonical cooperative lock, scheduler occupancy, real competing ingress capability and 30s quiet grace. Classify Codex App and direct CLI process roles by actual work, not only name. No process-name exemption, blocked-state override, spoofed lease environment, lock-file deletion or gate shutdown to obtain admission.
7. **Reconciliation outcome determines the branch:**
   - If the original operation is proven terminal/released (or proven never accepted) AND the installed gate **already reports safe admission with no reconciliation barrier** through its normal read-only observation, proceed into section C without another Central turn.
   - If the same exact operation remains \`unknown\`/in-flight, or the gate still shows \`blocked_reconcile\` despite backend terminal proof, do **not** pause clients or run GPU. Report its exact record keys, read-only evidence, required official recovery API/transaction and minimum state mutation as \`RECOVERY_ACTION_REQUIRED\`; stop for Central authorization. User approval to pause inference clients is not authority to force/clear/replay a commit.
   - If the receipt service returns 404, investigate auth/route/version/retention versus missing task, but do not regard fixing the lookup as automatically settling the durable commit. Distinguish interface failure from backend ledger truth.
   - If controller provider routing cannot be authenticated or any competing inference ingress cannot be controlled, stop with evidence; no speculative model-backed test.

### C. Only after verified gate admission: finish the *already authorized* maintenance campaign

8. Read and execute \`AUTHORIZED_INFERENCE_MAINTENANCE_CONTRACT.md\` within its exact existing limits, WITHOUT seeking another permission to reversibly pause proven interfering clients. Make one staged preflight/restoration ledger identifying exact safe-stop targets and their active job/queue state. No global system sweeps, broad firewall, ninfer server config change, or protected data mutation. Restore all targets even after a failed experiment; preserve the gate health and no pending or unknown async work.
9. If permitted by verified exclusive ingress isolation, run CPU preflights and a small number of diagnostic Graphiti extraction tests on disposable worker/model alias and a unique new source-attributed group; no replay of the historical five zero-edge records or two clean-fact failures. Inspect actual effective prompt, model JSON/structured shape, generation parameters, postparser results and graph persistence. Repair only bounded disposable subsystem configuration/code. One newly **materialized and recallable** edge with source group/sourceRef is sufficient; do not undertake another reranker campaign. Return complete local diff for Central to independently review. No GitHub push/PR/merge or production promotion.
10. Maintain the three separate outcome fields \`episode_persisted\`, \`facts_materialized\`, and \`recall_verified\`. Never infer the latter two from the former, HTTP 200, a "Successfully processed" line or cleanup wrapper rc=0.

### D. One consolidated handback

Return as one private, nonsecret, SHA-256-manifested bundle and typed handback:
\`\`\`text
RESULT=PASS|PARTIAL|BLOCKED|FAIL
SOURCE_HEAD_SHA=<full GitHub/checkout SHA>; SOURCE_DIFF=<path and hash or none>
ORIGINAL_SUBMISSION_IDENTITY=<account/peer/physical-session/generation/request marker, redacted>
RECEIPT_LOOKUP=<actual URL route/version, HTTP status, authorized identity, response shape>
GATE_SPOOL_ROW=<table/primary key/state/request generation/attempt/claimed_at/updated_at, sanitized>
BACKEND_QUEUE_AND_RECEIPT=<authoritative task/message IDs, current state, terminal/release evidence, or absence-not-proven>
EXACT_OUTCOME=TERMINAL_PROVEN|NEVER_ACCEPTED_PROVEN|IN_FLIGHT|UNKNOWN|RECOVERY_ACTION_REQUIRED
GATE_ADMISSION=<readback, lock owner, scheduler running/waiting, 30s quiet grace, barrier>
CONTROLLER_TRANSPORT=<actual backend/model effective endpoint, evidence or UNVERIFIED>
RECOVERY_PROPOSAL=<only if required: minimal supported mutation, preconditions, rollback, expected invariant; NOT executed>
MAINTENANCE_PROCEED=<yes|no, admission evidence and protected clients inventory>
GRAPHITI_RUN=<only if admitted: unique group, UUID, extracted nodes/edges, source-attributed fresh recall>
HOST_CHANGES=<none or scoped reversible changes and rollback>
PROTECTED_STATE=<config/source hashes, gate/backend/Graphiti services, queues, graph groups>
TESTS=<reused exact-head evidence and focused new checks without needless repeat>
EVIDENCE_BUNDLE=<host path, inventory equality, SHA256 and privacy review>
COMMAND_SHAPE_FRICTION=<full canonical GHDEV-10 requested/effective/provenance/event/outcome fields>
REMAINING_BLOCKERS=<specific evidence/authority required>
\`\`\`
Keep all original unknown-commit artifacts, even if a later task resolves. Distinguish read-only reconciliation from a durable-state repair. No claiming PASS based on an inferred absent receipt or on a prior mock-only extractor test.

**Stop conditions:** any unknown original commit outcome, gate barrier still present, inconsistent identity, unverified controller endpoint, unsafe client quiescence, potentially active model work, or need for a protected state mutation. No speculative workarounds; return the best causal evidence and the smallest supported recovery transaction.
<<< LOCAL_AGENT_CONTRACT_END >>>
