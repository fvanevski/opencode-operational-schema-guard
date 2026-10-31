# Issue #70 — automatic Git-source capture, read-only Graphiti recall and isolated runtime (Phase 3)

**Central-staged architecture / code contract.** Read the actual candidate source as authority, not this document as test evidence. Branch: `issue/70-automatic-recall`, based directly on Phase 2 source-only `56e5d908e9d401791d2bbff09b271f2ec4ec8a16`. PR #71 is the separate approved Phase 1 source package and remains unmerged until a separate explicit merge approval. Do **not** open another PR for this slice or duplicate Phase 1 history in a review.

## Intended functional behavior (source authority and system boundaries)

### Automatic capture (one bounded source family)

The stock-V2 OpenViking plugin already nominates schema-v1 `agent_candidate` metadata from **completed operator-allowlisted tools**. That user-facing callback remains cheap and nonblocking, posting a source reference to the existing localhost gate; it never calls Graphiti. Untrusted metadata does **not** become a verified fact by supplying a basis/confidence field.

Central added `phase3/git_source_authority.py` implementing a concrete independent `GitFactResolver`. An operator policy (established once) names one canonical repository root, trusted branch ref, source prefix, permitted workspace/group/category, and a revision. The nominated `fact_ref` has the form `git:<40-char-sha>:memory-facts/<safe-name>.json`. The resolver checks Git commit ancestry against the approved ref and reads a bounded **immutable blob from Git object storage**, never the working tree or raw session text. The JSON record contains exactly `schema_version=1`, `workspace_id`, `group_id`, `category`, `episode_body`, `reference_time`; metadata only selects the immutable source. This authenticates repository content and scope, not the truth of arbitrary claims, and is intentionally narrower than a general classifier.

Central added `SharedWorkQueue.auto_admit()` and a `Worker.source_resolver` hook. When graphiti is enabled **and** an authenticated non-disabled adapter/resolver have been explicitly installed, the ordinary worker inspects at most **two** deferred candidates per tick, independently resolves their immutable Git source and promotes verified work in the existing SQLite transaction through `admit_attested`. All actual inference still flows through the existing scheduler-idle checks, shared EX flock, quiet grace and backend terminal observer. A malformed/rejected source stays deferred and cannot self-promote; no per-event operator approval is necessary for already-approved Git paths. This is one concrete supported source type, not a promise to classify every arbitrary chat turn.

### Cross-interpreter Graphiti execution

Installed OpenViking gate and Graphiti Core are in different Python environments; the bridge **does not install Graphiti into the gate interpreter**.

- `phase3/graphiti_process_transport.py`: creates one *awaited* Graphiti child process for the current coordinator-owned work, under the gate's existing exclusive inference lease. It sends a bounded JSON request over stdin (not CLI argv), accepts only a unique terminal record, and validates the returned UUID/group/name/content.
- `phase3/graphiti_core_worker.py`: runs under the operator's exact Graphiti 0.31.2-compatible Python interpreter, awaits `Graphiti.add_episode`, reads the persisted episode back by exact UUID/group and closes the Graphiti client before emitting the terminal record. It refuses non-disposable targets.
- `phase2/graphiti_terminal.py`: the shared receipt owner, now also invoking the client finalizer before sealing; failure leaves the durable work blocked.
- `candidate/gate/graphiti_runtime_bootstrap.py`: explicit opt-in `serve()` composition, requiring a reviewed Phase 3 directory, source policy, matching group, executable, and a disposable graph named `issue70_*`. No second inference scheduler.

Transport uncertainty, child exit, timeout, process crash, or readback mismatch must never seal completion or blindly resubmit. Sticky admission remains protective after restart and config disablement.

The **qualification-only** configuration explicitly rejects auto-ingestion of `exclusive_state_transition` events until the existing validator outcome can be durably associated with the same source/episode receipt. The Phase 2 manually exercised validator is retained and must not be misrepresented as fully automatic production validation.

### Read-only contextual recall

- `phase3/graphiti_recall_service.py`: a separate, localhost-only, bearer-protected **read-only** service in the Graphiti Python environment, making bounded parameterized FalkorDB Cypher *reads* only. Constructing the Falkor driver outside an active event loop avoids its implicit index-creation task. It requires a matching exact `group_id`, and source joins against **completed, Git-attested** work in the gate SQLite. No ranked search, embedding call, raw graph scan or Graphiti extraction is allowed in this service.
- `candidate/openviking-v2/graphiti-recall.mjs`: bounded, intent-triggered localhost client; max 8 items / 2400 characters, default 4 / 1600; rejects untrusted records, wrong group, missing Git source, secret-like content and duplicate context. Exclusive-state facts without validator proof are marked `CURRENT STATE UNVERIFIED / CONFLICTED`.
- `candidate/openviking-v2/index.mjs`: injects optional Graphiti memory **after the original OpenViking hybrid context**, preserving its default behavior. A missing policy/endpoint or timeout results in no graph injection; no Graphiti call in the V2 hook invokes an LLM or embedding model.

This recall implementation currently marks **all** exclusive-state claims UNVERIFIED because it has no trusted temporal validation-status ledger reader. It is safe for scoped normal facts; do not claim the feature is complete for exclusive-state recall or enable that category in production.

## Explicit example operator policy (disposable only, never commit credentials)

```json
{
  "enabled": true,
  "source_type": "git-record-v1",
  "revision": "issue70-r1",
  "repository": "/absolute/path/to/operator-approved-repository",
  "trusted_ref": "refs/heads/main",
  "source_prefix": "memory-facts",
  "workspaces": ["/absolute/path/to/disposable-workspace"],
  "groups": ["issue70_phase3_disposable"],
  "categories": ["durable_decision", "verified_architecture_fact", "entity_relationship"]
}
```

The V2 capture policy additionally names only the trusted `tools`, `workspaces`, `groups`, and `categories`; use the same workspace/group IDs. The V2 recall policy is a separate opt-in JSON of the form `{"enabled":true,"groups_by_workspace":{"/absolute/path/to/disposable-workspace":"issue70_phase3_disposable"},"max_items":4,"max_chars":1600}`.

With an explicitly chosen candidate gate config:

```toml
[worker]
drain_enabled = true
receipts_enabled = true
graphiti_enabled = true
graphiti_runtime_dir = "/absolute/path/to/checkout/docs/issue-70/phase3"
graphiti_source_policy = "/absolute/path/to/operator-policy.json"
graphiti_core_python = "/workspace/mcp_servers/graphiti/upstream/mcp_server/.venv/bin/python"
graphiti_group = "issue70_phase3_disposable"
```

This is a **disposable test example**, not a production switch-on recipe. Use an isolated SQLite database, lock, gateway ports, graph, OpenCode config, HOME and XDG directories. Keep existing live worker config `graphiti_enabled=false` and `receipts_enabled=false`, with no capture/recall policy enabled.

The read-only endpoint requires `GRAPHITI_RECALL_GROUP`, `GRAPHITI_RECALL_GATE_DB`, `GRAPHITI_RECALL_TOKEN` and optional port, in a disposable process. V2 expects `GRAPHITI_RECALL_POLICY_PATH`, `GRAPHITI_RECALL_URL` and the same token. Never place the token or raw graph results in committed evidence.

## Required local-agent qualification in ONE campaign

1. **Identity/preflight (CPU):** verify actual OpenCode V2 version/plugin event semantics, Graphiti Core client/driver field names and current 0.31.2 source identity, Python environments, operator-owned Git source root, shared gate DB+lock and current source baselines. Inspect source before repairing. Do not install candidate over the live gate.
2. **Focused CPU tests:** `python3 -m unittest discover -s docs/issue-70/phase3 -p 'test_*.py' -v`; `node --test docs/issue-70/implementation/i1-integrated/candidate/openviking-v2/tests/graphiti-recall.test.mjs`; updated Phase 2 terminal tests (now +3 client-lifecycle regressions), existing Git nomination, admission and V2 capture tests. Use the appropriate installed Python for each test; record exact interpreter/source identities.
3. **Integrated CPU host process:** with disposable gate and Git repo, prove a completed native V2 tool event nominates a `git:SHA:path` source; the gate stores `deferred_unverified`; a worker independently verifies the Git blob and promotes to `queued` without per-event operator intervention; disallowed source stays deferred. Assert no model call or Graphiti write occurs in the V2 event/context hooks.
4. **Real Graphiti separate-interpreter run:** against a *fresh disposable issue70_* graph* and the operator-approved local LLM/embedder, let the actual gate Worker hold its EX lease while the Python 3.13 Graphiti child ingests exactly one Git fact. Confirm the child returns only after persisted exact UUID/group/content readback, then a durable `completed` receipt is sealed. Verify duplicate idempotency, a second OpenViking job's exclusion, child failure/timeout blocking and cleanup. CPU-only test doubles do **not** replace this one real integration.
5. **Read-only recall & V2 coexistence:** use the existing Graphiti/FalkorDB installation with the read-only service against the disposable graph; verify the Graphiti 0.31.2 `RELATES_TO` edge/group/episode provenance shape and modify the bounded Cypher field mapping only if needed. Exercise one query with a graph-relation intent and the exact source citation in the V2 context hook, plus no policy/no graph data/wrong group/duplicate/conflicted state. Verify OpenViking baseline context and other plugin hooks remain intact; no implicit index/graph writes or hidden model inference in recall.
6. **Temporal boundary:** retain Phase 2's authenticated real post-write validator results. Automatic exclusive-state capture is currently **disabled by startup policy**. If the existing source-derived transition contract and validator can be integrated into the same durable pipeline without a new framework, add a narrowly scoped post-write outcome ledger keyed by work/episode and prove statuses `0/1/2/3`. Otherwise record this exact remaining acceptance requirement; never claim auto temporal PASS or enable the exclusive category without the ledger.
7. **Package reconstruction:** rerun affected gate/receipt/launcher/stock V2 suites; update gate and V2 source patches, complete manifest/changed-file inventory, `SHA256SUMS`, Phase 3 evidence, reproduction and rollback. Reuse unchanged prior real-Graphiti/temporal results only at their **original** source identities. All new Python and JS files must be package/install mapped to their executable roots, not merely listed as evidence.
8. **Publication:** one coherent push to `issue/70-automatic-recall`, fast-forward and exact head readback. No new PR, Phase 1 merge, live Graphiti/FalkorDB write or production deployment. Full approval/merge decisions remain Central-owned.

**No unnecessary side campaigns:** do not tune the reasoning model's `</think>` output, migrate historical V1 code, reimplement FalkorDB, build an independent scheduler, prompt-classify arbitrary transcripts or treat a fixture as validated runtime behavior. The local agent may repair source-specific import/signature/packaging mismatches and needed tests within these components without an intermediate handoff.

## Required evidence and stop boundaries

Record CPU test commands/counts, real Git source commit/blob, V2 tool event group identity, SQLite state transitions, child interpreter and exact persisted episode, process-lock ownership, optional validator disposition, read-only recall response and context injection size/source, manifest/patch byte proofs, protected live surface nonmutation, and the GHDEV-10 command-shape friction ledger.

**Stop and return bounded PARTIAL** only if the installed OpenCode hook cannot emit the required trusted tool event or the installed Graphiti Core cannot provide read-only relation retrieval with independent provenance. Do not silently permit arbitrary tool metadata or unverified graph facts to become authoritative.

A passing package is a **review-ready source-only candidate**; production activation still requires a later explicit operator authorization and exact reviewed host configuration.
