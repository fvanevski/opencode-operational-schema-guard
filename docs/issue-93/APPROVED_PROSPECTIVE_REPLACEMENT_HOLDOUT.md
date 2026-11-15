# Issue #93 — APPROVED one-time prospective replacement holdout

**Decision:** APPROVED by the repository operator on 2026-11-15.

**Purpose:** replace the missing original *per-query retrieval-transport identity*
with a genuinely new prospective test of the already-fixed Codex-remediated
selector. The previous holdout is historical and is **not rewritten**.

**Fixed candidate implementation:** full commit
\`d40506d15ed2ed2c2c08edcd64995182c197a6d8\`,
PR #96 in \`fvanevski/opencode-operational-schema-guard\`.

**Acceptance authority:** \`APPROVED_PROSPECTIVE_ACCEPTANCE.md\` (notably
sections 2-7), plus the two already-approved, explicitly retrospective
comparator exceptions. This document authorizes **one finite supplemental
prospective 4-positive/2-negative holdout** without changing hard source,
privacy/EX, native performance, selector budgets, comparison thresholds,
or closure requirements. It supersedes *only* the now-impossible demand
that the new fixed candidate be tested against the unavailable byte-exact
original holdout search responses. It does **not** reclassify an exposed
holdout as untouched.

## Why a new prospective test is authorized

The original 2026-11-15 holdout sealed the source pool and episode
membership, but did not retain the original per-query Graphiti
\`search_memory_facts\` top-24 responses. Subsequent read-only re-capture
could not prove identical selection inputs. One attempted requalification
also used abbreviated guillemet/redaction placeholders instead of the
original secret-negative queries, creating invalid 4/2 negative
measurements. Private host stage-attribution then reported that the
exact frozen N04/HN02 raw queries are rejected at stage 0 by
\`safeText(query,500)\`, with no model-facing facts. The source-level
privacy prefilter is unchanged and Central independently reproduced
the long-credential rejection versus shortened-placeholder admission
on synthetic examples. The private original raw queries were evaluated
by the local agent, not directly by Central. The missing original
transport remains an unrecoverable historical method gap.

The synthetic Codex P2 strict-floor counterexample was independently
reproduced and corrected by the fixed source above. This approval is
NOT prompted by inspection of new prospective outcomes. No source
revision, cohort refreeze, threshold search, or repeated trial is
authorized after the prospective test is opened.

## Single fixed evaluation protocol

1. Select and independently adjudicate **exactly four new positives**
   (covering direct/indirect or paraphrase, cause/fix or decision,
   and historical/temporal use) plus **exactly two negatives**:
   one off-topic question and one secret/privacy question using a
   **synthetic, never-real credential-format sentinel**. No exact or
   near-duplicate of any original development, exposed holdout or
   retrospective diagnostic query; no previously scored result used
   to pick easier questions. Positive source/expected-fact identities
   and negative classifications must be adjudicated from accepted #92
   source/ReviewStore/episode evidence **before any selector output
   is observed**. If credible cases cannot be sourced, STOP before
   trial rather than repeatedly changing cases.
2. PRE-REGISTER and durably seal one private six-case manifest:
   **exact UTF-8 raw question bytes and SHA256 for each**, expected
   fact/source/episode identifiers, group/workspace/project,
   temporal and evidence classification, hard negative expectations,
   fixed source snapshot and original compared implementation SHA,
   and authoritative registrar timestamp. Store private artifacts
   with directory 0700/file 0600. Clearly distinguish
   \`raw_query_sha256\` from \`safeText_query_sha256\`;
   \`sha256('')\` is NOT a unique raw-query identity.
3. Before any candidate/comparator ranking, capture and seal
   **byte-exact per-query Graphiti search request + full ordered
   top-24 response** for every admitted query, not only underlying
   graph facts; also freeze exact read-only source-journal/curated
   index rows, same-group \`get_episodes\` responses and remote
   proof needed by all comparator paths. For privacy-rejected query,
   record \`admission=REJECTED\`, the exact prefilter provenance,
   and \`NO_SEARCH_CALL\`; do NOT call Graphiti artificially.
   Make a second immutable SHA256-sealed transport bundle,
   with completion timestamp and original query-manifest digest.
   Verify the source snapshot against the original 355-fact
   fingerprint when using that source; any unqualified new fact
   must remain unadmitted. Do not pretend a source-pool hash
   fingerprints query-dependent retrieval responses.
4. **Only after BOTH seals are complete**, execute one deterministic
   read-only replay against the identical frozen input package
   with four existing implementations: unchanged strict control,
   unchanged original semantic
   \`69014b739d490f8cb90bce86233edf3054673209\`,
   prior B2.2 \`4bc169cc59e8900f5dc3cd4d3c70a22d0fcfb9f4\`,
   and fixed candidate \`d40506d15ed2ed2c2c08edcd64995182c197a6d8\`.
   The replay MUST NOT fall through to live Graphiti, different
   source/index/proof responses, substituted question strings,
   or unrecorded reranking services. Any unknown transport
   request is a hard STOP/UNVERIFIED, not an untracked fetch.
   All roles use the same frozen data, with policy-specific
   execution only where existing code requires it.
5. Judge **case-wise source-exact positive support**, preserving
   every recovered original-semantic, B2.2 and strict-only
   positive. Require **no new unsafe or off-topic facts**
   relative to comparators. The privacy negative must produce
   **zero model-facing facts and zero credential disclosure**
   (including stage-0 rejection as a valid PASS). Inspect all
   negative output stages, not just a raw selected-fact count.
   Check group/project/workspace, source IDs, remote membership,
   source evidence class, temporal/rollover and EX controls.
   Enforce <=5 selected facts, <=1400 **selector JSON** chars.
   Record absolute misses and false positives even if the
   relative method gate passes. Do not invent a new absolute
   off-topic threshold beyond existing accepted criteria.
6. Preserve previously authenticated, source-exact native hook
   (n=20, p95=299.99ms on fixed d40506d) and clean D12
   answer-use bridge evidence **as separate evidence classes**
   when their exact code/host source identities remain valid.
   No automatic GPU rerun or redundant benchmark campaign.
   Source or environment mismatch is UNVERIFIED, not a PASS.
7. Publish **one sanitized evidence-only commit** on existing
   \`issue/93\` and PR #96, with pre-ranking seal digests,
   transport-response seal digests, raw-query identity proofs
   expressed as hashes only, exact per-case adjudicated
   source-exact booleans/counts, absolute privacy result,
   absence of live fallthrough, SHA256SUMS, actual exit codes
   and source/manifest fingerprints. Do NOT publish raw
   questions, synthetic sentinel token, fact assertions,
   source refs, episode UUIDs, private Graphiti responses,
   auth/EX details or full model trace. Original historical
   records MUST remain untouched.

## Hard stop conditions / authority

If a new case is invalid before sealing, report
\`NO_ELIGIBLE_PROSPECTIVE_COHORT\` without consuming a trial.
Once sealed, do NOT substitute/refreeze cases or transport,
repeat candidate runs to chase outcomes, tune thresholds,
change production code, edit tests, or alter privacy or
source admission. Inability to capture exact transport,
any live fallback, source/remote identity mismatch, actual
privacy/EX violation, or unsupported inference about
model-visible content => FAIL/UNVERIFIED with evidence.
The single authorized evaluation is then consumed.
A new protocol requires separate operator approval.

Historic B2.2 absolute holdout 1/4 + HN01=4,
the earlier comparator recovery, Codex diagnostic,
and erroneous guillemet replay remain immutable and
are never silently replaced by the new results.

**Result of operator decision:** \`APPROVED_ONE_PROSPECTIVE_REPLACEMENT_HOLDOUT\`.

**Qualification:** NOT YET PERFORMED.

**PR approval / merge / deployment / Issue #93 closure:**
NOT AUTHORIZED by this document. Final GitHub exact-head
CI + trusted Verify + independent review and merged-main
gates remain Central-owned. Issue #94 separately owns
final installed Graphiti/OpenViking coexistence.
