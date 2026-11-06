# Central disposition — ISSUE81_GIT_PROCEDURE_SELECTION_V1

## Result

The centrally staged S10 correction at exact implementation head `5d6b285` (draft PR #89)
passes the complete host qualification:

1. **Deterministic qualification** — 13/13 `node --check`, focused suite 71/71 (producer
   exit 0), 10/10 generic order-independence/fence assertions. All handoff invariants hold:
   300 ms hook allowance, single-fact output, safeText, 24-candidate bound,
   source/Issue/numeric/named-entity fences, remote-positive episode membership,
   curated native-id scope, serialized MCP calls. answerTypeSupport is ranking-only.
2. **Exposed replay** — ONE source-bound 16+4 replay at the staged head:
   exact-source **13/16** (strict ratified >=13/16 met). The only delta vs the 12/16
   control is S10 (WRONG_SOURCE → PASS). S03/S05/S13 remain correctly rejected on
   NAMED_IDENTITY with selected refs identical to control — no threshold waiver or
   answer-preference rescue. N01/N03/N04 PASS_NO_INJECTION; N02 frozen FAIL_INJECTED
   (same-group policy, identical injected ref). S06 historical/superseded precedence
   preserved. No privacy, group, or false-claim violations.
3. **S10 predicate proof** — the expected abbreviated-SHA-prefixed conventional subject
   (verb "reject", outside the old change-verb lexicon) is now recognized (answerType 1);
   the incidental git -C worktree-setup transcript is recognized as procedural (answerType
   0, all 6 observed procedural candidates). Result is input-order independent (generic A4
   assertions; no known call ID/source ref hardcoded in ranking).
4. **Remote/safety** — live read-only `get_episodes` positively confirms 16/16 expected
   episode UUIDs (group-pure, 227 episodes, untruncated); deployed plugin bytes are the
   main-base bytes (unmerged candidate NOT installed); no service/plugin/config,
   Graphiti/curator/queue, or OpenViking EX-gate changes; no implementation-branch write.
5. **Latency** — d24 p50 147 ms / p95 185.7 ms / max 320 ms (single first-call transient;
   17 subsequent calls 138–162 ms); get_episodes p50 21 ms; curated index p50 32 ms;
   e2e Memory.search p50 178.5 ms / p95 205.5 ms. No persistent regression.
   HOOK_P95=UNVERIFIED (native hook boundaries not instrumented offline).
6. **Human precision** — 126-item operator packet reauthenticated (SHA256 MATCH); all
   human verdict fields null; HUMAN_PRECISION=UNVERIFIED (operator-adjudicated, >=0.90).

## Recommendation

`PR89_HOST_REVIEW_READY=yes` for the existing draft PR #89: the S10 defect is corrected at
the source, the strict 13/16 exposed gate is met with no test/safety/authority regression,
and the three named-entity residuals (S03/S05/S13) are fence-correct, not ranking defects.

This is permission for Central to begin independent exact-head PR review — NOT merge,
installation, or final native acceptance. Residual open items for Central/operator:
- S03/S05/S13 named-entity residuals: out of scope for this campaign (content-based
  ranker only; no new facts admitted).
- Human durable precision >=0.90 remains operator-adjudicated and UNVERIFIED.
- Native fresh-process acceptance (hook p95 <=300 ms) remains to be measured natively;
  HOOK_P95=UNVERIFIED here.

No new subcampaign, PR, or scoring-policy redesign is initiated by this packet.
