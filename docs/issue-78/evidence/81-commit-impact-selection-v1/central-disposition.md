# Central disposition — ISSUE81_COMMIT_IMPACT_SELECTION_V1

## Verdict

**PR89_HOST_REVIEW_READY = no.** The new exposed offline exact-source score is **12/16**, below the ratified **>=13/16** target, with one concrete generic predicate defect (S10). No new safety defect, no weakened fence, no forced 13/16. Per the controlling handoff, this packet reports the exact root cause and stops; no new diagnostic campaign and no local production rewrite were made.

## Exact root cause (S10)

Question (digest `8be465fd…`): asks what commit `52863ae` changed in the Graphiti test suite.

- Expected source `opencode:ses_e50efdb27ffep7alMZaj9wkl3x:tool:call_1e0445fde85fa221` (episode `0de3cdc8…`, fact digest `9f431c07…`) is the **commit subject line** (short-SHA-prefixed subject in `<sha> <scope>(<name>): <summary>` form). It is propositionally the answer, but `answerTypeSupport` scores it **0**: its summary verb ("reject") is not in the generic change-verb list, and the subject form carries no `fix/change/modify/update/add/remove/...` verb.
- The live incidental candidate `opencode:ses_e50efdb27ffep7alMZaj9wkl3x:tool:call_0485ce2600ec5dba` (episode `c059ab8f…`, fact digest `607cedac…`) is a **worktree-setup command sequence** (a `git -C <path> worktree add` invocation chained with `rev-parse`/`status` calls, whose output echoes the commit subject) that merely mentions the commit. It scored **answerType=1** because:
  1. the procedural fence `git\s+(?:worktree|checkout|rev-parse|switch|fetch|clone)` requires `git worktree` **adjacency**, so the `git -C <path> worktree` form evades it (`isProcedure=false`);
  2. the change-verb list matches the word **"add"** inside "worktree add" (`describesChange=true`).
- Both facts are eligible at equal priority; the new `answerType` sort key then selects the incidental worktree command over the expected commit subject.

The defect is **generic, not benchmark-specific**: any `git -C <path> worktree …` (or `git -C <path> checkout …`) fact in a commit-effect query receives the spurious answer-type bonus, while commit-subject facts (the natural "what did X change" answer) receive none. S10's expected fact is present **only via the curated index route** (absent from the live d24 Graphiti facts), so the miss is observable in the exposed `Memory.search` path even though the staged pairwise unit tests (which use adjacent `git worktree` forms) pass.

**Bounded correction scope for Central (suggestion, not applied):** extend the `isProcedure` fence to catch `git -C <path> worktree/checkout/…` forms (e.g. `git\s+(?:-C\s+\S+\s+)?(?:worktree|checkout|rev-parse|switch|fetch|clone)`), and/or require the change-verb match to occur outside a `worktree add` compound; optionally treat commit-subject facts (`<sha> <scope>(<name>): …`) as describing the change. Verify with the existing adversarial negatives (wrong product/Issue/numeric, N01–N04) and re-run this same exposed replay; no fence relaxation, no source-ID preference, no deadline change.

## Unchanged correctly-guarded failures (S03/S05/S13)

All three fail `NAMED_IDENTITY` on the assertion **and** with the `sourceContext` excerpt (`linkedUsed=false`; fact+excerpt eligible=false). The relaxed alias/acronym paths (structured `*DB` identifier, 2–4-letter acronym with ≥2 shared opaque identifiers + topical support) did **not** promote them. Selected sources are other fence-passing facts. These are the intended hard named-entity coverage fences, not regressions.

## N02 (frozen negative)

Injection observed, identical to the previously adjudicated frozen fact `1afbcca0…` (`opencode:ses_e508c6d53ffeWrJEJftz60lqXB:message:msg_1af753f0…`, assistant-reported): stored in `development-knowledge` **about** the superseded `ghdev_gh_mcp` group. Per the admission causal trace: "N02 remains frozen FAIL_INJECTED and no cross-group leakage is inferred from a fact discussing a former group." Not a new wrong-group/private/authority-upgrade injection; reported for completeness, not re-adjudicated here (human precision remains UNVERIFIED; no new worksheet initiated).

## Safety and provenance

- No new wrong-group/private/authority-upgrade injection: all selections group-pure, persisted, and confirmed live in the untruncated group-pure `get_episodes` readback (227/227; 16/16 roster UUIDs).
- `sourceContext` and `remoteEpisodeUuid` omitted from every output entry; single-fact output; honest temporal labels (S06 `historical/superseded` PASS); `safeText` secret fence verified (N03 prompt vetoed pre-remote).
- Latency: e2e p95 299 ms (≤300 ms process-level), max 597 ms from one cold d24 search (514 ms in a 151–161 ms band) — a candidate tail risk, deadline **not** increased; `HOOK_P95=UNVERIFIED` (native 300 ms hook instrumentation not directly observed in this diagnostic run).
- Tests/fences: focused 67/67 + provenance 48/48, exit 0; syntax 13/13; fences and 24-candidate/one-fact bounds confirmed unchanged in source.

## Historical scores (preserved, not replaced)

original frozen **8/16** · post-S06 native **9/16** · prior exposed offline **12/16** · **this run 12/16** (new exposed offline diagnostic, not native acceptance).

## Readiness

- `HOST_REVIEW_READY = no` (score 12/16 < 13/16 with the S10 predicate miss).
- `HUMAN_PRECISION = UNVERIFIED` (126-fact worksheet `PENDING_OPERATOR_ADJUDICATION`, all verdicts null).
- No merge, no production installation, no issue closure, no new PR. Central may: (a) dispatch the trusted exact-head `repository-final-v1` verify for the candidate head, (b) apply the bounded S10 fence correction on the PR branch and re-dispatch this same qualification, (c) adjudicate the 126-fact worksheet.
