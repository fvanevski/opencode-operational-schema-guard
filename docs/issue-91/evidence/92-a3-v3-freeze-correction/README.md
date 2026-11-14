# Issue #92 — A3 v3 prospective freeze correction (evidence-only)

PRIMARY_AGENT=Hermes (build) · REPO=fvanevski/opencode-operational-schema-guard · BRANCH=work/91-memory-utility-r1
CURRENT_VERIFIED_HEAD = `40412563f1e3f914ad4a77fc113b64036be3ae77` · MODE=CPU_ONLY · MODEL_INFERENCE=FORBIDDEN · GRAPHITI_WRITES=FORBIDDEN

Sanitized, evidence-only publication for the **corrected A3 prospective freeze** (`gh_mcp-development-v3`).
The v2 freeze (`92-a3-freeze-ratification/`) is retained as **rejected historical evidence**. No source
algorithm change, no scorer weakening, no S6 reopen, no new campaign, no inference, no Graphiti writes.

## Result

`RESULT=A3_FREEZE_READY_FOR_CENTRAL_APPROVAL`

- **Source-label mismatch corrected.** 7 of the 10 v2 valuable targets were questions
  (v2-03, v2-04) or unexecuted instructions (v2-05/06/08/09/10) — not source-stated durable facts.
  They are **replaced** with 7 genuinely source-supported technical predicates (operative
  constraints/decisions/stated facts) from previously-unused native events. v2-01/02/07 (genuine
  stated facts/decisions) and the 10 v2 controls are retained.
- **New immutable pre-inference freeze** — 10 valuable + 10 controls, original identities/hashes,
  predeclared predicates, bounded 25–450-char quotes, reviewable label rationale.
  `PRIVATE_MANIFEST_SHA256 = 7b96a107…`, `LABEL_FREEZE_SHA256 = 96b9e51e…`.
- **Exact nonoverlap** vs B3 (0/0/0) and gh_mcp (0/0/0, incl. text-digest); 7 new cases genuinely new.
  H2–H4 byte-level digest crosscheck marked **UNVERIFIED** (private corpus files not on host) —
  family difference NOT substituted for proof.
- **Fresh state root** (`state-v3`) + **group** (`graphiti-adr92-a3-prospective-v2`, 0 episodes),
  corrected `issue92-a3-stage.mjs` staging → **26 native spans from 20 cases** (whole-input
  privacy-checked, bounded ≤6/case); frozen digests preserved.
- **Host driver source binding repaired** at the current verified head (`4041256`); all 7
  execution-source blobs bound (on-disk == committed == provenance); canonical EX negative
  preflight PASS (marker-only → `missing_lock_fd`); once-only/non-replay preserved. No repo
  source/test change.
- **Central fact-level scorer** (`issue92-a3-score.mjs`) verified to accept the v3 input contract
  and **require independent post-inference judgments** (fails closed at
  `insufficient_review_samples` pre-inference — no simulated fact approvals).
- **Zero-inference / zero-Graphiti-write** proof: A3 group 0 remote episodes, no host marker, no
  driver result file, staging CPU-only.

## Files

| File | Purpose |
|------|---------|
| `a3-v3-central-review-packet.json` | Sanitized 10 valuable (bounded quotes) + 10 controls (reason + hash), scope, source digests, nonoverlap, v2 supersession. |
| `a3-v3-native-source-audit.json` | Classification of the 7 rejected v2 valuable + 3 retained + 7 new, privacy exclusion, nonoverlap, ratification, group-0 proof. |
| `a3-v3-sanitized-roster.json` | Frozen 20-case roster (manifest `7b96a107…`, label `96b9e51e…`). |
| `a3-v2-staged.json` | `issue92-a3-staged-v2` receipt: 26 native spans, case→span map, multi-span counts, frozen digests. |
| `a3-host-provenance.json` | Host driver source binding at `4041256` (per-file blob SHAs + bridge blob `004188b1…`). |
| `a3-host-driver.mjs` / `a3-host-ex-launcher.py` | EX-kernel A3 driver + gated launcher (v3 state root, current head, once-only). |
| `a3-host-ex-preflight.py` / `.json` | Negative EX preflight: marker-only `missing_lock_fd`, non-inherited `wrong_inode`, positive ADMITTED. |
| `a3-v3-scorer-inputs.json` | Exact 8-arg `issue92-a3-score.mjs` command + READY/post-inference input statuses + templates. |
| `a3-host-launcher.log` | Gated launcher preflight (no inference). |
| `a3-command-shape-friction.md` | GHDEV-10 friction log. |
| `a3-handback.md` | Consolidated handback. |

Private (0600, host-side, referenced by digest): `issue92-a3-v3-corpus.json` (manifest),
`issue92-a3-v3-ratification.json`, and the post-inference scorer templates
(`issue92-a3-v3-{remote-readback,fact-adjudications,authority-audit}.json`) under
`/home/filip/.local/state/ghdev-graphiti-issue92/private/`.
