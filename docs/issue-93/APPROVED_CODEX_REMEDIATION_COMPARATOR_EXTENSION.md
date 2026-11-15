# Issue #93 — approved exact-SHA extension of the retrospective comparator exception

**Operator decision: APPROVED.** This supplements, but does not edit or
replace, the original
[APPROVED_LIMITED_HOLDOUT_COMPARATOR_RECOVERY.md](APPROVED_LIMITED_HOLDOUT_COMPARATOR_RECOVERY.md)
and [APPROVED_PROSPECTIVE_ACCEPTANCE.md](APPROVED_PROSPECTIVE_ACCEPTANCE.md).

The operator explicitly approved extending the existing one-time
comparator-recovery method exception **only** to the Codex-driven
strict-anchor correction at exact Git commit
\`d40506d15ed2ed2c2c08edcd64995182c197a6d8\` in PR #96.
This is a fixed-revision approval, not a standing license to
repeatedly tune against an exposed holdout. No new candidates,
threshold changes, refreezing, or replacement criteria are authorized.

## Provenance and reason for this exception

- Issue #93 PR #96 originally reviewed at
  \`fd81cd65c43c6e94502696c5cc3ffdc611046f8f\`.
- Independent Codex review at that exact head identified P2
  [strict-anchor regression](https://github.com/fvanevski/opencode-operational-schema-guard/pull/96#discussion_r4577140954):
  a legitimate historical comparison whose only literal overlap was
  "now" could lose a verified strict-control fact after semantic
  lexical normalization.
- Central independently reproduced the bug on the source at
  \`fd81cd65c43c6e94502696c5cc3ffdc611046f8f\`.
- Central committed **only**
  \`docs/issue-75/v2-candidate/semantic-recall.mjs\` and
  \`docs/issue-93/semantic-abstention.test.mjs\` in the targeted
  remediation \`d40506d15ed2ed2c2c08edcd64995182c197a6d8\`.
- The new logic preserves an EXACT, independently requalified strict
  anchor present in the same already-source/remote-authorized pool,
  without admitting incidental "now" as independent semantic support.
  Three added focused regression cases cover native/index historical
  comparison and unqualified/out-of-pool anchors.
- **This source revision postdates exposure of the holdout.** It was
  triggered by independent synthetic code review, NOT by observing
  specific holdout cases. Do not falsely assert that the revised source
  was frozen before the original holdout exposure. The authorization
  below addresses that disclosed chronology directly.
- Original B2.2 source:
  \`4bc169cc59e8900f5dc3cd4d3c70a22d0fcfb9f4\`.
  Unchanged original semantic:
  \`69014b739d490f8cb90bce86233edf3054673209\`.
  Both historical source/holdout outputs remain preserved.

## Method authorization, bounded to the named remediation

For THIS revision and the original already-registered, already-exposed
4-positive/2-negative holdout, permit ONE controlled, deterministic,
read-only **post-exposure** candidate replay. Use the same frozen
Graphiti/ReviewStore snapshot, original case/source judgments, exact
group/workspace/project, same-group episode membership, transport and
replay adapter as the previous comparator qualification.

Compare four distinct authority roles without conflating them:

1. Original strict/current semantic at their authenticated source;
2. Original once-only candidate B2.2 at its original source, with
   preserved results (H01=T, H02-04=F; HN01=4; HN02=0);
3. Approved post-exposure unchanged semantic comparator previously
   recovered and explicitly labeled diagnostic/exception;
4. Revised candidate source at
   \`d40506d15ed2ed2c2c08edcd64995182c197a6d8\`,
   expressly labeled \`POST_EXPOSURE_CODEX_REMEDIATION_EXCEPTION\`.

Required evidence: original frozen dev/holdout manifests and snapshot
hashes reproduced without any mutation; independent exact-source code
diff and Codex chronology; same source-bound input/remote authority;
case-by-case positive source-exact no-loss vs unchanged semantic and
old B2.2; no new off-topic, unsafe, source/EX/temporal or privacy
injections; same predeclared development N01/N02 abstention and
additional negative guardrails; and the genuine historical strict-floor
counterexample corrected. Preserve original B2.2's 1/4 absolute
holdout support and four HN01 off-topic facts: these were **not**
candidate-only regressions and are not silently relabeled.

**Important:** This extension permits evidence evaluation; it does
not retroactively make the original holdout untouched for the revised
source. A post-exposure revised-candidate result must NEVER be called
an original sealed-holdout score or a prospective independent test.
No tuning to improve retrospective scores is allowed; if the fixed
revision fails, return FAIL with diagnosis and seek a separate
prospectively approved plan rather than iterating candidate changes
against the exposed set.

## Other unchanged acceptance obligations

- Run revised 14-case semantic-abstention regression file with actual
  exit codes, plus relevant source-bound integration/privacy tests.
  The trusted \`repository-final-v1\` profile does not currently
  include those focused Issue #93 test files.
- Independently confirm the revised installed/native path still
  meets <=5 selected facts, <=1400 **selector JSON** characters and
  >=20 mixed native context hooks at p95 <=300 ms, including
  empty/error/late observations; search/get_episodes RTT separately.
  Reuse only evidence for unchanged components with an explicit
  source-equivalence proof.
- Previous clean memory OFF/ON model-answer result was independently
  adjudicated PASS for B2.2 and is not automatically a fresh model
  answer experiment on revised source. It may support the revised
  candidate only with a source-exact bridge showing the same D12 fact
  still selected, same source authorization, same assembled context
  semantics and no alternate channels; otherwise mark revised
  candidate answer utility UNVERIFIED and propose a single bounded
  operator-owned verification, **not automatic GPU reruns**.
- Preserve the original source, remote, privacy, evidence-class,
  temporal, rollover and EX hard fences; do not weaken tests or
  source-authority checks to obtain PASS.
- The CI \`node-contract\` and trusted exact-head Verify on
  \`d40506d15ed2ed2c2c08edcd64995182c197a6d8\` passed,
  but any subsequent evidence commit creates a NEW PR SHA requiring
  exact-head revalidation and independent review.
- Open Codex thread and formal independent review/approval remain
  pending until Central resolves them at the final exact head.
  Merged-main CI, possible installed qualification and issue closure
  require separate decisions. Issue #94 remains responsible for
  installed Graphiti+OpenViking coexistence.

**Authorization result:** \`APPROVED_CODEX_REMEDIATION_COMPARATOR_EXTENSION\`.
**Qualification result:** \`PENDING_REVISED_CANDIDATE_HOST_EVIDENCE\`.
**PR merge / deployment / issue closure:** NOT AUTHORIZED.
