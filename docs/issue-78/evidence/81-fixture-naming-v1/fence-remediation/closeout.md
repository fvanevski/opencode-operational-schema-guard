# Fence-remediation closeout — Issue #81 (addendum to 81-fixture-naming-v1)

Compact closeout for Central's combined F-1/F-2/F-3 correction
(`docs/issue-78/v2-curator/terminal-recovery.mjs`,
`terminal-recovery.test.mjs`, `activation/render-qualification.mjs`,
`activation/render-qualification.test.mjs`,
`activation/prepare-review.mjs`, `activation/prepare-review.test.mjs`).
The parent packet's historically accurate PARTIAL finding (F-1 blocking at
`cff9000`) is preserved unchanged; this addendum closes it and records one
new mechanical finding (F-4).

## Exact identities

| Item | Value |
| --- | --- |
| Tested source SHA | `0da92ed6573f6f933220380f7d06e8108f9274ea` |
| Previous head (evidence commit) | `cff90008047a841582a951e1f2bd90f2c90e4317` |
| PR #83 state | OPEN draft, head = tested source SHA, base `main` |
| Exact-head CI | `node-contract` COMPLETED/SUCCESS at `0da92ed` (Node 22) |
| Host runtime | Node `v26.13.0` (fnm), Linux |

Source diff `cff9000..0da92ed` touches **exactly** the six required files
(one commit, `0da92ed`, +75/−11); no other paths changed.

## F-1 / F-2 / F-3 resolution mapping

| Finding | Resolution in `0da92ed` | Verified |
| --- | --- | --- |
| F-1 (blocking): `terminal-recovery.mjs` legacy `cur80_*` fence | `const recoveryGroup=g=>isFixtureGroup(g,'recovery',{allowLegacy:true})` replaces `GROUP` at the three fence sites (queue-log, operator recovery, never-submitted) — exactly the proposed minimal patch | PASS |
| F-2 (non-blocking): `render-qualification.mjs` renderer fence | CLI now validates the pair via `validRecoveryBinding(group,unit)`; named recovery groups default their unit to `fixtureUnitName(group)`; legacy `cur80_*` + `ghdev-curator80-*` pairing retained | PASS |
| F-3 (non-blocking): `prepare-review.mjs` fence | CLI fence now `isFixtureGroup(group,'recovery',{allowLegacy:true})` (same contract as the assessment core) | PASS |

New regression coverage added by the same commit:
`terminal-recovery.test.mjs` (legacy accepted; `graphiti-cron-holdout-r01`
and `ghdev_gh_mcp` rejected at the queue-log fence),
`render-qualification.test.mjs` (paired named/legacy groups reach the
deliberate missing-path check; mismatched unit, non-recovery named group,
and production group rejected), `prepare-review.test.mjs` (named + legacy
accepted, `graphiti-cron-holdout-r01` and `ghdev_gh_mcp` rejected).

## Invariant verification (Step 2)

Direct fence-semantics probes (all PASS):

1. `graphiti-curator-recovery-r01`, `graphiti-cron-recovery-r02` accepted
   by the recovery fence.
2. `cur80_qualtest`, `cur80_qual01` (legacy) accepted.
3. `graphiti-cron-holdout-r01` (named non-recovery) and `ghdev_gh_mcp`
   rejected.
4. `validRecoveryBinding` accepts the exact named pair (r01↔r01), rejects
   r01↔r02, keeps the legacy `cur80_qual01`↔`ghdev-curator80-qual01`
   pairing, rejects production and named non-recovery pairs.
5. Renderer and prepare-review entrypoints accept exactly the
   `isFixtureGroup(…,'recovery',{allowLegacy:true})` / `validRecoveryBinding`
   contract of the assessment core.
6. Original remote-receipt checks, revision CAS, operator attestation,
   stopped-unit requirements and no-replay safeguards are byte-unchanged
   (the diff touches only the group-fence lines + import in
   `terminal-recovery.mjs`; CLI fences are additive). No source,
   authority, group, or EX validation was weakened.

## Focused tests (Step 3)

`node --check` on all six changed files: **6/6 SYNTAX_OK**.

```
node --test \
  docs/issue-78/fixture-groups.test.mjs \
  docs/issue-78/v2-curator/terminal-recovery.test.mjs \
  docs/issue-78/v2-curator/activation/render-qualification.test.mjs \
  docs/issue-78/v2-curator/activation/prepare-review.test.mjs
```

Result at the committed source on host Node 26: **exit 1 — 17 tests,
16 pass, 1 fail.** The **six previously failing terminal-recovery tests
are all resolved** (all six pass, plus the new legacy/production-fence
regression passes). The single failure is the new
`render-qualification.test.mjs` regression — see F-4 below (mechanical
host-runtime collision, not a fence-logic failure).

Wider suite (`find docs/issue-78 docs/issue-75 -name '*.test.mjs' | xargs
node --test`): **138 tests, 137 pass, 1 fail** (the same single F-4
failure). Prior state was 135 tests with 6 failures; all six are resolved.

## F-4 — new mechanical finding (Node 26 `--env-file` runtime flag collision)

- **Minimal reproduction (host Node `v26.13.0`):**
  `node render-qualification.mjs --env-file /tmp/issue81-naming-unavailable-env …`
  → `node: /tmp/issue81-naming-unavailable-env: not found`, exit **9**,
  before the script runs.
- **Diagnosis:** Node 26 added a native `--env-file=…` CLI flag ("set
  environment variables from supplied file"). The runtime consumes the
  renderer CLI's own `--env-file` argument wherever it appears, loads the
  named file (or dies at startup with exit 9 when it is absent), and
  strips it from `process.argv`. The test's deliberate-missing env path
  therefore never reaches the CLI's intended `stat` ENOENT check; the
  assertion `stderr matches /ENOENT/` observes the runtime's
  "not found" message instead.
- **Scope:** pre-existing mechanical incompatibility (the `--env-file` CLI
  flag name predates this diff); exposed only now that a regression test
  drives the CLI end-to-end on the host's Node 26. CI runs Node 22
  (no such flag) and is SUCCESS at the exact head, so the committed source
  is green in CI.
- **Verified minimal corrective patch (working tree only, not committed):**
  rename the operator-facing flag `--env-file` → `--private-env-file` in
  `render-qualification.mjs` (`env=get('private-env-file')`) and the test
  invocation. With the rename applied, the renderer regression and the
  full focused suite pass **17/17** on host Node 26; files were restored
  to the committed state afterward (the defect is preserved at the
  committed source for Central). No rendered unit is affected: systemd
  units use `EnvironmentFile=`, not the CLI flag.
- **Class:** important non-blocking (fails closed; operator invocations on
  Node 26 hit the runtime flag, older runtimes unaffected).

## Identity and nonmutation checks (Step 4)

- Named recovery group/unit pair consistent across assessment, renderer,
  and review preparation (probe results above; tests pass).
- Legacy group handling unchanged (legacy regression passes;
  `validRecoveryBinding` legacy branch intact).
- Signed evidence digests re-verified **unchanged**:
  corpus `524de3ff…e425863`, case worksheet `f6241a46…f9ceddb1`,
  fact worksheet `26c7692d…3095c98c`, observations `ab66cdbe…50b09b5ca3`,
  proposal `17ffb605…a8c76f049`, ratification `3e958111…1fbb8626a`,
  accepted score `522f9285…4aa2c60` (both score files identical).
- Production nonmutation: `ghdev_gh_mcp` remote readback unchanged
  (4 episodes `81dd997d…`, `7211e2bd…`, `b3a21d33…`, `4126ba20…`);
  historical `cur81_holdout_cc5349fc` episodes
  `56b75c2c…`/`d4b8fff6…` unchanged. Read-only operations only.
- No model calls, no new Graphiti episodes, no systemd install, no
  historical group migration, no EX-gate activation in this phase.

## GHDEV-10 command-shape friction

- `friction_encountered: yes` (2 events, both resolved):
  1. `git checkout -- <two files>` rejected by the host guard during
     working-tree patch verification (`pre_execution_rejection`);
     corrected to `git restore <files>` (same effect, guard-accepted
     shape); material effect none.
  2. zsh `PIPESTATUS` echo in an earlier probe expanded empty
     (`interface_discovery`, agent command); producer success
     independently verified by direct readback; material effect none.
- `commands_match_handoff: yes` — the contract's literal commands
  (git fetch/switch, the 4-file `node --test` list, the
  `find | xargs -0 node --test` pipeline) were submitted in the
  requested form; the working-tree rename verification was an
  explicitly authorized in-scope repair probe.

## Disposition

```
RESULT=PARTIAL
```

F-1/F-2/F-3 are resolved and verified (all six legacy failures closed;
fence invariants 1–6 hold; CI green at the exact head). One new regression
test (`render-qualification.test.mjs`) is mechanically blocked on the
host's Node 26 runtime by the native `--env-file` flag collision (F-4);
it passes on CI's Node 22 and locally with the verified one-line rename.
Per the contract, a PASS disposition is not published while a regression
test fails on the host runtime; the concrete failure, reproduction, and
minimal patch are returned above for Central.
