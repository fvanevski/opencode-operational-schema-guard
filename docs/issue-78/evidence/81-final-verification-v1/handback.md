# Issue #81 — Final source verification & operator adjudication handback (sanitized, evidence-only)

Packet `81-final-verification-v1` · branch `issue/81` · PR #83 (draft, unchanged) ·
tested source head **`81f9c36ff4c62d474a080442db67db18df87eb39`**.
Sanitized: no private prompt transcripts, no credential values, no operator signature text.
Raw source material and signatures remain in authorized host-local private storage (mode 0600).

## 1. Signed, SHA-bound operator verdict status

- Status: **`OPERATOR_RATIFIED`** — signed host-local by operator `filip` on 2026-11-04
  (signature text host-local only; the status and digest-bound aggregates are published here).
- Bound to: source `81f9c36f…`, corrections `72ce234…` + `81f9c36f…`, corpora
  `d3822a30…` (12-case dev) / `2435236a…` (5-case prospective holdout) /
  `22ae11e6…` (57-case frozen dev) / `f904411e…` (9-case frozen holdout),
  targets `17ffb605…`.
- Verdict record: `operator-adjudication-worksheet.md` §F (host-local), items R1–R6:
  R1 `RATIFIED_WITH_ONE_EDIT`, R2 `RATIFIED` (qualification), R3 `RATIFIED` (corrections),
  R4 `RATIFIED`, R5 `ACKNOWLEDGED_WITH_QUALIFICATIONS`, R6 `ACKNOWLEDGED`.

## 2. Original proposed labels vs operator-amended labels

| Case | Proposed | Operator-adjudicated | Note |
|---|---|---|---|
| dev-p-longdecision | true | **true** | |
| dev-p-codeprose | true | **true** | previously the single dev FN; recovered at `81f9c36f` |
| dev-p-shell | true | **true** | source-event level; not a durable test-count fact |
| dev-p-read | true | **false** | **amended**: out-of-workspace read instruction; no successful read shown, no contents, no durable fact; retained as read-only classification control |
| dev-p-historical | true | **true** | |
| dev-p-superseded | true | **true** | durable fact F11 |
| dev-p-secretlate | false | **false** | credential control (redacted) |
| dev-p-self | false | **false** | SELF/injected-context control |
| dev-p-dup | false | **false** | duplicate selection ≠ unique fact usefulness |
| dev-p-chatter1/2/3 | false | **false** | routine chatter |
| ho-p-longdecision, ho-p-shell, ho-p-longdecision2, ho-p-longdecision3 | true | **true** | |
| ho-p-secret | false | **false** | credential control (redacted); must never emit a source candidate |

The amendment is a **post-result operator label correction**, not an independent blind result.

## 3. Corrected confusion matrices and cohort-specific denominators

All at source `81f9c36f`, offline (no model calls, no Graphiti writes), corpora unmodified.

| Set (denominator authority) | Matrix | Recall | Selection precision |
|---|---|---|---|
| 12-case prospective dev — **original proposed labels** | tp 6 · fp 2 · tn 4 · fn 0 | **6/6 = 1.000** | 6/8 = 0.75 |
| 12-case prospective dev — **operator-adjudicated labels** | tp 5 · fp 3 · tn 4 · fn 0 | **5/5 = 1.000** | 5/8 = 0.625 |
| 5-case prospective holdout (counterfactual) | tp 4 · fp 0 · tn 1 · fn 0 | 4/4 = 1.000 | 4/4 = 1.000 |
| 57-case frozen dev (counterfactual at head) | tp 29 · fp 6 · tn 14 · fn 8 | 0.7838 | 0.8286 |
| 9-case frozen holdout (counterfactual at head) | tp 4 · fp 2 · tn 1 · fn 2 | 4/6 = 0.6667 | 4/6 = 0.6667 |
| **Historical immutable results** | — | **dev 27/37 = 0.7297 FAIL** · **holdout 3/6 = 0.5000 FAIL** | retained, not relabelled |

Recovery detail: `dev-p-codeprose` → event `51ede3da98cd34cb8b72a76f0c889de81f724197ecdf3f6cbaccd4161635589b`,
native source `opencode:ses_e5811b72dffeHsBS4pVp98BgX7:message:msg_1a7ef64ae00189hlwZMK4t6p70:span:896`,
1 candidate (code `{…}` regions are not stored as user decisions; the narrative span survives).

## 4. Holdout semantic-overlap finding and consequences

The 5-case prospective holdout contains substantive requirements already represented in development
(log, read-back, manifest, and transition contracts). Separate sessions/workspaces do not establish
semantic independence. Consequences:

- Classified as an **exposed, semantically overlapping regression cohort** — regression-verification
  evidence only, **not** independent post-remediation acceptance evidence.
- Its 4/4 capture recall is retained as regression evidence; its durable-fact precision is
  **UNVERIFIED** (group not drained; 0 persisted facts).
- A genuinely nonoverlapping, prospectively frozen, independently adjudicated holdout is required
  before final quality acceptance (see §6).

## 5. Source grounding, provenance authority, grounded precision, durable usefulness (distinct)

- **Grounding (exact source):** 13/13 — every persisted fact is a verbatim substring/prefix of its
  cited native source event; no assertion contains a proposition absent from its cited span.
- **Provenance authority (preserved per fact):** user-stated (F1–F5, F11) · tool-reported observed
  (F6–F8, F10) · assistant-reported (F9, F12, F13). No assistant-reported fact is classified as
  independently verified. Textual grounding is **not** proof that an implementation exists or a
  test result is independently confirmed.
- **F12 correction:** the current `after()` hook establishes the current implementation only; without
  historical source evidence it does not prove the cleanup previously ran at module load.
- **F4 note:** extracted from a repeated source occurrence (clean local deferral
  `f1a8c418…` `LOCAL_REPEATED_ASSERTION`) — relevant to source/fact deduplication quality.
- **Grounded precision (cohort-separated):** dev `cur81_native_a1f3c9d7` **12/12** (measured,
  receipt-bound); earlier cohort `cur81_holdout_4c3ab514` **1/1** (F13, conditional);
  combined receipt-bound **13/13 = 1.0000**; new prospective holdout **UNVERIFIED** (0 facts).
  The ≥0.90 threshold is satisfied for the adjudicated persisted facts — not declared a pass of
  Issue #81 as a whole.
- **Durable usefulness (separate operator metric):** dev **6/12** (F1–F5, F11); all 13 persisted
  facts **7/13** (F13 conditional). The six non-useful persisted dev facts are a real selectivity
  concern.
- No Graphiti episode deleted or retroactively changed; all persistence receipts retained
  (12 dev episodes + 1 earlier-cohort episode + 1 clean local deferral).
- Credential-bearing cases displayed with values redacted; raw values remain in private
  SHA-pinned corpora; both credential strings flagged for operator rotation review if genuine.

## 6. Remaining acceptance blockers + proposed single consolidated independent-holdout plan

Remaining blockers (none waived):

1. **Independent holdout qualification — PENDING:** a genuinely nonoverlapping, prospectively
   frozen, independently adjudicated holdout cohort with a bounded post-exit Graphiti drain and
   receipt-bound durable-fact scoring (the current 5-case cohort is exposed + semantically
   overlapping; its durable precision is UNVERIFIED).
2. **Fresh installed-client semantic recall — UNVERIFIED** (≥0.80 target): requires a fresh
   installed-client run with distinct host receipts; not conflated with capture recall.
3. **Durable selectivity:** six non-useful persisted dev facts (test counts / transient state) —
   operator policy keeps them in the evidence history; a selectivity improvement is a subsequent
   Central-owned decision, not authorized by this adjudication.
4. **Historical recall failures remain visible:** 27/37 dev and 3/6 holdout against the 85%
   threshold (frozen corpora, immutable).
5. **Installed p95 latency receipts** remain UNVERIFIED until installed.

Proposed single consolidated independent-holdout qualification plan (for Central/operator):

- **P1 Register** a new prospectively frozen holdout cohort (new group, new session/workspace,
  nonoverlapping requirement set vs dev + previous cohorts) with SHA-pinned corpus, labels
  provisional, zero Graphiti episodes at freeze; freeze digest recorded in a manifest.
- **P2 Adjudicate** source-case labels by the operator **before** draining (blind labels).
- **P3 Drain** once via the bounded post-exit EX wrapper (one-shot, non-retrying), collecting real
  model decisions, usage, and Graphiti episode/source-index readback receipts.
- **P4 Score** with the original frozen corpus bytes + pinned adjudication evidence: capture
  recall vs the ≥0.85 binding target, receipt-bound durable grounded precision vs ≥0.90,
  durable-usefulness as a separate operator metric, zero-leakage/wrong-group/false-verified
  controls; fresh installed-client semantic recall as the distinct gate.
- **P5 Publish** one sanitized evidence-only packet (this pattern) and return a consolidated
  handback; no merge, deployment, or issue closure from the plan alone.

## 7. Exact source SHA, unchanged production-state evidence, GHDEV-10 friction ledger

- **Exact source SHA tested:** `81f9c36ff4c62d474a080442db67db18df87eb39` (issue/81 == remote HEAD).
- **Suite:** 6-file `node --test` → 42/42 pass, 0 fail, exit 0; `node --check` 3/3 exit 0
  (logs preserved host-local: `logs/exact-head-tests-81f9c36.out`).
- **Corpora unmodified:** all four digests re-verified at run time (see manifest).
- **Production state unchanged:** 0 model calls and 0 Graphiti writes in this verification;
  live group states last verified read-only in `81-post-exit-terminal-v1` / worksheet §D
  (dev 12 · earlier holdout 1 · new prospective holdout 0 · production `ghdev_gh_mcp` 4 ·
  prior `cur81_dev_ce555621` 9 — all intact); no live-surface mutation in this session.
- **GHDEV-10 COMMAND_SHAPE_FRICTION ledger:**
  | # | Class | Event | Attribution | Effect |
  |---|---|---|---|---|
  | F-1 | `interface_discovery` | OpenViking `read` first invoked with `uri` (singular) → rejected (`Missing key: uris`); corrected to `uris` (array) and succeeded | agent command shape; transparent harness behavior | context lookup only; no acceptance-bearing evidence affected |
  - All handoff-literal commands (6-file `node --test`, `node --check`, git fetch/checkout on the
    disposable worktree) matched the requested shape; `COMMANDS_MATCH_HANDOFF=yes`;
    **friction encountered = yes** (one F-1 event).
- **Boundaries honored:** no new PR, PR #83 not merged, Issue #81 not closed, no production
  deployment, no EX modification, no model replay, no Graphiti writes.

**Disposition:** `DEVELOPMENT_RECALL=MEETS_THRESHOLD_ON_ADJUDICATED_CASES` ·
`INDEPENDENT_HOLDOUT_QUALIFICATION=PENDING` · `PROSPECTIVE_HOLDOUT_DURABLE_PRECISION=UNVERIFIED` ·
`FRESH_SESSION_SEMANTIC_RECALL=UNVERIFIED` · `ISSUE_81_FINAL_ACCEPTANCE=NOT_GRANTED`.
The implementation remains under qualification until independent source-case recall, durable-fact
quality, and fresh-session acceptance genuinely satisfy the governing objectives.
