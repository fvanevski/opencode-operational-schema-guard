# Issue #92 / PR #95 — native-source integrity corrective qualification (sanitized evidence)

Branch `issue/92-v7c-accepted` | PRIMARY_AGENT=Hermes/Build | EXECUTION_MODE=host-local CPU / native source & provenance
CONTRACT=docs/issue-91/adr-acceptance/ISSUE92_PR95_NATIVE_SOURCE_REMEDIATION_VERIFY.md
MODEL_INFERENCE=none | GRAPHITI_WRITES=none | HISTORICAL_REPLAY=none

## RESULT = **SOURCE_REMEDIATION_REQUIRED**

Central's substantive source fix (credential-value screening, literal whitespace
preservation, independent authored fragments, atomicity-review direction) is
present at the exact tested head and is verified by 143/144 focused native tests.
One focused regression test fails on a **semantic source defect** in the
credential-value screening that Central owns; the minimal correction is stated
below and is **not** applied here (SEMANTIC_REMEDIATION=forbidden).

## Source identity (Section A)
- TESTED_SOURCE_HEAD = `5ce36d93b615d3c3b1adda32600e1fad6be05133`
  (remote `origin/issue/92-v7c-accepted` head == REQUIRED_EXACT_HEAD, verified pre- and post-run; no drift)
- Worked in a separate disposable worktree at the exact SHA; the main checkout's
  untracked files and private state were preserved and untouched.
- Key source/test blob SHAs (git blob ids):
  - events.mjs            `4ffa5a9849a480da1fee4fb8c81a4fee1d8a7e5c`
  - fact-review.mjs       `4059560d872d4fa279399096e34233d1730d895a`
  - long-prompt.test.mjs  `f1c039eee9f0f780feb0f2c0187f0f39bcb6c7f8`
  - issue92-a3-acceptance.test.mjs `e2632774fa4d552cac34035e5519ca669e3f4e60`
  - issue92-a3-native-source.mjs   `7d8dedddb618d3d6840475f8123f01dc380a3a96`
  - issue92-a3-stage.test.mjs      `75e7012ab6407e69ce17951d867ddb3c25c619ff`
  - finite-batch.test.mjs `82b5955bdb7241a019f85b770f2ccad8756d2dc2`

## Focused native regression gates (Section B) — real producer exits
| command | tests | pass | fail | rc |
| --- | --- | --- | --- | --- |
| node --check events.mjs / fact-review.mjs / long-prompt.test.mjs / issue92-a3-acceptance.test.mjs | 4 files | 4 | 0 | 0 |
| node --test v2-candidate/candidate.test.mjs v2-candidate/long-prompt.test.mjs | 31 | 31 | 0 | 0 |
| node --test v2-curator/fact-review.test.mjs v2-curator/claim-evidence.test.mjs v2-curator/finite-batch.test.mjs | 94 | 93 | **1** | **1** |
| node --test adr-acceptance/issue92-a3-stage.test.mjs adr-acceptance/issue92-a3-acceptance.test.mjs | 19 | 19 | 0 | 0 |

Totals: 144 focused tests, 143 pass, 1 fail.

### The single failure (semantic source defect, Central-owned)
- Test: `source-exact utility rubric covers durable facts without confusing them
  with setup chatter` (docs/issue-78/v2-curator/finite-batch.test.mjs:292,
  loop case index 4 — a "post-change system state" credential-store fact).
- Actual: `AssertionError [ERR_ASSERTION]: native source must stage`
  (the source produces no staged events → `selectClusters(...)[0]` is undefined).
- Root cause: `docs/issue-78/v2-candidate/events.mjs:8` `PRIVATE_VALUE` regex
  treats "API key **was removed**" as a credential *value* and privacy-vetoes the
  whole source, because "removed" is absent from the negative-lookahead
  location-word allow-list (in|at|under|inside|on|stored|located|…|specified).
  This under-captures a legitimate "credential-store LOCATION / post-change state"
  fact that the test (and contract §B "safe credential location text still
  captured without any secret values") requires to be staged.
- Minimal proposed Central correction (verified, not applied): add `removed` to
  that allow-list →
  `…|generated|included|found|specified|removed)\\b)`.
  Verified: with that one-word addition all 94 curator tests pass and the
  candidate (31) and A3 (19) suites remain green.
- Not a host invocation/fixture-path issue; it is a production-regex semantics
  change, so per contract it is Central's to own → SOURCE_REMEDIATION_REQUIRED.

## Trusted CI (root profile)
- GITHUB_RUN_ID = `43476420695` (exact-head "node-contract" root check, PASS).
  Its package.json scripts do **not** cover the docs/issue-78 and docs/issue-91
  suites above, so the one failing focused test is not masked by that run.

## Historical v7c native-source equivalence (Section C) — read-only
- Frozen private corpus manifest SHA-256 `9356e663…af691` == expected;
  label-freeze SHA-256 `401e57ab…fc0` == expected (both verified on the private
  bytes at `~/.local/state/ghdev-graphiti-issue92/`).
- Re-derived stageRows under the CURRENT source via the pure
  `prepareProspectiveEvents` (20 cases → 20 events, all case_event_counts=1),
  compared to the frozen staged receipt (20 rows), sorted by (case_id,source_ref):
  - **15/20 cases byte-identical** on all 5 fields (case_id, source_ref,
    event_id, native_event_text_sha256, excerpt_sha256).
  - **5/20 cases** (v7-c-01, v7-c-02, v7-c-03, v7-c-09, v7-v-09) differ **only**
    in `excerpt_sha256`. For all 5,
    `sha256(whitespace-collapsed(current excerpt)) == historical excerpt_sha256` —
    i.e. the sole delta is literal internal-whitespace preservation (the intended
    fix #2); the authored wording is unchanged.
  - No source opportunity gained or lost: same 20 cases, same event_ids, same
    source_refs, same native-text digests, same case event counts. No new
    false-positive admits, no undercapture, no source-count change.
- **V7C_EQUIVALENCE = PASS** (5 documented whitespace-only representation
  differences; case IDs + hashes only, no private native text committed).
- **NATIVE_CONTIGUITY = PASS**: every current excerpt is a contiguous substring
  of its original native message; no quote crosses a removed context block (all
  v7c source_refs are whole-message base locators — no `:span:N` splits).

## Atomicity verification gap (Section D) — read-only
- **ATOMIC_FACT = FAIL** (substantive review blocker for Central).
- Case v7-v-08, native message `msg_160509336001zc8AM5tccpDCaM`. The original
  ONE Graphiti episode (`f699fd62-c952-49aa-a79c-4ff5428402d5`) stores exactly
  ONE user-stated fact whose assertion equals the full original native message
  verbatim (assertion SHA-256 `2c03af01093b4e136aee70b5e396a85bcb72b8d3231ec7b9b8dfe7ee10804c60`).
- Privacy-safe description: that single fact bundles **two independent,
  non-entailing, unrelated-domain predicates** — (1) a Tdarr server/node v3
  version fact and (2) a Context7/Firecrawl MCP tool-use instruction. Neither
  entails the other; the frozen label predicate also separates them. This is
  exactly the defect-#3 class the fix targets. Not presumed from the summary:
  read from the persisted ReviewStore record.

## Privacy boundary (Section E)
- **PRIVACY_BOUNDARY = PASS**: this packet contains source/blob SHAs, test
  commands+counts+exits, CI run id, v7c hashes + case IDs, and the atomicity
  digest/abstraction only. No private native messages, raw model responses,
  secrets, Graphiti identifiers beyond the proof UUID, or host home paths.

## Historical state
- **HISTORICAL_STATE = unchanged**: the v7c corpus, label freeze, staged
  receipt, adjudicated scorecard and acceptance history were read read-only and
  not modified; no historical driver/scorer was re-run; no Graphiti writes.

## Source changes
- **SOURCE_CHANGES = none** in the committed tree. The scratch one-word
  `PRIVATE_VALUE` experiment was applied, verified, and fully reverted before
  publishing (worktree clean at the exact SHA).

## Command-shape friction
- **COMMAND_SHAPE_FRICTION = encountered (path/naming only, no semantics):**
  - Requested private paths `/tmp/opencode/issue92-a3/{private/…,a3-v7c-scorer-roster.json,state-v7c/…}`
    were absent; effective location is
    `~/.local/state/ghdev-graphiti-issue92/{private/…,state-v7c/…}`.
  - The v7c scorer roster (`a3-v7c-scorer-roster.json`) is not present as a
    standalone file; it was faithfully reconstructed from the corpus (all
    per-case roster fields + `label_digest_sha256` + manifest byte-hash) and
    consumed read-only by `prepareProspectiveEvents`. Execution effect: none on
    source semantics; the comparison ran and matched.

## Limitations
- The v7c roster reconstruction is host-side and read-only; it does not alter the
  frozen corpus/label/staged bytes. The one focused source defect and the
  ATOMIC_FACT=FAIL finding are left for Central's substantive correction and
  independent rereview; no merge, PR, model inference, Graphiti write, or #92
  closure was performed.
