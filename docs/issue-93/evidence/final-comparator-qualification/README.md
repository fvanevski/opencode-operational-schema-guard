# Issue #93 — final B2.2 qualification (comparator-recovery exception)

Authority: `LOCAL_AGENT_CONTRACT_COMPARATOR_RECOVERY_FINAL.md`,
`APPROVED_PROSPECTIVE_ACCEPTANCE.md`, `APPROVED_LIMITED_HOLDOUT_COMPARATOR_RECOVERY.md`.
Target head: `402a59bff76645491eb48be830d54196a9a95553` (issue/93, authenticated).

## RESULT

`COMPARATOR_PASS_ANSWER_UNVERIFIED`

- **Comparator gate: PASS (relative, nonnegative)** under the operator-approved
  one-time post-exposure method exception. **Native context association:
  SHOWN.** **Clean isolated answer-benefit: UNVERIFIED.**

This is HOST qualification only. It is NOT PR review, merge, deployment, or
issue closure.

## Stage A — provenance (PASS)

- Original semantic `69014b739d490f8cb90bce86233edf3054673209` and B2.2
  `4bc169cc59e8900f5dc3cd4d3c70a22d0fcfb9f4` precede holdout exposure; the B2.2
  change is isolated to `semantic-recall.mjs` (semantic-only).
- **Strict control `relevance.mjs` byte-identical** across both trees
  (`85b52e16…`); `memory-core.mjs`, `sourced-recall.mjs`,
  `curated-recall-candidates.mjs` identical. No code/threshold/query/cohort
  substitution after exposure.
- **Frozen identities all verify** (`snapshot-hash-receipt.json`):
  dev `3e799c46…`, sealed-holdout `3f9eaebb…`, snapshot `dc597c69…` (reproduced
  with the exact `SHA256(UTF8(JSON.stringify(joined-string)))` formula). The
  earlier "fingerprint broken" reading was a method-mismatch artifact
  (superseded by `CENTRAL_SNAPSHOT_HASH_ERRATUM.md`).

## Stage B — comparator recovery (PASS, post-exposure exception)

`comparator-replay.json` (labeled `POST_EXPOSURE_COMPARATOR_APPROVED_EXCEPTION`,
not `PRE_EXPOSURE_PAIRED_TEST`):

| case | original semantic | B2.2 (once-only) |
| --- | --- | --- |
| H01 | source-exact yes | yes |
| H02 | no | no |
| H03 | no | no |
| H04 | no | no |
| HN01 (off-topic) | 4 | 4 |
| HN02 (secret) | 0 | 0 |

No lost original-semantic positive, no new off-topic/unsafe injection. B2.2
reproduces the once-only recorded outputs exactly (1/4 positives, HN01=4,
HN02=0). The comparative gate is **PASS (relative, nonnegative)**; absolute B2.2
utility remains 1/4 + HN01=4.

## Stage C — native utility (association SHOWN, benefit UNVERIFIED)

`answer-proof.json`: an isolated single-plugin, all-tools-denied, fresh
standalone run (serial memory-off then memory-on, single local `local/chat`
engine) on a non-git-history development-knowledge fact.

- **Native context association: SHOWN** — the memory-on answer cites a Graphiti
  source-attributed observation ("The data physically lives in the
  development-knowledge graph (35 nodes) while graphiti_live has 0 nodes") that
  the memory-off control did not attribute to Graphiti.
- **Clean isolated answer-benefit: UNVERIFIED** — the control leaked the node
  count via a non-Graphiti channel (session/OpenViking not fully gated in this
  harness) and the edge-count fact was not selected, so no clean numeric delta
  is isolated. Native hook p95=299.77ms (≤300), 14/20 injected with source
  attribution, late/error/empty retained; search p95=159.31ms, get_episodes
  p95=45.67ms.

## READY_FOR_FINAL_OPERATOR_RUN (clean answer benefit)

One bounded, fully isolated operator run that gates **OpenViking + session
memory + all tools**, uses a Graphiti-only non-git-history fact not previously
seeded, adjudicates the answer/source receipt privately before the two runs, and
runs memory-off then memory-on serially on the single local engine:

```
off=$(mktemp -d); on=$(mktemp -d)
# single-plugin no-tools configs (answerprobe agent, deny-all tools; gate OpenViking + fresh session)
#   prompt: a Graphiti-only development fact NOT derivable from git/GitHub/search
cd "$off" && opencode run --standalone --session "new-off-$(date +%s)" "<prompt>"   # control: expect NO fact
cd "$on"  && opencode run --standalone --session "new-on-$(date +%s)"  "<prompt>"   # enabled: expect sourced fact
# private adjudication: enabled cites the injected Graphiti fact; control does not; no tool/fixture/git channel
```

Do not claim PASS from the in-harness run; the clean isolated answer benefit
remains an operator-gated step.

## Boundaries honored

No production source/test/CI/Graphiti/ReviewStore/config change; no new branch,
PR, merge, deployment, or issue closure. One sanitized evidence-only commit on
the existing issue/93 branch. Raw source refs, UUIDs, private queries, and
unredacted logs are not published. Original holdout/adjudication/erratum
documents are retained unchanged.

## Remaining acceptance gaps

1. Clean isolated model-answer benefit (OpenViking/session fully gated) —
   UNVERIFIED; needs the operator run above.
2. Formal independent exact-head PR review, trusted Actions, and merged-main CI
   — Central-owned subsequent steps (no PR exists).
3. Issue #94 owns final installed two-memory coexistence.
