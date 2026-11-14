# Issue #92 — Balanced recovery and completion campaign · terminal handback

`RESULT=READY_FOR_ONE_FINAL_PROSPECTIVE`

## A. Authenticate and verify (all green)
- Required head `e31d22bb` fetched + fast-forwarded; balanced-dedup source commit `fea134e`
  (finite-batch.mjs +80, curator-cli.mjs +9, finite-batch.test.mjs +38). 8 execution-source blobs
  verified committed==on-disk.
- Focused regressions: finite-batch **61/61** (incl. 5 new balanced-dedup), claim-evidence 7/7,
  ex-admission 2/2, A3-acceptance 12/12, Python EX bridge OK, `npm run check` exit 0, `npm test`
  **524/524**. No Central source defect; no semantic remediation.
- Balanced-dedup invariants (a–e) each have a passing regression: genuine source-quoted duplicates
  defer; uncertain/malformed/invalid-quote families retain both; no retrofit of a frozen recall
  batch; source validation / privacy / utility / UUID / once-only unchanged.

## B. Diagnose the failed A3 cohort (no inference)
- **3 missed valuable targets** (all DISCOVERED, deferred at the claim-support gate):
  - v3-02 b75-journal → `not_substantive` → SKIP (cluster "No attributable source claim").
  - v3-05 release quality-gate → `claim_support_missing_predicate` → DEFER.
  - v3-07 fsm81 log-rotation → `claim_support_missing_predicate` → DEFER.
  - Model-selection / source-support false negatives, **not** discovery omissions; the
    balanced-dedup option does not recover them (lost before the dedup stage).
- **5 duplicates** (69c45869/89f00ba5/d528788b/f79b88d6/ad9bc7a7) are same-predicate → the balanced
  review can compare and suppress them; the distinct v3-08 pair (pure-function + unhandled-event)
  is preserved as separate families.
- **A1 population:** 1,423 full-native user turns vs 1,113 genuinely-new (nonoverlapping) subset; the
  v3 raw-opportunity file conflated the two labels. Admit_rate 0.726 = 1,033/1,423 (full population).
- **A3 batch identity:** authoritative immutable batch = `6287a0ee…` (active/driver/provenance agree);
  the terminal handback's `226621f6…` was a transcription error. No scorecard rewritten.

## C. Prepare the next untouched prospective qualification (gated)
- Fresh **v4** cohort: 10 valuable (6 real-dev + 4 new fsm81) + 10 controls; **0 message-ID overlap**
  with v3/v2/B3/gh_mcp; 20/20 distinct text digests; 34 staged native spans (multi-span 04/05/06/09/10).
- Frozen pre-inference: manifest `9b64831e9f411e34680042d58dd0d08ca73cb47938974f77d15a20f121c0e55d`,
  label-freeze `b36680886c41410c4d314fa78f8f0ec300ee56d1d7515ac35e9219a9afcc984e`; fresh `state-v4`
  root; independent pre-inference ratification (0600, 20 ratified cases).
- Treatment: `--finite-batch on --novelty-policy recall --source-recovery on --resilient-discovery on
  --claim-evidence on --source-exact-complement on --balanced-dedup on --max-clusters 24
  --max-candidates 72 --max-seconds 3600` (chat-fast, unchanged).
- Launcher `a3-v4-host-ex-launcher.py` + `a3-v4-host-driver.mjs` (balancedDedup:true), provenance →
  `e31d22bb` (8 blobs), negative EX preflight PASS (marker-only `missing_lock_fd` / non-inherited
  `wrong_inode`), Hermes exempt, once-only preserved.
- Scorer `issue92-a3-score.mjs` validates the v4 freeze contract and **fails closed** at
  `insufficient_review_samples` (no simulated PASS) — unchanged acceptance thresholds (recall ≥9/10,
  grounded precision ≥0.90, useful ≥0.75 over ≥8 distinct, zero breaches, Wilson 95%).
- **Empty-group proof:** fresh `graphiti-adr92-a3-prospective-v4` = 0 episodes. `issue92-a3-stage.mjs`
  hard-pins `...v2` (now 13 v3 episodes) — Central must clear v2 or update the hard-pin before the
  gated v4 inference.
- Ready-to-run command (gated): `A3_HOST_APPROVED=1 python3 /tmp/opencode/issue92-a3/a3-v4-host-ex-launcher.py`.

## Return
Exact tested source SHA: `e31d22bbd4865d752a81995a457438c9d9904cde` (balanced-dedup `fea134e`).
Evidence commit SHA: see below (this packet). No model calls, Graphiti writes, historical replay,
group clearing, PR/merge, production activation, or Issue #92 closure in this campaign.

`RESULT=READY_FOR_ONE_FINAL_PROSPECTIVE` — Central can accept the corrected source verification +
new v4 source/label freeze and authorize the single final prospective inference.
