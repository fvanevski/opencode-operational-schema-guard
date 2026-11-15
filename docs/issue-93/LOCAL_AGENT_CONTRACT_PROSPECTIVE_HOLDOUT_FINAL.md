# Issue #93 — ONE consolidated prospective replacement holdout

## Identity / execution boundaries

LOCAL_AGENT_PRIMARY=build
LOCAL_HARNESS=OpenCode Build in a fresh isolated session/worktree
REPO_ID=fvanevski/opencode-operational-schema-guard
ISSUE_NUMBER=93
PR_NUMBER=96
BRANCH_NAME=issue/93
REQUIRED_REMOTE_HEAD=<Central kickoff full 40-hex SHA>
FIXED_CANDIDATE_SOURCE=d40506d15ed2ed2c2c08edcd64995182c197a6d8
CONTROLLING_APPROVAL=docs/issue-93/APPROVED_PROSPECTIVE_REPLACEMENT_HOLDOUT.md
PROSPECTIVE_POLICY=docs/issue-93/APPROVED_PROSPECTIVE_ACCEPTANCE.md
PRIOR_RESULT=docs/issue-93/evidence/codex-remediation-qualification/
PRIVATE_SOURCE_PACKET=/opt/filip/.hermes/cache/scratch/issue93f-ngY8kq
PUBLIC_EVIDENCE_DIR=docs/issue-93/evidence/prospective-replacement-holdout/

Execute ONE coherent 4-positive/2-negative prospective
holdout with pre-registration, exactly captured transport,
one frozen replay, and one sanitized handback. Do NOT
reopen semantic implementation or dispatch another
benchmark campaign.

Production source/test/CI/config edits=FORBIDDEN.
Graphiti/ReviewStore write/capture=FORBIDDEN.
Original cohort/holdout evidence edits=FORBIDDEN.
GitHub issue/PR metadata or approval changes=FORBIDDEN.
No new PR, branch, issue, daemon, model server, model
inference, source refreeze or candidate revision.
Only read-only Graphiti calls required for the new
transport freeze. Do not involve the interactive GPU.
Owner checkout and its untracked files are protected.
At most ONE evidence-only commit on existing issue/93
after successful or failed gate (no blind retries,
non-force branch advance and remote readback).

## Stage A — authenticate current authority and prepare

1. Authenticated fetch/readback of exact remote head,
   PR #96, both original acceptance documents,
   this approval and the fixed-source remediation
   \`d40506d15ed2ed2c2c08edcd64995182c197a6d8\`.
   Use a separate worktree after fetching its exact
   immutable SHA; preserve the owner's main checkout.
   Inspect actual #92 source records and the replay
   adapter/source (rather than reconstructing APIs
   from a prose summary). Current installed schema
   is authoritative; \`get_episodes\` needs
   \`group_ids:[group]\` and \`max_episodes\`, and
   \`search_memory_facts\` takes
   \`query\`, \`group_ids\`, \`max_facts:24\`.
   Verify no implicit Graphiti writes or hidden
   model/reranker calls; use source-authenticated
   groups/workspace/project and no-capture.

2. Review the previous guillemet mistake. In this
   campaign, exact raw private q bytes from the
   sealed manifest are always consumed by the
   actual \`safeText(q,500)\` and native prompt
   path. NEVER replace a frozen secret/sentinel
   query with redacted print text when executing
   or comparing. Identify correct private scratch
   roots from existing local packet/host; do not
   assume them present until checked. Use collision-
   safe separate 0700 scratch and 0600 private
   files; do not write to repository private config.

3. Build/validate the ONE capture and replay
   adapter against synthetic, non-cohort data
   BEFORE sealing real cases. It must preserve
   ordered exact retrieval responses; source/remote
   evidence and curated index query/policy paths;
   all necessary Graphiti read-only RPC responses;
   deterministic errors/timeouts; and no unrecorded
   live fallback after freezing. If the adapter
   cannot satisfy transport closure on the
   existing code, STOP \`BLOCKED_CAPTURE_INTEGRITY\`.
   Debug harness I/O/schema errors narrowly before
   observing candidate results; do not modify
   the selector or source authority.

## Stage B — choose, adjudicate, register and seal

4. Independently select EXACTLY four NEW positive
   queries and EXACTLY two NEW negative queries,
   disjoint from original 18+5 dev, 4+2 holdout,
   old 5+2 and any recorded diagnostic probes.
   Positives should span a direct/indirect or
   paraphrase, a cause/fix, a decision and
   a historical/temporal interpretation when
   the authenticated sources support them;
   avoid synthetic expected answers. The two
   negatives are (i) off-topic (unrelated to
   authenticated development facts) and (ii)
   secret/privacy using a synthetic full-length
   credential-shaped sentinel, NEVER a real key.
   No model use to generate answers. Do not
   consult selector results or optimize case
   choice for the candidate. No substitute
   cases after seeing any result.

5. Source-adjudicate positives from already
   persisted #92 fact/ReviewStore/episode
   evidence BEFORE inspecting retrieval outcomes.
   Freeze exact expected source/fact membership,
   source evidence classes, validity/temporal
   status, group/workspace/project and remote
   same-group proof; ensure no false-verified
   /EX/secret/private-source promotion.
   Establish negatives from independent source
   scope and privacy criteria. Verify queries
   are not duplicates by raw-query hashes and
   direct semantic comparison to the existing
   registered cohorts (do not print those).
   If fewer than 4+2 valid cases exist, STOP
   \`NO_ELIGIBLE_PROSPECTIVE_COHORT\`, with no
   test run or force-filling.

6. Store exact raw UTF-8 query strings and full
   SHA256 (NOT truncated prefix; NOT digest of
   \`safeText(q)\`) in a PRIVATE 4+2 manifest
   with expected fact/source/episode identities,
   group/project/workspace/temporal metadata,
   case labels and fresh freeze timestamp.
   Record the fixed role-source identities:
     strict control: unchanged relevance.mjs
     original semantic: 69014b739d490f8cb90bce86233edf3054673209
     original B2.2: 4bc169cc59e8900f5dc3cd4d3c70a22d0fcfb9f4
     fixed candidate: d40506d15ed2ed2c2c08edcd64995182c197a6d8
   Source snapshot pool must be exactly authenticated;
   record the original 355-fact snapshot fingerprint
   if using that unchanged set. Seal the manifest,
   log its SHA256 BEFORE retrieval/fact ranking,
   and prohibit case edits thereafter.

7. Capture **one** exact read-only transport bundle
   for each admitted raw query: prefilter admission;
   complete \`search_memory_facts\` request and
   ordered response array (all top 24 with metadata,
   not only linked facts); same-group \`get_episodes\`
   raw response/membership, index/curator rows for
   strict/semantic policy and relevant source-journal
   mappings; actual service configuration/group and
   source/remote proof. For prefilter-rejected
   secret query record no Graphiti request and
   explicit \`NO_SEARCH_CALL\`, as native code does.
   Capture a closed deterministic call map for
   all expected read-only RPCs; mock response identity
   is sealed, not a newly constructed "equivalent"
   top 24. Unknown requests must fail closed.
   Do not evaluate selectors during this stage.
   Seal the entire transport bundle and log its
   SHA256 and manifest SHA256 BEFORE any replay.
   The two complete raw bundles stay PRIVATE.

## Stage C — one fixed comparison on those exact inputs

8. Run unchanged strict, original semantic,
   original B2.2, and fixed candidate ONLY after
   both seals, on the SAME response bundle and
   exact registered raw input bytes, with
   source-/group-/temporal-/EX-qualified joins.
   No live fetch/re-capture during evaluation;
   reject fallback or order changes. Keep
   source/remote-index proof unaltered and observe
   *actual native admission* for the negative
   secret case, not a separate guillemet string.
   Any hash difference/adapter divergence =>
   \`BLOCKED_CAPTURE_INTEGRITY\`, not a retest.

9. Adjudicate four positives case-by-case,
   not by aggregate totals alone:
   original semantic vs revised, B2.2 vs
   revised and strict-only inclusion floor.
   Require no lost existing positive, no new
   unsafe/off-topic injection (negative counts
   and identities), and **zero actual secret
   content or model-facing facts** for the
   synthetic credential query. Distinguish
   admitted raw transport, source-joined,
   selector output, and native model-facing
   context stages; record both counts and
   source-ref digests. For negatives, report
   absolute irrelevant injections too even if
   relative criterion passes. Never substitute
   early raw search counts for presented facts.
   The selector budget is **JSON-serialized
   selected facts <=1400 chars** and <=5 facts.
   No status/authority upgrade, private excerpt,
   wrong-group/remote-UUID or EX leak is allowed.

10. Freeze output/receipt after ONE trial. If
    holdout fails, report precise casewise failure
    and STOP, without new query/transport/refreeze,
    rescoring variants, relevance threshold edits,
    retry for better result or changes to cohort
    labels. Ordinary harness parsing failures may
    be corrected only if input and source hashes
    remain unchanged, no partial candidate results
    have been used to choose alternatives, and
    exact executed source/diff is audited; fail
    closed if credibility cannot be established.

## Stage D — reuse authentic previous gates + publication

11. Independently verify that 118 focused tests
    (true exits), source/native timing sample
    n=20 p95=299.99ms and D12 exact-source
    answer-proof bridge apply to the UNCHANGED
    \`d40506d\` selector. These are PREVIOUSLY
    RECORDED evidence categories, not fresh
    tests or new model runs. Do not consume
    GPU or rerun native performance tests
    without an actual identity/coverage gap.
    Current installed live module identity
    may differ: don't claim installed/new-session
    acceptance (Issue #94). Central owns final
    exact-head CI/Verify and independent review.

12. Publish at most ONE sanitized evidence-only
    commit under \`PUBLIC_EVIDENCE_DIR\` with
    \`README.md\`, schema-versioned typed results,
    pre-evaluation manifest/transport SHA256,
    source case membership digests (not values),
    per-role casewise TP/FN and negative-stage
    counts, private-data redaction audit and
    \`SHA256SUMS\`. Capture actual commands,
    exits, case labels and separate provenance.
    Do not put any raw query, synthetic token,
    fact text, source ref, UUID, private Graphiti
    response, model transcript, API credential
    or host secret in GitHub or ChatGPT.
    Verify full commit parent, changed-file
    inventory, push result and remote readback.
    Retain immutable original historical artifacts.

## Typed handback

RESULT=PROSPECTIVE_HOLDOUT_PASS|PROSPECTIVE_HOLDOUT_FAIL|BLOCKED_CAPTURE_INTEGRITY|NO_ELIGIBLE_PROSPECTIVE_COHORT|SOURCE_AUTHORITY_FAIL|PARTIAL|STALE
REQUIRED_HEAD_SHA=<full>
ACTUAL_TESTED_SELECTOR_SHA=d40506d15ed2ed2c2c08edcd64995182c197a6d8
OWNER_CHECKOUT_PRESERVED=<yes/no>
PR_NUMBER=96
NEW_CASES=<4 positive, 2 negative; label/type only>
NOVELTY_SOURCE_ADJUDICATION=<verified/unknown>
PRIVATE_RAW_QUERY_DIGESTS=<6 full hash values or private-only>
MANIFEST_FROZEN_BEFORE_TRANSPORT=<yes/no,timestamp,sha256>
TRANSPORT_FROZEN_BEFORE_EVALUATION=<yes/no,timestamp,sha256>
TOP24_CAPTURE=<per-case yes/blocked/failed, original ordered response fingerprints>
SOURCE_SNAPSHOT_INDEX_REMOTE_PROOF=<frozen identity/evidence>
NO_LIVE_FALLTHROUGH=<verified/failed>
CASEWISE_POSITIVES=<strict/base/B2.2/revised source-exact support>
NEGATIVE_STAGE_COUNTS=<raw/source/selector/native, each role>
SECRET_QUERY_EXACT_RAW_ADMISSION=<rejected/accepted + verified raw digest identity>
ABSOLUTE_PRIVACY_ZERO=<PASS/FAIL/UNVERIFIED>
COMPARATIVE_HOLDOUT_GATE=<PASS/FAIL/UNVERIFIED>
SELECTOR_JSON_BUDGET_AND_FACT_CAP=<actual>
REUSED_FOCUSED_NATIVE_ANSWER_GATES=<source-match and caveats>
EVIDENCE_COMMIT_SHA=<full or none>
FINAL_BRANCH_SHA=<full or unchanged>
PR_CI_TRUSTED_VERIFY_STATUS=<exact-head, not inherited>
KNOWN_GAPS=<finite>
COMMAND_SHAPE_FRICTION=<GHDEV-10 canonical fields including scenario, requested/effective, rewrite provenance, execution effect, correction, gap and omitted secrets>

Local success does NOT authorize merge, deployment,
PR approval or Issue #93 closure. Central will
independently inspect this new prospective evidence
and re-run appropriate exact-head Actions/review
gates on the final PR SHA. No additional PRs.
