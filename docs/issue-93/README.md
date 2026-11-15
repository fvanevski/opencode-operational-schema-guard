# Issue #93 relevance comparison kit

This is a source-safe metadata scorer, NOT a retrieval implementation or a
source-authentication proof. Keep the original #81 frozen judgments immutable.
Build independently maps original source-exact targets to synthetic labels
such as S03-target, and records the nine labeled stage arrays for each case:
graphiti, source_join, remote_proven, shortlist, strict, semantic, candidate,
presented, answer_supported. Indexed-only records have their own remote
membership path. Never pretend these stages are all nested, and never treat a
Graphiti search result as positive source authority.

Input is a private JSON object with schema issue93.stage-ledger.v1, cohort
(frozen, holdout, exposed, native), cases (1..96), and callbacks (0..10000).
Each case: id, kind=positive/negative, expected=[synthetic labels],
stages={all nine arrays}, context_chars (actual rendered text length), optional
budget_chars (sum of selector JSON item costs, <=1400), on_time, associated and
controls={secret:false,wrong_group:false,false_verified:false}. The control
flags indicate actual observed breaches. Callbacks contain duration_ms,
injected and error for ALL Graphiti context-hook invocations, including
abstentions and failures. Search latency and callback latency are distinct. The selector charges the
sum of JSON item lengths to its 1400-character limit; formatContext adds
presentation prose and may render more characters. The scorer records a
rendered-over-1400 observation without misclassifying it as a selector-budget
breach; missing budget measurements remain separately visible.

Execute from the repository checkout:

  node --test docs/issue-93/score-stage-ledger.test.mjs
  node docs/issue-93/score-stage-ledger.mjs --input /ABS/private-ledger.json --output /ABS/scorecard.json

The scorer writes a 0600 exclusive output and rejects raw-looking source IDs.
Never publish the private input, queries, facts, live UUID mapping, assembled
model prompts or sensitive traces. Scorecard aggregate numbers are meaningful
only alongside independent source, remote-membership, association and
callback instrumentation evidence. Missing proof remains UNVERIFIED; a
metadata row does not establish it. Preserve the semantic 13/16 and strict
12/16 source-exact controls without retroactive relabeling.

## Correction decision

Issue #93 B2 permits only a measured, cohesive selector/presentation
correction preserving the hard source/remote/group/privacy/temporal and EX
controls. Native top rank can presently present a lexically unsupported hit,
but that is a hypothesis, not an established N01/N02 cause; a hard lexical
veto may lose S03/S05/S13 paraphrases. Strict remains the untouched control.
Central owns any substantive production selector/test change on issue/93.
Do not create a separate PR for this diagnostic kit. Issue #94 owns final
installed two-memory coexistence and scaling.
