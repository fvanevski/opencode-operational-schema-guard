# Source and host identity — Issue #81 independent holdout (Phase B)

**Packet:** `81-independent-holdout-v1` · campaign `ISSUE81_INDEPENDENT_HOLDOUT`

## Source identity (verified this session)

| Item | Value |
|---|---|
| Repository | `fvanevski/opencode-operational-schema-guard` |
| Branch / PR | `issue/81` / PR #83 (draft, OPEN, unchanged by this packet) |
| Remote `issue/81` HEAD | `3271a97be43d25f6646a63cce71fc0e907fd1059` (fetch + `git ls-remote` readback) |
| PR #83 head | `3271a97be43d25f6646a63cce71fc0e907fd1059` (GitHub API readback) |
| Exact worktree | disposable detached worktree at the campaign root (operator-kickoff SHA), clean tree, no source modifications |
| CPU gates (Phase A, from exact worktree) | 4× `node --check` exit 0 + 8-file `node --test` 76 pass / 0 fail (host-local log) |

## Frozen private identities (digests only; bytes remain private 0600)

| Identity | SHA-256 |
|---|---|
| Frozen corrected corpus (`split=holdout`, 24 cases) | `524de3ff36877442c6dc4e75edf5da9f317ba1c2e25e267b117233514e425863` |
| Original pre-correction corpus bytes (preserved) | `4cce01be7fc994ff77b3266c9ec5a0005a39e55053b4d25b2d0af4c9252c2a2e` |
| Signed case worksheet (`OPERATOR_RATIFIED`, 14/10, bound to corrected corpus) | `f6241a46ce66f2d3d29b1eb4f81f31cb498472c6d03db5b65307cfc8f9ceddb1` |
| Pre-attestation draft worksheet (historical) | `52ae968b4b932f96ad1e1f686faf929c806c236c9469fe1323e395b74e3a256d` |
| Fact-signed worksheet (original labels verbatim, 0 fact verdicts, `OPERATOR_RATIFIED`) | `19f21b9db8e2a2ebda7a76f9d300bf1b35093d286c745a8c0a36ebcde587d59b` |
| Fact-level draft (pre-attestation, historical) | `a1441ebd49b513cbb308cc6ea6771e3c5e91f1e55dfd5ef1adbf08c230a03c43` |
| Original target proposal (committed `targets.proposed.json`, hash verified in worktree) | `17ffb60515f5f96f2d546fd3abf951d0bc008325e38d83145ec4f75a8c76f049` |
| Signed target ratification (reused, unchanged) | `3e9581114047ac7416f6014a0dd6a57304dc5e5784efe39b176ced61fbb8626a` |
| Group-bound observations (3 records, 22 case bindings, 0 facts) | `5ccdb95b085f148314b376faf88935c6fcdeb4810fc2f5292a212707f16eb86d` |
| Frozen three-path score (this packet) | `ba5305c8be8b0614809152c78e3290da1f705e001836f491ffe1c127be1477fb` |
| Stage receipt (22 queued, group below) | private `stage-receipt.json` (digest on file with the private state) |

## `source_locator`-only correction (verified)

The corpus builder initially omitted the `source_locator` provenance field. The
correction added exactly one field to each of the 24 cases
(`opencode:<session>:message|tool:<native-id> (live capture group cur81_native_8cd61d76)`)
and changed **nothing else**:

- 24/24 native source identities preserved (message/call IDs byte-identical to the
  Phase A read-only source-identity check: 24/24 MATCH against the 44-item session dump
  + 48-envelope census, 0 discrepancies).
- Labels, roster, categories, scopes, and top-level fields byte-identical
  (field-level diff: only `source_locator` differs, ABSENT → present, in all 24 cases).
- Both digests preserved: original `4cce01be…` (backup file) and corrected
  `524de3ff…` (in place). The signed case worksheet binds to the **corrected** corpus
  (`corpus_sha256 = 524de3ff…`), and the fact-signed worksheet inherits the original
  pre-run case labels verbatim (`case_label_changes_from_provisional = 0` in the score
  authority block).

## Host interfaces (read-only state)

- **EX gate:** canonical Python admission wrapper
  (`<host-home>/.local/share/openviking-commit-gate/openviking_commit_gate.py` +
  `<host-home>/.config/openviking/commit-gate.toml`, both 0600, installed);
  exclusive flock on `$XDG_RUNTIME_DIR/openviking-agent.lock`.
- **Model:** loopback LiteLLM proxy `127.0.0.1:8002` with non-thinking `chat-fast`
  alias (no `reasoning_effort` overrides, no token budget) over the NInfer backend
  `127.0.0.1:8001` (model `chat`). Verified live with the unit's exact credentials.
- **Graphiti:** loopback MCP `127.0.0.1:8766` (falkordb), read-only group-scoped
  readback used; no deletes, no production writes.
- **Groups:** holdout `cur81_holdout_cc5349fc`; live capture group
  `cur81_native_8cd61d76` (capture-only, 0 episodes by design); production
  `ghdev_gh_mcp` untouched.
- **Cohort session:** native session `ses_e577a8c27ffeixiiSob1B8tbFo`
  (continuous `opencode serve` + prompt route, stock V2.2.5, XDG-isolated config).

## Nonmutation (group-scoped readback, this session)

| Group | Episodes now | Baseline (81-final-verification-v1) | Status |
|---|---|---|---|
| `ghdev_gh_mcp` (production) | 4 | 4 | unchanged |
| `cur81_dev_ce555621` (prior dev cohort) | 9 | 9 | unchanged |
| `cur81_native_a1f3c9d7` (WebVTT diagnostic) | 12 | stable | unchanged |
| `cur81_native_8cd61d76` (this capture group) | 0 | 0 | unchanged |
| `cur81_holdout_cc5349fc` (this holdout) | 0 | 0 (no writes attempted) | terminal |
| `cur80_disposable` / `cur80_qual01` / `cur80_qual02` | 1 / 1 / 1 | 1 / 1 / 1 | unchanged |
