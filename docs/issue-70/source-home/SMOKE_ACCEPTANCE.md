# Issue #70 — Stock-V2 source-home qualification, one consolidated local pass

**Applies to** draft PR #71, `fvanevski/opencode-operational-schema-guard`. Central source-home decision: `SOURCE_HOME_DECISION.md`. This is an acceptance supplement, not a new phase/issue/PR. Full PR source home remains `docs/issue-70/implementation/i1-integrated/`; historical V1 root is not a V2 install target.

## Source-specific dependency finding (verified from current GitHub candidate)

`candidate/openviking-v2/index.mjs` imports **ten** modules from `../openviking-context-v4/lib/` and computes its runtime plugin root from `../openviking-context-v4/index.mjs`. Copying only `openviking-v2` to a temp directory is an invalid fresh-process test; module import will fail before plugin setup. Preserve the exact relative sibling layout in a disposable packages tree, using the authenticated preserved V4 dependency source. Do not register `openviking-context-v4` as an additional OpenCode V2 plugin merely because it is an import dependency.

Central-staged `verify_v2_entrypoint.mjs` performs a read-only ESM import from that disposable sibling layout and checks default export `id=local.openviking-v2` and callable `setup`. It first verifies the **actual** V2 import graph: the ten `openviking-context-v4/lib/` modules that `openviking-v2/index.mjs` imports (its V1 root entry is retired as `index.mjs.v1-retired` and is not part of the V2 import graph — `pluginRoot` is computed from a `new URL(...)` string, not an import), then imports the candidate. **This is only an import-shape preflight; it does not prove runtime hooks or native V2 compatibility.** It does not run OpenCode or any inference.

## Clean-process runtime acceptance

OpenCode V2 official configuration supports explicit local plugin *directories* in the `plugins` array and `OPENCODE_CONFIG_DIR`; a custom directory is **additive**, not a guaranteed replacement for global/project discovery. The standard CLI also searches for an existing per-user server unless a private standalone mode is used. The smoke must use an isolated HOME and XDG config/state/data/cache, a standalone/private server or equivalent verified process isolation, an isolated project worktree, and the actual installed OpenCode V2 executable identity. Never connect it to an already-running per-user server or installed global plugin paths.

Suggested disposable layout (adapt to verified installed loader and config semantics):

```text
$SMOKE_ROOT/
  packages/openviking-v2/         # copy of candidate, exact relative layout
  packages/openviking-context-v4/ # authenticated preserved sibling dependency
  config/opencode.json            # V2 "plugins": [absolute path to packages/openviking-v2]
  project/                        # no inherited project .opencode
  home/  state/  data/  cache/
```

Keep `receipts_enabled=false`, `graphiti_enabled=false`, no capture policy/token, no external MCP endpoint, and no live database or inference credentials in the private process. Set effective data roots to disposable paths. If the plugin is configured `enabled=false`, loading it checks *only* the no-op path; also prove enabled baseline OpenViking hook registration and disposal in a **disposable/mocked** environment, with no live commit or remote recall. Verify `ctx.session.hook("context")`, `ctx.session.hook("compaction")`, `ctx.tool.hook("execute.before")`, optional event subscription and disabled capture; check event ordering and no unexpected mutations. If a model call is required to trigger native hooks, use a CPU stub/private provider or a faithful native runtime test double; do not accidentally perform GPU/production inference.

The installed wrapper's shared lease may legitimately be held by production harnesses. Do not bypass it to run a *real* interactive agent. For a non-interactive private smoke, prove it cannot reach or mutate the real gate/backend before using an unwrapped CLI executable. Keep any source-backed repair in the isolated candidate and the issue branch only.

## Host source identity and artifact proof

1. Run `python3 -m unittest -v test_verify_source_home.py` from `docs/issue-70/source-home` (six synthetic tests).
2. Run `python3 verify_source_home.py --package <absolute package> [--host --gate-root <installed gate> --v2-root <installed V2> --backend-root <site-packages> --shim <common launcher>]` with existing exact source ownership and current hash identities. Host mode is read-only and should fail on drift; inspect drift rather than pinning to a new hash.
3. Validate the complete candidate including source/patch ownership in an isolated copy using `prepare_backend.py`; prove forward, reverse, and changed consumer references. Preserve authenticated original source/root hashes.
4. Run the offline import probe against `$SMOKE_ROOT/packages`, then native V2 fresh-process hooks with isolated config. Record `opencode --version`, exact executable path, effective plugin IDs and order, selected session/compaction event semantics, environment containment evidence and any incompatibility.
5. Execute affected unit/integration tests after any repairs. The older 136/136 host suite can be cited at its earlier exact source identity if untouched code and consumers are byte-identical; do **not** claim it was rerun unless actually executed. If changed runtime consumers or source code, rerun all applicable suites and rebuild manifests/hashes.

## Disposition

A PASS establishes **PR #71 source package compatibility** at the fresh tested OpenCode V2 executable and source identities. It does *not* establish installed activation, real Graphiti write terminality, or authorization to merge/deploy. If a source-home or V2 hook incompatibility is found, repair it in this same bounded campaign when root cause can be resolved without an architectural change or protected live mutation.

Publish one complete sanitized evidence packet to `issue/70` (the already open draft PR #71), recheck the fast-forward ancestry and exact new remote commit. No new PR or issue. Hand back for Central's final independent review and ready/merge decision.
