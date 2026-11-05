# Handback — Issue #81 attribution remediation campaign (evidence-only)

RESULT: **PASS_READY_FOR_CENTRAL_REVIEW**

## Scope

One consolidated implementation-validation campaign for the Central-authored
changes staged on PR #83 (branch `issue/81`), authenticating exact source
`8dcdf199c8b53d8e213c07427525cb0766f726ca` (predecessor evidence head
`941706acf155aa00502255c7ede97434e81170ba`), running focused CPU validation,
qualifying the corrected adapter against preserved native stock-V2.2.5
evidence, re-scoring the frozen benchmark under the corrected evaluator, and
publishing this sanitized evidence packet. No redesign, no new PR, no
holdout regeneration, no Graphiti inference.

## Results

| Gate | Result |
| --- | --- |
| Source attribution tests (invariants A–G, focused suite) | PASS — 81/81 focused tests, exit 0 |
| Source attribution review (bounded) | PASS — 5-file diff, no drift; invariants A–G confirmed |
| Full focused CPU suite | PASS — 81/81, no failures |
| Native host provenance (bounded replay) | PASS — 3 cross-turn mis-anchors corrected; envelope identities byte-identical; tool anchors unchanged |
| Frozen score compatibility | PASS — all required accounting values met (recall 14/14, precision 14/22, 2 EMIT/1 DEFER, 2 receipt-bound facts, 2/2 grounded, 1/2 useful, 0 false authority, 0 wrong scope, no privacy/wrong-group, 0 label changes) |
| Benchmark telemetry | PASS — `post_exit_persisted_ms` separate series (population 2); missing per-record usage reported as null/unknown; host-journal aggregates (6548/564/2334 ms) preserved undistributed |

New post-correction score artifact: `final-score-attribution-v1.json`
(SHA-256 `522f9285393f0e90ad36d623715faafd04a1d7a230cd8ed803412e61c4aa2c60`),
distinct from the preserved historical redrain score
(`c0fcb59982fdbc1f327ec2d4dd2ee0bea9c5a5b395fc225374f53a00e645b823`).

## Defects found in the Central implementation

None. Invariants A–G hold; the smallest-repro regressions (association tests)
pass, and the preserved native evidence shows the corrected behavior where the
pre-correction dump exhibited the later-prompt mis-anchors.

## Blockers

None.

## Residual limitations (recorded, not defects)

- Cross-restart historical anchors fail closed (omitted, never invented) until
  native prompts are re-admitted in the new process; durable dedup unaffected.
- Native replay reconstructed per-context-build ordering from staged-event
  timestamps; per-build message arrays and file-tool input payloads are not
  preserved in the historical dump.

## Remaining gates (Central-owned, not exercised here)

- Independent PR review of the source changes (Central-owned).
- Merge, installation, GPU inference, fresh-client public acceptance.
- `semantic_recall` (`UNVERIFIED_UNTIL_FRESH_CLIENT`) and
  `context_latency` (`UNVERIFIED_UNTIL_INSTALLED`) remain explicitly
  unverified gates in the score.

## Identities

- REPO_ID: `fvanevski/opencode-operational-schema-guard`
- ISSUE_NUMBER: 81, PR_NUMBER: 83 (draft, open)
- TESTED_SOURCE_SHA: `8dcdf199c8b53d8e213c07427525cb0766f726ca`
- EVIDENCE_COMMIT_SHA: recorded in the session handback (a file cannot contain its own commit SHA)
- SOURCE_CHANGE_DIFF: the 5-file Central diff 941706ac→8dcdf199 (staged before this packet)
- EVIDENCE_CHANGE_DIFF: this packet directory only

## Sanitization

No raw native transcripts, credentials, signed operator identity, host home
paths (shown as `<host-home>`), or private worksheet bytes are included in this
packet. The private detailed diagnostics (raw suite output, replay script,
score artifacts, campaign-run journal) remain under
`<host-home>/.local/state/ghdev-graphiti-issue81/holdout81-64d32eb7/` and
`/tmp/opencode/issue81-holdout-64d32eb7/raw/`.
