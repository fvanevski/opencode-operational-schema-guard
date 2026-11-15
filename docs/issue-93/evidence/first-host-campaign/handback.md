# Issue #93 — first consolidated B1/B3 host campaign (handback)

Bounded diagnosis on the authenticated issue/93 working branch. Not a final
acceptance claim; diagnostic PASS only. Substantive production selector
changes remain owned by Central.

```
RESULT=PASS_DIAGNOSTIC
SOURCE_BASE_SHA=25ca82a70b968cd6102a0f02980ea2a34d82ebd9
TESTED_SOURCE_SHA=bfa6cbed805f79bae4d675c94206dc9315b6acec
REMOTE_ISSUE_BRANCH_SHA=bfa6cbed805f79bae4d675c94206dc9315b6acec
```

## B1 stage loss (repo-visible issue-75 frozen set, 5 positives + 2 negatives)

- S01 direct (f1): recovered at every stage; presented. No loss.
- S02 paraphrase (f1): LOST at shortlist and strict (decision-intent
  paraphrase, zero literal token overlap with the f1 target assertion);
  RECOVERED at semantic/presented. This is the positive-loss stage
  (strict/shortlist) that a hard lexical veto would also lose.
- S03 dependency (f2): recovered at all stages; presented.
- S04 historical (f3): recovered at all stages; presented.
- S05 multi (f2): recovered at all stages; presented.
- N01 irrelevant: semantic/presented lane injects 1 lexically-unsupported
  native top hit (negative injection; hypothesis, not a confirmed cause).
- N02 wrong-group: offline pool admits cross-group f4 (Vue) at strict (1) and
  semantic/presented (4). In the real pipeline group fencing is enforced
  upstream (Graphiti search is group-scoped), so this is a content-policy miss
  (frozen N02=FAIL_INJECTED class), not a cross-group leak.

## Frozen / holdout controls

- FROZEN_STRICT=UNVERIFIED (16-positive #81 roster is private, SHA256
  47e141bd...; not reproducible from the repository).
- FROZEN_SEMANTIC=UNVERIFIED (same private-roster reason).
- The 7-case issue-75 subset reproduced here: strict 4/5 positives (S02 lost),
  semantic 5/5 positives, presented 5/5 answer-supported.

## Measured

- NEGATIVE_COST=N01:1, N02:4 (presented-lane negative injection, offline model)
- HOLDOUT_SUPPORT=UNVERIFIED (live #81 native-session holdout not run)
- CONTEXT_CALLBACK_ALL=n=3,p50=156ms,p95=157ms,max=157ms,errors=0,empty=0,on-time=yes (raw prompt-prefetch search_memory_facts round trips; 300ms allowance met)
- ANSWER_SUPPORT=independently checked on issue-75 frozen set: 5/5 positives present in presented + answer_supported.
- SCOPE_PRIVACY_REMOTE_EX=read-only development-knowledge group; Graphiti reachable (falkordb); no add_memory/delete/replay/EX-drain/curator/historical-graph mutation; no live config write; no credential disclosure; no production deployment.

## B2 decision

- B2_CHANGE_REQUIRED=no
- Rationale: the source at bfa6cbed already stages the substantive
  rendered-context-length-vs-selector-budget distinction (commit bfa6cbe). All
  94 regression tests pass; the semantic path recovers all issue-75 positives
  including the S02 paraphrase the strict control misses; no measured gain from
  a selector rewrite in this bounded campaign. The N01/N02 negative-injection is
  a hypothesis, and a hard lexical veto risks the S02-class paraphrase loss.

## B2 minimum contract (for Central to stage on issue/93, IF N01/N02 injection is to be addressed)

- Root cause: selectSemanticContext admits a lexically-unsupported (overlap=0)
  native top hit because the native-rank prior (2/(1+rank*0.42)) alone can clear
  the low-expansion threshold when no anchored fact qualifies.
- Smallest semantic contract: in selectSemanticContext, when no candidate in the
  pool has lexical overlap>0 (unanchored), cap presentation to the strict-control
  anchor (baselineAnchor) only and suppress pure native-rank distractors. Do not
  relax source/secret/group/remote/temporal/EX fences; do not enlarge the public
  1400-char / 5-fact budget.
- Planned regression: a frozen N01/N02 case where the top native hit has
  overlap=0 (expect presented=[] or anchor-only) plus a S02-style anchored
  paraphrase case (expect recovery preserved) so the veto does not drop
  S03/S05/S13-class paraphrases.
- Expected effect: removes N01/N02 lexically-unsupported injection without losing
  anchored paraphrases; strict 12/16 control unchanged.

## Receipts

- TEST_RECEIPTS=8 suites, 94 tests, 0 fail, all exit 0 (see regression-receipts.json); scorer exit 0 (cases=7, callbacks=3).
- EVIDENCE_PUBLICATION=PASS
- EVIDENCE_COMMIT_SHA=<published evidence-only commit on issue/93; SHA reported in returned handback>
- EVIDENCE_PATH=docs/issue-93/evidence/first-host-campaign
- UNCOMMITTED_SOURCE_CHANGES=none
- KNOWN_GAPS=frozen #81 16-case strict/semantic controls UNVERIFIED (private roster); live #81 native-session holdout not run; N01/N02 injection measured on the offline issue-75 model, not on the live #81 group.

## COMMAND_SHAPE_FRICTION

```
encountered=no
events=[]
omitted_sensitive_values=no
```
(One `node -e` inline-script invocation triggered a host guard annotation
(auto-approved); non-shape, did not alter execution — see command-shape-friction.json.)
