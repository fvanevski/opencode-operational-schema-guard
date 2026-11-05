# Issue #81 — Operator Decision Packet 1 (sanitized decision table) (81-operator-adjudication-v1)

Sanitized, self-contained decision table for the source-case label ratification. **NOT YET RATED.**
AI-prepared recommendations; the operator signs the verdicts — **no human verdict is invented**. The
verbatim private source text and event identities stay on the host
(`operator-decision-packet-1-revised.md`, private); this table carries every field needed for an
informed decision without the private source strings. Grouping note: the 3 routine chatter cases are
collapsed into one row; no decision-relevant information is omitted.

## Acceptance targets (unchanged; the ≥85% recall requirement is STILL BINDING)

| Target | Threshold | Status |
|---|---|---|
| candidate_recall_min | **≥ 0.85 (binding)** | staged dev = 0.8333 → **FAIL**; patched counterfactual = 1.0000 → PASS |
| durable_grounded_precision_min | ≥ 0.90 | measured 13/13 = 1.0000 (receipt-bound), **not declared passed** pending operator sign-off + packet-1 ratification |
| zero_secret_leakage / zero_wrong_group / zero_false_verified | 0 | staged dev = PASS |

## Datasets (must remain distinguishable)

- **Historical ratified datasets (immutable):** dev 27/37, exposed holdout 3/6 — unchanged, NOT part of this adjudication.
- **Newly registered prospective datasets (this adjudication):**
  - **Development (provisional):** 12 source cases, 6 valuable — group `cur81_native_a1f3c9d7`, corpus `corpus81-dev.json` (sha `d3822a30…`).
  - **Independent prospective blind holdout (blind, provisional):** 5 source cases, 4 valuable — group `cur81_native_holdout_a1f3c9`, corpus `corpus81-holdout.json` (sha `2435236a…`). Disjoint group/workspace from dev; the prior exposed 9-case holdout is NOT reused. **NOT drained** → durable-fact precision UNVERIFIED (0 Graphiti episodes).
- **Earlier qualified `prime.js` cohort (separate):** `cur81_holdout_4c3ab514` / `qualified_project` — the source of fact F13. **Not** the new prospective holdout; must not be combined with it.

## A. Development source cases (12) — `cur81_native_a1f3c9d7`, project `fsm81`

| Case | Category | Captured | Proposed label | Rationale (short) | Alternative judgment | Recommendation | Acceptance impact |
|---|---|---|---|---|---|---|---|
| dev-p-chatter1 | chatter | yes | valuable=false | session-open probe, not a decision | valuable=true (opened the session) | REVIEW (label irrelevant; captured as a span) | dev recall denominator |
| dev-p-longdecision | direct | yes | valuable=true | option-C terminal-state decision | valuable=false (transient) — rejected: it is the binding final decision | ACCEPT | dev recall numerator |
| dev-p-codeprose | direct | **no** | valuable=true | code + binding narrative contract | valuable=false — rejected: the narrative is the binding contract | EXAMINE / ROOT-CAUSE (sole dev FN = defect #2) | dev recall numerator (via defect #2) |
| dev-p-shell | error_fix | yes | valuable=true | durable fail→fix→success procedure | valuable=false (one-off) — lower confidence; procedure is reusable | ACCEPT | dev recall numerator |
| dev-p-read | tool | yes | valuable=true | out-of-workspace read-only probe (user_turn; not file_change; no contents leaked) | valuable=false (routine tool use) — the out-of-ws read is a deliberate probe | ACCEPT | dev recall numerator |
| dev-p-historical | historical | yes | valuable=true | retired `states.json` layout record (temporal) | valuable=false (obsolete) — the note's value is that it marks `states.json` obsolete | ACCEPT | dev recall numerator |
| dev-p-superseded | historical | yes | valuable=true | explicit supersession (settle-to-self removed) | valuable=false (superseded) — the supersession itself is the durable fact | ACCEPT | dev recall numerator (this is durable fact F11) |
| dev-p-dup | duplicate | yes | valuable=false | known duplicate FP at span level | valuable=true (it is itself a valuable decision) — rejected at source-case grain to avoid double-counting | REVIEW (known FP; label irrelevant to recall) | known FP to broad-capture precision; does not change the valuable denominator |
| dev-p-secretlate | privacy | no | valuable=false | contains a **live** bearer token | valuable=true (informative runbook) — rejected: a live credential dominates; capture = leakage | REJECT (privacy) | must remain 0 leakage |
| dev-p-self | negative_finding | no | valuable=false | `[GHDEV_GRAPHITI_CONTEXT]` injected SELF context | valuable=true (references a real prior decision) — rejected: it is the curator's own injected context | REJECT (SELF/injected-context) | keeps the graph from recalling its own prior output |
| dev-p-chatter2 | chatter | no | valuable=false | 2-char chatter below threshold | — | ACCEPT (not captured) | — |
| dev-p-chatter3 | chatter | no | valuable=false | 2-char chatter below threshold | — | ACCEPT (not captured) | — |

**Chatter group note:** all three chatter cases are routine single-word probes. `chatter1` was
captured as a span (a known, label-irrelevant FP); `chatter2`/`chatter3` were correctly below
threshold. None is valuable; none is a privacy/wrong-group risk. Net effect on dev recall is neutral.

### Root-cause note (single dev FN)

`dev-p-codeprose` is the **only** dev false-negative. Its native prompt is JSON-quote-wrapped with a
**raw newline** inside the wrapper; the staged `promptText()` does a strict `JSON.parse` that throws on
the raw control character, losing the whole message. This is **defect #2** in Central's staged
`events.mjs`. The bounded repair (escape `\u0000-\u001f` before the `JSON.parse` retry) is verified in
`scratch-evalfix` (78/78) and lifts dev recall 0.8333 → 1.0000. It is a **substantive candidate-adapter
change**: a minimal complete diff to Central, not a silent product push. **Not applied** in this
adjudication.

## B. Independent prospective blind-holdout source cases (5) — `cur81_native_holdout_a1f3c9`, project `fsm81`

> **Blind. Must not be tuned after results. NOT drained** → durable-fact precision **UNVERIFIED** (0
> Graphiti episodes). Source-case capture recall (4/4 valuable) is a **separate provisional capture
> metric** pending the operator's label ratification below. The earlier `prime.js` cohort
> (`cur81_holdout_4c3ab514`, fact F13) is **not** this group and must not be combined with it.

| Case | Category | Captured | Proposed label | Rationale (short) | Alternative judgment | Recommendation | Acceptance impact |
|---|---|---|---|---|---|---|---|
| ho-p-longdecision | direct | yes | valuable=true | log-format API decision (durable) | valuable=false — rejected | ACCEPT | holdout capture recall numerator |
| ho-p-shell | error_fix | yes | valuable=true | durable fail→fix procedure | valuable=false — rejected | ACCEPT | holdout capture recall numerator |
| ho-p-longdecision2 | direct | yes | valuable=true | durable API decision (`lastLogLine`) | valuable=false — rejected | ACCEPT | holdout capture recall numerator |
| ho-p-longdecision3 | direct | yes | valuable=true | durable API decision (`writeBundleManifest`) | valuable=false — rejected | ACCEPT | holdout capture recall numerator |
| ho-p-secret | privacy | no | valuable=false | live vault token | valuable=true — rejected (leakage dominates) | REJECT (privacy) | must remain 0 leakage |

## C. What the operator must decide (explicit)

1. **Ratify (or edit) the 12 dev + 5 holdout source-case labels** above. These become the
   operator-adjudicated corpus for the blind-holdout score. (Packet 1 was **not** ratified by the
   prior response.)
2. **Ratify the targets** (≥0.85 candidate recall — **binding** — and ≥0.90 grounded precision).
3. **Accept the bounded-repair recommendation** for defect #2 (multi-line `promptText`) as a minimal
   diff to Central, with its focused regression (scratch-evalfix `long-multiline`); and **acknowledge**
   defect #1 (evaluator qualification-group identity). Neither is applied here.
4. **Acknowledge** that the independent prospective holdout is blind, must not be tuned after results,
   and is **not drained** (durable-fact precision UNVERIFIED); its 4/4 capture recall is provisional
   pending the labels in (1). The earlier `prime.js` cohort (F13) is a separate dataset and does not
   ratify it.

## D. Lineage & file pointers (private)

- Staged native queue events (dev): `state/candidate-events-v1/cur81_native_a1f3c9d7/` (96 events).
- Staged native queue events (independent prospective holdout): `state/candidate-events-v1/cur81_native_holdout_a1f3c9/` (66 events; not drained).
- Earlier `prime.js` cohort (F13): `/home/filip/.local/state/ghdev-graphiti-issue81/holdout81-4c3ab514/` (group `cur81_holdout_4c3ab514`, project `qualified_project`).
- Corpora (SHA-pinned): `corpus81-dev.json` (`d3822a30…`), `corpus81-holdout.json` (`2435236a…`).
- Source under test: `worktree/docs/issue-78/v2-candidate/events.mjs` @ `7b7d626`.
- Prior packet-1 (immutable reference, private): `operator-decision-packet-1.md` (sha `54fca993…`);
  revised complete private form: `operator-decision-packet-1-revised.md`.

**Status:** READY_FOR_OPERATOR_REVIEW (sanitized, complete, self-contained; no AI-signed verdicts;
operator signatures remain local, never GitHub).
