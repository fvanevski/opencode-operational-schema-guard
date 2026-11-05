# Source review — Issue #81 three-commit naming diff

Scope: bounded independent review of
`b92c57f8c6f8379b72a2dcafa502392dc2cd16d0..0e30106ced8da710b23b4e474b57f4e184752ce1`
(commits `4aac6ae`, `5863894`, `0e30106`; 20 files, +363/−28). Focus:
genuine source/consumer mismatches and lifecycle usability of the new
descriptive names. No speculative cosmetic slices were created.

## Invariant verification (A–G)

- **A. Functional identity — PASS.** `NAMED` regex
  `graphiti-<domain>-<purpose>-rNN` with 8 closed purposes;
  `parseFixtureGroup` rejects issue/PR numbers, `cur*` tokens, and
  8+-char hex fragments in the domain; `fixtureGroupName` round-trips
  through the parser and throws `DESCRIPTIVE_FIXTURE_ID_REQUIRED`
  otherwise.
- **B. Producer/consumer coherence — PASS.** The additive `fixture`
  descriptor is keyed by the unchanged `group_id`; queue paths, event
  identities (`sha(1|group|project|workspace|session|kind|sourceID)`),
  review records, CLI flags, source-index lookups, portal `scope`, and the
  service template `@@GROUP@@` all retain the exact machine group ID.
- **C. Namespace isolation — PASS.** `permittedQualificationGroup` fails
  cross-domain and production `ghdev_gh_mcp` rebinds (named→named requires
  same domain; `cur81_dev` source binds only to permitted legacy/named
  targets; identical groups always pass). `evaluate.mjs` now fails closed
  with `qualification_scope_mismatch` (new committed regression proves
  `graphiti-webvtt-holdout-r01` and `ghdev_gh_mcp` are rejected). A display
  label is never used as a lookup alias (verified across all consumers).
- **D. Historical compatibility — PASS.** `allowLegacy` preserves
  `cur80_*`/`cur81_*` semantics; `LEGACY_FIXTURE_CATALOG` is a frozen
  display-only ledger; the frozen cron benchmark re-scores byte-identical
  (see `historical-compatibility.md`).
- **E. No hidden migration — PASS.** `fixture-groups.mjs` is purely
  functional (regex + frozen catalog; no fs or network); no consumer in the
  diff deletes, copies, renames, rekeys, or creates persistent legacy group
  data.
- **F. Status ergonomics — PASS.** CLI/portal output adds
  `fixture: {group_id, kind, label, …}` (e.g. `"Cron / Capture / Run 01"`);
  the exact machine ID remains in every output (`group`/`scope`/`group_id`).
  Legacy IDs render as `legacy_fixture` with `immutable_group_id`;
  unlisted legacy patterns render as `unmapped_legacy_fixture`
  ("purpose not independently verified"); anything else as
  `not_a_known_fixture` with `label: null` (portal falls back to
  `"Group: <id>"`).
- **G. Recovery safety — PARTIAL (see F-1).** Pairing is enforced by
  `fixtureUnitName`/`validRecoveryBinding` (named recovery group ↔ exact
  `ghdev-<domain>-recovery-rNN` unit; legacy `cur80_*` ↔
  `ghdev-curator80-*`), and `terminal-recovery-cli.mjs` now validates the
  pair. State, lease, remote-receipt, and operator-attestation requirements
  in the CLI are unchanged. However, the assessment core still fences to
  legacy groups (F-1), so a *new* named recovery group is accepted by the
  CLI and then rejected by the core.

## Findings

### F-1 — Blocking correctness/safety defect
**`docs/issue-78/v2-curator/terminal-recovery.mjs` group fence not updated.**
Line 11: `const GROUP=/^cur80_[a-z0-9_-]{3,60}$/;` used by
`assessQueueLog` (line 20), `assessOperatorRecovery` (line 52), and
`assessNeverSubmittedRecovery` (line 124). The diff updated the CLI to
`validRecoveryBinding` (which accepts `graphiti-<domain>-recovery-rNN`) and
the committed regression to `graphiti-curator-recovery-r01`, but the core
still rejects any non-`cur80_*` group with `INVALID_QUEUE_LOG_INPUT` /
`INVALID_OPERATOR_RECOVERY_SCOPE` / `INVALID_NEVER_SUBMITTED_SCOPE`.
Consequence: 6 of 87 focused tests fail at the committed source (exact
list in `validation.md` §3); the new named-recovery lifecycle is not
executable end-to-end through the CLI.

**Violated invariant:** G (recovery safety) — a new descriptive recovery
group must pass the same assessment fences with its matching service
identity.

**Minimal corrective patch (proposal for Central; verified in working tree,
not committed):**

```diff
--- a/docs/issue-78/v2-curator/terminal-recovery.mjs
+++ b/docs/issue-78/v2-curator/terminal-recovery.mjs
@@ import {sourcedEpisodeResolver} from './sourced-recall.mjs';
+import {isFixtureGroup} from '../fixture-groups.mjs';
 const HEX=/^[a-f0-9]{64}$/;
 const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
-const GROUP=/^cur80_[a-z0-9_-]{3,60}$/;
+const GROUP_OK=g=>isFixtureGroup(g,'recovery',{allowLegacy:true});
```
and replace the three `GROUP.test(group||'')` uses (lines 20, 52, 124)
with `GROUP_OK(group)`. `isFixtureGroup(…,'recovery',{allowLegacy:true})`
accepts exactly the union of the legacy `cur80_*` pattern and the named
recovery groups — the same group-side semantics as `validRecoveryBinding` —
so legacy behavior is preserved and no validation standard is weakened.

**Verification with patch applied (working tree only):**
`terminal-recovery.test.mjs` → exit 0 (6/6); full focused suite → exit 0
(87/87). File restored afterward; the committed regression remains failing
until Central lands the patch.

### F-2 — Important non-blocking issue
**`docs/issue-78/v2-curator/activation/render-qualification.mjs` CLI fence**
(lines 32–35) accepts only `cur80_*` groups and `ghdev-curator80-*` units,
so a new named recovery group (e.g. `graphiti-curator-recovery-r01` +
`ghdev-curator-recovery-r01`) cannot be rendered through the CLI even
though the generic `renderUnits` core, the template comment added by this
diff, and the pairing contract all support it. Fails closed (no
mis-rendering). Suggested fix: accept the pair when
`validRecoveryBinding(group, unit)` holds (plus the existing legacy unit
shape), mirroring F-1's group-side semantics.

### F-3 — Important non-blocking issue
**`docs/issue-78/v2-curator/activation/prepare-review.mjs` line 30** keeps
the legacy-only `cur80_*` group fence for review preparation. Same class as
F-2; fails closed.

### Test/documentation gaps
None blocking. `FIXTURE_GROUP_NAMING.md` (new) is consistent with the
implementation: canonical form, producer/consumer map, read-only historical
ledger, host inventory contract, rollback boundaries. README updates in
v2-benchmark/v2-candidate/v2-curator and the `ghdev-curator.service.in`
comment are accurate. The ledger deliberately leaves unlisted identifiers
unclassified, matching the host inventory.

### Optional improvements (not adopted, no new slices created)
- The `LEGACY_FIXTURE_CATALOG` could be derived from the inventory ledger
  to keep them in lockstep (today they are two hand-kept copies of the
  same eight IDs — verified consistent).
- `renderUnits` requires all 12 placeholder values even for a service-only
  render; a partial-render mode is a convenience, not a correctness need.

## Review limitations

- Bounded to the diff plus its directly implicated consumers
  (`terminal-recovery.mjs`, activation renderers, queue/events adapters);
  no repo-wide renaming campaign was performed.
- Remote readback is group-scoped `get_episodes` counts/UUIDs; episode
  contents (private facts) were not published.
- F-1/F-2/F-3 patch proposals were verified in a working tree; they are
  not committed, and Central review remains the gate
  (`INDEPENDENT_REVIEW=Central_owned`).
