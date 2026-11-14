# Issue #92 — A3 freeze ratification · consolidated handback

`RESULT=A3_FREEZE_RATIFIABLE`

## SOURCE_HEAD
`0a009e844a3470fca550158ca84b4328f3b7d50a` (local == remote, fast-forwarded from the S6
evidence commit `9c6126c`; no source mutation, no PR/merge/deploy/issue closure).

## NATIVE_TESTS (actual exits/counts)
- `node --check` ×5 (native-source, stage, acceptance, acceptance.test, score): **all exit 0**
- `node --test issue92-a3-acceptance.test.mjs`: **12/12 pass, exit 0** (the 12 prospective
  regressions: native identity, long-source tail, whole-input privacy veto, 9/10 useful pass,
  session-only miscredit, operator-pending labels, post-intent ratification, missing fact
  judgments, unsupported grounding, remote/quote auth, authority breach, duplicate inflation)
- `node --test finite-batch.test.mjs`: **56/56 pass, exit 0**
- `node --test claim-evidence.test.mjs`: **7/7 pass, exit 0**
- `npm run check`: **exit 0**
- `npm test`: **524/524 pass, exit 0, `OPERATIONAL_PLUGIN_TEST_RESULT: PASS`**

## PRIVATE_MANIFEST_SHA256
`a85941839f1f9dc7e04081829016aa3c38ef05e9a6f3c29ca58de8b53abbf5ca`
(private bytes == frozen; mode 0600).

## LABEL_DIGEST (frozen before model)
`bdfb7c6c7c025c572ba899094b94d1388c425e59189e395b38f5469968da3a58` (recomputed == published).

## SOURCE_VALIDATION
**20/20** original native IDs, content, time, workspace, privacy. Every case's
`session_id`/`message_id`/text-SHA-256/`source_locator`/`project`/`workspace`/`observed_at`
match the live native DB (`opencode.db`, v2). Roster rows match 20/20 (text/locator/label).
All 20 sources passed the whole-input native privacy scan; no credential/secret spans.

## SOURCE_EVENT_STAGING
`issue92-a3-stage.mjs` → receipt `issue92-a3-staged-v2`: **43 native spans from 20 cases**
(whole-input privacy-checked, bounded ≤6/case). Multi-span: i92-v2-05/06/10 = 6, i92-v2-07/08 =
4, i92-v2-09 = 3, remaining 14 = 1. All `source_ref` = `opencode:…`; case→source-ref/event-id
map in `a3-v2-staged.json`. Frozen digests preserved (manifest `a8594183…`, label `bdfb7c6c…`).

## EXPOSED_DISPOSITION
S6 is settled/published (evidence commit `9c6126c`); its 8/16 valuable-target coverage remains
below S2/S3's 9/16 and is **not** retroactively called a functional PASS. **No new exposed
inference** in this assignment.

## SANITIZED_CENTRAL_RATIFICATION
10 bounded original-source-backed predicates + 10 controls in
`a3-v2-central-review-packet.json` (bounded 25–450-char quotes; no credentials, no entire
messages, no raw logs, no source-private file contents). Independent pre-inference
ratification of all 20 labels frozen at 0600
(`issue92-a3-v2-ratification.json`; original_source/temporal/privacy/label_confirmed all
true, `completed_at` before any model intent).

## NONOVERLAP
- **B3 24-cluster**: 0 session / 0 message (exact ID sets).
- **gh_mcp 20-case**: 0 session / 0 message / 0 text-digest (vs private `issue92-holdout-corpus.json`).
- **H2–H4**: byte-level digest crosscheck **UNVERIFIED on host** (private corpus files absent);
  established by distinct cronparse/firecrawl families + H2 receipt's 0-overlap with gh_mcp +
  A3 v2 being genuinely-new native turns.
- Raw opportunity denominator: 1,113 genuinely-new native turns / 619 sessions.

## A3_GROUP
`graphiti-adr92-a3-prospective-v2`: **0 remote episodes** (untouched; staging is CPU-only).

## A3_EXECUTION_PREPARED (host-only command, NO inference yet)
Launcher (gated): `A3_HOST_APPROVED=1 python3 /tmp/opencode/issue92-a3/a3-host-ex-launcher.py`
— canonical EX bridge (`004188b1…`), Hermes harness-exempt, once-only marker
(`/tmp/opencode/issue92-a3/.a3-host-ran`), bounded positive reconcile, no replay. Driver is
bound to source head `0a009e8` (`a3-host-provenance.json`). Gated preflight confirmed:
`A3_HOST_APPROVED` unset → "gated, no inference". Negative EX preflight PASS (marker-only
`missing_lock_fd`; non-inherited `wrong_inode`; positive ADMITTED) → no model/Graphiti call
without the admitted inherited fd.

## A3_SCORER_READY
Acceptance gate = `docs/issue-91/adr-acceptance/issue92-a3-score.mjs` (fact-level independent
adjudication; 12/12 tests green). Old session-based `a3-v2-scorer.mjs` superseded, no longer
an authority. Exact 8-arg command + input statuses in `a3-scorer-inputs.json`:
READY = roster, staged, state-root, group, ratification; post-inference = remote readback,
fact adjudications (one independent verdict per persisted fact — missing = block to PASS),
authority audit (EX/replay/write/privacy/group/verified + `first_model_intent_at` after
ratification). Exit 0 = measured PASS, 3 = measured FAIL. Independent fact-ledger contract
enforced (duplicates don't count; session match never earns credit; persisted ≠ grounded).

## COMMAND_SHAPE_FRICTION
See `a3-command-shape-friction.md`: (1) manifest 0644→0600; (2) `rm -rf`+`mkdir`+`node`
consent split; (3) 43-span multi-span native capture; (4) H2–H4 identity availability;
(5) EX inherited-stdout bridge file-based preflight.

## Disposition
The A3 prospective freeze is **ratifiable**: source/label digests verified, 20/20 native
identity + nonoverlap audited, labels independently ratified pre-inference at 0600, corrected
staging (43 native spans) and corrected fact-level scorer integrated and preflighted, A3 group
empty, and the host execution prepared + gated. Central can approve the already-prepared
launcher (`A3_HOST_APPROVED=1`) to run the single A3 prospective inference, then independently
review the terminal prospective scorecard — no further development/setup handoff.
