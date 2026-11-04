# Issue #80 closure-v1 — CPU-only source admission and regressions (cpu-tests.md)

Node v26.13.0, npm 12.2.1. Worktree authenticated at the kickoff head before
any change; final state after the in-scope terminal-recovery source delta.

## Source identity

- Admitted source authority (detached HEAD): `59cbd9055a4a3710b880e26be2c6887b3f6f6c12`
- Remote `issue/79` HEAD at packet time: `59cbd9055a4a3710b880e26be2c6887b3f6f6c12`
  (matches source authority; not stale — verified via `git ls-remote origin refs/heads/issue/79`)
- `git diff --check`: exit 0 (clean) at start and after the delta
- Uncommitted working-tree delta (for Central review; NOT committed; 7 files):
  - modified: `docs/issue-75/v2-candidate/post-exit-drain.py`
    (`reconcile_late`: `Path(cli).resolve(strict=True)` → `strict=False`, so a CLI
    path that may be re-resolved during long retention does not throw)
  - modified: `docs/issue-78/v2-curator/core.mjs`
    (admission invariant in `advance()` + new `reconcileNeverSubmitted()`)
  - modified: `docs/issue-78/v2-curator/terminal-recovery.mjs`
    (new exported `assessNeverSubmittedRecovery`)
  - modified: `docs/issue-78/v2-curator/terminal-recovery-cli.mjs`
    (new `--never-submitted` adjudication mode)
  - modified: `docs/issue-78/v2-curator/curator.test.mjs`
    (lease-marker wraps + 2 new regression tests)
  - modified: `docs/issue-78/v2-curator/graph-evidence.test.mjs` (fixture marker wrap)
  - modified: `docs/issue-78/v2-curator/terminal-recovery.test.mjs`
    (lease-marker wrap + 2 new never-submitted regression tests)
- Complete source delta (7 files): `source.patch` in this packet,
  SHA-256 recorded in `manifest.json`.

## Repository-deterministic syntax block (modified modules) — all exit 0

```
node --check docs/issue-78/v2-curator/core.mjs                    exit 0
node --check docs/issue-78/v2-curator/curator.test.mjs           exit 0
node --check docs/issue-78/v2-curator/graph-evidence.test.mjs    exit 0
node --check docs/issue-78/v2-curator/terminal-recovery-cli.mjs  exit 0
node --check docs/issue-78/v2-curator/terminal-recovery.mjs      exit 0
node --check docs/issue-78/v2-curator/terminal-recovery.test.mjs exit 0
python3 -m py_compile docs/issue-75/v2-candidate/post-exit-drain.py  exit 0
```

## Test suites (final post-change run)

| suite | command | exit | tests | pass | fail |
| --- | --- | --- | --- | --- | --- |
| v2-curator (5 files) | `node --test curator.test.mjs terminal-recovery.test.mjs portal-api.test.mjs graph-evidence.test.mjs graph-preview.test.mjs` | 0 | 39 | 39 | 0 |
| v2-curator per-file | terminal-recovery 6/6, curator 24/24, portal-api 1/1, graph-evidence 5/5, graph-preview 3/3 (all exit 0) | 0 | 39 | 39 | 0 |
| #79 candidate | `node --test docs/issue-78/v2-candidate/candidate.test.mjs` | 0 | 15 | 15 | 0 |
| #75 legacy (4 files) | `node --test memory-core.test.mjs plugin-behavior.test.mjs relevance.test.mjs relevance-observation-replay.test.mjs` | 0 | 26 | 26 | 0 |
| Python post-exit wrapper | `python3 test_post_exit_drain.py` (loaded via unittest; 11 test methods) | 0 | 11 | 11 | 0 |

Note: there is no `activation.test.mjs` in `docs/issue-78/v2-curator/`; the
combined v2-curator suite is 5 files / 39 tests (not 43).

## RED/GREEN for the core.mjs structural-edge-check move

The `advance()` fix moves the structural edge check to run **after** the CAS
state check, so a legal edge replayed against an already-advanced record (e.g.
`failed_extraction`) returns a clean `false` instead of throwing
`Illegal remote state transition`. Proven necessary against the admitted HEAD:

- **RED** — committed `curator.test.mjs` executed against HEAD `core.mjs`
  (`git show HEAD:...`): 22 tests, 21 pass, **1 fail**
  (`operator-attested asynchronous extraction failure preserves source
  authority and blocks replay` — the committed assertion
  `advance(record.id,'queued','submission_unknown') === false` throws on HEAD).
- **GREEN** — same committed test executed against the worktree `core.mjs`:
  22 tests, **22 pass, 0 fail**.

This is the in-scope behavioral change the new regression tests lock in; it
does not weaken any existing assertion.

## New regression tests (this delta)

- `curator.test.mjs`:
  - `authentic admission is required before durable remote-write intent`
    (bare interactive staging of `submission_unknown` is fail-closed with
    `EX_POST_EXIT_ADMISSION_REQUIRED`; interactive local `defer`/
    `edit-and-approve` need no marker; an admitted caller may stage the
    durable write intent; a stale CAS miss stays a clean `false`).
  - `replay of a legal edge against an advanced record fails with clean false`
    (after `failed_extraction`, replayed `submission_unknown->queued` and
    `queued->persisted` edges return `false`, not a throw).
- `terminal-recovery.test.mjs`:
  - `never-submitted staging reconciles to approved only with exact scope,
    zero-episode readback and attestation`.
  - `never-submitted adjudication rejects present remote episodes, stale
    revisions and audit mismatch`.

All 39 v2-curator tests pass with the delta; all 15 candidate, 26 legacy, and
11 Python-wrapper tests remain green.
