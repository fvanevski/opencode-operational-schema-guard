# Issue #80 — activation (event-wake) receipt

Scope: disposable systemd PathModified → oneshot wake **only**. No
standing production unit, no second scheduler, no canonical gate
change.

## Staged templates (repo source, not installed)

- `docs/issue-78/v2-curator/activation/ghdev-curator.path.in`
- `docs/issue-78/v2-curator/activation/ghdev-curator.service.in`
- `docs/issue-78/v2-curator/activation/README.md`

## Disposable instantiation (host, removed after demo)

Instantiated from the templates with the authenticated host bindings
(unit copies kept under host-local `/tmp/opencode/issue80-evidence/activation/`):

- `PathModified=/home/filip/.local/state/ghdev-graphiti-issue80/candidate-events-v1/cur80_disposable`
  (disposable group queue dir, `Unit=ghdev-curator80.service`)
- oneshot `ExecStart=/usr/bin/python3 docs/issue-75/v2-candidate/post-exit-drain.py
  --gate-source /home/filip/.local/share/openviking-commit-gate/openviking_commit_gate.py
  --gate-config /home/filip/.config/openviking/commit-gate.toml
  --cli docs/issue-78/v2-curator/curator-cli.mjs
  --group cur80_disposable
  --state-dir /home/filip/.local/state/ghdev-graphiti-issue80
  --endpoint http://127.0.0.1:8766/mcp
  --max-seconds 900 --lock-timeout 120`
- `EnvironmentFile=/home/filip/.local/state/ghdev-graphiti-issue80/curator.env`
  (0600; keys `LOCAL_CURATOR_URL`, `LOCAL_CURATOR_MODEL`,
  `LOCAL_CURATOR_API_KEY` — values never staged)
- hardening: `NoNewPrivileges=yes`, `UMask=0077`, `Restart=on-failure`
  (30 s event-wake continuation, not inference authorization)

The wrapper passes `GHDEV_MEMORY_POST_EXIT_LEASE=admitted` to the child
**only inside the wrapper** (accepted `post-exit-drain.py`, unchanged).

Installed transiently with `sudo` for the pre-exit demo, then removed.
Verified no standing unit remains: `ls /etc/systemd/system | grep
curator80` and `systemctl list-units --all | grep curator80` both
empty.

## Pre-exit exclusion (two independent receipts, both FAIL_CLOSED)

1. **Direct wrapper run while this interactive harness is active:**
   `post-exit-drain.py` (same arguments as above) →
   `FAIL_CLOSED: shared agent/gate lease held; bounded wait exhausted`,
   exit 2. The canonical shared EX lock is held by the active
   harness/gate, so no inference admission.
2. **systemd PathModified → oneshot wake** (touch of the queue dir
   while the harness was active): oneshot invoked the same wrapper →
   `FAIL_CLOSED: interactive harness active/unknown: cannot drain`,
   exit 2. The wake fired, the gate correctly refused pre-exit work.

No model call and no Graphiti `add_memory` occurred in either path.

## Durable state / CLI status

- Disposable state root `/home/filip/.local/state/ghdev-graphiti-issue80`:
  - `candidate-events-v1/cur80_disposable/` — 3 seeded queue events
    (uuids `de6e9fad3ad4...`, `99462949b9ba...`, `b19d06c5469d...`)
    ready for the post-exit run; `.wake-probe` empty marker file.
  - `curator.env` (0600) with the three `LOCAL_CURATOR_*` keys.
- `curator-cli.mjs drain` is the CLI entrypoint used by the wrapper;
  pre-exit it is a no-op by gate design (fail-closed), not an error.
- Gate identities: installed source
  `/home/filip/.local/share/openviking-commit-gate/openviking_commit_gate.py`
  (SHA-256 `aa0cf54e4513767b87f18e9704e27eb398a6aee3e71462644044d8805fd12b96`)
  and config `/home/filip/.config/openviking/commit-gate.toml`.
  Gate DB had no unresolved `memory_work` at demo time.

## Post-exit continuation (operator, after harness exit)

Exact native wrapper command (env from the 0600 `curator.env`):

```
python3 /workspace/opencode-issue80-curator-integration/docs/issue-75/v2-candidate/post-exit-drain.py --gate-source /home/filip/.local/share/openviking-commit-gate/openviking_commit_gate.py --gate-config /home/filip/.config/openviking/commit-gate.toml --cli /workspace/opencode-issue80-curator-integration/docs/issue-78/v2-curator/curator-cli.mjs --group cur80_disposable --state-dir /home/filip/.local/state/ghdev-graphiti-issue80 --endpoint http://127.0.0.1:8766/mcp --max-seconds 900 --lock-timeout 120
```

Expected: one admitted model curation of the seeded
user+tool+assistant cluster, exactly one group-scoped `add_memory`
episode under `cur80_disposable` on `http://127.0.0.1:8766/mcp`,
positive exact episode-UUID readback and `_episode-index`
confirmation, then queue convergence. The operator result must be
returned to Central as an authenticated separate receipt
(`READY_FOR_POST_EXIT_OPERATOR_RUN` boundary; see `handback.md`).
