# Issue #93 — Central final acceptance disposition after B2.2

Status: **COMPARATOR_PASS_ANSWER_UNVERIFIED**.
Current authoritative GitHub evidence commit:
827a120277c547cccb308c0ee70493dbfd6befa9.
No PR, merge, deployment, or issue closure authorized.

## Verified public evidence

GitHub branch readback, commit DAG and complete change-list confirm
the current evidence commit's parent
402a59bff76645491eb48be830d54196a9a95553 and five added
sanitized files under
docs/issue-93/evidence/final-comparator-qualification.
This evidence commit changed no source, tests, Graphiti state,
installed config or historical records.

Host-reported immutable source identities:
- Unchanged original semantic:
  69014b739d490f8cb90bce86233edf3054673209
- Central B2.2 candidate:
  4bc169cc59e8900f5dc3cd4d3c70a22d0fcfb9f4
- Original dev manifest:
  3e799c461080985324c58d487ec6327e7616436b546ee9aa2dce3a67251919db
- Exposed original holdout:
  3f9eaebb6debe949bc9eb07eb777f2851b957adc1a8a3d94bccfcd27fa75c0c9
- Original Graphiti source snapshot (correct canonicalization):
  dc597c690b0e8990b925b01467269f530d37dfb2dd7730663bdda46680e7231b

The published sanitized replay states the relative holdout
gate PASS under the explicitly approved one-time
POST_EXPOSURE_COMPARATOR_APPROVED_EXCEPTION: H01 true in both,
H02/H03/H04 false in both, HN01 four off-topic facts in both,
HN02 zero in both. The unchanged 18+5 development cohort
reports strict 13/18, semantic B2.2 15/18, no positive loss;
N01, N02, N04 abstain. The absolute holdout outcome remains
poor (1/4 true positives, HN01 four irrelevant facts);
this is not a high-precision result.

The host also reported a mixed 20-invocation native sample:
p50=45.72ms, p95=299.77ms, max=300.273ms,
14 injected/2 empty/2 error/2 late, all retained;
separate Graphiti search p95=159.31ms and remote proof
p95=45.67ms. This is not full independently measured
service availability or a merged release gate.

## Blocking independent model-answer proof

The most recent enabled/disabled local model comparison
could not isolate memory benefit. The supposedly Graphiti-only
35-node fact appeared in the MEMORY-DISABLED answer through
another channel; the attempted second edge-count fact was
not even selected by the Graphiti context. A source-attributed
Graphiti context block in the memory-enabled request IS
demonstrated, but answer attribution to Graphiti is UNVERIFIED.
Tools being denied and a configured single plugin are not
sufficient proof of zero other CONTEXT inputs.

Root cause of this cross-channel information is NOT YET
verified. It may involve inherited global/project plugin
loading, OpenViking/session persistence, other instruction
sources or prior model/request context. Do not assert which
without effective runtime/config and assembled-request
evidence. OpenCode's current documented plugin discovery
and additive config merging require inspecting ACTUAL
loaded plugin inventory, not just the desired config file.
Installed runtime command/config shapes are authoritative;
do not assume that later public documentation matches a
specific host v2.2.x binary without verification.

## Next controlled action

Only host-bound preparation and a SINGLE QUIET OPERATOR-OWNED
fresh-process, serial memory-off then memory-on comparison
remain needed before deciding on PR creation. Use the attached
CPU-only LOCAL_AGENT_CONTRACT_CLEAN_ANSWER_PROBE_PREP.md
to construct a verified isolated one-shot operator runner.
The Build agent MUST EXIT before model inference to avoid
single-GPU contention.

Predeclare one truly non-git, remote-proven, source-attributed
#92 fact with a query that selects it via the actual B2.2
Memory.search path; do not reuse the 35-node anecdote, the
unselected edge-count fact, or a known alternate-channel fact.
Do not seed the ANSWER in the prompt. Use separate fresh
session DB/config/state roots for each arm. The ONLY intended
difference must be Graphiti enabled=false versus true.
Confirm exact provider/model and plugin load, *complete*
effective instructions and absence of OpenViking/session
context in BOTH arms; confirm no tools. Compare actual
model-bound context (not model prose alone), sources and
privately adjudicated answer. One trial only. Stop rather
than tweak the source, query or fact after seeing outcomes.

A clean PASS requires: correct source selected and injected
ONLY in treatment; no credited answer fact in disabled
model input or any other channel; disabled model not providing
the fact; enabled answer uses it correctly and independently
adjudicated from the original #92 receipt; zero tools and no
other plugins/contexts supplying it. If any condition is
unsupported report UNVERIFIED/FAIL, not optimistic PASS.

Historical holdout and snapshot evidence and the approved
exception are unaffected. Exact-head independent PR review,
trusted Actions, and merged-main gates remain pending.
