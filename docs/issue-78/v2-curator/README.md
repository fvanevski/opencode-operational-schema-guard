# Stage #80: source-grounded deferred curator and local review portal

**Status:** Central-staged, **not yet CPU/GPU/browser qualified or deployed**.
This is the first integrated #80 vertical implementation on the **existing
issue/79 branch**. The accepted #79 capture layer is unchanged except for the
optional source-aware mapping into existing #75 native recall. The final #79/#80
implementation should use one PR when the required host acceptance is clean.

## Architecture and authority

1. #79's exact `CandidateQueue` supplies source-linked observations.
   `core.mjs` groups up to 8 related same-session events, creates bounded
   untrusted-source prompts, validates JSON decisions, retains exact scope,
   timestamp and evidence class, and writes immutable source events plus
   durable revisioned operator review/audit records. An excerpt is a
   source-reported observation, never a claim of independent verification.
2. `model.mjs` invokes an already-running **loopback** OpenAI-compatible local
   model **only** with `GHDEV_MEMORY_POST_EXIT_LEASE=admitted`. This flag is
   informational in the worker; only the existing Python gate wrapper
   supplies authenticated process/lease/scheduler admission. Missing model,
   malformed JSON, unbound sources, secrets, mixed authority or timestamp
   discrepancy become DEFER with typed reasons, not Graphiti facts.
3. `worker.mjs` groups and curates clusters under the existing exclusive
   gate. A grounded single-fact EMIT can progress `approved ->
   submission_unknown -> queued -> persisted`. The worker records possible
   submission **before** `add_memory`; missing ACK or missing recent episode
   remains unknown/queued until **positive** group/name/UUID readback. No blind
   replay or automatic deletion. Duplicate assertion checks use scoped local
   confirmed submissions and existing `search_memory_facts` under admission.
   Operator MERGE/SUPERSEDE are **proposals**, not remote graph mutations.
   Multi-fact EMIT is currently deferred until per-fact remote source identity
   is implemented; do not collapse mixed evidence classes into one source.
4. The confirmed `curation-v1/<group>/_episode-index/<uuid>.json` provides
   O(1) scoped read-only remote-to-source mapping. Readers validate the
   referenced record is truly `persisted` with the matching UUID, group,
   project and workspace and one source-labelled fact. Index-first writes
   are safe on crash because readers never trust index metadata alone.
   `sourced-recall.mjs` is an optional source resolver injected into the
   existing #75 Memory.search path by #79's wrapper; old journal resolution
   and 300-ms context limit are unchanged. **Native fresh-client context**
   needs host/Stage #81 proof, not inferred from a passing unit test.
5. `curator-cli.mjs` exposes bounded `status|list|drain`. Drain uses the
   accepted `docs/issue-75/v2-candidate/post-exit-drain.py` (EX lock, no
   active harness, idle metrics, quiet grace). Its `--cli` points to this
   curator-cli and passes `--endpoint` as the Graphiti MCP endpoint; the
   curator URL, model ID and local API key are supplied through a private
   environment. There is **no new model daemon or Graphiti datastore**.
6. `portal-server.mjs` hosts an authenticated, scope-fixed loopback API and
   Vite-built static portal. Operator approval/edit, discard, re-evaluate and
   merge/supersession proposals share ReviewStore validation, revision CAS
   and audit; none calls a model or Graphiti directly. The frontend uses
   React, Radix Themes, and React Flow. It shows a source timeline,
   proposal/authority labels, status counts and an interactive provenance
   diagram. The diagram shows **source -> proposed fact -> confirmed remote
   episode associations only**; it never invents extracted graph edges.
   A source-confirmed, read-only actual entity-edge overlay is available with
   the optional private `--graphiti-endpoint` server argument; it requires exact
   persisted episode identity and native indexed source readback, then requests
   only `get_episodes` and `get_episode_entities` in the same group. The
   overlay never upgrades extracted claims to verified, and fails closed when
   returned node/edge groups cannot be established. A full model-driven
   contradiction comparison
   remain acceptance work under #80/#81 if real Graphiti data requires them.
7. `activation/ghdev-curator.{path,service}.in` are disposable systemd
   **event-wake templates**, not an installed service. Instantiate against
   the authenticated existing external gate and a private disposable group.
   A path-wake does not grant inference admission. The existing gate is the
   only authority and its unknown-outcome fail-closed behavior takes precedence.
   No standing production activation is authorized by these source files.

## Repository-deterministic qualification

From the repository root:

```sh
node --check docs/issue-78/v2-curator/core.mjs
node --check docs/issue-78/v2-curator/model.mjs
node --check docs/issue-78/v2-curator/worker.mjs
node --check docs/issue-78/v2-curator/curator-cli.mjs
node --check docs/issue-78/v2-curator/portal-server.mjs
node --check docs/issue-78/v2-curator/sourced-recall.mjs
node --check docs/issue-78/v2-curator/curator.test.mjs
node --check docs/issue-78/v2-curator/portal-api.test.mjs
node --test docs/issue-78/v2-curator/curator.test.mjs docs/issue-78/v2-curator/portal-api.test.mjs
node --test docs/issue-78/v2-candidate/candidate.test.mjs
node --test docs/issue-75/v2-candidate/memory-core.test.mjs docs/issue-75/v2-candidate/plugin-behavior.test.mjs docs/issue-75/v2-candidate/relevance.test.mjs docs/issue-75/v2-candidate/relevance-observation-replay.test.mjs
```

Portal build (local host network required to resolve npm packages, no
production installation):

```sh
cd docs/issue-78/v2-curator/portal
npm install
npm run check
npm run build
```

Retain `package-lock.json` as reviewable uncommitted source material and
include its exact bytes/diff in the GitHub evidence packet; Central will
inspect and stage accepted dependency locks. Avoid unrelated root npm changes.

Host acceptance must separately qualify the real local model API, pinned
Graphiti MCP behaviors, source-attributed readback, shared EX admission and
actual browser UI; no GitHub source commit or static mock is a substitute.

## Security and known limits

- No local model or Graphiti write on an interactive prompt/context hook.
- Only scoped native source IDs, safe excerpts, operator intent and positive
  persisted episode readback can support automatic recall. Model reason text
  cannot upgrade evidence to "verified". Lexical overlap is a plausible-source
  check, **not a semantic-veracity proof**.
- `get_episodes(max_episodes=1000)` is a bounded positive-observation
  window, not a proof of remote absence. An older ambiguous write still
  requires an independently justified safe reconciliation route. Never
  replay it merely because it was not in the recent window.
- Portal token must be private (0600) and known only to the operator.
  Only 127.0.0.1 is bound; same-origin and token guards apply to APIs.
  Never put live credentials, raw transcripts or private code into GitHub.
- Authenticated current stock-V2 hooks/activation, systemd wake, model
  output shape and Graphiti extraction semantics must be tested **on host**;
  unresolved integration is typed as UNVERIFIED or BLOCKED, not a PASS.
- The model JSON schema permits up to three proposed facts; the current
  automatic Graphiti episode path accepts only one fact per confirmed episode
  to preserve unambiguous source attribution. More sophisticated semantic
  merge/supersession and real graph-edge visualization are explicitly not
  claimed accepted in this first vertical host campaign.

## Post-exit schema recovery

The first admitted disposable model call completed under EX admission but
produced a proposal rejected as `invalid_fact_fields`; no Graphiti write
occurred. The old review entry is `deferred` (revision 1), and its three
original source events remain staged. This is not a Graphiti failure and not
proof that the model hallucinated content: the model response body was omitted
by the privacy policy, so the exact incorrect field is **UNVERIFIED**.

`validateModelDecision` now binds **only omitted** immutable scope,
evidence class and latest supporting observed timestamp from exact native
source references. Mismatched provided fields, wrong-group refs, ungrounded
assertions, unsupported dates, private text and mixed source authority still
fail the existing strict validator. Safe `diagnostic_field` identifies the
invalid schema field without persisting model output or private content.
The prompt now supplies exact allowed enumerations and unambiguous SOURCE
reference syntax. Operator-created approvals continue to require all fields.

When an admitted post-exit drain returns typed `unresolved`, the
   shared-worker-safe wrapper retains its original EX flock and executes
   `curator-cli reconcile-only` periodically. This mode makes no model or
   Graphiti writes; it can finish only after all queued/submission-unknown
   identities have exact positive readback, with no new/reserved candidate
   or unsubmitted approved review remaining. A terminal Graphiti extraction
   failure remains an operator-adjudicated blocker, not an automatic retry.
   This does not hot-patch any already-running legacy wrapper.

A subsequent worker run must use `ReviewStore.change(id, revision,
'reevaluate', {reason})` (revision checked) to request an **admitted**
re-evaluation of the same original evidence. Do not restage source events,
alter the frozen pilot, or bypass admission. `review_required` reports
nonterminal review work even if the admitted command exits zero.

The next admitted re-evaluation returned `unsupported_claim_text` at
revision 3 without any Graphiti write. Whether its paraphrase was genuinely
unsupported or merely lexically dissimilar is **UNVERIFIED** because the
rejected model content was deliberately not retained. For this bounded
integration, **only exact contiguous extracts of one authenticated source
excerpt qualify for automatic model promotion**; literal quoted statements
retain their original evidence class, which is not verification of truth.
No lexical-overlap threshold is lowered. A read-only Graphiti
get_episodes shape preflight is now required before first add_memory, so a
missing/incompatible remote readback schema causes a durable, no-write DEFER.
Paraphrases can be proposed through human operator review, which has
separate full-field source validation.
An ordinary `DEFER` remains an acceptable model decision; it must not be
converted into `EMIT` simply to obtain a real remote write.

**Execution handoff:** `LOCAL_AGENT_CONTRACT_FIRST_INTEGRATION.md`.
**Evidence contract:** `docs/issue-78/REVIEW_EVIDENCE_PACKET.md`.
**PR:** none in this campaign. Use the same issue/79 branch for the combined
#79/#80 implementation, then #81 integrated benchmark/fresh-session acceptance.
