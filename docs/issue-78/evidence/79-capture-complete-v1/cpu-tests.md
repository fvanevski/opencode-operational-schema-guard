# Issue #79 CPU qualification receipts

Node: `v26.13.0` (host). All commands run from the indicated directory. Every
command exited 0. No failures; no in-scope production defect was demonstrated,
so no source file was modified.

## docs/issue-78/v2-candidate

Syntax checks (all exit 0):
```
node --check events.mjs          # exit 0
node --check queue.mjs          # exit 0
node --check plugin.mjs         # exit 0
node --check candidate-cli.mjs  # exit 0
node --check pilot-evaluate.mjs # exit 0
node --check pilot-real-replay.mjs # exit 0
```

Candidate suite:
```
node --test candidate.test.mjs  # exit 0  -> tests 15, pass 15, fail 0
```
Coverage: implicit/explicit user capture + distinct native message occurrences;
weak-ID session fallback + group fencing; tool fail/pass as separate source
events; native edit/write/apply_patch receipts scoped/content-free/tool-reported;
bounded whole-message privacy scan before truncation; completed assistant
adapter-ready (never self-upgraded); durable queue dedup/restart/CAS/readback/
list-beyond-500/capacity-overflow; concurrent repeated delivery single-record +
compaction; durable decline counters survive reopen + source identity/kind cannot
be forged; forged authority labels/ungrounded handles rejected; capture opt-out
stages nothing; stock-V2 wrapper keeps legacy recall + stages only in admitted
context + no Graphiti add_memory; finished-turn binding through authenticated
context surface deduped by native message ID; admitted user prompts link later
tool/assistant events; ID-less/short/secret assistant messages not staged.

Frozen pilots (immutable baselines, labels frozen before comparison):
```
node pilot-evaluate.mjs     # exit 0  synthetic: total 10, valuable 6,
                            #   baseline selected 2 (recall 0.333), candidate selected 6 (recall 1.0)
node pilot-real-replay.mjs  # exit 0  real 8-case: total 8, valuable 7,
                            #   baseline selected 0, candidate selected 8 (valuable 7, noisy 1, recall 1.0)
```

## docs/issue-75/v2-candidate

Syntax checks (all exit 0):
```
node --check memory-core.mjs  # exit 0
node --check memory-cli.mjs   # exit 0
```

Focused regressions:
```
node --test memory-core.test.mjs plugin-behavior.test.mjs relevance.test.mjs
    # exit 0  -> tests 25, pass 25, fail 0
node --test relevance-observation-replay.test.mjs
    # exit 0  -> tests 1, pass 1, fail 0   (in-sample retrospective replay)
```
The `legacy journal pages preserve all 501+ rows and admission-safe
drain/reconcile` and `ambiguous send is not replayed` tests both pass: 501 rows
scanned via `Journal.pages()`, `list()` default still throws at the 500 bound,
`list(600)` returns all 501, and an ambiguous `submission_unknown` row is NOT
replayed (exactly one `add_memory` attempt).

## Working-tree integrity
```
git diff --check        # exit 0, clean (no whitespace errors)
git status --short      # (empty) no tracked or untracked source changes
git diff | wc -c        # 0 bytes (no uncommitted source diff)
```

## Deterministic CI note
The repository `CI` (`.github/workflows/ci.yml` -> `npm run check` / `npm test`)
exercises the installed operational-schema-guard plugin (`lib/`, `scripts/`,
`index.mjs`), a separate component from the Issue #79 capture layer under
`docs/`. The capture layer is qualified by the repo-defined node commands above
per the controlling contract; no CI/acceptance rule was altered.
