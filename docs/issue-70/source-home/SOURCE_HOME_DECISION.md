# Issue 70: Phase 1 source-home and PR promotion contract

Central decision: retain the Phase 1 source-bound overlay under docs/issue-70/implementation/i1-integrated/ as the versioned candidate source-of-record. The historical V1 repository root is NOT the installed stock OpenCode V2 source. No new repository or PR is required. Merge of this package, when separately authorized, does not deploy it.

Verified state before staging this contract: issue #70 OPEN; draft PR #71 at 4591f8af9e80d66ca8f10612d55306b399dc4258 against main afbb1d2ccc803af82e07fef2036ee84b8b5ca7dd. GitHub node-contract PASS is V1 CI only. The host reported 136/136 Phase 1 CPU-only checks (20 backend executions, 11 distinct tests), with Graphiti writes disabled and no production installation.

Authority: GitHub package governs proposed Phase 1 bytes; currently installed source/config/services govern host runtime until separately authorized promotion. source-base-manifest.json binds exact original and candidate hashes; source-ownership.json records a host observation, not perpetual authority; prepare_backend.py validates patched backend in a disposable tree. No automatic source-home migration to src/, new upstream fork, or installer architecture is required for PR #71.

Local acceptance, in ONE campaign:
1. Run the new read-only verify_source_home.py package and --host modes with explicit current original source roots; execute its six synthetic tests. Fail on drift rather than changing expected hashes.
2. Fresh-process stock OpenCode V2 compatibility smoke using copied candidate plugin, isolated HOME/XDG config/data/state, disabled receipt/Graphiti/capture policy, no live backend writes or inference. Record executable version, discovered plugin hooks, compaction/session handling and any mismatch. Use disposable services as necessary. Do not conclude compatibility solely from node tests or a prior long-running process.
3. Validate complete package source mapping, isolated forward/reverse patches and fresh report of meaningful changed-code consumers. Existing 136/136 host suite may be reused if untouched consumers remain byte-identical; rerun affected tests/new smoke on the current exact head. Do not claim all previously reported suites independently rerun.
4. Commit sanitized source-home evidence and only required scoped repairs directly to issue/70, re-read remote SHA, preserve PR #71 draft; do not create PR #72. Central independently reviews the new exact head and decides final PR disposition. A compatible disabled source package can later merge without production activation; Graphiti terminal persistence is a separate subsequent phase.

Do not mutate live plugin, gate, backend, launcher, config, memory, SQLite or FalkorDB. Do not try to unlock ambiguous receipt work by clearing rows or downgrading sticky admission. No Graphiti automatic ingestion.

Stop for a material current-source drift, an incompatible stock V2 event contract requiring architectural change, a protected production mutation, or an unfixable test blocker. Otherwise complete the bounded campaign and publish one handback.
