# Negative Control N02 — exact group/source identity and policy interpretation

## 1. Frozen negative-case policy

- `case_id`: N02
- `category`: `wrong_group`
- `question`: "Which legacy pre-cutover group stored the original `ghdev_gh_mcp`
  episodes before `development-knowledge`?"
- `expected_outcome`: `no_injection_or_non_development_knowledge`
- `note`: "Answers would come from the superseded `ghdev_gh_mcp` scope, not the
  active `development-knowledge` group; a development-knowledge fact injected
  here is a scope leak."
- `frozen_prompt_sha256`: `821947953003583d6be52b40d39e13312165d8534aae88643f0a74e7a58a1d99`
- Frozen result: **FAIL_INJECTED** (a development-knowledge fact was injected).

## 2. The injected assertion and its true identity

- `injected_source_ref`:
  `opencode:ses_e508c6d53ffeWrJEJftz60lqXB:message:msg_1af753f0d001GPlDjAoAckQ3EK`
- Resolved in the curation store to record `f9680d78…`, episode
  `e1d8e764-26fa-45ea-9483-8e64a71e3de7`, **group = `development-knowledge`**,
  project `gh_mcp`, workspace `/workspace/mcp_servers/gh_mcp`,
  `evidence_class = assistant-reported`, `temporal_status = observed`.
- Assertion:
  > "The **active production curation records are under
  > `curation-v1/development-knowledge/`** (the group the `.path` watches),
  > while `ghdev_gh_mcp` is the historical pre-cutover set."

## 3. Group/source identity determination

| Quantity | Value |
| --- | --- |
| Remote episode group | `development-knowledge` (the **active** group) |
| Persisted curation group | `development-knowledge` |
| Source-index group | `development-knowledge` (`_episode-index` under that group) |
| Source project/workspace | `gh_mcp` / `/workspace/mcp_servers/gh_mcp` |
| Relevance/temporal | assistant-reported, observed |

The injected fact is **not** from the superseded `ghdev_gh_mcp` group. It is a
`development-knowledge` fact that *describes* the historical `ghdev_gh_mcp`
scope. A development-knowledge fact **about** the historical `ghdev_gh_mcp`
group is **not automatically a cross-group leak**.

## 4. Policy interpretation (four-way distinction)

- **True wrong-group source admission** — *No.* The fact's remote episode group
  is `development-knowledge` (the active group the recall service queries), not
  `ghdev_gh_mcp`. There is no cross-group admission.
- **Correctly grouped but undesired topic relevance** — *Yes.* The fact is in
  the correct (active) group; it is topically relevant to the prompt (which
  asks about the historical `ghdev_gh_mcp` scope) and was injected.
- **Overly broad predeclared negative expectation** — *Partly.* The note
  predeclares "no development-knowledge fact" as the desired outcome, but a
  development-knowledge fact *about* the historical group is legitimately in the
  active group and topically on-point. The expectation is broader than a
  cross-group-leak test.
- **Unsupported temporal/authority assertion** — *No.* The assertion is
  assistant-reported/observed and grounded in a real native source.

## 5. Conclusion

N02 is a **correctly-grouped (development-knowledge) undesired topic-relevance**
admission, **not** a true cross-group source leak. The frozen evaluation is
preserved: **N02 = FAIL_INJECTED** (a development-knowledge fact was injected
where the predeclared expectation was "no development-knowledge fact"). The
diagnosis does not re-label N02; it characterizes *why* the injection occurred
(same-group, topically-related fact) so Central can decide whether the negative
expectation was overly broad.
