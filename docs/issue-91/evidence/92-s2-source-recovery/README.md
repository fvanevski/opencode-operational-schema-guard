# Issue #92 S2 — source-recovery integration & exposed-case qualification (evidence-only)

**Result:** `REMEDIATION_REQUIRED`
**Status:** `READY_FOR_FINAL_OPERATOR_RUN` (post-exit inference prepared + preflighted; not executed in-harness)

## Campaign
Single cohesive S2 slice of Issue #92: integrate the Central-authored development-only
opt-in source-recovery path (`--source-recovery on`) for first-pass zero-approved
clusters and qualify useful-fact recovery on the exposed B3/S1 24-cluster corpus.
Not final prospective acceptance, a new PR, or a production deployment.

## Identities
- Repository: `fvanevski/opencode-operational-schema-guard`
- Branch: `work/91-memory-utility-r1`
- Admitted source head: `c4a804b8fbcec722b007a55aa64af2c808f343a0`
  (authenticated == remote `origin/work/91-memory-utility-r1`; local fast-forwarded
  from `57c3326` to reach it)
- Central S2 commits integrated: `e228881` (feat), `2b9d07a` (test+contract), `c4a804b` (test+bounds)

## What was done (in-harness, CPU + read-only host)
1. **CPU acceptance** (`s2-native-test-results.json`): 3× `node --check` OK; focused
   suites — `finite-batch` 39/2, `finite-batch-tuning` 5/5, `fact-review` 14/14,
   `curator` 36/36, `issue92-source-fact` 5/5, `adr-causal-audit` 14/14;
   `npm run check` rc=0; `npm test` 524/524 PASS.
2. **S2 source defect** (`s2-source-defect.md` + `s2-proposed-source-patch.diff`):
   the new recovery path reads `proposal.facts[i].evidence_span`, which
   `validateDecision` (core.mjs) strips, so the `utility_non_substantive` trigger
   throws. 2 S2 regression tests fail at head; both pass with the additive 1-file
   patch (validated 41/41 + 524/524). Patch retained for Central; not committed.
3. **B3/S1 source identity** (`s2-source-digest-roster.json`): 24/24 source
   `session_message` records (native `opencode.db`, `id`+`session_id`+`type=user`)
   present with normalized text byte-matches; corpus SHA-256 `ebac7052...` matches
   the recorded B3 reconstruction.
4. **Fresh disposable fixtures** (`s2-freeze-manifest.json`): new empty group
   `graphiti-adr92-s2-source-recovery`, private 0700/0600 state root, 24-source
   roster staged (24 new / 0 drops), roster + config frozen with safe hashes.
5. **EX preflight** (`s2-ex-preflight.md`): canonical EX holder verified (gate,
   config, lock, 30s grace, scheduler idle, model aliases `chat-fast`/`chat-review`
   supported, Graphiti MCP reachable); once-only launcher `s2-ex-launcher.py` +
   driver `s2-driver.mjs` preflighted (syntax + gate load + bounds).

## Post-exit (operator, after harness exit)
ONE exact command (`s2-operator-command.md`):
```bash
python3 /tmp/opencode/issue92-s2/s2-ex-launcher.py
```
Runs the finite-batch source-recovery drain once under a single EX window
(`--max-clusters 24 --max-candidates 72 --max-seconds 3600`, `chat-fast`, no tuning
file). At head it will reproduce the S2 defect on the `utility_non_substantive`
trigger; applying `s2-proposed-source-patch.diff` first enables the full
qualification. No in-harness inference; no historical/production group mutation.

## Result rationale
`REMEDIATION_REQUIRED`: a concrete S2 scaffold-function defect (the source-recovery
`utility_non_substantive` trigger crashes because `evidence_span` is not preserved
on `validateFactDiscovery` output facts) blocks a clean source-recovery
qualification at head. It is not merely imperfect semantic precision. The additive
patch + regression evidence are provided for Central adjudication; the post-exit
run is ready and preflighted for operator execution.

## Packet contents
- `s2-native-test-results.json` — CPU test counts + exits
- `s2-source-defect.md` + `s2-proposed-source-patch.diff` — defect + portable patch
- `s2-freeze-manifest.json` — roster/config/hashes (pre-inference freeze)
- `s2-source-digest-roster.json` — 24 native source digests
- `s2-ex-preflight.md` — EX admission preflight
- `s2-operator-command.md` — the ONE post-exit operator command
- `s2-command-shape-friction.md` — canonical COMMAND_SHAPE_FRICTION
