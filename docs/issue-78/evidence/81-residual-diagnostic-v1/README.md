# Issue #81 Residual Recall Diagnostic — v1 (ISSUE81_RESIDUAL_DIAGNOSTIC_V1)

Evidence-only addendum to `docs/issue-78/evidence/81-postmerge-fresh-native-v1/`.
Diagnoses the residual recall failures of the post-merge fresh-native acceptance
campaign and hands a remediation packet to Central. No production code,
deployment, threshold, or score change is made on this branch.

## Scope and method

- Evidence branch: `issue/81-recall-acceptance` (parent head `df53c64`);
  production source: `main@9a27b73de882c0af6fec4d86de81945338611479`.
- CPU-only, read-only Graphiti access; no GPU inference, no production install,
  no new native recall run in this campaign.
- Candidate-set presence/eligibility is a **current-snapshot** reconstruction via
  read-only `search_memory_facts` (group `development-knowledge`,
  `max_facts=12`), NOT historical request-time evidence.
- `relevanceFilter` evaluated with `ranker=null` (installed plugin config has no
  `rerankEndpoint`); selection order: `priority → lexical.count →
  lexical.score → candidate index`.
- The original 8/16 baseline and 9/16 post-fix score are preserved verbatim
  (see `observer-erratum.json`); nothing was rescored.

## Files

| File | Content |
| --- | --- |
| `observer-erratum.json` | S12 `duplicate_block_in_request` observer error (OBSERVER_ERROR) with corrected complete-block-pair counting, corrected distinct-fact counts for all 20 cases, and score-impact proof (9/16 preserved). |
| `seven-case-root-causes.json` | 7-case residual root-cause matrix (S01, S03, S04, S05, S07, S10, S13) plus the N02 special adjudication (POLICY_FALSE_POSITIVE, frozen FAIL_INJECTED label retained). |
| `source-equivalence-review.json` | Source/proposition equivalence findings for the special-adjudication cases (S04/S05 cluster, S10 sibling source, S13 block-present/wrong-source). |
| `precision-adjudication-readiness.json` | Readiness state of the 126-item operator precision-adjudication worksheet (host paths + SHAs), target-ratification authentication, fixed thresholds, all human verdicts null. |
| `central-remediation-plan.md` | Consolidated production-change proposals for Central: named-entity fence relaxation (`relevance.mjs`), top-12 retrieval coverage, observer correction, N02 policy note; out-of-scope list. |
| `command-shape-friction.json` | Command-shape friction ledger for this campaign. |
| `SHA256-MANIFEST.txt` | SHA-256 manifest over all published files in this directory (excluding the manifest itself). |

## Headline findings

- **S12 duplicate verdict: OBSERVER_ERROR** — request `608a476b` held exactly one
  complete `[GHDEV_GRAPHITI_CONTEXT]...[/GHDEV_GRAPHITI_CONTEXT]` block pair; the
  second marker string is a quoted reference inside an OpenViking memory fact.
- **Root causes (7/7 diagnosed):**
  - LEXICAL_ADMISSION (named-entity fence over-rejection): S01, S04.
  - RETRIEVAL_COVERAGE (expected episode absent from current top-12): S03, S05, S07, S10, S13.
  - Pure RANKING failures: none.
  - Secondary: S03 (+LEXICAL_ADMISSION), S05/S10 (+SOURCE_EQUIVALENCE).
- **N02: POLICY_FALSE_POSITIVE** — injected episode `e1d8e764` persisted in
  `development-knowledge` with a proposition-correct cutover fact; frozen
  FAIL_INJECTED label retained.
- **Human precision: UNVERIFIED** — the 126-item worksheet is staged with all
  human verdicts null; no agent has populated or signed a human verdict.
- **Target ratification authenticated** (receipt + proposal SHAs match the
  committed and on-host bytes); thresholds fixed (`durable_grounded_precision_min=0.9`).
- **Central fix required: yes** (see `central-remediation-plan.md`).

## Sanitization

No real credentials, full model requests, or source-private records are included.
Host file paths appear only as provenance references to private artifacts.
