# Issue #81 — bounded long-user-source capture contract

## Requirement and architecture

An admitted stock-V2 native user prompt is a source occurrence, not an already-verified fact. The #79 adapter previously returned no candidate when the cleaned message exceeded 1,100 characters. Issue #81 adds **bounded contiguous spans** while preserving the accepted #75 selector and the #79 queue, evidence-class and interactive resource boundaries.

1. **Context/admission:** native `session.prompt` is buffered; only a later admitted `session.context` releases candidates. No interactive model call, Graphiti write or speculative prompt admission.
2. **Whole-source vetting before segmentation:** decode the existing JSON-wrapped native text if applicable, reject source text above 16,000 characters, private credential patterns, injected `[GHDEV_GRAPHITI_CONTEXT]` / OpenViking context, disallowed controls and whole JSON-root payloads. For short content preserve prior boring-text/JSON vetoes. For long mixed prose/code, reject any individual code/JSON-containing span and retain separate narrative spans only. This is deliberately conservative and does not prove quoted statements true.
3. **Bounded fanout:** normalize whitespace; take contiguous word-bounded text spans no longer than 900 characters; downselect uniformly to at most **six** across the complete original message (including the tail) when needed. Do not fabricate summaries or join nonadjacent text into an assertion.
4. **Source identity:** long spans REQUIRE a valid native message ID. Their source handles have the form `opencode:<session>:message:<message-id>:span:<normalized-offset>`; each event ID is computed from that exact handle, group/project/workspace, occurrence and `user_turn` kind. One surviving span still has a span suffix, because it is not the whole input. A weak content-hash fallback is permitted only for short messages, as before.
5. **Truth/authority:** evidence class remains `user-stated`, meaning only that the source was a native user message. Quoted file content, instructions in source, missing adjacent context and claims about tests are **not** independently verified. #80 curator receives an explicit partial-span rule and can extract only one literal contiguous 25–450-character assertion from one cited excerpt. No crossing spans, semantic completion or verified upgrade.
6. **Case-vs-span grain:** selection recall counts the **original source case once**, irrespective of whether 1–6 source events were staged. New diagnostic rows report `candidate_count` and event-ID hashes. Real model observation receipts must bind **each** cited span event ID and may list the same source case multiple times; cross-group and duplicate-event rules remain. Disposable holdout staging enqueues all admitted native source spans.
7. **Resource bound:** maximum six events per admitted prompt, existing four pending prompts per session, bounded in-flight writes, 4,000-item private queue, eight source events per curator cluster by default, and EX-admitted post-exit model processing. A truncated source is not a complete-message assertion. Report source-coverage limits and event volume alongside recall.

The acceptance benefit is **hypothetical until real native tests and ratified independent evaluation**. Some original 57-case input messages are already missing native result data or were deliberately excluded by privacy/scope policy. An improved adapter cannot recreate evidence absent from the frozen raw corpus.

## Non-changes

- No source reconstruction of the six SQLite-derived shell events whose `result` field is absent. Accepted #79 live `execute.after` still supplies real `result.output.exit/output` where present.
- No `read -> file_change` substitution, no out-of-workspace file capture, no raw file contents, and no SELF-context ingestion. If genuinely useful document-reading information is needed, obtain explicit native outcome/content/scoped evidence and define a distinct event type through Central, not a cosmetic taxonomy switch.
- No automatic relaxed acceptance target, artificial retuning of the exposed nine-case holdout, or claim that the old development recall meets ≥85%.
- `chat-fast` is non-thinking by operator authority; this source change does not add a `reasoning_effort` override or change LiteLLM/NInfer.

## Verification required

Exact source-head Node tests; known safe short/native fallback compatibility; all-span hook → queue admission; persistent dedup/restart; whole-source secret/SELF rejection even when after the last selected span; source reference validation by the #80 curator; actual live OpenCode V2 native event/queue matching, and no unadmitted inference.

A new **prospectively registered**, nonoverlapping, real-native development-and-holdout corpus must be collected before scoring new acceptance, with independent operator verdicts and immutable SHA pins. It should include long user decisions, multi-event error→fix→test, code-containing messages with separate prose, direct/historical context, duplicate/secret/SELF/wrong-project negatives, and read-only events that are *not* file mutations. Report source-case and native-span denominators separately.

Any operator-facing request for verdicts must include the full relevant context and an evidence-based recommendation; see `LOCAL_AGENT_CONTRACT_RECALL_REMEDIATION.md`. Do not force the operator to locate transcripts, request IDs, source files or prior threshold decisions in order to answer.
