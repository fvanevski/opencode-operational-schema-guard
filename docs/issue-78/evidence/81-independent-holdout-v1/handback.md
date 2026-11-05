# Handback — Issue #81 independent holdout, Phase B (cron-acceptance cohort)

**Packet:** `81-independent-holdout-v1` · campaign `ISSUE81_INDEPENDENT_HOLDOUT`

```text
CAMPAIGN=ISSUE81_INDEPENDENT_HOLDOUT
PHASE=B
RESULT=PARTIAL
REPO_ID=fvanevski/opencode-operational-schema-guard
PR=83
TESTED_SOURCE_SHA=3271a97be43d25f6646a63cce71fc0e907fd1059
REMOTE_HEAD_BEFORE=3271a97be43d25f6646a63cce71fc0e907fd1059
REMOTE_HEAD_AFTER=<full SHA of this packet commit, recorded in the session handback>
CORPUS_PRIVATE_SHA256=524de3ff36877442c6dc4e75edf5da9f317ba1c2e25e267b117233514e425863
HOLDOUT_INDEPENDENCE=operator-approved-before-results
SOURCE_CASES=24 (48 native envelopes census; 22 staged, 2 excluded controls: ho2-cred-fake, ho2-wrong-scope)
CASE_LABELS=f6241a46ce66f2d3d29b1eb4f81f31cb498472c6d03db5b65307cfc8f9ceddb1 (operator attestation, 2026-11-04T23:43:36Z, pre-result; 14 valuable / 10 non-valuable)
TARGETS=17ffb60515f5f96f2d546fd3abf951d0bc008325e38d83145ec4f75a8c76f049 + 3e9581114047ac7416f6014a0dd6a57304dc5e5784efe39b176ced61fbb8626a
COMPARE=baseline(#75) 0/14 recall; broad(#79) 14/14 recall=1.00 (PASS >=0.85), precision 14/22=0.636; curator(#80) 3x DEFER, 0 facts, grounded precision UNVERIFIED (empty denominator)
EX=ghdev81-holdout-cc5349fc.service (oneshot, operator-started); admitted 2026-11-04T23:47:45Z; terminal 23:48:15Z; 3/3 clusters DEFER; 22/22 queue rows deferred; 0 persisted, 0 unresolved; no remote write attempted; 3 records reevaluate-flagged (rev 1->2) for the single authorized re-drain
MODEL=chat-fast (non-thinking, no reasoning_effort); 3 attempts / 0 calls / 3 errors (private env file missing /v1/chat/completions path; fixed, original preserved: orig 41840c38... / fixed 265a1dbe...); 0 tokens; 0 ms
GRAPHITI=cur81_holdout_cc5349fc 0 episodes (no UUID/source-index/edges; consistent with 0 model calls); production ghdev_gh_mcp 4 episodes unchanged; historical cohorts unchanged (cur81_dev_ce555621=9, cur81_native_a1f3c9d7=12, cur80_* =1 each)
HUMAN_FACT_VERDICTS=FACTS_A_ACCEPT_EMPTY_FACT_SET ratified 2026-11-05T00:01:09Z (private operator-fact-review-cron.json); single bounded re-drain authorized (7 conditions, all prepared); fact-signed worksheet 19f21b9db8e2a2ebda7a76f9d300bf1b35093d286c745a8c0a36ebcde587d59b (original labels verbatim, 0 fact verdicts)
QUALITY=recall PASS (1.00 >= 0.85, frozen); durable grounded precision UNVERIFIED (0 receipt-bound facts); usefulness UNVERIFIED (separate metric); negatives PASS (zero credential leakage / wrong group / false verified in observed controls); post-exit admission window 30s <= 900s PASS (persistence latency to be re-measured on re-drain positive readback); context latency UNVERIFIED_UNTIL_INSTALLED; semantic recall UNVERIFIED_UNTIL_FRESH_CLIENT
SOURCE_CODE_MUTATION=none (private env fixture fix only; digests recorded; no production source change proposed)
EVIDENCE_PUBLICATION=<full SHA of this packet commit on issue/81, path docs/issue-78/evidence/81-independent-holdout-v1/>
REMAINING_GATES=independent Central PR review; late Codex if available; authorized merge; main CI; fresh installed client + OpenViking coexistence (semantic recall >= 0.80, context p95 <= 300ms); operator post-exit re-drain start + fresh fact verdicts on any newly persisted facts
NEXT=Central accepts evidence and adjudicates remaining Issue #81 gates on PR #83; operator runs the single post-exit command (systemctl --user start ghdev81-holdout-cc5349fc.service) after all inference-holding harnesses have exited, then a fresh consolidated fact-review packet follows if model facts persist
```

## Operator-only post-exit command (single authorized re-drain)

```text
systemctl --user start ghdev81-holdout-cc5349fc.service
```

Preconditions: all inference-holding interactive harnesses exited (the EX lock
`$XDG_RUNTIME_DIR/openviking-agent.lock` free of interactive holders); unit file
unchanged; env file corrected (digest `265a1dbe…`); 3 records
`reevaluate_requested=true`. Fail-closed: if the remote outcome is ambiguous, preserve
the reconciliation contract and return evidence — no blind `add_memory` replay, no
forced lease release.

## What this packet does and does not establish

- **Establishes:** exact source identity; frozen corpus/worksheet/target identities and
  the source-locator-only correction (24/24 native identities + labels preserved, both
  digests retained); the terminal, unambiguous first-run drain state (3/3 DEFER, 22/22
  deferred, 0 remote writes); group-scoped Graphiti readback (0 episodes; production
  and historical groups unchanged); the frozen three-path matrix (recall PASS; durable
  precision UNVERIFIED); operator case/target/fact sign-offs; the prepared single
  re-drain.
- **Does not establish (genuinely outstanding):** model-to-Graphiti persistence
  latency (no positive readback exists yet); durable fact quality (0 facts);
  fresh-client semantic recall and installed context latency; Central independent
  review, merge, and issue closure.
