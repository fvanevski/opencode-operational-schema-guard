# Issue #81 — Production extraction reliability and fresh graph cutover

## Authority and ordering

The future production group is **development-knowledge**. The historical
**ghdev_gh_mcp** group contains development-era data and MUST NOT be migrated,
cloned, reindexed, or silently aliased. This is not a rename of the existing
FalkorDB graph: Graphiti resolves group IDs to distinct graph namespaces.

The stock-V2 plugin remains opt-in and its group is supplied by live plugin
options. The post-exit wrapper receives its group explicitly; source alone
does not update host config, systemd units or existing state directories.
Update all producers and consumers at one controlled cutover; do not merely
change the display label. Read old identities only to adjudicate the currently
blocked historical submission, then retire them.

### 1. Correct the extraction model's response budget, not the curator budget

The observed error is in Graphiti's **OpenAIGenericClient** using LiteLLM and
NInfer, not in GHDEV_CURATOR_MAX_TOKENS. Captured NInfer requests ended with
output_limit at 8,192/16,384 tokens; the 5th FIFO task failed after four
tries, whereas the 6th completed on a later attempt.

Select the lowest-risk Graphiti-only policy by observing effective request
payloads across Graphiti → LiteLLM → NInfer. Preferred: route Graphiti
extraction to a dedicated non-thinking model alias, using an actual
per-request disable-thinking option supported end-to-end, with a sufficient
structured-output token limit. If this cannot be supported, cap thinking
independently of max_tokens (e.g. 2,048 thinking / 8,192 total) and verify
sufficient headroom for both forced thinking close and a complete JSON body.
Do not apply NInfer's global --no-thinking or default-thinking changes to
other clients. The non-thinking route must be proven effective at NInfer:
a LiteLLM alias name is not proof of disabled thinking.

For Graphiti extraction, return finite request budgets and prefer native JSON
constraint only if the current installed Graphiti client and NInfer support
the same schema contract. Verify whether OpenAIGenericClient sets its own
max_tokens on calls, so a server default is not silently shadowed. Validate
a real sanitized representative extraction on the host after the canonical
EX admission has been safely released, or through an isolated service test
that does NOT consume the live EX-held inference slot.

Acceptance: positive nonempty content, schema-parseable JSON, quality adequate
for the frozen Issue #81 rubric, finish_reason=stop/stop_token, no output_limit
on the representative heavy prompt, no secrets logged, and unchanged ordinary
client inference profiles. Preserve resource contention/serialization policy.
An output-limit failure is never proof of no partial Graphiti graph effects.

### 2. Single old-group terminal failure (before cutover)

Use terminal-failure-cli.mjs from this reviewed/merged source, not the
fixture-only terminal-recovery.mjs. The new CLI is deliberately fenced to the
old group and only performs read-only assessment or a single local
ReviewStore.markExtractionFailure CAS. It never sends Graphiti add_memory.

Evidence JSON shape (private 0600 file):
{
 "kind":"graphiti_async_processing_failure",
 "identity_binding":"anonymous_group_fifo_inference",
 "journal_sha256":"<SHA256 OF EXACT BOUNDED JOURNAL FILE>",
 "window_start_at":"2026-11-05T18:47:57Z",
 "window_end_at":"2026-11-05T19:10:30Z",
 "failed_at":"2026-11-05T19:02:56.042Z",
 "ordered_review_ids":["<SIX FULL HEX IDS IN ACTUAL ACK ORDER>"],
 "success_review_id":"<SIXTH REVIEW FULL HEX ID>",
 "other_success_episode_uuid":"576e82f1-8a2e-428a-b577-0cf581635245",
 "source_event_count":8,
 "serial_fifo_verified":true,
 "other_group_interleaving_excluded":true,
 "error_code":"graphiti_json_decode_error",
 "reason":"FIFO fifth task failed JSON decode; sixth succeeded. No replay authorized."
}

The source's admitted six-task journal parser requires exactly six complete
start/end pairs within the scoped window, with failure at position 5, and
an authenticated exact journal digest. It checks all six review audit orders,
a full unique remote inventory, all persisted review/source-index bindings,
and current target state/revision before presenting DRY_RUN_READY.
For apply, add --apply --attest-anonymous-fifo --ack-partial-effects and
--expect-remote-sha <FRESH DRY-RUN SHA256>. The only effect is queued rev3
→ failed_extraction rev4. No replay and no third submission. Do not apply
if target or backend evidence changed. Preserve private pre-CAS snapshot.

### 3. Fresh production graph, no historical migration

Cutover acceptance requirements:
- Old EX-held wrapper reaches a terminal state and exits normally after
  the old-group failure CAS; do not force-unlock and do not allow an
  interactive client to contend with EX.
- The new group development-knowledge is absent/empty in both Graphiti's
  group-scoped inventory and the local candidate/review/index roots before
  activation. A truly absent FalkorDB graph, or an empty newly provisioned
  graph, is acceptable; never attach to occupied state.
- Change the live stock-V2 plugin group option, opt-in capture config,
  canonical post-exit wrapper unit/group selectors, status portal and
  operator commands together. Keep the same existing service/gate topology,
  unless an actual host contract demonstrates a narrower unit override.
- Check that group=development-knowledge traverses capture → persisted
  ReviewStore record → Graphiti group → episode index → native fresh-session
  recall and that wrong-group exclusion holds. Never copy or rewrite old
  episode UUIDs/source references or expose old group through an alias.
- Old ghdev_gh_mcp state and FalkorDB graph may be deleted after the new
  graph's fresh-session acceptance, using a separately enumerated exact
  deletion inventory and operator's existing permission to discard
  development data; do not delete while it remains the rollback target.
- Capture pre/post source/config/process identity and a reversible activation
  config/unit snapshot. No special backup of old graph content is required.
  Rollback before deletion restores old effective configs and units without
  pretending that the new namespace contains the old data.

### 4. Validation and work limits

Retain original Issue #81 benchmark rubric and privacy/source attribution.
Issue #84's distinct relevance-filter correction stays separate and must
be independently integrated against current main. Do not create new issues,
additional PRs, speculative durable-queue infrastructure, or new inference
services. Host service changes, cold-client acceptance and actual LiteLLM
parameters are HOST-bound evidence: never mark them PASS from static tests.
