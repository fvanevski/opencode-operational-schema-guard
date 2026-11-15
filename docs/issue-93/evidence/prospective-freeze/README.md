# Issue #93 — prospective-freeze evidence packet

Sanitized, evidence-only snapshot of the approved prospective cohort freeze and
matched baseline on the issue/93 working head
(`68eaf2400194eb19a3803984bc2c7eb43fbf8e82`).

Measurement only. The historical #81 roster/denominators/scores remain
immutable and are NOT re-passed. Not final acceptance; no production selector
change staged.

## Members

- `cohort-manifest.json` — published-safe cohort manifest: safe case labels,
  SHA256 digests, denominators, source scope, frozen snapshot fingerprint,
  freeze timestamp, and the dev/holdout private-manifest SHA256 values.
- `baseline.json` — UNMODIFIED strict (13/18) vs UNMODIFIED semantic (15/18)
  on an identical frozen snapshot; no strict-only losses; 6 raw-top24-absent
  cases (4 recovered via the #92 index rescue); negative control outcomes.
- `france-diagnosis.json` — measured root cause of the off-topic (N01 France)
  single-fact injection in the semantic selector.
- `central-change-contract.json` — the one narrow Central selector correction
  contract (affected function, I/O behavior, regressions, zero-regression
  requirement, explicit non-goals).
- `command-shape-friction.json` — COMMAND_SHAPE_FRICTION block.
- `handback.md` — full typed handback with SHA identities and B2 root cause.
- `SHA256SUMS` — manifest covering the members above.

## Privacy

Raw queries, expected fact/source/remote identities, group/workspace/project
maps, and the sealed holdout's raw cases live in the PRIVATE scratch
(`/opt/filip/.hermes/cache/scratch/issue93f-ngY8kq/`) and are NOT published.
Only safe labels, digests, denominators, and the frozen snapshot fingerprint are
in this packet. The holdout is SEALED_NOT_RUN.

## Baseline method

The real `Memory.search()` pipeline runs with a frozen Graphiti transport so
strict and semantic see the identical search-result + same-group membership
snapshot, with the real #92 `curatedCandidateRetriever` + `sourcedEpisodeResolver`
index/resolver. The #81 replay/scorer utilities were adapted in private scratch
to this prospective roster with a distinct Issue #93 cohort identity; no
historical edits.
