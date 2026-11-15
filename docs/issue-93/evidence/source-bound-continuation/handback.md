# Issue #93 — source-bound continuation handback

Consolidated source-bound qualification continuation on the authenticated
issue/93 working head. Source and inference kept distinct. Not a final
acceptance claim; a production selector change is NOT staged by this campaign.

```
RESULT=PASS_SOURCE_BOUND
SOURCE_TARGET_SHA=5aa14fde42f47c7abfb144f550cdb6bcab6989bb
HOST_OPEN_CODE_AND_GRAPHITI_IDENTITY=OpenCode stock-V2 native plugin interface (docs/issue-75/v2-candidate/plugin.mjs, id local.ghdev-graphiti-memory); selector source unchanged from bfa6cbed; Graphiti MCP 127.0.0.1:8766/mcp, group development-knowledge, falkordb (connected, read-only)
ORIGINAL_16_AUTHORITY=FINGERPRINT_RECOVERED (roster 20=16+4, frozen_roster_sha256 47e141bdc81f1f2cdc2e98c7697162dbbf3250a5eb209a56361b358bc2441652; recorded strict 12/16, semantic 13/16); raw roster body host-private -> fresh same-snapshot reproduction UNVERIFIED
STRICT_SOURCE_EXACT=UNVERIFIED (12/16 recorded provenance, not freshly reproduced)
SEMANTIC_SOURCE_EXACT=UNVERIFIED (13/16 recorded provenance, not freshly reproduced)
STRICT_ONLY_LOSSES=none (candidate superset of semantic in the issue-75 set; no strict-only positive lost)
S03_S05_S13=original #81 cases not freshly reproduced (raw roster host-private). issue-75 S03/S05 (f2 dependency) recovered at all stages; issue-75 S13 not present in that set. S02-class decision-intent paraphrase is lost at shortlist/strict and recovered by the semantic lane (the class a hard lexical veto would drop).
N01_N02=original N01 (unrelated): recorded shadow replay strict 0 / semantic 1 (one injection). Original N02 (legacy wrong-group): strict 1 / semantic 3, all within development-knowledge (same-group content-policy miss, not a cross-group source leak). issue-75 offline: N01 semantic 1, N02 strict 1 / semantic 4 (offline cross-group artifact, fenced upstream by group scoping).
HOLDOUT=issue-75 7-case set: 5/5 positive recovered by semantic (TP), 0 FP at answer_supported; N01/N02 negative injection present. No separate registered untouched development-question holdout beyond this set.
NATIVE_CONTEXT_HOOK=n=8,p50=147.047ms,p95=224.952ms,max=224.952ms,empty=8,error=0,over300=0,within_300ms=true (real plugin context hook, isolated mock session binding)
GRAPHITI_SEARCH_RTT=n=4,p50=152.862ms,p95=156.659ms,max=156.659ms (separate from hook latency)
MODEL_BOUND_CONTEXT=on-time (all 8 hook calls <300ms); kinds useful=5/offtopic=2/secret-fence=1; injected=0 because the host development-knowledge source journal is empty (no persisted per-fact source mappings) so recall yields no sourced facts; request attribution via prompt-prefetch memory.search keyed by native messageID; no independently-evaluated answer use (no injected context to answer from)
SOURCE_REMOTE_PRIVACY_EX=read-only development-knowledge; per-fact remote-UUID join intact; no Graphiti write/replay/EX-drain/curator; no live config/plugin mutation; no credential disclosure; N03 secret fence short-circuits pre-Graphiti (~0.005ms)
B2_DISPOSITION=INSUFFICIENT_SOURCE_EVIDENCE
MINIMUM_CENTRAL_CHANGE=none staged. Concrete failing path: (1) the original #81 raw 20-case roster is host-private, so the 12/16 strict and 13/16 semantic floors are recovered as fingerprint provenance, not freshly reproduced; (2) the host development-knowledge source journal is empty, so the native context hook injects no context (empty_no_injection=8) and real answer-support is not measurable. Proposed next steps for Central on issue/93: (a) recover/reproduce the raw roster on host and re-run the shadow replay to re-establish 12/16 & 13/16 on a matched snapshot; (b) populate a per-fact source journal so the native hook produces a real injection and hook p95/answer-support can be measured on injected context; (c) only then consider a bounded semantic ordering/abstention change for N01/N02. No arbitrary lexical/Issue-ID veto and no calibrated-score assumption.
NODE_TEST_EVIDENCE=node --test, workdir /workspace/opencode-issue93-build, source 5aa14fde: score-stage-ledger 10/10, semantic-recall 15/15, memory-core 22/22, relevance 31/31, relevance-priority 3/3, relevance-observation-replay 1/1, semantic-memory-integration 4/4, curated-recall-candidates 12/12 = 98 tests, 0 fail, all exit 0
EVIDENCE_PUBLICATION=PASS
EVIDENCE_COMMIT_SHA=<published evidence-only continuation commit on issue/93; SHA reported in returned handback>
PRIVATE_PACKET_LOCATION=/opt/filip/.hermes/cache/scratch/issue93c-q9UemB (stage-ledger.json, native-hook.mjs + measured samples, build-ledger.mjs; no raw facts/queries/UUID mappings)
PROTECTED_STATE_DIFF=none (only docs/issue-93/evidence/source-bound-continuation added; no source/privacy/Graphiti persisted data/live config/CI gate changes)
KNOWN_GAPS=original 16-cohort fresh reproduction UNVERIFIED (raw roster host-private); native hook measured in an isolated mock ctx, not a live external OpenCode process; host source journal empty so no real injected-context answer support measured.
```

## COMMAND_SHAPE_FRICTION

```
encountered=yes
events:
  - scenario=inline_node_script
    requested_shape=node -e '<sanitized inline script>'
    effective_shape=same-as-requested
    rewrite_provenance=none
    event_kind=guard_annotation
    execution_effect=executed_succeeded
    correction_or_annotation=Host guard flagged the inline -e/-c script for approval (auto-approved by a saved 'always' approval); no rewrite. Recorded as under-captured feedback per first-campaign Central disposition item 6.
    replacement_shape=none
    recipe_reference=none
    resource_reference=none
    contract_conflict=no
    durable_gap_candidate=no
omitted_sensitive_values=no
```
