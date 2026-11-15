# Issue #93 — CPU-only independent adjudication of the existing clean-answer-proof packet

Status: **INDEPENDENT_ANSWER_PASS** (answer-side gate verified from raw artifacts;
input-side attribution re-confirmed). One sanitized evidence-only commit; no PR,
merge, issue closure, production change, or new model trial.

This is a **retrospective, read-only** adjudication of an already-completed one-shot
serial clean answer proof (2026-11-15 UTC). It does NOT re-run the probe, does NOT
tune, and does NOT alter the approved comparative holdout (which stays PASS under the
previously approved one-time post-exposure exception).

## Provenance / identity (recomputed, not self-reported)

Required remote head authenticated: `dc6140c346d0ee7d96b28e12bb3b3d55961816cf`.

Private packet (host-side, 0600, not committed) — digests recomputed from bytes:

| artifact | SHA-256 |
| --- | --- |
| packet-manifest.json | 67705b5b2a836d5b2dd0b49120b65721e7ba7876a2d1429607f161e9b9ffce22 |
| preflight.json | ce9632763569bea191ac05bd4ac5a036ac8d9598d0b61b1561829571f1f7cc42 |
| run-clean-answer-proof.sh (runner) | f4303939980f3652724d41677fbe50e06a385f7df7fffd7f5546fb0d8ff5c780 |
| model-capture-proxy.mjs (relay) | 888ffac0225093a9d480af16a72f220ac44b9c6498c213c1f6ea0ca0e4b093d8 |
| model-input.jsonl (combined capture) | d905d6c548ddded308c5ff87b16d5359420ac5f8034b86b28f8b505e5718ee55 |
| expected.json | 09a2c8d281b1e59eeca9b95d83acd79a0316f41ae74b286a631b183417926d47 |
| prompt.txt | 9911cc24808ac15b33cfe96f8a15f0ff1f8aebdca8ddc67ec97bf8a5b9690aed |
| results/receipt.json | bee4ddb361116aa5839dd91563d0dc8d3611ca86807b931ba0647cad21c55478 |

These match the manifest hashes and the Central audit's independently recomputed
hashes. Runner `bash -n` and relay `node --check` both pass. This proves source
identity + static syntax only; the answer-side gate below is the substantive check.

Frozen identities (digests only; raw values stay 0600):
- fact_id = `D12`; credited answer token SHA-256 = `5525c7f917d12a1f5dd5d6940d3019bc8cc5d2c3f6d76d2c93706b21d96efba2`
- expected_answer SHA-256 = `280dca65e171441315447778c79a2a4c26368c7bd692dc7fe19e2a4ecd5f68e3`
- source_ref SHA-256 = `0207e103cbbc60b950ba80304a806cad5ea6fab4fdada112135b6d09e4fbfccb`
- prompt (query) SHA-256 = `9911cc24808ac15b33cfe96f8a15f0ff1f8aebdca8ddc67ec97bf8a5b9690aed`

## Model / routing identity

Both arms: model `local/chat` (Qwen3.8 Chat, xhigh reasoning, bounded), served by the
mcp-mux OpenViking-shims proxy `local/chat` → `127.0.0.1:8002` LiteLLM bridge, routed
through a **transparent no-inference relay** on `127.0.0.1:18002` (relay source is a
stdlib HTTP forwarder that appends each request body to JSONL and pipes the response
through; it contains no inference and no answer synthesis).

Per captured answer request (one per arm), both arms are identical on:
- user-content SHA-256 = `9911cc24…` (the frozen prompt), message count = 2 (system + user);
- `model`, `stream=true`, `stream_options.include_usage=true`,
  `max_completion_tokens=32768`, `reasoning_effort=xhigh`, `temperature=1`, `top_p=0.95`,
  `top_k=20`; identical single advertised tool schema.

## Serial capture and boundary

Combined capture has 4 requests, seq 0..3, in strict serial OFF→ON order:
OFF arm = seq {0,1} (auxiliary title request + substantive answer request),
ON arm = seq {2,3} (same shape). The arm-separated files
`results/off.model-input.jsonl` (seq 0,1) and `results/on.model-input.jsonl` (seq 2,3)
match the recorded line-count boundary. Distinct session identities:
`off.session` = `ses-c93-off-…`, `on.session` = `ses-c93-on-…` (separate fresh sessions).

## Independent invariant checks (from raw artifacts, not the runner's claim)

1. **Both model runs completed successfully.** `results/off.exit` = `0` and
   `results/on.exit` = `0` (2-byte files, both `0\n`); each answer NDJSON terminates in a
   `step-finish` with `reason:"stop"`. (Both exit files share SHA-256 `9a271f2a…` because
   both contain `0\n`.)
2. **Same frozen prompt/model.** User content digest matches in both answer requests
   (`9911cc24…`); model + sampling + tool schema identical (above). Configs differ ONLY in
   the single plugin option `enabled:false` (off) vs `enabled:true` (on); everything else
   (relay baseURL, apiKey, model settings, agent, deny-all permissions, compaction off) is
   identical across the two 0600 arm configs.
3. **Credited fact entered treatment input only.** ON answer-request system message
   contains a correctly-bracketed `[GHDEV_GRAPHITI_CONTEXT]` block with the credited
   token and `source=` attribution (source_ref SHA-256 `0207e103…`); the OFF answer-request
   system message contains NEITHER the marker NOR the token. The block carries 3 fact lines
   (≤5 cap), all sharing the same source ref; within the 1400-char cap.
4. **Control did not answer with the fact.** OFF answer text does not contain the credited
   token (the model said the state is "off", which is not the credited answer and not in the
   allowed-paraphrase set).
5. **Treatment correctly answered using the sourced fact.** ON answer text contains the
   credited token, matching the frozen expected answer (digest `280dca65…`).
6. **No alternate answer-bearing channel / tool result supplied the fact.** Neither answer
   request has a `tool`-role message (roles = [system, user] only); neither answer NDJSON
   stream contains a `tool` part (parts = step-start / text / step-finish only); and no
   OpenViking / `viking://` / hybrid-recall / session-memory marker appears in either
   captured answer request. The only answer-bearing channel is the `[GHDEV_GRAPHITI_CONTEXT]`
   system block in the ON arm.
7. **Advertised "skill" function not invoked → OFFERED_BUT_UNUSED.** Both answer requests
   advertise one function schema named `skill` (tools=[skill]) even though the `answerprobe`
   agent has a deny-all permission. No tool call executed and no tool result was produced in
   either arm, so it cannot have supplied the fact. This is a tool-exposure gap (a schema is
   offered at the outbound-request level despite deny-all), NOT an alternate answer channel —
   i.e. it distinguishes "actual alternative-channel exclusion" from "ideal isolation": the
   fact was excluded from the control input and answered by the treatment via the Graphiti
   block, while a non-invoked schema remained visible to the model.

## Receipt-gate defects (independent findings on the runner, not verdict-affecting)

- **D1 (incomplete PASS predicate).** The runner's `ANSWER_PASS` branch tests only
  `TREAT_CTX && CTRL_CLEAN && CTRL_SRC_EXACT && TREAT_SRC_EXACT`; it does NOT require
  `OFF_EXIT=0`, `ON_EXIT=0`, or `ALT_CHANNEL=verified`. Those are written to the receipt but
  are not part of the successful-verdict predicate. Independently confirmed here: both exits
  are 0 and the alternative channel is excluded, so the PASS stands on the raw artifacts.
- **D2 (misnamed field).** `CONTROL_ANSWER_SOURCE_EXACT=yes` means the credited token is
  ABSENT from the control answer ("control did not reproduce the fact"), not a positive
  source-exact match.
- **D3 (hard-coded inventory, not measured).** `LOADED_CONTEXT_PLUGIN_IDS_OFF_ON`,
  `EFFECTIVE_TOOLS_OFF_ON`, and `ISOLATED_DB_CONFIG_STATE_PATHS` are string literals in the
  generated receipt, not runtime inspection. The "tools=0 both arms" claim is imprecise: the
  outbound request offers a `skill` schema; the correct classification is OFFERED_BUT_UNUSED.
- **D4 (conflated SHA role).** `CANDIDATE_SOURCE_SHA` is populated from
  `preflight.target_head` = `6e5c2ce6…` (the issue-branch documentation head), which is a
  different role from the B2.2 selector-candidate source fixed earlier at `4bc169cc…`. These
  two repository SHAs must not be equated.
- **D5 (stale KNOWN_GAPS).** The committed receipt's `KNOWN_GAPS` describes "trace-log"
  model-input capture, whereas the actual run used the no-inference relay, and the runner
  (`f4303939…`) template describes the relay. The committed receipt therefore predates the
  runner's final form; this is stale prose, not a reason to reject the captured requests.
- The runner does not self-authenticate; the verdict above is derived independently from the
  raw result artifacts.

## Verdict

All seven invariants are satisfied by the raw artifacts, independent of the runner's
self-reported `ANSWER_PASS`:
- OFF/ON exits = 0;
- source-exact fact selected and injected exclusively in ON;
- no answer-bearing alternative channel used;
- OFF actual answer lacks the credited fact; ON actual answer supplies it correctly;
- no untrusted/secret/source leak in the model input (digests + marker + counts only);
- matching original fact/prompt/model/settings.

`MODEL_ANSWER_INDEPENDENT_GATE = PASS`.

## Publication

One sanitized evidence-only commit on `issue/93` (parent = required remote head
`dc6140c346d0ee7d96b28e12bb3b3d55961816cf`) under
`docs/issue-93/evidence/clean-answer-adjudication/`, containing this memo, the typed
handback (`handback.json`), and `SHA256SUMS`. Raw prompt/fact text, the credited token,
source UUIDs, raw model answers, arm configs, tokens/API headers, and private logs are NOT
published; only digests, role/message/tool counts, zero-call evidence, and private
receipt/runner/relay/preflight digests are.
