# Issue #92 / PR #95 — source integrity corrective qualification (single Build campaign)

## Authority and exact change

REPO_ID=fvanevski/opencode-operational-schema-guard
PR=95
BRANCH=issue/92-v7c-accepted
SOURCE_HEAD=full 40-hex SHA supplied in Central kickoff
CONTROL_BASE=c8eb5260f2b10832346234b1b5d0cf28302ffba8
PRIMARY_AGENT=build (OpenCode preferred; Hermes Build acceptable)
EXECUTION_MODE=host-local CPU / native source and provenance qualification, no model
SOURCE_REMOTE_UPDATE=forbidden
EVIDENCE_REMOTE_UPDATE=allowed
EVIDENCE_PACKET_REQUIRED=yes
EVIDENCE_ROOT=docs/issue-91/evidence/92-pr95-source-integrity
MECHANICAL_REMEDIATION=limited to genuinely mechanical host test invocation/config-path repairs; no semantic production/test assertions
SEMANTIC_REMEDIATION=forbidden
NEW_PR=forbidden; MERGE=forbidden; ISSUE_CLOSE=forbidden; PROD_ACTIVATION=forbidden
GRAPHITI_ADD_MEMORY=forbidden; MODEL_INFERENCE=forbidden; HISTORICAL_REPLAY=forbidden

Central already implemented the substantive source fix directly on PR #95, including regressions. Do not redesign source semantics, edit memory architecture, add another safety framework, change scoring/acceptance/EX authority, rerun v7c, or create a new cohort. This is one ordinary implementation-Verify assignment plus host-only source identity checks. Stay within these objectives; solve trivial host path/invocation problems autonomously without separate handoffs.

## Why

The formal independent CHANGES_REQUESTED review at commit 0f392b2caeb1d96a0d71dbf4267ae377a3249a93 identified:
(1) natural-language disclosure of a password or access token bypassing the pre-capture privacy veto;
(2) whitespace collapsing and OpenViking context excision combining non-contiguous authored native text into an apparently exact Graphiti quote;
(3) one fact per episode is structurally enforced, but one "fact" may bundle several unrelated predicates.

Central fix:
* docs/issue-78/v2-candidate/events.mjs: explicit credential-value screening at original-source entry; preserve literal internal whitespace; original decoded-native UTF-16 offsets on partial source ref :span:N; no synthetic assistant truncation marker; context removal returns independent authored fragments, never a combined quote.
* docs/issue-78/v2-curator/fact-review.mjs: explicitly direct independent reviewer to reject mixed unrelated predicates as one atomic quote while accepting one conditional rule as one fact.
* Focused unit/A3 tests in docs/issue-78/v2-candidate, docs/issue-78/v2-curator and docs/issue-91/adr-acceptance.

Architecture unchanged: ADR-91 Graphiti factual developer memory + OpenViking contextual continuity; precise source identity; no invented model paraphrase as graph authority; independent semantic support and utility; temporal/evidence-class qualifiers; full-input privacy before segmentation; ReviewStore CAS and per-fact remote UUID/source-index; canonical kernel-backed post-exit EX flock, once-only model intent and reconcile-only after ambiguity. Existing V7c PASS 9/10 is **historical evidence at its original treatment**, not newly-run acceptance for this changed source head. Never rewrite the old cohort/scorecard.

## A. Materialize and prove exact source identity (Build, CPU)

The current PR head is already committed remotely. From a real local checkout of this repository:

git fetch origin refs/heads/issue/92-v7c-accepted
git rev-parse FETCH_HEAD
git status --porcelain=v1

The fetched commit MUST equal SOURCE_HEAD; confirm git object exists and PR head has not moved before consequential work. If the current checkout is clean and on the same branch, ff-only update it; otherwise use a separate disposable worktree at the fetched exact SHA. Do not reset, clean, stash, or overwrite unrelated local work. Work under the verified candidate repo workdir for the commands below.

Record actual full HEAD, source/test blob IDs, dirty/untracked status, and target Git branch. Trust remote PR head, not a same-named local branch or historical memory.

## B. Focused native regression gates (CPU, exact SOURCE_HEAD)

Run these as separate real commands from the target workdir, capture each process's own exit status (no pipe-masking):

node --check docs/issue-78/v2-candidate/events.mjs
node --check docs/issue-78/v2-curator/fact-review.mjs
node --check docs/issue-78/v2-candidate/long-prompt.test.mjs
node --check docs/issue-91/adr-acceptance/issue92-a3-acceptance.test.mjs

node --test docs/issue-78/v2-candidate/candidate.test.mjs docs/issue-78/v2-candidate/long-prompt.test.mjs
node --test docs/issue-78/v2-curator/fact-review.test.mjs docs/issue-78/v2-curator/claim-evidence.test.mjs docs/issue-78/v2-curator/finite-batch.test.mjs
node --test docs/issue-91/adr-acceptance/issue92-a3-stage.test.mjs docs/issue-91/adr-acceptance/issue92-a3-acceptance.test.mjs

Use the GitHub Actions exact-head "node-contract" receipt for npm run check/npm test instead of duplicating the 524-test profile. Verify that workflow binds SOURCE_HEAD and that it is trusted for its root profile, but note that its package.json scripts do not cover the above docs/issue-78 and docs/issue-91 suites.

Must see specific PASS coverage for:
- user, assistant, tool and native edit/write credential value disclosures (synthetic dummy values only);
- safe credential location text still captured without any secret values;
- multiline/CRLF/tab raw quotation is literal and attributable, with offsets;
- OpenViking-excised regions kept separate, including multiple tags;
- old malformed/memory-only source fails closed;
- A3 full native source/hash binding and pre-inference privacy veto;
- atomicity-review prompt and explicit REVIEW->DEFER behavior;
- existing finite batch, source/evidence and no-replay regressions.

Any real failing behavior is a blocker; report exact test names, actual stderr and minimal provenance-correct root cause. You may fix only host invocation/fixture-path mistakes without changing source semantics or assertions. Do not weaken tests/privacy/EX. Central owns any substantive source correction.

## C. Historical v7c native-source equivalence check (CPU, read-only)

The old v7c manifest and source/label freeze remain untouched. The known private paths (verify existence and actual owner before use) are:
  /tmp/opencode/issue92-a3/private/issue92-a3-v7c-native-corpus.json
  /tmp/opencode/issue92-a3/a3-v7c-scorer-roster.json
  /tmp/opencode/issue92-a3/state-v7c/a3-v2-staged.json

Expected v7c private manifest SHA256:
  9356e663092df3a82b6b549e5d2c6208ff19a429205502388ba7d41b207af691
Expected label freeze SHA256:
  401e57abae879653b2c37dff9173e3ba43a8f8b02e052ee87cbf319b954ecfc0

Do NOT run the historical v7c driver or scorer, alter a frozen file, regenerate old group writes, use private source in public evidence, or call an LLM.

Using the pure repo source function prepareProspectiveEvents from docs/issue-91/adr-acceptance/issue92-a3-native-source.mjs, read those three files (without writing) and compute:
- manifest bytes hash matches roster private_manifest_sha256 and expected SHA;
- roster label-freeze hash matches expected;
- each case has its original session/message/native-text digest;
- under the CURRENT source the newly derived stageRows, sorted by (case_id,source_ref), match historical frozen staged rows on case ID, source ref, event ID, native text digest and excerpt digest; or provide ONLY per-case IDs, mismatched field names and safe hashes if they differ;
- exact-source offsets from all new source_ref :span:N cite contiguous quotations from original canonical/decoded native message; no quote crosses a removed context block;
- any new false-positive source admits, failures, undercapture or source-count changes.

One lean temporary inline Node script is permitted for this host-only comparison; it must import the existing pure library, not reimplement the capture algorithm. Do not persist private text copies under Git. No need for a 20-case new prospective campaign. If meaningful source opportunities changed, return exact mismatch classification for Central; do not adjust old source labels or assume the old PASS automatically transfers.

## D. Inspect the existing atomicity verification gap (CPU, read-only)

At the unchanged v7c state/root, locate the persisted source fact for v7-v-08 (native message ID msg_160509336001zc8AM5tccpDCaM). Verify its original ONE Graphiti episode's exact fact assertion and evidence-span against its original message, without changing ReviewStore/Graphiti.

The historical sanitized adjudication describes two potentially separable components: Tdarr server/node v3 and Context7/Firecrawl tool-use instructions. Return one of:
 ATOMIC_FACT=PASS (one dependent atomic fact);
 ATOMIC_FACT=FAIL (independent unrelated claims were stored together);
 ATOMIC_FACT=UNVERIFIED (exact original fact inaccessible).

Do not presume FAIL merely from the sanitized summary. If FAIL, provide a bounded privacy-safe abstract description and digest of the fact; mark as substantive review blocker. Central owns any remediation, and the historical pass result is preserved as originally recorded.

## E. Evidence publication and single handback

Publish at most ONE sanitized evidence-only commit to BRANCH under EVIDENCE_ROOT, only after verifying latest authoritative remote head is the tested source HEAD and no unexpected source changes exist. Do not publish private prompts, native DB text, credentials, passwords, graph secrets, raw model responses, private manifests, full host logs, Graphiti identifiers unrelated to proof or the user's home paths.

Include one concise README and JSON receipt: source SHA/blobs; focused test commands, producer exit/count; trusted Actions run identity; v7c source-equivalence PASS/differences (hashes+case IDs only); ATOMIC_FACT verdict; unchanged historical invariants; limitations and COMMAND_SHAPE_FRICTION. Verify staged path list is evidence-only; ordinary non-force push; authenticate remote SHA and new file blobs. On non-fast-forward or unrecognized drift, stop EVIDENCE_PUBLICATION=BLOCKED, preserve sanitized portable handback, never force/rebase/duplicate commits.

Return ONCE:
RESULT=READY_FOR_CENTRAL_REREVIEW | SOURCE_REMEDIATION_REQUIRED | BLOCKED
SOURCE_HEAD=<actual tested SHA>
EVIDENCE_HEAD=<full remote evidence commit SHA or BLOCKED>
FOCUSED_TESTS=<command/count/rc>
TRUSTED_CI=<run ID, exact HEAD, check names/outcome>
V7C_EQUIVALENCE=<same source spans and IDs or bounded mismatch table>
NATIVE_CONTIGUITY=<PASS|FAIL>
PRIVACY_BOUNDARY=<PASS|FAIL>
ATOMIC_FACT=<PASS|FAIL|UNVERIFIED>
HISTORICAL_STATE=<unchanged>
SOURCE_CHANGES=<none; any local changes must be listed>
COMMAND_SHAPE_FRICTION=<encountered=no or actual events with requested vs effective shape, provenance and execution effect>
DECISION_BLOCKERS=<only evidence-backed material blockers>

Do not request a new PR, late Codex review, merge, host activation or #92 closure. Do not perform new inference, Graphiti write, speculative debugging, broad architecture refactoring, or side-issue campaigns. Central will independently review the packet and perform the formal exact-new-head semantic gate.
