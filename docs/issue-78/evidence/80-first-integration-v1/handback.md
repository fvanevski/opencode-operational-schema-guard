# Issue #80 first integrated Build campaign: handback (evidence packet 80-first-integration-v1)

```text
RESULT=READY_FOR_POST_EXIT_OPERATOR_RUN
LOCAL_AGENT_PRIMARY=build
REPO_ID=fvanevski/opencode-operational-schema-guard; ISSUE_NUMBER=80; BRANCH_NAME=issue/79
SOURCE_START_SHA=c38c8fd1b8fee0b701ebeb8888fa6f1f0a27bfda
SOURCE_TESTED_SHA=c38c8fd1b8fee0b701ebeb8888fa6f1f0a27bfda + uncommitted diff (M portal/src/main.tsx + ?? portal/package-lock.json + ?? portal/dist/; full bytes in source.patch, SHA-256 below; source remains uncommitted for Central review)
EVIDENCE_COMMIT_SHA=pending (confirmed by remote readback; a commit cannot embed its own SHA pre-publication)
EVIDENCE_PUBLICATION=PASS (single evidence-only fast-forward commit on issue/79; see remote readback below)
EVIDENCE_PACKET_REF=docs/issue-78/evidence/80-first-integration-v1 @ issue/79 (commit SHA confirmed by remote readback)
EVIDENCE_MANIFEST_SHA256=efd2a60e6043111000b777923ec3d5ebee64170e7fbd7cfc28aaf416c7ae822c
SOURCE_PATCH_SHA256=9f0e1032abe6cdd864b4eb9ede1543bce12af5858c6dad59c7eb952d44c805f3
CHANGED_SOURCE_PATHS=docs/issue-78/v2-curator/portal/src/main.tsx (modified); docs/issue-78/v2-curator/portal/package-lock.json (untracked); docs/issue-78/v2-curator/portal/dist/ (untracked build artifact, hashes in manifest.json)
CPU_TESTS=8x node --check exit 0 (core/model/worker/curator-cli/portal-server/sourced-recall/curator.test/portal-api.test); curator+portal-api 13/13 exit 0; portal-api standalone 1/1 exit 0; #79 candidate 15/15 exit 0; #75 legacy 26/26 exit 0; git diff --check exit 0; 7/7 deterministic stub-Graphiti scenarios PASS (see cpu-tests.md)
PORTAL_BUILD_AND_BROWSER=npm install/check/build all exit 0; dist assets hashed in manifest; real browser (host Chromium 156 via Playwright, private loopback 43589, fresh 0600 token, disposable group portal80) 35/35 PASS: auth/token/UNAUTHORIZED, origin/CSRF 403, wrong-group 404, filters, source timeline, fabricated/verified/wrong-class rejection (INVALID_APPROVAL), source-bound edit-and-approve rev CAS, two-tab STALE_REVIEW_REVISION, reevaluate/discard, MERGE + SUPERSEDE_PROPOSED, submission_unknown lockout, persisted badge + graph episode node (uuid 1e8c3f2a-4b5d-4f6e-9a0b-7c8d9e0f1a2b fixture) + pan/zoom, 12s live refresh, keyboard nav, dark/light, 480px 0-overflow, 84 requests all to the portal host only (see portal-api-browser.md + screenshots/)
HOST_MODEL=litellm OpenAI-compatible /v1/chat/completions at http://127.0.0.1:8002; model chat-fast (reasoning variant chat rejected: burns max_tokens on reasoning_content, empty content); response_format json_object honored; probe usage prompt=57 completion=47 total=104 (reasoning 38), predicted ~252ms decode ~182 tok/s; key held only in 0600 curator.env (value omitted) (see model-curator.json)
POST_EXIT_GATE=installed gate /home/filip/.local/share/openviking-commit-gate/openviking_commit_gate.py (SHA-256 aa0cf54e4513767b87f18e9704e27eb398a6aee3e71462644044d8805fd12b96) + config /home/filip/.config/openviking/commit-gate.toml; shared EX lease held by active harness; quiet-grace/idle checks owned by the accepted post-exit-drain.py wrapper; pre-exit exclusion proven twice, both FAIL_CLOSED exit 2 (direct wrapper: shared agent/gate lease held; systemd PathModified->oneshot wake: interactive harness active, cannot drain); no model call or Graphiti write pre-exit (see activation-receipt.md)
GRAPHITI=endpoint http://127.0.0.1:8766/mcp (MCP streamable HTTP; initialize ok; 12 tools incl. add_memory/get_episodes); disposable group cur80_disposable with 3 seeded events in private 0700 state root; deterministic stub lane 7/7 incl. unknown-ACK no-replay->persisted with exactly 1 write; POSITIVE real add_memory episode + _episode-index readback PENDING the post-exit operator run (see graphiti-receipt.json)
NATIVE_SOURCE_RECALL=deterministic proof: persisted episode source-attributed in native recall with exact group/workspace/evidence-class binding and wrong-workspace exclusion (curator suite 13/13); stub restart convergence without model recall; real-model recall pending post-exit run
UNKNOWN_SUBMISSION=reconciled-in-stub (positive get_episodes readback -> persisted; no blind replay; unknown write remains observable, EX retention respected)
AUTOMATIC_WAKE=qualified-pre-exit-negative (disposable PathModified->oneshot wake fired, gate correctly FAIL_CLOSED pre-exit; one post-exit admitted run is the pending operator step; no standing unit installed; transient units removed and verified absent)
LEGACY_ISSUE75_AND_ISSUE79=#75 legacy 26/26 exit 0 (memory-core + plugin-behavior + relevance + replay suites); #79 candidate 15/15 exit 0; accepted #79 findings/frozen fixtures preserved; no #79 discovery rerun
PRODUCTION_MUTATION=none (installed seven-plugin config, production Graphiti group ghdev_gh_mcp, OpenViking state, installed gate all untouched; disposable group/state/units only)
OPENVIKING_MUTATION=none
SOURCE_GITHUB_MUTATION=none
GITHUB_MUTATION=one evidence-only fast-forward commit (this packet; no source push, no PR, no merge, no issue closure, no force)
KNOWN_GAPS=real-model curation + positive Graphiti episode persistence + _episode-index readback are pending the post-exit operator run (see NEXT); fresh-client/native-session acceptance belongs to #81; see bounded gap list below
NEXT=operator exits the interactive harness and runs the exact wrapper command in activation-receipt.md; returns the authenticated post-exit receipt (episode UUID readback, _episode-index, queue convergence, timing) for Central adjudication; then Central independent review and accepted source integration of the uncommitted portal fix on issue/79
```

## Lane-by-lane outcome

1. **CPU admission + regressions** (cpu-tests.md): Node v26.13.0; all 8
   repo-deterministic syntax checks exit 0; curator+portal-api 13/13,
   portal-api standalone 1/1, #79 candidate 15/15, #75 legacy 26/26,
   `git diff --check` clean. One in-scope defect found and fixed in a
   single cycle: the portal detail header did not wrap the 64-char
   cluster ID (30px horizontal overflow at 480px) —
   `portal/src/main.tsx` `wrap="wrap" gap="2"` + `overflowWrap:'anywhere'`.
   No behavior, API, validation, privacy or authority changes.
2. **Portal build + real browser/API** (portal-api-browser.md): clean
   install/check/build; lockfile retained as untracked proposal evidence;
   35/35 real-browser checks on the built `dist` (host Chromium 156 via
   global Playwright with `executablePath`), including two-tab revision
   CAS, CSRF/origin rejection, wrong-group 404, submission_unknown
   lockout, persisted badge + graph episode node, live refresh,
   responsive 480px, and zero non-portal network hosts across 84 requests.
3. **Model/Graphiti lane preparation** (model-curator.json,
   graphiti-receipt.json, activation-receipt.md): litellm endpoint
   shape/usage/timings confirmed for `chat-fast`; Graphiti MCP session +
   tools authenticated; disposable group `cur80_disposable` seeded;
   installed gate identity + config recorded; pre-exit exclusion proven
   twice (FAIL_CLOSED, exit 2 each). The positive real-model run is the
   declared post-exit continuation of this campaign.
4. **Recoverability + negative scenarios** (cpu-tests.md): 7/7
   deterministic stub-Graphiti scenarios, including restart convergence
   without model recall, malformed/timeout → durable DEFER, unknown ACK
   → `submission_unknown` with no blind replay, and lease refusal.
5. **Automatic wake** (activation-receipt.md): staged `activation/*.in`
   templates instantiated for the disposable group only; transient
   systemd units installed for the demo, pre-exit wake fired and was
   correctly refused, then units removed (verified absent). No standing
   production unit, no canonical gate change.

## Known gaps (bounded)

- **Positive real-model curation + Graphiti episode persistence**
  (`add_memory` under `cur80_disposable`, exact episode-UUID readback,
  `_episode-index` confirmation) cannot execute while the interactive
  harness holds the shared EX lease; it is the single declared
  post-exit operator step (exact command in `activation-receipt.md`).
  Operator result must be returned as an authenticated separate receipt.
- **Fresh-client/native-session acceptance** after a real merge belongs
  to #81 by contract; not exercised here.
- Browser lane used host Chromium via `executablePath` (bundled
  ms-playwright browser absent); receipts are scoped to that browser
  build, not an extrapolation to other browsers.
- Model shape probe used a trivial 1-token prompt (sanitized); latency
  numbers are that probe's timings, not a workload benchmark.

## Invariants honored

No production config, production Graphiti group, OpenViking state, or
installed gate was mutated. No model curation and no Graphiti
`add_memory` occurred while the interactive harness was active (both
pre-exit attempts FAIL_CLOSED, exit 2). Source changes remain
uncommitted for Central review; the only remote write is this
evidence-only fast-forward commit. No PR, merge, issue closure,
force-push, or deployment.

## Remote readback (post-publication)

Filled in the chat handback after push: remote `issue/79` ref SHA,
evidence commit SHA, and per-file path/hash readback of this packet on
the remote.

## COMMAND_SHAPE_FRICTION (canonical)

```text
encountered=yes
events:
  - scenario=disposable_scratch_reset_1
    requested_shape="rm -rf <disposable scratch dir> && mkdir -p <fresh dir> (compound)"
    effective_shape=not_executed
    rewrite_provenance=none
    event_kind=pre_execution_rejection
    execution_effect=not_executed
    correction_or_annotation="host shell guard rejected broad rm -rf in scratch area; recovered by pointing the disposable state at a fresh directory instead of deleting"
    replacement_shape="mkdir -p <fresh dir>; update config/state binding to it"
    recipe_reference=none
    resource_reference=/tmp/opencode/issue80-evidence (disposable scratch)
    contract_conflict=no
    durable_gap_candidate=no
  - scenario=disposable_scratch_reset_2
    requested_shape="rm -rf <disposable browser-qual root> (second occurrence, same guard class)"
    effective_shape=not_executed
    rewrite_provenance=none
    event_kind=pre_execution_rejection
    execution_effect=not_executed
    correction_or_annotation="same guard class as event 1; recovered with a fresh numbered root (rootN) without deletion"
    replacement_shape="fresh numbered state root per run"
    recipe_reference=none
    resource_reference=/tmp/opencode/issue80-evidence/browser-qual/rootN
    contract_conflict=no
    durable_gap_candidate=no
  - scenario=playwright_browser_discovery
    requested_shape="playwright chromium launch (bundled browser path)"
    effective_shape=executed_failed (bundled ms-playwright chromium absent on host)
    rewrite_provenance=none
    event_kind=interface_discovery
    execution_effect=recovered_after_retry
    correction_or_annotation="host has /usr/bin/chromium (Chromium 156); drove it via global Playwright executablePath; no separate browser-testing platform introduced"
    replacement_shape="chromium.launch({ executablePath: '/usr/bin/chromium' })"
    recipe_reference=none
    resource_reference=/usr/bin/chromium
    contract_conflict=no
    durable_gap_candidate=no
  - scenario=playwright_request_url_api_bug
    requested_shape="new URL(request.url()) in qualification script"
    effective_shape=executed_failed (Playwright Request.url is a property, not a method)
    rewrite_provenance=none
    event_kind=execution_failure
    execution_effect=recovered_after_retry
    correction_or_annotation="property vs method mismatch in agent-authored script; corrected to request.url (no product code change)"
    replacement_shape="request.url property access"
    recipe_reference=none
    resource_reference=/tmp/opencode/issue80-evidence/browser-qual/qualify.cjs
    contract_conflict=no
    durable_gap_candidate=no
  - scenario=radix_select_selector_discovery
    requested_shape="click state-filter Select by visible label"
    effective_shape=executed_failed (Radix Select renders options in a [role=listbox] portal)
    rewrite_provenance=none
    event_kind=interface_discovery
    execution_effect=recovered_after_retry
    correction_or_annotation="Radix Select options live in a listbox popup; used [role=listbox] option selection (last() where multiple popups existed)"
    replacement_shape="page.locator('[role=listbox] > [role=option]') helper"
    recipe_reference=none
    resource_reference=portal UI (Radix)
    contract_conflict=no
    durable_gap_candidate=no
  - scenario=workspace_selector_bug
    requested_shape="page.locator('main .workspace')"
    effective_shape=executed_failed (actual markup is <main class=workspace>, not a nested .workspace)
    rewrite_provenance=none
    event_kind=execution_failure
    execution_effect=recovered_after_retry
    correction_or_annotation="selector did not match DOM; corrected to main.workspace (agent-authored script only)"
    replacement_shape="main.workspace selector"
    recipe_reference=none
    resource_reference=portal dist DOM
    contract_conflict=no
    durable_gap_candidate=no
  - scenario=merge_button_disabled_state
    requested_shape="exercise MERGE proposal on a record whose facts had been cleared"
    effective_shape=executed_failed (merge control disabled with 0 facts)
    rewrite_provenance=none
    event_kind=execution_failure
    execution_effect=recovered_after_retry
    correction_or_annotation="switched to record r2 which carries facts; MERGE/SUPERSEDE_PROPOSED then verified (no assertion weakened)"
    replacement_shape="use r2 for merge/supersession checks"
    recipe_reference=none
    resource_reference=portal80 seed records
    contract_conflict=no
    durable_gap_candidate=no
  - scenario=verified_class_post_origin
    requested_shape="POST verified-class fact from page context without Origin header"
    effective_shape=executed_failed (server 403 ORIGIN_REJECTED without Origin)
    rewrite_provenance=none
    event_kind=execution_failure
    execution_effect=recovered_after_retry
    correction_or_annotation="the 403 was the expected CSRF behavior being verified; positive controls sent with the matching Origin and the rejection case is retained as a PASS receipt"
    replacement_shape="explicit Origin header on positive POSTs"
    recipe_reference=none
    resource_reference=portal server loopback
    contract_conflict=no
    durable_gap_candidate=no
omitted_sensitive_values=yes
```

Notes: all events are agent-authored scratch-script or host-discovery
issues; none touched repository source semantics, protected live state,
or acceptance assertions. `omitted_sensitive_values=yes`: the portal
token, `LOCAL_CURATOR_API_KEY`, and raw model prompt/output text are
deliberately excluded from this packet (values live only in 0600/0700
host files).
