# Issue #75: one bounded host evidence publication (no new implementation campaign)

The user explicitly authorized local-agent publication of inspectable evidence
to the EXISTING GitHub working branch, \`issue/75\`, to let Central finish its
own relevance-policy design. This narrow exception supersedes earlier
"no GitHub writes" instructions **only for the exact files below**. Do not
open a PR, merge, deploy, modify Graphiti/OpenViking production state or
push implementation changes. This is not authorization for arbitrary GitHub
writes, a new feature slice, or manual model/LLM reconfiguration.

## Why

The previous handback contained aggregate lexical P/R 0.60/0.60 but not raw
query-to-fact matches and real reranker scores. Central has inspected the
user-attached \`final-diff.binary\`, \`plugin-behavior.test.mjs\`, and
\`extraction-profile.md\`. Those match reported SHA256:
- first campaign diff: \`39c2e54c1206634910362c187ffb8e2736707ba986c56195fb2d533d8aa3b338\`
- plugin behavior test: \`295bb0c5dbf45ad84a4f83f9c3c4c0cd3a8504f4261640f2ef5a576f5b6d8def\`
- extraction profile: \`cf9a09969eac8c698b0bce707ea7fff06484f227c1e8a1ccc88fc6332cec3865\`

Do not apply the older diff or revive its resubmit shortcut. The current
branch already contains corrections to Graphiti UUID/name, V2 tool-result
shape, journal-only capture and post-exit admission.

## Operator setup

From an existing clean repository checkout, fetch the exact remote issue/75
ref, verify its SHA against the SHA supplied in the current operator kickoff,
and prepare a NEW isolated Git worktree based on it with a temporary LOCAL
evidence branch. Do not switch, reset, clean, or overwrite the earlier
\`/tmp/ghdev-issue75.BuzBwKeu/worktree\` worktree or any previous host
evidence directory. Launch the stock V2 \`build\` primary in the new
prepared worktree through the normal OpenViking-aware launcher.

## Local Build execution

1. Inspect all three earlier host files where they were created, normally
   \`/tmp/ghdev-issue75.BuzBwKeu/worktree/docs/issue-75/v2-candidate/\`
   for \`plugin-behavior.test.mjs\` and \`extraction-profile.md\`, and
   \`/tmp/opencode/issue75-evidence/final-diff.binary\` for the first diff.
   Authenticate the above SHA256; if missing, search ONLY the named prior
   temporary evidence roots. Keep the original files untouched. Copy only
   the verified \`plugin-behavior.test.mjs\` and \`extraction-profile.md\` into
   their SAME candidate source paths in the new worktree.
   The old \`final-diff.binary\` is already reviewed and need not be committed.

2. Run \`node --check\` on the centrally staged
   \`docs/issue-75/v2-candidate/collect-relevance-evidence.mjs\` and the
   copied test; execute \`node --test\` on the copied test and other focused
   source tests if available. Do not modify the current relevance production
   threshold or candidate functionality to fabricate improved scores.

3. Search the named old evidence roots for the previous frozen query results
   and holdout JSON. Common prior locations:
   \`/tmp/opencode/issue75-evidence/\` and
   \`/tmp/opencode/issue75-b75/\`. Prefer the existing files and preserve
   their exact case IDs, scoring provenance and observed differences.
   The prior first-campaign \`baseline-results.json\`,
   \`candidate-results.json\` and \`benchmark-evaluation.json\` are worth
   copying if found and sanitized. If the holdout queries are not recoverable,
   report \`holdout_not_found\`; do not invent their prior scores, query
   strings or labels. Do not trawl broad unrelated user directories.

4. Run the centrally authored READ-ONLY collector against the existing
   disposable \`g_issue75_test\` group and private journal, using the
   actual installed Graphiti and independent CPU reranker endpoints.
   Example known bindings from the second handback (authenticate live):
     node docs/issue-75/v2-candidate/collect-relevance-evidence.mjs \
       --group g_issue75_test \
       --state-dir /tmp/opencode/issue75-b75/state-b75 \
       --graphiti-endpoint http://127.0.0.1:8766/mcp \
       --rerank-endpoint http://127.0.0.1:8004/v1/rerank \
       --output /tmp/issue75-rerank-evidence-UNIQUE.json
   Optional \`--holdout-file ABS_PATH\` only if the original holdout query
   fixture is recovered, inspected and structurally compatible. Use a fresh
   unique output path because the script refuses overwrite. The collector
   calls ONLY \`get_episodes\`-independent local journal read,
   \`search_memory_facts\` and read-only reranker HTTP, no \`add_memory\`.
   No Qwen extraction, second scheduler, production group or graph mutation.

5. Independently check raw outputs for credentials, tokens, private-source
   content, personally identifying details, arbitrary source-file bodies,
   unredacted local filesystem paths, or other data unsuitable for the
   public GitHub repository. The collector refuses common sensitive input,
   but is not a universal PII sanitizer. If an unsafe fact appears, redact
   ONLY the sensitive field in the publication copy, count the redaction
   and preserve the raw original privately. Do not sanitize scores, candidate
   order or errors in a way that conceals a quality defect. Verify that
   the file contains the actual seven frozen cases, raw per-fact rerank scores
   or explicit per-case rerank error, group and remote-episode attribution.
   A missing/failed model result is evidence of a failure, not permission to
   invent replacement facts or ranking.

6. Materialize ONLY the following allowed paths in the prepared checkout:
   - \`docs/issue-75/v2-candidate/plugin-behavior.test.mjs\`
   - \`docs/issue-75/v2-candidate/extraction-profile.md\`
   - \`docs/issue-75/evidence/20261101-reranker-observations.json\`
   - \`docs/issue-75/evidence/20261101-evidence-summary.md\`
   - Optional independently inspected sanitized originals under
     \`docs/issue-75/evidence/20261101-old-*.json\` and
     \`docs/issue-75/evidence/20261101-holdout-queries.json\`.

   Evidence summary: source HEAD, original filenames and SHA256,
   selected group/journal identity, Graphiti/reranker versions if available,
   case count, holdout recovered/missing, privacy redaction count, execution
   exit code, limitations. Do not publish raw request logs, entire journals,
   provider secrets/config, unrelated source trees or production memory.

7. **One allowed evidence-only GitHub mutation:** inspect \`git status\`
   and the COMPLETE staged diff, confirm only the listed paths,
   verify \`git diff --cached --check\`, then inspect the live remote
   \`refs/heads/issue/75\` again. It MUST still match the operator-authenticated
   source SHA; if it advanced, STOP and report (do not force push, rebase,
   overwrite or silently resolve changes). Commit once locally, push
   fast-forward to **\`refs/heads/issue/75\` only** (no new remote branch),
   and read back exact remote SHA to verify the update. Do not use
   \`--force\`, \`--force-with-lease\`, PR creation or merge.
   Do not modify source code for this publication; this is artifact delivery.

8. Return immediately after the evidence-only push: exact commit SHA,
   GitHub links to results/summary/test/profile, frozen/holdout coverage,
   score ranges and notable wrong answers, test failures, and current source
   integrity. Central will independently inspect those public branch files
   and author the substantive relevance fix. If push authority or safe
   publication is blocked, retain files locally and provide exact paths and
   hashes, without using a denied route to bypass the guard.

## Evidence report fields

RESULT=PASS|PARTIAL|BLOCKED|FAIL
START_SOURCE_SHA=<40 hex>
PUBLISHED_SOURCE_SHA=<40 hex or NONE>
PUBLICATION_PATHS=<exact allowlisted paths>
ATTACHED_ARTIFACT_INTEGRITY=<full sha256>
LOCAL_TESTS=<commands+counts>
COLLECTOR=<group, journal, reranker, case counts and errors>
FROZEN_RESULTS=<readback link>
HOLDOUT=<recovered/missing; actual link when recovered>
PRIVACY=<inspection and field-redaction counts>
GITHUB_WRITE=<fast-forward push/readback or explicitly blocked>
SOURCE_MUTATIONS=none
COMMAND_SHAPE_FRICTION=<canonical GHDEV-10 schema, even if none>
