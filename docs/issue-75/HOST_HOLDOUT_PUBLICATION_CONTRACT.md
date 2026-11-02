# Issue #75: publish third-handoff raw holdout and tested local patch

**Authority:** narrow user-authorized GitHub evidence publication to the existing
\`issue/75\` branch. This explicitly overrides older "GITHUB_WRITES=no"
contracts ONLY for ONE evidence-only fast-forward commit of the allowlisted
files below. No PR, merge, production mutation, source/code change, broad
diagnostic campaign or new remote branch.

**Why:** The last Build handback reports 9/12 new holdout, with three distinct
failures, but the new fixture, raw results and host-local patch have not been
made inspectable to Central. Do not ask Central to infer missing queries or
score distributions from aggregate metrics. Central has already staged
the narrow, source-inspected RTK and JSON-quoted V2 input adapters.
**Do not attempt a substantive relevance implementation in this evidence task.**

## Starting identity and isolation

Source branch at kickoff: use exact SHA provided by operator, resolved by a
fresh GitHub \`refs/heads/issue/75\` read. Create a NEW isolated local worktree
from that SHA. Keep prior local qualification worktree
\`/tmp/ghdev-issue75-final.c8xbg34c/worktree\` unchanged: it has four
uncommitted host-fixed source files. Never reset, \`git clean\`, stash,
overwrite, cherry-pick, rebase or force-push that old worktree.

Validate installed source identity and independent services only as needed
to gather **read-only** evidence. The interactive Build agent must not submit
GPU Graphiti ingestion or launch another worker/scheduler. Its code work is
limited to the specified evidence files, not production source.

## Required collection

1. Locate and SHA256-verify the exact *pre-scored* holdout fixture
   \`/tmp/opencode/issue75-final-qual/new-holdout-queries.json\`.
   Reported SHA256:
   \`67e2a72888d561b3503c6c36543f6fd9cff3713b97af937868c041258586e470\`.
   The fixture MUST contain 12 questions and preserve their original IDs,
   wording, group and expected labels. If this hash fails, STOP and report
   instead of reproducing or rewriting the fixture.

2. Recover unmodified prior result files from ONLY the known paths under
   \`/tmp/opencode/issue75-final-qual/\` (and the prior worktree if linked):
   - \`new-holdout-live-holdout.json\` (raw live 12-case results)
   - \`frozen-live-results.json\` (7 fixed cases)
   - \`frozen-live-results-holdout.json\` (5 prior holdout)
   Preserve original scores, admitted IDs, timings, error fields,
   provenance and recorded order. If a named file is missing, mark it
   UNAVAILABLE rather than synthesize a replacement.

3. Obtain a fresh per-fact reranker score/candidate trace on the SAME frozen
   12-query holdout, including n2/n5/n6, via Central's existing
   \`docs/issue-75/v2-candidate/collect-relevance-evidence.mjs\`.
   From the new isolated worktree, execute after \`node --check\`:

       node docs/issue-75/v2-candidate/collect-relevance-evidence.mjs \
         --group g_issue75_test \
         --state-dir /tmp/opencode/issue75-b75/state-b75 \
         --graphiti-endpoint http://127.0.0.1:8766/mcp \
         --rerank-endpoint http://127.0.0.1:8004/v1/rerank \
         --holdout-file /tmp/opencode/issue75-final-qual/new-holdout-queries.json \
         --output /tmp/issue75-third-raw-scores-UNIQUE.json

   This is read-only (7 frozen plus 12 new holdout). Use a unique output file
   and check schema, source attribution, episode UUID, score and rank fields.
   Do not call \`add_memory\` or change the reranker/model configuration.
   The collection may use CPU ONNX reranking but must not run Qwen extraction.
   Note that newly collected scores may differ from the originally logged
   scores; label both datasets independently, NEVER overwrite historical
   results or imply they are identical.

4. Capture the full four-file local host patch in the old worktree with
   \`git diff --binary\` (tracked files only). Store it as an **evidence diff**
   in the new worktree under the allowlisted evidence folder; do not apply it
   to the new source. The SHA256 of every changed source file and the patch,
   original HEAD \`371919ea54c20a853e7747e32bcc42fae3453a86\`,
   and a list of differences already reconstructed centrally (RTK allowlist,
   quoted prompt wire) belong in the summary. No untracked \`__pycache__\`.
   This patch is for audit; Central must not infer host-tested parity solely
   from two independent implementations of the same reported behavior.

5. Privacy/scope review of all publication artifacts BEFORE staging.
   Redact only sensitive strings, credentials, local machine paths,
   customer/private text or private source bodies from a publication COPY,
   without altering relevance scores, case IDs, result ordering, semantics or
   judgments. Raw private evidence stays on the host. A complete code patch
   should not expose host secrets; if it does, remove/redact that text from
   published copy and record exactly what was omitted. Do not publish full
   journals, unfiltered model logs or service credentials. Prefer a short
   sanitized summary to giant redundant logs.

## Exact publication allowlist

Publish at most these paths on the preexisting remote branch:

- \`docs/issue-75/evidence/20261102-new-holdout-queries.json\`
- \`docs/issue-75/evidence/20261102-new-holdout-live.json\`
- \`docs/issue-75/evidence/20261102-frozen-live.json\`
- \`docs/issue-75/evidence/20261102-prior-holdout-live.json\`
- \`docs/issue-75/evidence/20261102-new-holdout-reranker-observations.json\`
- \`docs/issue-75/evidence/20261102-host-local-fixes.diff\`
- \`docs/issue-75/evidence/20261102-evidence-summary.md\`

The per-fact trace includes old frozen seven plus the new twelve; do not
mislabel its 19 total cases as a new 19-query holdout.

Summary must identify exact source and host SHA256, original and published
file hashes, privacy redactions, service endpoints/versions (nonsecret),
whether all 12 new questions are present, ranking candidates and
eligibility observations for n2/n5/n6 (including why the reported
\`0.0559\` vs \`0.0561\` scores nevertheless led to admission), measured
p50/p95 and output counters. No ungrounded explanations.

## One authorized GitHub publication

- Ensure target paths are absent/unmodified on the current remote branch.
- Inspect complete \`git status\`, \`git diff --cached\` and
  \`git diff --cached --check\`; only allowlisted evidence files may be staged.
- Re-read remote \`refs/heads/issue/75\` before committing. It must still
  equal the operator-provided SHA. If not, STOP; do not rebase, force, or
  silently merge concurrent work.
- Create ONE local evidence-only commit, then ONE ordinary fast-forward
  push to existing \`refs/heads/issue/75\` (not a new remote branch).
- Verify exact remote readback via \`git ls-remote\` and a fresh fetch.
  Do not create a PR or change source/production configuration.
- If GitHub mutation is blocked, preserve files locally, record exact
  paths/hashes and report. Never bypass repo guards with a different route.

## Post-exit extraction

Do not rerun the five pending Graphiti captures during this evidence task.
The previous post-exit procedure is a separate acceptance gate, not an
instruction to stop the shared \`:8766\` server on failure. The Qwen
extraction-only non-thinking alias still lacks a native Graphiti
end-to-end proof. Preserve source and pending evidence until Central
selects a safe bounded completion route.

## Required single handback

RESULT=PASS|PARTIAL|BLOCKED|FAIL
START_SOURCE_SHA=<full SHA>
PUBLISHED_SOURCE_SHA=<full SHA or NONE>
PUBLICATION_PATHS=<exact GitHub links>
OLD_HOST_PATCH=<path, diff SHA256 and changed-file hashes>
NEW_FIXTURE=<original SHA256, case count, preserved expected labels>
HISTORICAL_RESULTS=<original and published file SHA256>
FRESH_SCORES=<19-case collector, per-case error counts and distinct status>
COUNTEREXAMPLES=<n2/n5/n6 raw candidate IDs/rank/scores, signal causes>
PRIVACY=<checked paths, redaction count, omissions>
READ_ONLY_PROOF=<no Graphiti writes, model/gate unchanged>
GITHUB_WRITE=<fast-forward verified or explicit blocker>
SOURCE_MUTATIONS=none
COMMAND_SHAPE_FRICTION=<full GHDEV-10 fields; none if not encountered>
