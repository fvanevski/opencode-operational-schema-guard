# Standing Graphiti capture: reconcile the pre-handler OpenViking receipt failure

Status: **CENTRAL CANDIDATE STAGED; HOST VALIDATION AND OPERATOR APPROVAL OUTSTANDING**.

This task-specific branch supports one host recovery. It is not installed production code, an authorization to mutate the queue, an unbounded replay policy, or evidence of completed Graphiti standing activation.

## Authenticated causal chain

Evidence from the operator's `2026-11-01` host handback and SHA-256-verified `standing-capture-queued-continuation-20261101-evidence.tar.gz`:

1. A genuine stock-V2 native `read` completed and independently source-attested Graphiti work `a7877b6c3484049f808c6bdbb11b135338f2363dffe7f1e02b30b8af04874604` into `memory_work.status=queued`, `attempt_generation=0`.
2. The same OpenCode process also created one ordinary OpenViking session commit. The gate enabled `receipts_enabled=true`; the backend system service had **no** `OPENVIKING_COMMIT_RECEIPT_DB`, and its receipt POST returned HTTP 503 `UNAVAILABLE: receipt protocol disabled` *before* the handler submitted a commit.
3. The gate marked that attempt `unknown`, with `submitted=1, resolved=0` because it could not prove the server had rejected it before submission. This is the correct generic fail-closed response, and the admission shim blocks all interactive harness launches under the sticky admission contract.
4. With capture disabled, the gate's `queue_empty` health state is **not proof** that the Graphiti item disappeared or that the unknown claim resolved; the Graphiti item remains queued and must not be nominated again.

Source authority: `fvanevski/opencode-operational-schema-guard` `main@0f03cec9635304849ae17bfbf08ea930eab32e1d`, installed gate handback SHA-256 `9d71ac50a3e9e2deb455395ecfb56cb4cacfb09aeadfbad5206ae1f143dcb878`; exact live state **must be checked afresh** before mutations. GitHub source describes expected gate logic; operator handback is host-reported, not a direct Central DB connection. Original two persisted Graphiti episodes remain protected.

## Minimal repair design (Central-owned)

- **Correct backend configuration first:** Bind the *backend* `openviking.service` to a durable private `OPENVIKING_COMMIT_RECEIPT_DB` and verify its effective child environment, storage ownership, receipt ledger initialization, and authenticated **read-only** receipt API. Keep gate `receipts_enabled=true` only when the backend is proven to support it. An operator-controlled systemd drop-in is expected; select its exact path and file ownership from inspected live service constraints. Do not add secrets to systemd files, source control or handbacks.
- **Reconcile only the proven pre-handler failure:** The included `tools/rearm_prehandler_rejection.py` is a production-targeted, exact-identity one-time recovery primitive. It verifies the immutable request key/body digest, a single `unknown` intent, the single unresolved submitted attempt, and the untouched queued Graphiti work. The preferred correction, *only after proving no prior backend submission*, is to restore **that same generation and request key** to its original `pending`/`submitted=0` state. It does not synthesize a successful commit, increment generation, clear other unknown claims, touch Graphiti work, or submit work itself. The backend can then process the original request once under normal gate scheduling.
- **No shim or admission bypass:** Before any inference-producing work, all interactive harnesses must have exited, and the post-exit operator must verify no model process or lease conflict. Do not remove the sticky admission contract or weaken `unknown_quiescence_unavailable`/`blocked_reconcile`. The direct `agy` workaround observed during diagnostic work was a **safety deviation**, not an accepted production launch method.
- **Continue the existing work:** After backend parity and a resolved original OpenViking intent, allow the *existing* Graphiti work key to drain under the gate's ordinary exclusive lease, scheduler-idle and quiet-grace conditions. Confirm one real persisted receipt and Graphiti UUID, normal source-attributed recall, original two-episode nonregression, and optional source-category temporal validator as applicable. Do not commit another fact record or repeat a native nomination.
- **End state:** Standing capture enabled for the existing `ghdev_gh_mcp` workspace/group/category policy only if all accepted evidence checks pass. Otherwise restore the disabled capture configuration while preserving durable work/receipts and any backend receipt configuration required for outstanding reconciliation.

## One-time recovery tool contract

`tools/rearm_prehandler_rejection.py` requires Python 3.11+; its **default invocation is read-only**:

```
python3 tools/rearm_prehandler_rejection.py --queue-db /home/filip/.local/state/openviking-commit-gate/queue.sqlite3
```

A write-capable `--apply` additionally requires: an exact-request `--affirm` string displayed by the program's source, an authenticated operator-created `--backend-proof` JSON, a new absent `--backup-db` inside a pre-existing private directory, the gate user service stopped, and an exclusive nonblocking lease on the canonical OpenViking shared lock. Its backup uses SQLite's online backup API and **must be retained privately**. No proof JSON is by itself independent evidence: the operator must personally inspect the live backend HTTP 503 historical source and verified backend receipt behavior before approving. The write is limited to restoring the original pending request; it never marks a commit complete or changes Graphiti work directly.

For `--backend-proof`, the documented Boolean observations (all requiring independent supporting receipts) are:

```
{
  "request_key": "7d9010aaef66f2b7eefa597f8de220073e8c1a7c48bc6fbfe1935345cfe01ecf",
  "http_503_prehandler_confirmed": true,
  "prior_backend_receipt_absent": true,
  "prior_backend_archive_absent": true,
  "backend_receipts_now_enabled": true,
  "operator_authorized_same_request_rearm": true
}
```

Never put private session IDs, tokens, backend DB copies, raw journals, or secrets in GitHub. A report that says `503` without proving the **pre-handler path** is insufficient for `--apply`; if evidence contradicts it, STOP.

## Verification run in Central candidate environment

- `python3 -m py_compile tools/rearm_prehandler_rejection.py` — PASS.
- `python3 -m unittest discover -s tests -v` — **7/7 PASS** on synthetic in-memory SQLite, covering a single rearm, second-attempt refusal, and negative drift/conflict cases.
- These tests are **not** host-service/SQLite/FalkorDB validation. Operator must authenticate deployed runtime/config source and perform an independent fresh-process acceptance.

## Handoff execution

Use `LOCAL_AGENT_CONTRACT.md` on **this working branch**. Agent fetches the branch and reads these exact files from GitHub, prepares host-specific service integration/after-exit controller, returns a bounded evidence packet, and **does not open a PR** until host evidence supports the minimal candidate. No Central-generated ZIP download is required.

## Post-handback production-source correction (2026-11-01)

The first host continuation returned BLOCKED with an additional independently demonstrated pair of defects. A missing backend receipt DB was not the only problem: receipt handler \`_receipt_owner\` rejects a legitimate empty \`actor_peer\`, while the gate previously selected a ROOT credential merely because it existed, potentially breaking legacy tenant-scoped commits. Historical rollout scripts that compare against the pre-native-read release checkout are stale for the current installed integration; use exact current installed SHA pins.

**Central-owned source, same branch:** \`tools/build_receipt_corrections.py\` takes the exact current installed gate and backend source (SHA-256 pinned inside the tool), and produces two *disposable* corrected Python files with a nonsecret source-readback JSON. The corrections are deliberately narrow:
- Backend receipt owner: require exact scope keys and nonempty account/user/session, permit the documented empty string only for \`actor_peer\` (or bounded nonempty values); preserve ROOT/tenant/header comparisons.
- Gate auth: for \`receipts_enabled=true\`, require \`OPENVIKING_ROOT_API_KEY\`; for legacy \`false\`, require \`OPENVIKING_API_KEY\` even if ROOT is also present. Never use fallback across credential roles.
- No change to the queue, sticky admission, scheduler/lease, receipt submission/replay, or Graphiti semantics.

**Current operational prerequisite:** the backend \`openviking.service\` requires an effective, private durable \`OPENVIKING_COMMIT_RECEIPT_DB\`; the gate user service requires access to the actual ROOT key for receipt mode and tenant API key for legacy mode. Reuse an authenticated existing secret-bearing EnvironmentFile where readable by the service identity (do not copy secrets into Git or a new broad-access file). Systemd changes are scoped to these service units, ownership and effective process environments. Prove the proper credential is selected by each endpoint mode in a disposable real HTTP exercise, including the empty-actor-peer receipt POST and mismatching scope negative controls.

**Source/package integrity:** \`implementation/i1-integrated\` is the historical installed source package; its old manifest is not rewritten to misrepresent installed bytes. Build a new two-file overlay from the pinned live source, test it in private scratch, record its new SHA-256 identities, then install it only in an operator-authorized post-exit activation with preimages and fresh readback. Any later canonical package consolidation belongs in at most one PR after host qualification, not this diagnostic campaign.

**One-shot continuation order:** qualifying both source corrections and backend/gate credentials comes *before* the original pre-handler rearm. Recheck exact request/session/queue state, archive/receipt absence and exclusive lease; obtain new operator approval; back up SQLite and installed source/config; deploy fixed source + receipt service support; verify a real disposable receipt round-trip and original-request negative read; stop gate; invoke the existing \`rearm_prehandler_rejection.py\` once with its exact proofs; restart in standing config; let original receipt-keyed OpenViking work and the already-queued Graphiti work process normally; confirm terminal actual receipts, Graphiti UUID/readback, recall and baseline nonregression. Stop and retain disabled capture on any uncertainty. Never repeat the native read or source commit.

**Regression commands (run from this directory):**
\`\`\`bash
python3 -m unittest discover -s tests -p 'test_receipt_corrections.py' -v
python3 tools/build_receipt_corrections.py \
  --gate-original <AUTHENTICATED_INSTALLED_GATE_PY> \
  --backend-original <AUTHENTICATED_INSTALLED_SESSIONS_PY> \
  --output <ABSENT_PRIVATE_SCRATCH_OUTPUT>
GRAPHITI_RECEIPT_CORRECTIONS_DIR=<PRIVATE_SCRATCH_OUTPUT> \
  python3 -m unittest discover -s tests -p 'test_receipt_corrections.py' -v
\`\`\`
The second test run must execute the dynamic acceptance cases; do not count SKIP as full source qualification. Run the existing seven rearm regressions, the repository's backend service integration cases in a disposable runtime, and the original-host read-only preflight. No write to live source, private DB or service during active harness execution.

