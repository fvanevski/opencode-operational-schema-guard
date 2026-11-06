# Issue #81: Shared MCP serialization and final-review prerequisites — complete Build handoff

CAMPAIGN=ISSUE81_SHARED_MCP_REVIEW_GATE_V1
PRIMARY_AGENT=build
REPO_ID=fvanevski/opencode-operational-schema-guard
ISSUE_NUMBER=81
PR_NUMBER=89
IMPLEMENTATION_BRANCH=issue/81-source-recall-correction
IMPLEMENTATION_SHA=verify exact remote branch head supplied by operator kickoff; this document must exist in its immutable tree
PRE_CORRECTION_HEAD=5d6b285eec078ebf320e13578c1f650fe5fca5b6
BASE_MAIN=9a27b73de882c0af6fec4d86de81945338611479
EVIDENCE_BRANCH=issue/81-recall-acceptance
EVIDENCE_EXPECTED_HEAD=77acfac89f3b8935c2398dfe0049eb409a5c6df9
EVIDENCE_ROOT=docs/issue-78/evidence/81-shared-mcp-review-gate-v1
GROUP=development-knowledge
PROJECT=gh_mcp
WORKSPACE=/workspace/mcp_servers/gh_mcp
GRAPHITI_MCP=http://127.0.0.1:8766/mcp
SOURCE_REMOTE_UPDATE=forbidden
EVIDENCE_REMOTE_UPDATE=allowed
EVIDENCE_PACKET_REQUIRED=yes

## Objective and reason for this review gate

One narrow host qualification of a Central-owned independent-review fix, PLUS a bounded read-only inventory for Issue #81's already mandatory descriptive fixture naming. Return one consolidated handback, not separate campaigns or PRs.

The PRE_CORRECTION_HEAD has exposed source-exact 13/16 PASS (target >=13/16), no new false admission, targeted tests 71/71 PASS. This is NOT native holdout or merged-main acceptance. Immutable historical scores: original 8/16, post-S06 native 9/16, earlier exposed 12/16. The 126-item operator precision remains UNVERIFIED and hook p95 <=300ms not measured.

Central code review found the previous serialization test insufficient. The native prompt hook starts asynchronous Memory.search prefetch on each prompt without awaiting completion. One Memory.search serialized search_memory_facts -> get_episodes, but two overlapping searches sharing GraphitiMcp could send concurrent MCP tool calls and trigger known service instability. The newly staged GraphitiMcp.call promise-tail queue serializes ALL calls on the shared client, including initialization and error paths; failed RPC does not poison the next queued request or cause an automatic retry. No relevance, source/identity/private guards, timeout, candidate depth, output shape, model/curation path or production deployment changed.

Issue #81's current GitHub body also REQUIRES readable, purpose-based ACTIVE qualification fixture group identifiers and synchronized producer/consumer names before final issue independent review/merge disposition. This handoff obtains the source/host inventory only. Central owns substantive naming edits; no local agent naming or data migration is authorized.

## Environment and permissions

Primary OpenCode Build, launched through the usual OpenViking-managed shim; use a new isolated worktree AFTER fetching exact current GitHub ref. Preserve operator checkout and untracked files.

CPU-only: source/diff inspection, Node tests, mock transport concurrency proof, scoped source/config name inventory, sanitized report. Service-backed: at most a small read-only serial Graphiti smoke on the authorized group, no new inference or service start. No EX lease bypass or competing LLM workload.

Allowed: bounded local scratch, private harness/interface adaptation, autonomous shell/tool correction, test-output capture with actual exit code, reading current effective config and fixture state, and exactly one sanitized evidence-only commit under EVIDENCE_ROOT after exact evidence-branch CAS preflight.

Forbidden: source/test semantic changes, source branch push, altering any installed plugin/config, Graphiti add/delete/queue operations, group renames/migration, changing signed historical receipts, full native 20-case replay, overriding 300ms, waiver of tests or selectors, opening PRs, merge, issue closure, claiming human verdicts. No large root/home recursive filesystem searches.

## Phase A: exact source, overlap regression, error recovery

1. Re-fetch GitHub origin implementation branch, independently authenticate exact kickoff SHA, current main=BASE_MAIN and PR #89 OPEN/DRAFT at the same source SHA. Fetch BEFORE local object/worktree proof. Read this entire contract, changed module, added tests and the prior 13/16 evidence from commit 77acfac89f3b8935c2398dfe0049eb409a5c6df9.
2. Check complete exact diff from PRE_CORRECTION_HEAD to kickoff SHA. Confirm only GraphitiMcp per-client queue + two regression tests and this handoff changed. Review promise-tail failure release, initialization, FIFO, absence of retries, idempotent cleanup, source/private/identity guards unchanged.
3. Run from clean exact commit:
   node --check docs/issue-75/v2-candidate/memory-core.mjs
   node --check docs/issue-75/v2-candidate/memory-core.test.mjs
   node --test docs/issue-75/v2-candidate/memory-core.test.mjs docs/issue-75/v2-candidate/plugin-behavior.test.mjs docs/issue-78/v2-curator/curated-recall-candidates.test.mjs
   Also run directly implicated tests if a new dependency is identified. Capture producer exit and TAP count before display filtering. Trusted full root npm check/test is Central-owned Actions evidence; do not run duplicate local root suite when exact-head receipt is valid.
4. Independently verify with actual staged code and mocked read-only rpc()/ensure(): two simultaneous Memory.search requests sharing a single GraphitiMcp yield remote maxActive=1; every search and get_episodes call occurs once and is ordered FIFO. A middle remote exception is surfaced and subsequent operation completes, without duplicate write/retry or queue poisoning. A unit test that covers only search/get_episodes inside ONE search is not sufficient.
5. Verify sequential single-request behavior and source selection remain unchanged. Since the patch touches MCP scheduling only, reuse the original 13/16 exposed source-selection evidence as historical corroboration, do NOT falsely claim a new exact-head 13/16 replay. Report any actual changed result promptly.
6. Optional read-only, bounded loopback MCP smoke if healthy; no deliberate concurrency against raw unqueued service. Keep any source/private text uncommitted.

## Phase B: narrowly scoped mandatory fixture-name inventory

7. Read the LIVE Issue #81 naming amendment and current source/host config. Inventory active issue-derived/opaque Graphiti fixture identifiers, notably cur80_* and cur81_*, and their producers/consumers in the current repo's Issue #78 source/scripts, CLI/options, status/discovery and cleanup/tests. Use scoped ripgrep/search; do not search / or full home.
8. Classify each match: ACTIVE fixture creation/writer, active consumer/status/cleanup, immutable historical receipt/corpus, legacy Graphiti episode/group, or production namespace. Current production development-knowledge MUST remain unchanged.
9. For active names, return exact old identifier, functional purpose from evidence, producer paths, direct consumers, recommended readable domain-purpose-rNN canonical label for Central consideration, any read-only legacy alias, and stateful migration risk. No private paths/user-specific source content in Git. For an already descriptive active name, say accepted; for old archived identifiers, label PRESERVE_IMMUTABLE; do not rename.
10. If no ACTIVE opaque names remain, substantiate that with bounded current source/config searches. Do not invent work just to fill the inventory. No host mutation, remote Graphiti write or reinterpretation of historical group authority.

## Phase C: review readiness and one evidence packet

11. Revalidate the 126 human-review packet/ratified precision target read-only, do not adjudicate; HUMAN_PRECISION=UNVERIFIED. Exact native hook start/end p95 is UNVERIFIED unless measured independently; do not infer from total Memory.search timing. Report whether multi-prompt queue head-of-line waits could affect the 300ms context allowance.
12. Publish ONE sanitized evidence packet under EVIDENCE_ROOT on existing EVIDENCE_BRANCH:
   README.md
   shared-client-overlap-tests.json
   fixture-name-inventory.json
   review-readiness.md
   command-shape-friction.json
   SHA256-MANIFEST.txt
   Keep private raw logs/roster/precision/credentials on host (0600/0700).
13. Re-read exact remote EVIDENCE_BRANCH immediately before write; require EVIDENCE_EXPECTED_HEAD or report STALE and stop publication. One non-force commit only under EVIDENCE_ROOT. Read back branch ref, parent SHA, exact path inventory and manifest SHA256. Do not mutate implementation branch.
14. Return one handback with exact PR SHA/tree/main, source/test blob IDs, focused exits and counts, concurrent maxActive/call order/error recovery, trusted Verify receipt, preserved 13/16 historical source qualification, any latency/serialization concern, complete active/archived fixture inventory and direct consumer list, recommended smallest Central-owned naming implementation if required, HOOK_P95/HUMAN_PRECISION status, evidence commit/parent/readback, full GHDEV-10 command-shape friction and unexpected host changes.

## Stop/next gate

Individual old fixture names or a benign local test syntax error are not global blockers; resolve routine mechanics autonomously. A true source-identity, privacy, remote authority or concurrency-invariant failure is blocking, as are unauthorized mutations. Do not begin a new naming implementation or re-run a full native/LLM qualification to satisfy this contract.

Return ONE complete handback. Central reviews and stages any necessary descriptive fixture renames before final issue-level review; after that, independent exact-head PR review and any late Codex review occur under GHDEV-05. PR #89 remains DRAFT, no merge/deploy/issue closure.

This GitHub-hosted file is authoritative. The operator gets only a concise kickoff referencing exact branch/SHA/path.
