# GHDEV-10 — command-shape friction log (A3 freeze + scorer correction)

## 1. Private manifest mode 0644 vs required 0600
- The repo-staged `issue92-a3-stage.mjs` rejects a private manifest whose group/other bits are
  set (`(mode & 0o077) != 0` → `private_manifest_permissions`). The frozen private manifest was
  `0644`.
- Resolution: `chmod 0600` the private manifest (host-side, not a source change) before the
  CPU-only stage run.

## 2. Combined `rm -rf` + `mkdir` + `node` hit the consent gate
- A single command that removed the old state dir, created the fresh one, and ran the stage
  was blocked by the consent mechanism (no user response within the window).
- Resolution: split into a read-only existence check, a separate `mkdir -p` + roster copy, and
  the standalone `node issue92-a3-stage.mjs` invocation.

## 3. Multi-span native capture (43 events from 20 cases)
- The old evidence-only `a3-v2-stage.mjs` sliced each native turn to a head window (≈1090
  chars) and produced exactly one event per case. The corrected
  `issue92-a3-native-source.mjs` rebuilds each case through `fromPromptCandidates` with
  whole-input privacy checking and bounded multi-span segmentation, so the 6 long PR/issue
  sources (i92-v2-05/06/10 → 6 spans, i92-v2-07/08 → 4, i92-v2-09 → 3) emit up to 6 bounded
  spans each. Total: **43 events from 20 cases** (≤6/case enforced). This is the intended
  "bounded multi-span handling"; the stage receipt records the case→span map.

## 4. H2–H4 nonoverlap identity availability
- H2/H3/H4 are cronparse/firecrawl multi-family holdout cohorts whose case-level source
  identities are stored as **private-digest locators** (corpus files 0600, not present on the
  host). A byte-level digest crosscheck against them is therefore **unverifiable on this
  host**; nonoverlap is established by distinct family + H2's recorded 0-overlap with gh_mcp +
  A3 v2 being genuinely-new native turns. B3 and gh_mcp nonoverlap IS exact (session/message
  ID sets + text-digest vs the private gh_mcp holdout corpus).

## 5. EX negative preflight via inherited-stdout bridge
- The positive EX branch runs the Node probe inside the bridge (inherited stdout), so the
  probe's `ADMITTED` print is not captured on a pipe. The preflight records the positive
  outcome by rc==0 (admitted) and writes the full result to
  `a3-host-ex-preflight.json` (file-based, survives the inherited-stdout bridge).
