# Issue #93 — B2.2 completion-bound qualification handback

Development gate PASSES (B2.2 now-stripping fixes N02; all 15/18 positives
preserved; N01=N02=N04=0). The sealed holdout, run ONCE after the dev gate,
FAILS (1/4 positives recovered; HN01 off-topic injects 4). Answer support is
UNVERIFIED (cross-channel leakage). No production change; no PR.

```
RESULT=HOLDOUT_FAILED
TARGET_SOURCE_SHA=4bc169cc59e8900f5dc3cd4d3c70a22d0fcfb9f4
OWNER_CHECKOUT_PRESERVED=yes (owner /workspace/opencode-operational-schema-guard untouched; work in isolated worktree /workspace/opencode-issue93-build)
CHANGED_PATHS_PROOF=strict control docs/issue-75/v2-candidate/relevance.mjs is BYTE-IDENTICAL to pre-candidate ac416a5; the only source change is docs/issue-75/v2-candidate/semantic-recall.mjs (semantic-only now-handling: semanticLexicalSupport strips \bnow\b for semantic presentation; strict path + source-qualified anchor untouched) + docs/issue-93/semantic-abstention.test.mjs (11 tests)
FROZEN_MANIFEST_AND_SNAPSHOT_HASHES=DEV 3e799c4610809853… OK; SEALED_HOLDOUT 3f9eaebb6debe949… OK; SOURCE_SNAPSHOT dc597c690b0e8990… OK (all re-verified private)
FOCUSED_TESTS=node --test x10 suites; 115 tests, 0 fail, true exit 0 (semantic-abstention 11/11, relevance 31/31, semantic-recall 15/15, integration 4/4, curated 12/12, native-source 6/6, scorer 10/10, memory-core 22/22, priority 3/3, replay 1/1)
PROJECT_GATES=npm run check exit 0 (passed/full); npm run test exit 0, OPERATIONAL_PLUGIN_TEST_RESULT: PASS
STRICT_AND_PREVIOUS_SEMANTIC=strict 13/18 (unchanged control); previous semantic (69014b7) 15/18
CANDIDATE_DEVELOPMENT=18 pos / 5 neg: B2.1 15/18, B2.2 15/18; zero positive loss; zero strict-only losses; not recovered D02/D05/D15 (both B2.1 and B2.2)
N01_N02=N01 France 1->0 (B2.2); N02 Tokyo-weather 4->0 (B2.2 now-stripping removes the weak single-token 'now' anchor); stage proof: B2.2 unanchored independentSupport gate now also applies to the weakly-anchored N02
N03_N04_N05=N03 wrong-group-content 4 (not worse); N04 secret 0 (fence holds); N05 false-verified 3 (not worse; native-id-only pool, not cleanly isolated)
INDEX_RESCUE=original 6 raw-top24-absent (D02,D03,D11,D14,D15,D17); recovered via #92 index D03,D11,D14,D17; not recovered D02,D15
HOLDOUT=SEALED 4/2 run ONCE after dev pass: 1/4 positives (H01 yes; H02/H03/H04 no), HN01 off-topic injects 4, HN02 secret 0 -> HOLDOUT_FAILED (3 source-exact positive losses + 1 new off-topic negative)
NATIVE_CONTEXT=real installed stock-V2 plugin + real read-only #92 route assembles a real source-attributed fact into the model request (event.system [GHDEV_GRAPHITI_CONTEXT]); 14/20 injected invocations carried opencode: source attribution with the private excerpt omitted
NATIVE_TIMING=n=20, p50=45.72ms, p95=299.77ms, max=300.273ms, injected=14, empty=2, error=2, late=2; p95<=300ms met; slow/empty cases retained
SEARCH_AND_GET_EPISODES_RTT=search_memory_facts p95=159.31ms (separate class); get_episodes proof p95=45.67ms within the 70ms optional enrichment window
SOURCE_PRIVACY_EX=N04 secret fence ZERO; private sourceContext excerpt omitted in all injections; no untrusted/cross-group remote source; no EX violation; no Graphiti/ReviewStore/installed-config mutation
ANSWER_SUPPORT=UNVERIFIED: a sourced nontrivial fact was injected and the memory-enabled model referenced it, but a clean causal proof is NOT isolated (the credited fact is a git commit, reachable via a separate tool/history channel; the memory-disabled control also surfaced it). READY_FOR_FINAL_OPERATOR_RUN: one specific operator command below.
PR_STATUS=none (exact-head review not started)
EVIDENCE_PUBLICATION=PASS
EVIDENCE_COMMIT_SHA=<full 40-hex of the evidence-only b2-2-completion commit on issue/93; reported in returned handback>
PROTECTED_SURFACE_DIFF=none (only docs/issue-93/evidence/b2-2-completion added; no source, test, privacy, Graphiti, ReviewStore, live-config, CI, or historical change)
PRIVATE_PACKET_LOCATION=/opt/filip/.hermes/cache/scratch/issue93f-ngY8kq (b22-result.json, holdout-result.json, native-timing.json, rtt.json, oc-memoff/oc-memon; raw queries/facts/UUIDs local only)
KNOWN_GAPS=(1) holdout under-recovery: B2.2 preserves the dev 15/18 but under-recovers the sealed 3/4 paraphrase/temporal holdout positives (single-fact selection in the unanchored/weak-overlap path); (2) HN01 off-topic injection (4 facts) on an off-topic holdout query; (3) N05 false-verified control not cleanly isolated (native-id-only pool); (4) ANSWER_SUPPORT UNVERIFIED (cross-channel leakage; needs a non-git-history fact in a fully isolated single-plugin no-tools fresh process).
```

## READY_FOR_FINAL_OPERATOR_RUN (clean model-answer)

One operator-owned, post-exit, isolated fresh OpenCode process; serial
memory-disabled-then-enabled no-tools runs, single GPU, no concurrent inference,
a #92 fact NOT derivable from git history:

```
oc93-memon=$(mktemp -d); oc93-memoff=$(mktemp -d)
# isolated single-plugin no-tools configs (ghdev plugin only, tools:{})
node -e 'const b=require("/home/filip/.config/opencode/opencode.json");const o={capture:false,group:"development-knowledge",workspace:"/workspace/mcp_servers/gh_mcp",project:"gh_mcp",endpoint:"http://127.0.0.1:8766/mcp",stateDir:"/home/filip/.local/state/ghdev-graphiti"};const P="file:///home/filip/.config/opencode/plugins/ghdev-graphiti-memory";const m=e=>({$schema:b.$schema,model:"local/chat",tools:{},plugin:[{package:P,options:{...o,enabled:e}}]});require("fs").writeFileSync(process.argv[1],JSON.stringify(m(false)));require("fs").writeFileSync(process.argv[2],JSON.stringify(m(true)));' "$oc93-memoff/opencode.json" "$oc93-memon/opencode.json"
cd "$oc93-memoff" && opencode run --standalone --session "ses-93-off-$(date +%s)" "<non-git-history #92 fact prompt>"   # control: expect NO fact
cd "$oc93-memon"  && opencode run --standalone --session "ses-93-on-$(date +%s)"  "<same prompt>"                 # enabled: expect sourced answer
# private source-exact adjudication: enabled cites the injected fact, control does not; no tool/fixture channel
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
    correction_or_annotation=Host guard flagged inline -e/-c scripts, recursive deletes, and the opencode headless runs for approval (auto-approved by a saved 'always' approval); no rewrite.
    replacement_shape=none
    recipe_reference=none
    resource_reference=none
    contract_conflict=no
    durable_gap_candidate=no
omitted_sensitive_values=no
```
