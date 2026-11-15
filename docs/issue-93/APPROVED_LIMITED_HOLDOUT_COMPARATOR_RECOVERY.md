# Issue #93 — APPROVED one-time holdout comparator recovery

Status: **APPROVED by the repository operator on 2026-11-14**.
Scope: **one-time, B2.2-only amendment to the holdout comparison method**.
Authority: a supplemental exception to
docs/issue-93/APPROVED_PROSPECTIVE_ACCEPTANCE.md, section 4 only.
Controlling proposal:
docs/issue-93/PROPOSED_LIMITED_HOLDOUT_COMPARATOR_RECOVERY.md.
The operator explicitly approved that proposal. The proposal remains
unchanged as a record of the requested decision.

This approval does not assert that acceptance has passed and does
not authorize new candidate tuning, a changed relevance threshold,
replacement holdout, new PR, merge, deployment or issue closure.

## Exactly what was approved

The original current-source 4-positive/2-negative holdout was sealed
before Central's B2.2 candidate source revision and evaluated ONCE
after the development gate passed. However, the once-only runner
recorded the unchanged STRICT comparator and B2.2 but omitted the
unchanged ORIGINAL SEMANTIC comparator that acceptance section 4
requires. The later, exposed-set comparator replay reports:

| Case | Unchanged semantic (retrospective) | B2.2 (once-only recorded) |
| --- | --- | --- |
| H01 positive paraphrase | source-exact yes | source-exact yes |
| H02 positive paraphrase | source-exact no | source-exact no |
| H03 positive temporal | source-exact no | source-exact no |
| H04 positive paraphrase | source-exact no | source-exact no |
| HN01 off-topic | four facts | four facts |
| HN02 secret/privacy | zero facts | zero facts |

These comparison results are **host-reported, POST-EXPOSURE
DIAGNOSTIC**, not already-approved qualification evidence. The
absolute B2.2 holdout utility remains 1/4 positives and four
irrelevant HN01 facts. A nonnegative *relative* score is not
a claim of high absolute quality.

**Approved exception:** For THIS B2.2 candidate and THESE
already-frozen cases ONLY, a deterministic post-exposure replay
of the unmodified original semantic comparator may be used
to adjudicate the comparative holdout gate **if and only if**
all independent provenance and no-tuning conditions below pass.
No future holdout or issue inherits this method exception.

## Non-negotiable independent qualification conditions

1. **Immutable code before exposure.** Independently authenticate
   original semantic selector at full SHA
   69014b739d490f8cb90bce86233edf3054673209
   and B2.2 at full SHA
   4bc169cc59e8900f5dc3cd4d3c70a22d0fcfb9f4.
   Establish that both implementation blobs, relevant thresholds,
   scoring definitions and caller/transport logic were fixed
   before the original holdout was opened. Prove no code,
   thresholds, query, source labels, corpus or cohort changes
   were made as a consequence of seeing holdout outcomes.
   The strict relevance.mjs control remains byte-identical.
2. **Exact frozen snapshot provenance.** Verify the original
   development manifest digest
   3e799c461080985324c58d487ec6327e7616436b546ee9aa2dce3a67251919db,
   holdout manifest digest
   3f9eaebb6debe949bc9eb07eb777f2851b957adc1a8a3d94bccfcd27fa75c0c9,
   and source snapshot fingerprint
   dc597c690b0e8990b925b01467269f530d37dfb2dd7730663bdda46680e7231b.
   Reproduce the fingerprint using the EXACT original
   freeze-manifest.mjs formula:
     SHA256(UTF8(JSON.stringify(fact_pool.map(
       f => [f.assertion, f.remote_episode_uuid].join('|')
     ).join('\n'))))
   Do not substitute raw joined-string hashing or a JSON-array
   digest. Publish a sanitized, independently inspectable
   calculation receipt, never the private underlying records.
3. **Identical paired authority and inputs.** Authenticate original
   case registration and source adjudication, query/source/fact
   digests, group/workspace/project/temporal status, #92
   persisted ReviewStore/index receipts, source-bound remote
   get_episodes same-group membership, frozen Graphiti search
   transport and offline replay adapter. Source drift, changed
   membership, source substitution or new retrieval data FAILS.
   Prove that the B2.2 output reproduced against exactly the
   same fixed inputs matches the ORIGINAL once-only B2.2
   holdout output, including source-exact positive membership,
   negative counts and authorized source identities.
4. **No historical rewriting.** The original once-only result
   remains PRE_EXPOSURE_ORIGINAL_SEMANTIC_COMPARATOR=false.
   Publish the recovered comparator as
   POST_EXPOSURE_COMPARATOR_APPROVED_EXCEPTION, with
   independently verified freeze/candidate/no-tuning evidence.
   Preserve the original HOLDOUT_FAILED report, subsequent
   COMPARATOR_NOT_RECORDED finding and earlier erroneous
   fingerprint-mismatch diagnosis as historical artifacts,
   superseded only by an explicit additive erratum.
   Do not misrepresent the original runner as paired.
5. **Actual comparison criterion unchanged.** Adjudicate each
   original positive against current semantic, requiring
   candidate source-exact support >= the original comparator
   (case-wise no losses) and no new off-topic/unsafe negative
   injection. Source, privacy, remote group, evidence class,
   temporal and EX hard gates remain nonnegotiable.
   Any missing independent proof, nonreproduced original
   output or unauthorized context = HOLDOUT_UNVERIFIED/FAIL,
   never a substituted PASS.
6. **Independent native answer benefit remains mandatory.**
   Obtain >=1 clean, independently source-adjudicated
   Graphiti-attributable model answer to a genuinely sourced
   non-git-history development fact. Prove that the fact was
   delivered via the actual source-attributed native context
   in the assembled model request, not via test fixture,
   alternative git/history/search tool, another plugin, or
   prior session. Use isolated fresh OpenCode context and
   serial memory-disabled then memory-enabled no-tools
   controls, no competing GPU models. A plausible answer or
   an unverified no-tools configuration is NOT sufficient.
7. **All other criteria remain.** Retain <=5 selected facts,
   <=1400 selector JSON characters, mixed >=20 native hook
   observations with p95 <=300ms including empty/error/late
   calls, separate Graphiti search and get_episodes RTT,
   actual real-route native context proof, EX/rollover/privacy/
   temporal limits, and relevant trusted Verify, independent
   exact-head PR review and merged-main CI. Issue #94 owns
   final installed two-memory coexistence. Reuse existing
   authentic receipts where they are exact-source-valid;
   avoid ritual duplicate tests or new GPU contention.

## Result and closure boundary

Decision=APPROVED_LIMITED_COMPARATOR_RECOVERY.
Qualification=NOT_YET_PASSED.
Issue_93=OPEN.
PR_MERGE_DEPLOYMENT_CLOSURE=NOT_AUTHORIZED.

Central owns further decisions and any substantive code change;
local Build may perform bounded private evidence/host validation
and ONE sanitized evidence-only commit on the existing issue branch.
Nothing in this approval authorizes tuning on exposed holdout or
refreezing cases, despite the methodological exception.
