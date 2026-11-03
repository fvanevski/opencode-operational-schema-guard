# Issue #80 — CPU-only source admission and regressions (cpu-tests.md)

Node v26.13.0, npm 12.2.1. Worktree authenticated at the kickoff head before
any change; final state after the single in-scope portal source fix.

## Source identity

- Starting (and final committed) HEAD: `c38c8fd1b8fee0b701ebeb8888fa6f1f0a27bfda`
- Committed tree: `5d6e1612cb0309c2fb6c23887657100c60fa815e`
- `git diff --check`: exit 0 (clean) at start and after the fix
- Uncommitted working-tree delta (for Central review; NOT committed):
  - modified: `docs/issue-78/v2-curator/portal/src/main.tsx` (responsive detail-header fix)
  - untracked: `docs/issue-78/v2-curator/portal/package-lock.json` (reviewable dependency lock)
  - untracked: `docs/issue-78/v2-curator/portal/dist/` (Vite build artifact; hashes in manifest.json)
- Complete source delta (modified + new untracked lockfile, build artifact omitted):
  `source.patch` in this packet, SHA-256
  `9f0e1032abe6cdd864b4eb9ede1543bce12af5858c6dad59c7eb952d44c805f3`

## Repository-deterministic block (README) — all exit 0

```
node --check docs/issue-78/v2-curator/core.mjs            exit 0
node --check docs/issue-78/v2-curator/model.mjs           exit 0
node --check docs/issue-78/v2-curator/worker.mjs          exit 0
node --check docs/issue-78/v2-curator/curator-cli.mjs     exit 0
node --check docs/issue-78/v2-curator/portal-server.mjs   exit 0
node --check docs/issue-78/v2-curator/sourced-recall.mjs  exit 0
node --check docs/issue-78/v2-curator/curator.test.mjs    exit 0
node --check docs/issue-78/v2-curator/portal-api.test.mjs exit 0
```
(Re-run identically after the portal fix: all 8 exit 0.)

## Test suites (final post-fix run)

| suite | command | exit | tests | pass | fail |
| --- | --- | --- | --- | --- | --- |
| curator + portal API | `node --test docs/issue-78/v2-curator/curator.test.mjs docs/issue-78/v2-curator/portal-api.test.mjs` | 0 | 13 | 13 | 0 |
| portal API standalone (contract-named) | `node --test docs/issue-78/v2-curator/portal-api.test.mjs` | 0 | 1 | 1 | 0 |
| #79 candidate | `node --test docs/issue-78/v2-candidate/candidate.test.mjs` | 0 | 15 | 15 | 0 |
| #75 legacy | `node --test docs/issue-75/v2-candidate/memory-core.test.mjs docs/issue-75/v2-candidate/plugin-behavior.test.mjs docs/issue-75/v2-candidate/relevance.test.mjs docs/issue-75/v2-candidate/relevance-observation-replay.test.mjs` | 0 | 26 | 26 | 0 |

Curator suite test names (13): bounded event clustering/identities; strict
structured validator (authority inflation, verified class, forged source,
timestamp, scope, secret text, unsupported text, weak source, malformed JSON);
review store durable create/dedup + revision CAS + blocked unverified approval;
Graphiti write-intent-first + no unknown-submission replay; ACK→queued +
positive group/name readback→persisted; duplicate-assertion deferral; no model/
graph work without admitted lease; one admitted cluster → exactly one
source-linked episode; operator re-evaluation; persisted episode source-attributed
in native recall with wrong-workspace exclusion; multi-fact deferral;
unavailable model → durable DEFER; loopback API token/origin/source-bound/CAS.

## Supplementary deterministic stub-Graphiti scenarios (CPU-only)

Script: host-local `stub-scenarios.mjs` (disposable tmp roots, stub Graphiti
client, `GHDEV_MEMORY_POST_EXIT_LEASE=admitted` set only in-process). 7/7 PASS:

1. `restart_convergence_no_model_recall` — durable approved record with queue
   events still `new` converges on re-run without recalling the model
   (state → queued, exactly 1 write-intent).
2. `restart_queue_converged` — queue counts: new 0, approved 3.
3. `malformed_model_defers` — `{not valid json` → durable DEFER
   (`invalid_model_json`), zero Graphiti writes.
4. `timeout_model_defers` — hung curate → durable DEFER
   (`curator_unavailable_or_invalid`).
5. `unknown_ack_status` — `add_memory` throws after send → `submission_unknown`,
   exactly 1 write.
6. `unknown_ack_no_replay_persists` — restart with positive `get_episodes`
   readback: `persisted`, still exactly 1 write (no blind replay).
7. `model_lane_requires_lease` — `curateCluster` refuses without the lease
   (`MODEL_ADMISSION_REQUIRED`).

## In-scope defect found and fixed (one cycle)

`portal/src/main.tsx` detail header: the 64-char cluster-ID `Text` and the
state `Badge` did not wrap, producing a 30px horizontal overflow at a 480px
viewport (measured via headless Chromium element audit). Fix: `wrap="wrap"
gap="2"` on the detail header Flex and `overflowWrap:'anywhere'` on the ID
text. No behavior, API, validation, privacy or authority changes. Re-verified:
tsc clean, Vite build clean, horizontal overflow at 480px = 0px, full browser
suite 35/35 (see portal-api-browser.md).
