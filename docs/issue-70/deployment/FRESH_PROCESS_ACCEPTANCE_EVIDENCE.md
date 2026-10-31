# Issue #70 / PR #73 — independent fresh-process acceptance evidence (2026-10-31)

**Disposition: PARTIAL independent acceptance; proven V2 public capability, operational evidence gaps remain.** This is a documentation-only record for the existing draft PR. It does not modify the deployed runtime, enable Graphiti capture, assert global memory-store immutability, authorize merge, or close Issue #70.

## Exact identities and custody

- Source reviewed and deployed with Graphiti capture disabled: commit `b126b6d415a3f8706e0c8c22b219cca2161a7465`, Git tree `dacb27120deef3e8bfa27b50222bf20cb60c450c`.
- PR evidence-orchestration baseline before this record: `a8d73a797de4fb44eaaaee3611877eace3390f3b`; merged source-only base: `4d4825b8151a1d8272af9da89701954d7ab27822`. These identities are not interchangeable.
- Independent operator run: `/tmp/opencode/issue70-accept-20261031214134` (2026-10-31, 21:41 local host output); installed OpenCode v2.2.5.
- Host audit packet: `sanitized-evidence.zip`, SHA-256 `68448389b8de634f40cd9a4efeb2953d6b7418e304c4eb560a5fef0dfd4f1407`; artifact manifest SHA-256 `27baaad6277fe80f440e60aaebe57aa63dfa20ab9c462024e3acd2bb9ac30a8a`. The packet was transferred to Central and its **ZIP bytes and sanitized contents** inspected. The complete original host logs, configs, SQLite/FalkorDB records and live host filesystem were not transferred; their asserted hashes remain host-audit evidence, not independently rehashed original host bytes in Central.
- Corrected host operator harness SHA-256: `130427eca4220cc961eebf8859174886a631167038eec44bffe3e94ab6dd4f7f`; checked trace verifier SHA-256: `a12674b8447c2259397c64782dd9f95084f6d520e590e18c15c237bc0359281d`. The harness is host-local and not a repository production runtime change.

## Independently audited outcomes

| Predicate | Audit result | Supporting packet material / limitation |
| --- | --- | --- |
| Actual installed `openviking-v2` loading | **PASS** | `excerpts/native-log.txt` line 23 identifies the installed `index.mjs`, run `767d04f3`. |
| Context hook and subscribed session event | **PASS** | `excerpts/plugin-trace.txt` lines 15 and 25, one context and one `session.execution.succeeded` (`session=true`); 30 total trace records. |
| Trace checker and exact input hashes | **PASS** | `trace-summary.json`, `excerpts/checker-original-output.json`: original checker input hashes match 20,573-byte native-log and 1,146-byte trace **prefixes**. Shutdown/refresh appended later records; the full-file hashes legitimately differ. Offline current-file checker also returned PASS. |
| Stub provider / response correlation | **PASS** | `model-stub-summary.json`: two loopback `POST /v1/chat/completions` requests, recomputed response identities, nonce and assistant reply matched. No individual HTTP request-ID linkage retained. |
| Private OpenCode server and admission | **PASS for observed probes** | `host-isolation-summary.json`: isolated server `http://127.0.0.1:41677`, explicit `run --server`, exclusive-lock probe blocked during server operation and succeeded after exit. Continuous native PID/FD ownership is inferred from launcher design, not directly measured. |
| Production memory endpoint isolation | **PASS** | `isolation-probe.json` summarized in `host-isolation-summary.json`: effective test endpoint `127.0.0.1:1`, inherited-credential negative control `127.0.0.1:1933`; Graphiti disabled. |
| Approved installed source/config identity | **PASS for 15/15 and gate TOML** | `host-isolation-summary.json`, pre/post readback projections and `artifact-manifest.json`; historical global OpenCode config digest values were not retained, so that narrower historical hash assertion is **UNVERIFIED**. |
| Activation wait API semantics | **UNVERIFIED at source level** | Harness calls location-specific `/api/model` before prompt and reports readiness; v2.2.5 `awaitActivation` implementation and HTTP transition history were not independently authenticated in this packet. Callback success is directly established by the trace. |
| No new production graphs or graph writes | **UNVERIFIED independently** | Original receipt reports FalkorDB count **27 → 27**. No raw graph listing, complete identity comparison, or write audit retained. Equal count is not proof of no writes or no replacement graphs. |
| Gate/backend health throughout original run | **UNVERIFIED independently** | Original receipt reports gate health; original HTTP bodies/timestamps and contemporaneous backend health not retained. Later read-only audit GETs at 22:12Z returned HTTP 200/healthy; these do not establish uninterrupted health at 21:41. |
| Compaction and live Graphiti ingestion | **NOT EXERCISED** | Short model-stub turn does not demonstrate compaction, production inference, or a newly authorized live Graphiti post-write transition. Earlier disposable Graphiti qualification remains historical and source-bound. |

## Receipt correction and admission timeline

The **original receipt is preserved, not silently rewritten**. Its `server_lifecycle.port=27611` names the **model stub port**, not the private OpenCode server. The actual private server was on **41677**, evidenced by `server-ready.json`, explicit CLI `--server` binding and the native log. The recorded job PID may be a launcher/`flock` parent rather than the native server PID. The original success note overstates continuous lease ownership, graph immutability and protected-state nonmutation; retain only observed probes, disabled policy, isolated endpoint and count observations.

The gate journal sampled `shared_lease_active` at 21:41:37.993 UTC and `quiet_grace` at 21:41:40.019 UTC (the host logs are PDT / UTC−07). The gate's health response exposes cached worker state, so a subsequent response mentioning `shared_lease_active` does not contradict the separately observed exclusive lock release. See `excerpts/gate-journal.txt` and `excerpts/gate-state-semantics.txt`.

The evidence auditor's current process was a **managed Codex app-server**; direct absolute-path Codex CLI ancestry was not proven. This does not change the independently identified fresh OpenCode server or reclassify the run.

## Review and next gates

1. Preserve the demonstrated V2 plugin, context, subscriber, model-stub and shared-lease **observed** PASS results without repeating the expensive source-only/Graphiti campaign.
2. Distinguish the unverified graph history, original-time backend health, and readiness implementation in any final host-acceptance or production-activation decision. Later current-health readback is corroboration only.
3. The previously reported Codex P1 validator selection race is addressed in the source by bootstrap-only `select_active_validator` and a delayed old-adapter regression. Its GitHub review thread still requires final exact-head adjudication.
4. Independently review the **new exact PR head** and CI after this evidence-only commit. `CODEX_REVIEW=WAIVED_REQUEST_CAP` (2/2 manual requests used); do not call that `CODEX_REVIEW=CLEAN`.
5. Keep draft→ready, merge, production Graphiti opt-in, any genuine source-authorized live post-write qualification, and Issue #70 closure as **separate approvals/gates**.

This record supersedes earlier *pending fresh-process capability evidence* statements in `FRESH_CAPABILITY_CLOSEOUT.md` and `HOST_PROMOTION_EVIDENCE.md` but does **not** supersede their earlier host-deployment/rollback evidence or upgrade this independent audit from PARTIAL to PASS.
