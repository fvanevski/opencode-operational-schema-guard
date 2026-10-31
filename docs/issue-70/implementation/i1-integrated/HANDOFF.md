# Consolidated Phase 1 integration handback

```text
ISSUE70_I1_INTEGRATION=PASS
TRACKER_BASE_SHA=c4714d33f30ce6f3aa81eac1c9caabcdefd6a3b9
PUBLISHED_HEAD_SHA=the containing GitHub implementation commit; exact remote SHA returned in the final local handback
GITHUB_PUBLICATION=commit/readback status returned in the final local handback
SOURCE_OWNERSHIP=source-ownership.json (exact installed paths and full SHA-256 identities)
I1_REQUEST_IDENTITY=PASS
I1_BACKEND_RECEIPT=PASS
I1_PUBLICATION_BARRIER=PASS
I1_TERMINAL_QUiescence=PASS (exact archive/task/QueueFS and producer/worker replay fence)
I1_INTERACTIVE_ADMISSION=PASS (sticky admission state checked inside retained shared flock)
I2_NO_TASK_ACK=PASS (Central patch and its negative-path regression unchanged)
CENTRAL_RECEIPT_TESTS=PASS 7/7 unchanged
PHASE1_EXISTING_REGRESSIONS=PASS gate 53/53 (48 original + 5 multi-unknown recovery regressions); I2 negative-path regression unchanged
BACKEND_SERVICE_TESTS=PASS 20/20 actual backend runs (9 base + 9 subclass reruns + 2 new multi-unknown admission tests; 11 distinct service checks)
MULTI_UNKNOWN_ADMISSION=PASS queued task blocks distinct ambiguous recovery; exactly one authorized recovery after first terminal; two ambiguous unknowns fail closed until backend evidence; restart/replay-after-seal boundaries hold
RESTART_AND_DUPLICATE_TESTS=PASS
CROSS_BACKEND_ADMISSION=PASS CPU-only synthetic Graphiti/OpenViking scheduling and shared admission interlock
IMPLEMENTATION_FILES=candidate/gate/, candidate/openviking-v2/, candidate/shim/, backend-new/, patches/
TEST_EVIDENCE_FILES=tests/, qualification.json, package-reproduction.json, COMMAND_SHAPE_FRICTION.json
SOURCE_BASE_MANIFEST=source-base-manifest.json
ROLLBACK_FILE=ROLLBACK.md
REAL_GRAPHITI_TERMINAL=UNQUALIFIED
GRAPHITI_AUTOMATIC_WRITES=disabled
PRODUCTION_DEPLOYED=no
LIVE_PROTECTED_SURFACES_UNCHANGED=unverified (installed source/config hashes unchanged; no consistent live data snapshots)
OPEN_BLOCKERS=none for scoped CPU-only Phase 1 integration; historical keyless or unprovable operations intentionally remain blocked, as required
RECOMMENDED_CENTRAL_ACTION=Independently review this single source-only implementation commit, receipt proof, recovery admission and launcher contract; choose source-home/PR staging while retaining disabled configuration. Production activation remains separately authorized.
```

All paths above are relative to docs/issue-70/implementation/i1-integrated/. README.md explains proof boundaries, actual-backend fixtures, reproduction, disabled defaults and the local single-host ownership contract. SHA256SUMS binds all artifacts; CHANGED_FILES.txt supplies the complete added-file inventory. No raw logs, secrets, databases, virtual environments, unrelated plugins, PR or deployment are included.

The final matrix contains 136 passing checks: gate 53, Central receipt 7, capture 14, legacy OpenViking 24, compaction 7, offline validator 6, launcher 5 and actual backend service 20 (eleven distinct service checks). Gate and actual-backend suites were rerun after the multi-unknown recovery admission work. Tests use read-only root, disposable storage and a private network without GPU devices. Raw test output remains local; sanitized fixture traces and output fingerprints are retained.

A paused real archive publication produces no TaskTracker entry or scheduler occupancy, yet neither another gate job nor a compatible interactive wrapper can start. The exact request/task is then reconciled and unrelated work resumes without re-executing commit_async. Crash recovery uses the real native publication lease and durable queue metadata. A separate counterexample holds the worker active after a done marker; release remains blocked until worker/queue finality. A physical QueueFS replay after terminal seal executes no model call. Recovery enqueue itself requires explicit coordinator admission through independent metrics/quiet grace; ordinary receipt observation does not enqueue.

Two distinct ambiguous commit identities are now admitted as a pair: while one identity can still produce inference (queued, not executing), the other's recovery stays read-only and cannot enqueue; after the first reaches a verified terminal, non-replayable state, the second undergoes exactly one authorized recovery GET, registers/enqueues its exact durable task once (no duplicate extraction), and seals terminal. With two simultaneous ambiguous unknowns and no authoritative terminal proof, the guard stays fail-closed even under empty task lists and idle metrics; backend-authoritative evidence (a registered task) restores one identity before the other may recover. The recovery path requires the per-key publication fence to be free, so a paused original publication must complete registration/enqueue before its recovery GET can observe the archive; the fixture models that boundary explicitly.

No task command changed protected live code, configuration, services, memory or FalkorDB. Source and config hashes were re-read unchanged. Byte-level live database invariance remains unverified because services continued running; this is not upgraded to a snapshot guarantee.

# Phase 3 campaign handback (automatic capture + read-only recall)

```text
ISSUE70_PHASE3_RESULT=PASS (disposable-qualification scope; review-ready source-only candidate)
BRANCH=issue/70-automatic-recall
TRACKER_BASE_SHA=e430ef70c08f0489cf9a2f6ee5556545f60e5c86
PHASE2_SOURCE_PARENT=56e5d908e9d401791d2bbff09b271f2ec4ec8a16
IDENTITY_PREFLIGHT=PASS (OpenCode v2.2.5 2.2.5 event shape; graphiti-core 0.31.2 / falkordb 1.8.1 venv; FalkorDB :6382; LLM :8002 / embedder :8004 disposable; episode label Episodic)
CPU_SUITES=PASS phase3 22/22; phase2 28/28; gate 66/66; ov2 15/15; graphiti-recall 5/5; launcher 5/5; actual-backend 20/20 (161 checks)
INTEGRATED_CPU_HOST=PASS git:<sha>:memory-facts/<name>.json nomination -> deferred_unverified -> verified Git blob -> queued (authority git-record-v1); untrusted/wrong-group/out-of-prefix/secret sources stay deferred; duplicate coalesced; disabled policy refuses bootstrap; no model call or graph write in V2 hooks
REAL_GRAPHITI_TERMINAL=PASS separate-interpreter run on fresh disposable graph issue70_p3_real; episode 7eb5dc00-ef29-460f-bd43-68462bf3794b persisted with exact UUID/group/content readback; EX lease held during child; duplicate idempotent; failing child -> blocked_reconcile with 0 restart submissions
READ_ONLY_RECALL=PASS service on 127.0.0.1:9091; synchronous driver construction leaves _init_task None; graph state sha256 invariant before/after; exact source citation in V2 context hook; no-policy/no-data/wrong-group/duplicate/secret/wrong-token cases fail closed; exclusive non-PASS renders CURRENT STATE UNVERIFIED / CONFLICTED
TEMPORAL_BOUNDARY=RECORDED exclusive_state_transition auto-ingestion disabled by bootstrap policy (CPU-proofed); Phase 2 validator results retained at original identities (docs/issue-70/phase2/results/, a27e2bf5/772a3ac9/52e98600/42d50f72); remaining issue-70 requirements recorded (source-derived contract binding, durable work/episode-keyed validator outcome, exit 0/1/2/3 recall interpretation)
PACKAGE_RECONSTRUCTION=PASS gate.patch 13 entries + openviking-v2.patch 8 entries regenerated against installed bases 6ad48a93/6899822e, byte-exact forward and reverse; backend.patch unchanged; SHA256SUMS (46 entries), CHANGED_FILES.txt (47 files), source-base-manifest.json (phase3_evidence + source-pinned install mapping), qualification-phase3.json, ROLLBACK.md and friction ledger updated
GHDEV10_FRICTION=encountered (see COMMAND_SHAPE_FRICTION.json phase3_events: rm -rf compound rejection, live-DB contamination incident (repaired), zsh loop/harness shape, grep/node-summary interface discoveries, i1-service precondition discovery, patch-label artifact correction)
PROTECTED_LIVE_SURFACES=live gate config has no graphiti keys (stays disabled); live gate DB restored clean after the disclosed A3 contamination repair; installed plugin remains pre-Phase 3 (6899822e); no production capture activation
NO_NEW_PR=no; PHASE1_MERGE=no; PRODUCTION_DEPLOYMENT=no; LIVE_GRAPH_MUTATION=no (disposable issue70_* graphs only)
OPEN_BLOCKERS=none within the disposable-qualification scope; automatic exclusive-state recall and production activation remain separate, separately-authorized campaigns
RECOMMENDED_CENTRAL_ACTION=Independently review this single source-only Phase 3 implementation commit on issue/70-automatic-recall (fast-forward from e430ef70); production activation requires later explicit operator authorization with an exact reviewed host configuration
```
