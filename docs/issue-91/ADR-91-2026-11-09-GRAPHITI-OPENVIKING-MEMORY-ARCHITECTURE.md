# ADR-91-2026-11-09 — Graphiti development knowledge alongside OpenViking

**Status:** APPROVED / authoritative project architecture decision  
**Approved by:** repository operator in the 2026-11-09 Central architecture review  
**Governs:** #91 (roadmap), #92 (capture and curation), #93 (context relevance), #94 (scaling and installed integration)  
**Implementation status:** NOT IMPLEMENTED OR ACCEPTED by this decision alone; working branch only  
**Prior evidence:** immutable #78–#81 controls and #92 H2, H3, H4 failed qualification records

> This decision governs later work on the #91 roadmap. Where older prose in the
> listed issues or \`docs/issue-91/ISSUE92_CURATOR_PLAN.md\`,
> \`docs/issue-91/h2-acceptance/ISSUE92_NEXT_PROSPECTIVE_CONTRACT.md\`, or
> other H2–H4 campaign instructions conflicts with this decision, this decision
> supersedes it **prospectively**. Those documents and their frozen outcomes
> remain historical evidence; they are not retroactively changed or passed.
> This decision does not waive the repository's GitHub/CI/EX/security contracts.

## 1. System purpose and division of responsibility

**Graphiti** is a source-supported, temporally contextualized, project/repository-scoped
**development knowledge graph**. It should remember facts, relations, choices,
constraints, dependencies, root causes, validated fixes, reusable procedures and
meaningful negative findings that can help a later coding decision. It is **not**
a general session transcript, execution log, comprehensive task history, or agent
workflow journal.

**OpenViking** remains the agent's session/experience/resource continuity memory,
suited to prior-task narrative, workflow progress, working context and resource
organization. The systems may refer to the same underlying event, but Graphiti's
persisted unit must be a selectively justified development fact or relation,
**not** an unfiltered OpenViking-style session summary.

Success means future development decisions become better supported and more accurate.
Maximizing Graphiti node count, candidate-event count, context injection, or
persisted-only usefulness percentage is not the objective.

## 2. Decision: high-recall, deterministic evidence capture

The OpenCode interactive plugin should **err on retaining potentially useful
evidence for post-exit consideration**, because losing valuable source material
upstream is generally costlier than admitting moderately relevant material into
the private candidate queue.

- Deterministic stage-1 capture checks **provenance, source/identity authenticity,
  timestamp and project/repo/workspace scope, privacy, injection/self-context
  exclusion, bounded size and resource constraints**. These are hard controls.
- Surface-level "relevance" signals such as command names, keywords, file
  extensions, line formatting, braces/JSON, tool category, test output markers,
  or text length are **not general hard vetoes**. They may prioritize, annotate,
  segment, or down-rank a safe candidate. Unfamiliar native event types must
  be represented safely when authentic source identity is available.
- Preserve an authentic source handle and sufficient safe, bounded context to
  allow post-exit interpretation. For large messages/outputs, use safe bounded
  windows or private references plus offsets/digests, instead of blindly losing
  the entire useful source. A missing native tool result must be recorded as
  missing evidence; it must never be invented.
- No private credential, secret-containing raw output, out-of-scope source,
  injected memory-context instruction, or untrusted cross-group content may
  reach the model or graph. Where isolation/redaction cannot be proven,
  **fail closed** for that unsafe content. High recall does not overrule safety.
- Instrument the complete raw-eligible-event -> admitted/filtered event stages
  with typed, privacy-safe reasons and counts. Explicitly distinguish genuine
  missing native data, intentional privacy rejection, capacity/backpressure,
  unsupported source shape, and discretionary relevance filtering.

This authorizes a **bounded correction to existing capture adapters and queues**,
not a generic replacement, new cross-harness capture rollout or unbounded
whole-session retention.

## 3. Decision: separate post-exit fact discovery, utility judgment, and authority

Under the existing exclusive post-exit inference admission, the local model may
examine admitted evidence and propose **atomic development facts and relations**.
The downstream work is logically separated into:

1. **Discovery:** identify plausible facts/relations from evidence, including
   durable findings embedded in transient test runs or mixed-format events.
   Preserve multiple independent candidates where justified rather than
   prematurely saying SKIP for the entire session.
2. **Utility selection:** judge whether each candidate can inform future coding
   decisions, cause/fix reasoning, architectural understanding, or reusable
   constraints. Prefer retaining safe, source-supported, moderately useful
   knowledge to rejecting a genuinely useful fact for speculative precision.
   Reject raw chatter, obsolete status, unsupported assertions, and true
   duplicates. Record why the fact was kept, rejected, or deferred.
3. **Deterministic authorization:** validate cited original evidence, source
   identity/offset/hash, scope, evidence class, observed time and temporal
   status, privacy, duplicate/idempotency safety, and Graphiti write/recovery
   rules **independently of model confidence**.

A model's failure to reproduce an **exact verbatim assertion** is not itself
proof that no useful claim exists. A normalized/structured claim may differ from
its supporting **exact, immutable quoted source evidence** only when its meaning
and qualifiers are demonstrably entailed by those sources. The evidence and
claim are different fields. Source-grounding must remain an actual verification
step, not token overlap, a self-attested model boolean, or "LLM said so."

Multi-source evidence and relationships may be proposed when every source
is individually attributable; causal or verification claims that are not
individually or jointly supported **must be deferred**, not promoted by
plausible synthesis. A user statement or assistant claim is not automatically
an independently verified implementation outcome. Temporal and provisional
status must remain explicit.

## 4. Decision: bounded more-than-one useful fact per review cluster

A cluster of events can contain multiple independently useful facts. **One
automatic fact per cluster is no longer an architectural requirement.** A
bounded plurality of facts **may** be selected, with a small limit justified
by exposed-case measurements, fairness, review effort, throughput and graph
pollution. No fixed maximum is ratified by this ADR; it must be established
before enabling multi-fact automatic promotion.

**Keep one atomic fact per Graphiti episode**, each with its own unique review/
source identity, source-index mapping, terminal Graphiti episode UUID, positive
remote readback and idempotent non-replay behavior. Do not pack multiple
unrelated facts into one episode to evade per-fact proof. Existing
ReviewStore/operator-CAS semantics, pending/unknown submission handling,
duplicate protection and historical episodes must remain compatible.

Multi-fact cluster promotion is authorized only **after** Central designs and
independently verifies per-fact state/receipt/recovery invariants on the existing
stack. Do not introduce a second datastore, generic agent transcript memory,
automatic destructive supersession, graph ontology redesign, or migration
solely to enable this capability. Keep the current one-fact behavior until
that compatible bounded implementation is qualified.

## 5. Measurements and decision priorities

Maintain a **stage ledger with independent denominators**:

- Raw native eligible opportunities and true valuable **source-opportunity
  capture recall** (including unsupported shapes, safety drops and queue loss);
- admitted evidence -> LLM fact-discovery recall, and discovery rejections;
- durable-utility judgment -> proposed/approved/rejected/deferred facts,
  with reasons and operator-review workload;
- valid, source-grounded fact -> actual terminal receipt-backed Graphiti
  persistence, useful-fact preservation, factual grounding/authority, and
  within-graph duplication/pollution;
- fresh-session question-relevant Graphiti retrieval, actual answer support
  and coexistence with OpenViking (rather than injection rate alone);
- context latency, post-exit model/Graphiti usage and queue backlog.

False negatives for genuinely useful source-supported knowledge carry **higher
decision cost** than moderate non-sensitive, supported false-positive
persistence. This is an explicit **recall-conscious utility preference**, not
permission to retain everything. Keep groundedness, source, privacy and
temporal gates hard. Low-value pollution still matters, but cannot be
optimized at the expense of catastrophic valuable-fact retention.

The historical #81 14/14 capture control, original source-exact and negative
controls, H2/H3/H4 frozen corpora, labels and scorecards stay unchanged. Do
not convert old failures into passes. Existing prospective targets (>=85%
high-value coverage, >=90% grounded precision, proposed >=75% usefulness with
an independently sufficient persisted sample) remain the starting binding
project constraints unless a **separate prospective, operator-approved**
measurement change is explicitly made. Preserve numerator/denominator,
Wilson/uncertainty, and report \`INSUFFICIENT_SAMPLE\` when applicable. Any
new multi-fact or changed claim/evidence unit needs **new prospective**
definition and freeze, not retroactive credit.

Before another untouched campaign, demonstrate on **exposed H2–H4 cases**
that (i) previously missed valuable raw evidence survives capture,
(ii) discovery/selection recovers useful facts in mixed clusters,
(iii) authorized claims are source-supported, and (iv) pollution and
security controls remain bounded. Do not replay old remote episodes.

## 6. Integration requirements and ownership

- **Interactive OpenCode path:** deterministic, fast, bounded, no local
  model calls or Graphiti writes. Retain capture instrumentation and
  the existing exclusive inference gate, quiet grace and safe post-exit
  once-only submission/readback protocol.
- **Post-exit model:** reuse the installed local model; no new paid service,
  Graphiti fork, always-on daemon, database migration or general agent store.
- **Read/retrieval path (#93):** may rank/abstain independently of broad
  capture/persistence; maintain present source/group/UUID authority, 1,400
  character default/<=5 facts and 300-ms context allowance until separately
  authorized. More stored facts do not authorize more irrelevant injections.
- **Installed integration (#94):** verify per-fact storage/recovery, real
  Graphiti + OpenViking complementary recall, safe native new-client
  activation, queue/throughput/latency and rollback. Preserve old records.
- **Ownership:** Central authors architectural and semantic changes,
  tests and exact-head PR review. Local Build supplies private host/source
  evidence, bounded mechanical integration and EX-admitted qualification.
  One cohesive PR remains preferred; no extra issue/PR per internal stage.

## 7. Explicit supersession and non-authorizations

This approved scope **supersedes** earlier #91 "#92 should not change capture",
"multi-fact persistence deferred without exception", and #92 requirements
that the *claim itself* always be a 25–450-character copied excerpt or
that only one fact can be selected per cluster. The **exact source evidence**
and strong independent support check are retained. #94's former blanket
"no multi-fact feature" exclusion is narrowed to **no unbounded or unrelated
multi-fact architecture expansion**.

Not authorized by this ADR: changing production deployment, changing hard
provenance/privacy/EX gates, unconditional automatic fact persistence,
automatic destructive graph updates, changing read-path latency/context
budgets, altering historical evidence, opening or merging a PR, or closing
the issues without independent reviewed acceptance. New semantic source
implementation and acceptance are subsequent work.

**Decision test:** a genuinely useful, safe, attributable development finding
must not be denied upstream merely for a missing relevance keyword, unfamiliar
tool format, arbitrary single-best-cluster selection, or a model's inability
to copy verbatim text; nor may uncertain, fabricated, private or
unattributed content become an authoritative graph fact.
