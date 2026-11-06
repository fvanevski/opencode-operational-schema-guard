# Issue #81 — Native-Source Audit v1 (evidence packet)

Self-contained, sanitized diagnostic evidence for Issue #81: completion of the
native-source binding for all **126** production facts and an independent
root-cause diagnosis of the **eight** failed positive recall cases (S01, S03–S07,
S10) plus the **S13** no-injection case and the **N02** negative control.

This is a **diagnostic** campaign, not a production repair. It adds no source,
test, config, CI, or policy change; the frozen evaluation (8/16 FAIL) is
preserved.

## Source identities

| Item | Value |
| --- | --- |
| Merged main | `b39e1ff7d950075273fc2dab7206c5f8a17add70` (tree `7c5486fefc12063c70c5839d63a300c630c925d0`) |
| Evidence branch head (commit parent) | `b58bde911a8a4f4aa1856315dc363f1fbaa68837` |
| Operator packet (126) | SHA-256 `c110acd3bcc9fa6e62f347c285bd61fd542e2a826634fa1134bac78a1f204e52` |
| Phase A worksheet | SHA-256 `9f9152cc1a5c0defc616dcced2869d30aa21738f78d698a5b8b2777659b7b56c` |
| As-of snapshot | SHA-256 `c8d5053c16ac7a07447c71d0bb5e7c4ce665940cdba3263119bdb25d6524ef37` |

See `input-identity-manifest.json` for the complete immutable input-identity
manifest.

## Contents

### Phase 2 — native-source binding (126 facts)
- `fact-source-bindings.jsonl` — 126 item-level records (identity, source event,
  roles, timestamps, exact UTF-8 byte offsets, evidence status). All 126 =
  `EXACT_NATIVE_SOURCE_MATCH`.
- `native-event-source-evidence.jsonl` — sanitized per-item source excerpts with
  native metadata, byte offsets and SHA-256 binding (indexed by item/source_ref).
- `source-match-reproduction.json` — aggregate totals.
- `authority-temporal-review.json` — item-level provenance concerns and
  operator-review recommendations (no fabricated human verdicts).
- `full-matrix.json` — machine-readable join for independent re-check.
- `source-extraction-method.md` — collection paths, schema fields, offset
  algorithm, independent checks.

### Phase 3 — recall root-cause diagnosis
- `recall-case-diagnostics.json` — nine case-level provenance paths and
  conclusions.
- `retrieval-pipeline-analysis.md` — source-backed invariant analysis and exact
  current-code locations.
- `recall-evaluator-analysis.md` — retrieval defects vs exact-source scoring
  strictness (8/16 preserved).
- `negative-control-n02.md` — exact group/source identity and policy
  interpretation.
- `reproducibility.md` — read-only commands/helpers, source identities, bounded
  results, honestly-marked unavailable evidence.

### Phase 4 — integrated disposition
- `diagnostic-summary.md` — Problem 1 (source quality) and Problem 2
  (retrieval correctness).
- `issue81-gate-disposition.json` — gate outcomes.
- `proposed-correction-contract.md` — optional scoring-only correction (no
  retrieval-code change demonstrated necessary).

### Helpers (executed, read-only)
- `helpers/bind-source-events.py`
- `helpers/build-recall-diagnostics.py`

### Manifests
- `input-identity-manifest.json` — immutable input identities.
- `SHA256-MANIFEST.txt` — non-circular SHA-256 manifest of every exported
  regular file (inventory-equal to the Git-staged set).
- `command-shape-friction.md` — complete command-shape friction ledger.

## Sanitization and public reproducibility

- `native-event-source-evidence.jsonl` publishes the **full unredacted**
  `source_text` (the original decoded source-event text) with
  `source_text_sha256`, so the verbatim byte match is **independently
  reproducible from Git** (`independently_publicly_reproducible=true`).
- A `public_display_excerpt` redacts only non-secret host metadata (operator
  username in `/home/…` paths, host hostname) for human readability. Rows with
  such redaction carry `public_excerpt_redacted=true` and are **not** presented
  as byte-identical to the unredacted source at the original offsets.
- `raw_exact_match_verified=true` for all 126 (assertion is a verbatim UTF-8
  substring of the unredacted source text, verified in the private store and
  bound by `source_text_sha256`).
- No credentials, authorization headers, bearer/API tokens, private keys, DSNs
  with embedded credentials, or protected operator attestations are published.
  Localhost connection URIs (for example `redis://127.0.0.1:6382`) appear only
  inside verbatim fact/source text and carry no embedded credentials. Native
  session/message/tool ids and non-secret host paths are retained where
  necessary for provenance.

## Headline results

- **Source binding:** 126/126 `EXACT_NATIVE_SOURCE_MATCH` (byte offsets
  verified). Only 8 items match the *single displayed* packet excerpt
  ({11,38,47,70,75,79,80,124}); the other 118 match a non-displayed source event
  of the same record.
- **Semantic recall:** 8/16 FAIL (preserved). Seven wrong-source cases are a
  combination of semantically-related recall + exact-source scoring strictness.
- **S13:** absent block, censored-or-no-match; missing-source-index ruled out.
- **N02:** correctly-grouped (development-knowledge) undesired topic relevance,
  not a cross-group leak; FAIL_INJECTED preserved.
- **Human grounded precision:** UNVERIFIED (all 126 `human_verdict` null).
