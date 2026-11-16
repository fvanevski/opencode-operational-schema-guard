# Issue #100 — bounded quote-quality host qualification (Hermes)

This is a **single focused host evidence campaign**, not a new implementation project. Central has already authored the opt-in quote-first autonomous policy and regression tests following the 2026-11-16 B5 audit. The previous B4/B5 positive model+Graphiti experiment is historical evidence **at its original tested SHA**. Its source quality was insufficient: 9 of 10 retained quotes split words.

## Authority and environment

- Repository: `fvanevski/opencode-operational-schema-guard`
- Working branch: `issue/100`; existing draft PR `#103` **only**
- Current trusted main anchor for this campaign: `658c4c96abc392bf8a100c1afd1dcfacc3adf5b0`, unless refreshed authoritative main differs
- **Agent: Hermes**, a host orchestrator reported unexcluded by the installed commit gate. Do not require Hermes to exit; do honor the installed gate's live excluded-harness classification, vLLM running/waiting metrics, quiet grace, canonical kernel EX flock and remote unknown/no-replay
- The GitHub exact head to test must match the operator's full `EXPECTED_HEAD_SHA`. Fetch before proving, use an independent detached worktree and do not change the owner checkout
- `SEMANTIC_REMEDIATION=forbidden`, `MECHANICAL_REMEDIATION=bounded`, `PRODUCTION_DEPLOYMENT=forbidden`, `ADDITIONAL_PR=forbidden`, `MERGE=forbidden`, `PRODUCTION_GRAPHITI_WRITE=forbidden`

## Work A: exact source, CPU, and model policy proof

1. Authenticate the fetched exact source, current PR head, and current `node-contract` Actions receipt. Read `docs/issue-100/autonomous-policy.mjs`, `autonomous-policy.test.mjs`, `docs/issue-78/v2-curator/worker.mjs`, `docs/issue-75/v2-candidate/post-exit-drain.py`, and `B5_HOST_EVIDENCE_ADJUDICATION.md` completely. Confirm the installed production curator remains plain. Do not repeat the unrelated full root test suite if equivalent exact-head Actions has passed.
2. Focused CPU tests: `node --check docs/issue-100/autonomous-policy.mjs` and `node --test docs/issue-100/autonomous-policy.test.mjs docs/issue-100/consolidation.test.mjs`, plus the existing Python EX wrapper tests if required for command-shape parity. Verify quote-first JSON shape, source membership, derivation of UTF-16 offsets, rejection of mid-word/invalid Unicode boundaries, source metadata and privacy preservation, good sibling isolation, and technical retry of invalid exact model quote. Never weaken tests to get green.

## Work B: **one** frozen, genuine model-backed fresh disposable-group trial

3. In a new private scratch root, create a fresh, collision-safe **nonproduction** Graphiti group and a distinct candidate queue. Using the existing native `fromPrompt/fromTool` and `CandidateQueue.stage` interfaces, freeze and hash six small, technical **synthetic** original-source cases **before model execution**. Preserve actual native provenance, source type and original observation times. Distinct session IDs are needed where six independent clusters are intended, since ordinary selection groups same-session events. Include:
   - one original user message with **two separately useful procedural constraints**, testing independent sibling facts;
   - one actual **tool-reported** failed test with the real failing test name and line;
   - one **user-stated unverified debugging hypothesis** that should not be upgraded to verified truth;
   - one temporal API deprecation with its relevant end-of-support qualifier;
   - one architecture/procedure statement with prerequisite and outcome in a full sentence;
   - one genuinely related but distinct source/near-duplicate example, if still within the six-cluster budget.
   Keep excerpts 25..450 characters, coherent, with no personal contents or credentials. Do not embed B5 historical model outcomes into the prompt and do not manually preseed ReviewStore.
4. Authenticate the existing model provider settings from the *installed private* `curator.env` and the canonical existing Python EX wrapper options. Use `--autonomous-curation` as the **Python wrapper boolean**, not the JS `--autonomous-curation on` spelling. Invoke the wrapper **directly from Hermes** with actual `--gate-source`, `--gate-config`, candidate `--cli`, disposable `--group`, private `--state-dir`, installed `--endpoint`, bounded timeout and `--scheduler-wait 180` if needed. No hand-set `GHDEV_MEMORY_POST_EXIT_LEASE`, no direct non-admitted Node model call, no new daemon, no production unit change.
5. Inspect the real per-source output after EX settlement. Compare the exact persisted assertion with the complete original synthetic text and source span, **not merely the fact/UUID count**. A quote accepted from the model must be an original-source verbatim extract, complete at both word boundaries, and a coherent independent claim preserving essential qualifiers (including tool failure path/line, hypothesis status, temporal scope, or prerequisite/outcome). For each returned quote record whether the host derived its offset from `evidence_quote`, any blocked legacy numeric span, source hash, actual source class, retention/temporal status, and remote UUID. The existing strict source/privacy/EX rules still apply.
6. Technical model-copy failures legitimately remain NEW for a later admitted retry, with a bounded local status 4 and released EX; do not force a manual review or represent those as successful persistence. If a model result is incomplete but at a lexical boundary, record it as a **semantic-quality failure** rather than treating token-boundary validation as proof of useful completeness. Report measured failures and calls/tokens rather than imposing an arbitrary throughput success floor.
7. Check positive remote identity for every *actually persisted* disposable episode, no accidental cross-group or production writes, and canonical EX lock release. No reingestion of historical production facts. Do not rerun the earlier plain predecessor/large cohort, full consolidation stress, or already accepted negative technical-retry fixture unless a new direct regression specifically requires it.

## Evidence / handback

Produce one sanitized, private, manifest-validated archive, not staged on public GitHub. Include: exact source/CI identity, frozen case inventory+SHA, per-case original synthetic quote/selected assertion and exact source-span/lexical boundary, evidence class and temporal qualifier, accepted/retry disposition, relevant bounded model usage/latency, terminal remote group/name/UUID, real EX admission/exit/lock, production nonmutation and optional command-shape friction. Raw provider requests/responses and credentials must remain outside the shareable archive.

```text
LOCAL_AGENT_RESULT=PASS|FAIL|BLOCKED|STALE
EXPECTED_HEAD_SHA=<full SHA from kickoff>
TESTED_HEAD_SHA=<full SHA>
REMOTE_HEAD_AFTER=<full SHA>
CI_EXACT_HEAD=PASS|FAIL|UNVERIFIED
PRIMARY_AGENT=hermes
FROZEN_SOURCE_CASES=<count>
MODEL_CALLS_AND_TOKENS=<actual>
MODEL_EXACT_QUOTES_FOUND=<accepted count>
WORD_BOUNDARY_VIOLATIONS_ACCEPTED=<count>
SEMANTICALLY_INCOMPLETE_BUT_BOUNDARY_VALID=<count, case IDs>
SOURCE_CLASS_AND_TEMPORAL_ERRORS=<count>
RETRYABLE_MODEL_QUOTE_ERRORS=<count>
PERSISTED_TERMINAL_UUIDS=<count, verified group/name>
GRAPHITI_UNKNOWN_REPLAYS=<count>
EX_GATE_HEALTH_AND_LOCK=<observations>
PRODUCTION_MUTATION=none|exact verified extent
ARCHIVE_PATH=<actual private path>
ARCHIVE_SHA256=<full SHA256>
ARCHIVE_BYTES=<size>
COMMAND_SHAPE_FRICTION=<none or canonical entries>
SEMANTIC_BLOCKER=<none or exact reproduced violation>
MERGE_OR_DEPLOYMENT=none
```

After a complete focused test or one material model/exclusion failure, return all evidence to Central for independent review. Do not self-approve, request Codex, merge, close the issue, or launch a second broad acceptance campaign.
