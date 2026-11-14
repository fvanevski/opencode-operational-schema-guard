# Issue #92 / PR #95 — one final v8c source ratification and provenance correction

REPO=fvanevski/opencode-operational-schema-guard
PR=95
BRANCH=issue/92-v7c-accepted
REQUIRED_HEAD=<full exact SHA in Central kickoff>
ORIGINAL_R2_SOURCE_HEAD=d3d66bb3694d71fd4e73a1dc7d80cc4a1ca93f24
ORIGINAL_R2_EVIDENCE_HEAD=daa5b7c12632497f74665218f02dc0505d158162
PRIMARY_AGENT=OpenCode Build (Hermes Build acceptable)
ENV=CPU_ONLY_READ_ONLY_NATIVE_SOURCE + PRIVATE_STAGING
INFERENCE=FORBIDDEN
GRAPHITI_MUTATION=FORBIDDEN
SOURCE_EDITS=FORBIDDEN
NEW_PR=FORBIDDEN
MERGE=FORBIDDEN
DEPLOYMENT=FORBIDDEN
ISSUE_CLOSE=FORBIDDEN
GITHUB_WRITE=AT_MOST_ONE_SANITIZED_EVIDENCE_ONLY_COMMIT
PUBLIC_EVIDENCE_ROOT=docs/issue-91/evidence/92-pr95-v8c-source-ratification

## Central decision: R2 exposed success host-attested; original v8 NOT yet ratified

The exposed R2 host receipt reports the correct bounded result: original v7-v08 bundled statement deferred by the new structural veto even when the model falsely attested one predicate, genuine atomic v7-v07 persisted with remote UUID, two controls deferred, zero reported breaches; one EX-gated intent reconciled, no replay. Preserve all r1/r2/v7c/historical groups and records. Do NOT repeat R2 inference to repair its evidence metadata.

The ORIGINAL v8 freeze has NEVER RUN. Its complete private manifest SHA256 is dcd723a60deceae511a7838a9d736f88c59b3571f2959597afcbd7da35cdaf8e, label SHA256 27159112f60deaaefa54a588c968cd1674f7bdd1e431771efb649c219c060c86, roster SHA256 b5293e8c1ad666f37d36ca7d48dcd300c34986d20e75dca31da7a412cd1fa548. Preserve that original freeze, 20-case staging and empty group untouched as dated pre-inference evidence; no post-hoc edits.

### A. Fix the published R2 source-identity discrepancy (read-only original objects)

Central independently inspected the immutable Git tree at ORIGINAL_R2_SOURCE_HEAD. The seven tracked blobs actually resolve to:

docs/issue-78/v2-candidate/events.mjs=041aab302264d080362c1039439a34f1f3fbf80c
docs/issue-78/v2-candidate/queue.mjs=b4e2df18e3741917e8f3f2513b54cb6aef874e98
docs/issue-78/v2-curator/finite-batch.mjs=6d735b0e0e6d018af6956c02412fd67f275f97e8
docs/issue-78/v2-curator/fact-review.mjs=ee5350d5db81bcd94ff7306b69ad0801723e1f65
docs/issue-78/v2-curator/claim-evidence.mjs=3c29c4ff617682701e01fdfb46609e21a1892bd6
docs/issue-78/v2-curator/core.mjs=5b1d33efedc62b5ba0ad5f74ed68cddbee6afb0e
docs/issue-78/v2-curator/ex-admission-proof.mjs=e63b8a36b51627a6211bf4367c62a5c76461fa76

Six of these seven do NOT match docs/issue-91/evidence/92-pr95-structural-atomicity-r2/summary.json source_blobs_verified at its own declared source HEAD. The same receipt asserts eight inputs but lists seven paths. Reconcile the actual invocation's eighth input, if any (e.g. a separately installed EX bridge), to its authoritative file/origin/hash; never invent a Git blob for a host-only file. Examine the original immutable host R2 launcher/driver/receipt, test run and existing local Git objects. Correct the evidence in a SEPARATE additive erratum, without modifying or replacing the original R2 receipt or replaying its model/Graphiti calls.

The published receipt's claimed GitHub run 43482932702 returned GitHub HTTP 404 to Central. Independently verified successful CI: run 43486835871, exact ORIGINAL_R2_SOURCE_HEAD, 673 pass / 0 fail. Current evidence-only PR head daa5b7c12632497f74665218f02dc0505d158162 also has successful run 43489965011. Identify the actual trusted run on the relevant exact SHA. Do not attribute the 404 run to a source-head verification.

An erroneous evidence-file hash is not proof that source was not actually executed; report whether original host source-matching can still be proven, or explicitly UNVERIFIED. If model invocation identity itself cannot be authenticated, return the narrow blocking discrepancy without claiming clean evidence.

### B. Correct the 20-case v8 source/label freeze (CPU only, one consolidated task)

Use the ACTUAL canonical native OpenCode source store, NOT the previously published manifest/roster as self-authenticating proof. For every case, establish a live read-only original session/message locator and original message bytes (e.g. session_message.data.text when that is indeed the governing native DB schema), source class, project/workspace/time, UTF-8 SHA256 and source quote offsets. Some published v8 session IDs have nonstandard forms; that is a validation target, not proof of fabrication. If an ID is not backed by the claimed native source, replace the case. Respect full original-input privacy; no copied private DB export or raw source dump in Git.

Central's per-case source/label adjudication, based solely on the PUBLIC sanitized excerpts (subject to original-source corroboration):

- v8-v-01: retain as a USER-REPORTED fzf-tab Tab activation failure if native quote is authentic; no established root cause.
- v8-v-02: retain as a source-stated self-hosted Firecrawl constraint and operator instruction not to use official API, provided distinct from earlier cohort facts.
- v8-v-03: requalify as a PROPOSED Hermes-owned timeout configuration, not an already-implemented Hermes setting; retain only if useful under original temporal/source status.
- v8-v-04: retain as an operator-reported Termux sshd restart symptom, not verified causal diagnosis.
- v8-v-05: REPLACE. A generic suspected kernel-completion misconfiguration without an observed technical defect or supporting detail is insufficient as a distinct valuable durable fact.
- v8-v-06: requalify as a LIMITED-TESTING user report suggesting reinstall of a custom plugin refreshes tool schema; not proven necessary or guaranteed.
- v8-v-07: requalify as user-reported experience that a GH MCP version bump PLUS subsequent version readback appears to help verify refresh, not an officially established/supported refresh mechanism.
- v8-v-08: distinguish model-side vision capability from Hermes agent configuration. The source asks to enable Hermes support and does NOT prove the agent's configuration already enables vision. Retain only a source-authenticated atomic, temporally qualified model-capability predicate, otherwise REPLACE.
- v8-v-09: REPLACE. The previously published label conflates an incorrect geolocation reading with the user's actual location; the original text includes personal location information unnecessary for durable developer-memory acceptance. Do not copy it into any new evidence, source-target, or public receipt.
- v8-v-10: REPLACE. "Issues resolved; service SHOULD be restored" does NOT establish that the service WAS restored, and the proposed history is weak and overlaps the other Firecrawl item.

Controls: v8-c-02 and v8-c-10 have the SAME original text SHA256 (80a62c1aa08786982ccca7e60fa1d71e6e807bd4af669df041041c5ffb17b0a0), so REPLACE one to maintain ten meaningfully distinct, representative controls. Retain the rest if native-grounded and truly nonvaluable; if original controls include technical facts, reclassify/replace without relabeling after inference.

Choose authentic previously UNUSED native technical sources for required valuable replacements. Preserve representative natural difficulty, mix of development work, temporal status and failure reports. No previous v2–v7/B/exposed source IDs, overlapping underlying predicates, or OpenViking echoes. Do not choose cases merely because the current prompt will likely accept them. Every valuable target must be ONE concrete independently useful technical predicate with an exact 25–450-character privacy-safe contiguous original source quote. A question alone, tentative diagnosis without concrete evidence, task-only command, or false verification is not a valuable fact. Track original-source hedge/temporal limitations faithfully.

If the natural source pool genuinely lacks enough valid independent facts, return COHORT_NOT_RATIFIABLE with actual bounded evidence, rather than fabricating or weakening cases. Autonomous replacement of unsupported cases within these constraints is authorized; do not request separate approvals for each item.

### C. Re-freeze and stage one v8c candidate before further inference

Original v8 manifest, label roster, stage receipt and empty group remain immutable. For any relabel/replacement, create ONE NEW complete private 0600 source manifest and independently ratified 10 valuable + 10 control label roster (new hashes; call it v8c). Stage in a NEW 0700 state root using existing native-event builder, with all 20 authenticated original session/message identities and original-byte digests. Natural 24 clusters / 72 candidates / 3600 seconds bounds remain.

The existing group graphiti-adr92-a3-prospective-v8 MAY be reused only if freshly shown to have 0 episodes, zero model/write intents and no stale marker or ambiguity, while staging goes to a new state-v8c root. Otherwise select an unused empty v8c group; never clear or overwrite any previous group. Confirm original source/blob binding against the actual execution driver (including host-only bridge if present), EX inherited kernel-FLOCK positive/negative preflight, one-shot marker absent, and the eight-argument canonical scorer fails closed PRE-inference. No model call, Graphiti add_memory, prospective run or historical replay.

Freeze the complete original-source corpus and labels BEFORE any model intent. Do not silently change them after Central's final ratification.

### D. One sanitized evidence-only publication and handback

Create at most ONE new, additive, sanitized evidence-only commit under docs/issue-91/evidence/92-pr95-v8c-source-ratification/. Do not overwrite prior evidence. Include a compact SHA/CI provenance erratum, a case-level new-frozen-label table with safe exact excerpts and reasons, controls, native-origin proof classification, and private manifest/label/staging SHA256. No native database dump, sensitive location, secrets, credentials, full model response, private home paths or host logs. Read back the remote ref, commit ancestry and exact new file blobs after an ordinary non-force push. If remote moves unexpectedly, stop publication; no force/rebase/duplicate commits.

Return exactly one complete handback:
RESULT=V8C_SOURCE_RATIFIED | COHORT_NOT_RATIFIABLE | SOURCE_AUTHORITY_BLOCKED | BLOCKED
SOURCE_HEAD=<exact full unchanged production SHA>
EVIDENCE_HEAD=<full published SHA or reason absent>
R2_PROVENANCE=<original 7 Git blobs + eighth input if any, actual run ID and execution identity; discrepancy resolved or bounded UNVERIFIED>
FOCUSED_CI=<verified run/head/result, no unnecessary host repeat>
CASE_REVISIONS=<IDs, old/new classification, safe native quote, original identity/digest, replacement and nonoverlap reasoning>
ORIGINAL_V8_FREEZE=<unchanged 3 SHA digests and no inference>
NEW_V8C_FREEZE=<manifest, independent labels, roster, stage hashes and exact case mapping>
EMPTY_GROUP=<remote proof, no outstanding intent and new state marker absent>
EX_PRECHECK=<kernel fd, negative/positive proof; no inference>
READY_LAUNCH=<exact one-shot launcher path only; NOT EXECUTED>
HISTORICAL_STATE=<unchanged original v7c/r1/r2/v8 history>
SOURCE_CHANGES=<none>
COMMAND_SHAPE_FRICTION=<only actual friction, correctly scoped>
DECISION_BLOCKERS=<material exact-source/provenance issues only>

Central will ratify ONLY the changed source/label cases and corrected execution identity. If valid, Central can immediately authorize one untouched v8c prospective run; no additional exploratory campaigns, prompt sweeps, PRs, deployment or issue closure.
