# Descriptive Graphiti fixture groups: naming, compatibility, validation

## Canonical IDs for NEW disposable fixtures

Use `graphiti-<domain>-<purpose>-rNN` as the **actual machine group ID**.

- Domain names the real subject (e.g. `cron`, `webvtt`, `curator`, `parser`).
- Purpose is `capture`, `development`, `diagnostic`, `efficiency`,
  `holdout`, `isolation`, `qualification`, or `recovery`.
- Run number is explicit and logical (`r01`, `r02`), not an issue/PR number,
  UUID, hash suffix, random nonce, or implicit auto-increment. A new run MUST
  use a **fresh, absent** candidate/review state group; never overwrite
  an occupied group to reuse its name.

Examples: `graphiti-cron-capture-r01`,
`graphiti-cron-development-r01`, `graphiti-cron-holdout-r01`,
`graphiti-webvtt-diagnostic-r01`,
`graphiti-curator-efficiency-r01`, and
`graphiti-curator-recovery-r01`.

The source authority is `docs/issue-78/fixture-groups.mjs`:
`fixtureGroupName`, `parseFixtureGroup`, `isFixtureGroup`,
`permittedQualificationGroup`, `fixtureUnitName`, and
`describeFixtureGroup`. Creation/validation cannot alias an existing
Graphiti identity. A display label is NEVER a machine group and cannot
redirect a source-index, state path, or Graphiti `group_id` lookup.

For new recovery fixtures, render `ghdev-<domain>-recovery-rNN.service`
from the SAME group, e.g. `graphiti-curator-recovery-r01` maps to
`ghdev-curator-recovery-r01.service`. The service template must
retain that exact `--group` string and the corresponding private state root.
Matching names **do not** grant authority to invoke an LLM, create episodes,
or bypass the installed EX admission wrapper.

## Producers and consumers

- **Staging:** `stage-holdout.mjs` requires an externally ratified holdout;
  it fences original per-case group/project/workspace, checks native identities,
  and refuses any present/partially initialized target group. New source
  `graphiti-<domain>-development-rNN` or
  `graphiti-<domain>-capture-rNN` can stage to the same-domain named holdout.
- **Scorer:** `evaluate.mjs` accepts same-domain authenticated qualification
  rebindings, independently recomputes target event IDs, and refuses wrong
  group, cross-domain, and production `ghdev_gh_mcp` rebindings.
- **Efficiency probe:** new group must have purpose `efficiency`; original
  bounded EX model-only authority remains unchanged.
- **Terminal recovery:** new group must have purpose `recovery` and
  the exact paired `ghdev-...` unit; original service-state checks,
  remote receipt/authority fences and operator attestation still apply.
- **Operator presentation:** `candidate-cli status|list`,
  `curator-cli status|list`, and portal `/api/status` now supply
  the additive `fixture` descriptor. The portal displays its purpose
  while retaining the literal machine group for forensic lookup.
  Source refs, Graphiti operations, queue paths, and state directories
  never use a display label as an alias.

## Historical identity ledger: READ-ONLY, no migration

| Exact machine group | Established purpose | Action |
| --- | --- | --- |
| `cur80_disposable` | Curator disposable qualification | preserve |
| `cur80_qual01`, `cur80_qual02` | Curator qualification runs | preserve |
| `cur81_dev` | Frozen development-corpus source scope | preserve |
| `cur81_dev_ce555621` | Curated-memory development cohort | preserve |
| `cur81_native_a1f3c9d7` | WebVTT diagnostic native capture | preserve |
| `cur81_native_8cd61d76` | Cron acceptance native capture | preserve |
| `cur81_holdout_cc5349fc` | Cron acceptance holdout | preserve |

This is a **read-only label mapping**, NOT a group alias or data migration.
Existing Graphiti episodes, UUIDs, source-index bindings, signed cron corpus,
operator worksheets, target ratification, and benchmark scores continue
to use their exact historical IDs and immutable hashes. The production
group `ghdev_gh_mcp` is not a fixture and is never renamed. Unlisted
legacy-looking identifiers remain *unclassified*: no fabricated purpose.

## Host inventory and verification contract

Read the actual host/configuration with no data mutations:

1. Inventory relevant `candidate-events-v1/<group>`,
   `curation-v1/<group>`, local index, native plugin options, curator
   `--group` selectors, unit/path names and read-only Graphiti group
   receipts. Classify active, production, known historical, and unknown IDs.
2. Give each relevant historical group its true purpose, source of evidence,
   and proposed **future** canonical name. Do not auto-rename, clone, delete,
   restage, or revise any historical group. Mark unverifiable labels unknown.
3. Demonstrate a NEW descriptive group across fixture construction,
   source-binding and local queue/staging, status/list and readback using
   isolated CPU-only state. Enforce empty destination paths and group scope
   on every consumer; do not infer positive remote persistence from local
   queue staging.
4. Verify backward compatibility against frozen signed input digests and
   existing episode/index UUID readback. Verify privacy and wrong-group
   exclusions, original sources, and production nonmutation. No GPU model,
   post-exit drain, or Graphiti mutation is needed for this slice.
5. Save one sanitized old→purpose→future-name/retained-ID inventory,
   tests, relevant read-only host evidence and discrepancies.

## Rollback and authority boundaries

Before a new fixture acquires any state, code/template changes can be reverted
without migration. Once used, a descriptive machine group remains immutable.
Any stateful move of existing Graphiti episodes, source-index records, queue
rows, systemd units or signed benchmark evidence requires **separate operator
authorization**, a detailed exact-identity migration plan and verified
rollback. Cosmetic naming improvement alone never authorizes that action.
