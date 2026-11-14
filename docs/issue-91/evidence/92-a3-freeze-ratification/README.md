# Issue #92 — A3 prospective freeze ratification + corrected scorer (evidence-only)

PRIMARY_AGENT=Hermes (build) · REPO=fvanevski/opencode-operational-schema-guard · BRANCH=work/91-memory-utility-r1

Controlling contract: `docs/issue-91/adr-acceptance/ISSUE92_A3_FREEZE_SCORER_CORRECTION_HERMES.md`
Authenticating source HEAD = `0a009e844a3470fca550158ca84b4328f3b7d50a`

Sanitized, evidence-only publication for the **A3 prospective freeze ratification** and the
integrated corrected staging/scoring architecture. No A3 inference, no Graphiti writes, no
source mutation. The private 20-case manifest, the pre-inference ratification receipt, and the
post-inference scorer inputs (remote readback, fact adjudications, authority audit) remain
host-side at 0600 under `/home/filip/.local/state/ghdev-graphiti-issue92/private/` and are
referenced here by digest only.

## Result

`RESULT=A3_FREEZE_RATIFIABLE`

- Source HEAD authenticated: `0a009e8…` (local == remote). All native producers green.
- Private 20-case manifest reauthenticated: bytes SHA-256 `a8594183…` (== frozen), label
  digest `bdfb7c6c…` (== published); 20/20 roster rows + 20/20 live-native-DB identity match.
- Independent pre-inference ratification of all 20 labels frozen at 0600
  (`issue92-a3-v2-ratification.json`); A3 group `graphiti-adr92-a3-prospective-v2` **0 remote
  episodes** (untouched).
- Corrected staging integrated: repo `issue92-a3-stage.mjs` produced receipt
  `issue92-a3-staged-v2` — **43 native spans from 20 cases** (whole-input privacy-checked,
  bounded ≤6 spans/case), fresh state root, frozen digests preserved.
- Corrected acceptance gate = `issue92-a3-score.mjs` (fact-level independent adjudication);
  the old session-based `a3-v2-scorer.mjs` is superseded and no longer an authority.
- Host-local A3 driver/launcher re-bound to `0a009e8`; EX negative preflight **proves a
  marker-only launch fails closed** (`missing_lock_fd`) and cannot call model/Graphiti.
- A3 execution prepared and gated (`A3_HOST_APPROVED=1`); **no inference yet**.

## Files

| File | Purpose |
|------|---------|
| `a3-v2-central-review-packet.json` | Sanitized 10 valuable (bounded 25–450-char original-source quotes) + 10 controls (reason + hash), scope, source digests, nonoverlap. |
| `a3-native-source-audit.json` | Task B audit: manifest SHA, label digest, live-DB 20/20 identity, nonoverlap (B3/gh_mcp exact; H2–H4 basis), ratification, group-0 proof. |
| `a3-v2-staged.json` | `issue92-a3-staged-v2` receipt: 43 native spans, case→source-ref/event-id map, multi-span counts, frozen digests. |
| `a3-host-provenance.json` | Host driver source binding at `0a009e8` (per-file blob SHAs + bridge blob). |
| `a3-host-driver.mjs` | EX-kernel A3 driver (0a009e8-bound, S6 complement flags). |
| `a3-host-ex-launcher.py` | EX-gated A3 launcher (flock + harness-exit + quiet-grace + scheduler-idle + no-unresolved; once-only; gated on `A3_HOST_APPROVED=1`). |
| `a3-host-ex-preflight.py` / `.json` | Negative EX preflight: marker-only → `missing_lock_fd`, non-inherited → `wrong_inode`, positive → ADMITTED (no model/Graphiti call without the admitted inherited fd). |
| `a3-scorer-inputs.json` | Exact 8-arg `issue92-a3-score.mjs` command + READY/post-inference input statuses + template schemas (remote, adjudications, authority). |
| `a3-host-launcher.log` | Gated launcher preflight (no inference). |
| `a3-command-shape-friction.md` | GHDEV-10 command-shape friction log. |
| `a3-handback.md` | Consolidated handback (test exits, hashes, ratification, staging receipt, scorer inputs, untouched-group proof, friction). |
