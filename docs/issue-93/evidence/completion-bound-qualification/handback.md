# Issue #93 — completion-bound source-backed qualification handback

Single completion-bound qualification on the authenticated issue/93 working
head. Source and inference kept distinct. Not a final acceptance claim.

```
RESULT=PASS_NATIVE_SOURCE_BOUND
EXACT_SOURCE_SHA=9bba7d8cf5965741545b8ecf069b4d0f054527ed
OWNER_CHECKOUT_PRESERVED=yes (owner /workspace/opencode-operational-schema-guard untouched; all work in isolated worktree /workspace/opencode-issue93-build)
NEW_NODE_TEST=Node v26.13.1; node --test docs/issue-93/native-source-context.test.mjs; tests=6 pass=6 fail=0 exit=0 (first-run green, no fixture repair). Corrected scorer: node --test docs/issue-93/score-stage-ledger.test.mjs; tests=10 pass=10 fail=0 exit=0.
#92_REVIEWSTORE_PROOF=development-knowledge curation-v1: total=565 persisted=355 with_remote_uuid=355 with_source_refs=411; concrete persisted record (id 3319... fdadb9942cdc) remote_episode_uuid=ad850db8…, source_ref strength=native-id, evidence_class=assistant-reported; V2 binding sourcedEpisodeResolver+curatedCandidateRetriever, recallPolicy=semantic, stateDir=/home/filip/.local/state/ghdev-graphiti (scoped, read-only, no backfill, no config change). Distinct from empty Issue-75 Journal.
REMOTE_SOURCE_UUID_PROOF=yes, same-group (ad850db8... present in get_episodes(development-knowledge), 355 episodes, not truncated)
NATIVE_CLIENT_PROOF=fresh external: (a) opencode run --standalone (private server, new session ses-issue93native...) loaded the real plugin and produced a model answer; (b) a fresh external Node process drove the real installed plugin against the real read-only Graphiti + #92 ReviewStore route. Only the OpenCode host ctx binding is emulated.
NATIVE_CONTEXT=n=5,p50=136.036ms,p95=221.825ms,max=221.825ms,injected=4,empty=1,error=0,late=0 (all <300ms); related=221.825/paraphrase=158.591/offtopic=99.037/temporal=136.036/secret=0.012
SEARCH_RTT=separate n=3,p50=160.498ms,p95=193.256ms,max=193.256ms (search_memory_facts; NOT used to infer get_episodes proof latency)
GET_EPISODES_RTT=separate n=5,p50=38.88ms,p95=40.6ms,max=40.6ms; within_70ms_window=true (INDEX_ENRICHMENT_MAX_WAIT_MS=70; proofs do not systematically expire)
MODEL_BOUND_CONTEXT=on-time; exact sourced facts: 4 per injection (<=5), <=1400 selector JSON chars (max 1361), each fact carries source=opencode:<id> + evidence class (tool-reported/assistant-reported), sourceContext (private excerpt) omitted; native message-ID association via prompt-prefetch memory.search keyed by native messageID
ANSWER_SUPPORT=UNVERIFIED (a fresh opencode run --standalone produced a 'PostgreSQL' answer matching the persisted #92 fact, but it was tool-assisted (model read the Issue #93 test fixture); pure-context answer support not cleanly isolated; no competing-inference model answer independently evaluated)
NEGATIVES=wrong-group: controlled by get_episodes group_ids scoping + fact.group_id===group check; secret: pre-Graphiti privacy fence short-circuits (~0.012ms, no injection); temporal: superseded facts labeled historical/superseded; off-topic: an off-topic query still injects 496 chars of development-knowledge context (N01-class distraction persists on the live same-group route)
ORIGINAL_81=historical fingerprint 47e141bdc81f1f2cdc2e98c7697162dbbf3250a5eb209a56361b358bc2441652 (recorded strict 12/16, semantic 13/16); current UNVERIFIED (raw roster host-private, not freshly reproduced)
B2_DISPOSITION=INSUFFICIENT_EVIDENCE. A real N01-class off-topic distraction (496 chars) is measured on the authentic live same-group route, but the original raw #81 source-exact-omission cases (S03/S05/S13) are lost (host-private roster), so a bounded selector amendment cannot be justified against an authentic matched case with zero strict-only losses. No arbitrary lexical/Issue-ID veto and no new LLM reranker. A separately approved prospective substitution standard is required to block Issue #93 closure.
PROTECTED_SURFACE_DIFF=none (only docs/issue-93/evidence/completion-bound-qualification added; no source, privacy, Graphiti persisted data, live config, CI gate, or historical scorecard change)
EVIDENCE_COMMIT_SHA=<full SHA of the evidence-only continuation commit on issue/93; reported in returned handback>
KNOWN_GAPS=ANSWER_SUPPORT unverified (tool-assisted, not pure-context); native hook emulated at the OpenCode host ctx layer (real plugin+route, not a full OpenCode server session); original #81 cohort fresh reproduction UNVERIFIED (raw roster host-private); off-topic N01 distraction remains un-remediated (no selector change authorized).
```

## COMMAND_SHAPE_FRICTION (GHDEV-10 canonical)

```
encountered=yes
events:
  - scenario=inline_node_script
    requested_shape=node -e '<sanitized inline script>'
    effective_shape=same-as-requested
    rewrite_provenance=none
    event_kind=guard_annotation
    execution_effect=executed_succeeded
    correction_or_annotation=Host guard flagged inline -e/-c scripts for approval (auto-approved by a saved 'always' approval); no rewrite. Recurring across review-store inventory, get-episodes probe, native-context extraction.
    replacement_shape=none
    recipe_reference=none
    resource_reference=none
    contract_conflict=no
    durable_gap_candidate=no
  - scenario=opencode_headless_session_id
    requested_shape=opencode run --standalone --session <id> ...
    effective_shape=same-as-requested (after operator corrected the id prefix)
    rewrite_provenance=operator
    event_kind=arg_contract
    execution_effect=first_invocation_rejected_then_succeeded
    correction_or_annotation=OpenCode requires --session ids to start with 'ses'; a non-prefixed id was rejected (rc=1) and re-run with a ses- prefix. CLI argument contract, not a host command-shape rewrite.
    replacement_shape=opencode run --standalone --session ses-<id> ...
    recipe_reference=none
    resource_reference=none
    contract_conflict=no
    durable_gap_candidate=no
omitted_sensitive_values=no
```
