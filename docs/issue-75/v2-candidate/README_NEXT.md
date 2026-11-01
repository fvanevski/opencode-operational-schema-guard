# Issue #75 integrated correction (next Build campaign)

STATUS: staged and GitHub-readback-verified Central candidate, NOT tested on the live host or deployed. The previous first handoff is superseded by LOCAL_AGENT_CONTRACT_NEXT.md. Prior locally generated /tmp/opencode/issue75-evidence/final-diff.binary remains host-only and its exact bytes are UNVERIFIED centrally.

## Architecture implemented

* Interactive stock V2 prompt/tool hooks only STAGE small privacy-screened journal entries. No automatic Graphiti add_memory, drain or startup reconciliation during the active LLM session.
* Python post-exit-drain.py is a one-shot executable, not a daemon/scheduler. It imports the EXISTING installed OpenViking gate Config, Worker harness classifier and scheduler parser, uses the SAME flock exclusive lock, verifies no interactive harness, verifies zero running/waiting inference requests, holds the gate quiet-grace interval and rechecks, then runs memory-cli.mjs drain while holding EX lock until persistence or bounded unresolved exit. Source/config must be authenticated on the actual host before use. Do not run this inside an OpenCode/Codex harness, disable an existing coordinator, bypass a blocked_reconcile condition, or start a second listener. Only a disposable group is admitted in this qualification.
* MCP add_memory omits caller UUID because the host-pinned Graphiti core generates its own remote episode UUID (caller UUID previously generated NodeNotFoundError). Deterministic local name = kind:local-journal-uuid. Reconciliation matches exactly one group/name episode, records remoteEpisodeUuid, and retrieves only edges whose remote episode UUID belongs to a persisted local candidate. The remote UUID is used for explicit forget. Missing get_episodes result is not negative proof beyond its capped recent window. queued / submission_unknown rows are never blindly replayed.
* Completed test capture accepts stock V2 nested result.output.exit / result.output.output / metadata.exit, not only old flat shapes.
* relevance.mjs inserts a conservative relevance gate before context injection. It uses a CPU lexical support floor, or an OPTIONAL explicitly configured fast independent HTTP reranker at a known loopback endpoint with a 160ms timeout and a predetermined 0.70 score floor. On service failure it falls back to conservative CPU filtering. Do not enable a reranker if it shares the single-serving extraction LLM or breaks the 300ms context hook budget. Its service API and score calibration remain HOST-UNVERIFIED. Native search supplies broad candidates, not proof that every top-k fact is relevant.
* benchmark-evaluate.mjs now separates actual cross-group returned fact IDs from irrelevant answers to a question about another group. The latter are false positives, not proven group leaks.

## Why source/host qualification remains necessary

The first handback reported real V2 journaling, persisted Graphiti facts and context injection, but precision 0.25 against a target >=0.80, intermittent empty extraction responses during single-concurrency Qwen3.8 GPU contention, queued residue and missing production-plugin coexistence. The host diff (five changed files and raw benchmark evidence) is NOT available to Central as file bytes; the new source reconstructs the reported remote-UUID and tool-result fixes, and local Build must inspect/reconcile the previous diff rather than overwrite or blindly reapply it.

Official Graphiti MCP add_memory is asynchronous and the server can run several model requests per episode. SEMAPHORE_LIMIT=1 reduces parallel episode processing, not inter-process model concurrency. Extraction errors can arise from model scheduling, context/reasoning-token exhaustion, empty completions or Pydantic/JSON mismatch; collect finish_reason, reasoning/completion token counts, model response length, queue wait and pinned client JSON errors. Confirm a non-thinking or tightly bounded thinking extraction profile only through the installed Graphiti client, without changing the interactive agent's model defaults or relaxing the expected structured format.

The existing lease must cover Graphiti processing THROUGH terminal remote readback; the mere queued ACK is insufficient. On unresolved failure/timeout, the one-shot runner retains the EX lock and requires explicit disposal-only Graphiti worker shutdown plus listener-down verification before release. If the pinned MCP endpoint is shared with production, do NOT shut it down merely for this experiment; use an isolated Graphiti instance or treat the experiment as blocked and resolve the queue under the existing gate. There is no unattended release of an unproven outstanding extraction. Interrupting/killing the runner would forfeit this safety guarantee. No new long-running worker, scheduler, database, service or Graphiti fork is part of Issue #75.

## Qualification

CPU-only from this candidate directory:

    node --check memory-core.mjs
    node --check memory-cli.mjs
    node --check plugin.mjs
    node --check relevance.mjs
    node --check benchmark-evaluate.mjs
    node --test memory-core.test.mjs relevance.test.mjs
    python3 -m py_compile post-exit-drain.py

The Build agent owns actual execution, integration and correction of verified host mismatches within the named source. The previous 7-query benchmark and relevance judgments are immutable. Rerun these plus separate holdout probes; targets remain precision >=0.80, recall >=0.75, >=2 additional covered cases over the first 5/7 heuristic-only baseline, zero actual cross-group leaks. Do not tune those judgments, fabricate old service results or treat the heuristic-only baseline as live service output.

After local Build agent exit, operator executes ONE fully host-resolved command:

    python3 post-exit-drain.py --gate-source ACTUAL_INSTALLED_GATE_PY --gate-config ACTUAL_GATE_TOML --cli EXACT_CANDIDATE/memory-cli.mjs --group DISPOSABLE_TEST_GROUP --state-dir DISPOSABLE_ABSOLUTE_PRIVATE_STATE --endpoint http://127.0.0.1:8766/mcp --max-seconds 600

The above is a template, not a verified host command. Local Build must give exact authenticated paths and recommend an endpoint only after live readback. Do not invoke node memory-cli.mjs drain directly. Existing production Graphiti and OpenViking configurations/data must remain intact. Existing queued rows from the prior lab campaign must be diagnosed, not blindly resubmitted.

## Completion boundary

One comprehensive local handback: exact working source, local historical diff reconciliation, tests, frozen + holdout score files with raw fact mapping, host model/lease tests, fresh OpenCode+OpenViking coexistence, post-exit command, extraction-state/timeout evidence, canonical command-shape friction. Central integrates reviewed final files and aims for ONE issue PR. Further small in-scope defects should be corrected in this same campaign, not turned into follow-up micro-handoffs.
