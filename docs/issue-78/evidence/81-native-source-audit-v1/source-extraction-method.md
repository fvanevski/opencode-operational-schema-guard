# Source Extraction Method — Issue #81 native-source audit

Read-only method used to bind all 126 operator-packet facts to their original
native source events and compute exact byte offsets. No Graphiti write, no
curator drain, no queue mutation, no EX lease bypass, no new native session,
and no re-run of the acceptance campaign were performed.

## 1. Input sources (all read-only)

| Input | Path | Identity |
| --- | --- | --- |
| Operator packet (frozen, 126 items) | `/tmp/opencode/issue81-fresh-native-acceptance/precision/operator-review-packet-126.json` | SHA-256 `c110acd3bcc9fa6e62f347c285bd61fd542e2a826634fa1134bac78a1f204e52` (verified) |
| Phase A worksheet | `/tmp/opencode/issue81-merged-promotion/evidence/phase-b/durable-precision-worksheet.json` | SHA-256 `9f9152cc1a5c0defc616dcced2869d30aa21738f78d698a5b8b2777659b7b56c` (verified) |
| As-of snapshot | `/tmp/opencode/issue81-merged-promotion/evidence/phase-b/durable-precision-asof-snapshot.json` | SHA-256 `c8d5053c16ac7a07447c71d0bb5e7c4ce665940cdba3263119bdb25d6524ef37` (verified) |
| Curation source store (private) | `/home/filip/.local/state/ghdev-graphiti/curation-v1/development-knowledge/<record_id>.json` | 237 records; all 126 packet records present |

The curation store is the authoritative captured native-source store. Each
`<record_id>.json` record carries an `events[]` collection of captured native
source events (the full set of source excerpts, 2–8 per record) and a `facts[]`
array (exactly one fact per record in this snapshot). The operator packet
displays only a **single** `native_source_excerpt` per item, which is why only
8 of 126 assertions are verbatim substrings of the *displayed* excerpt; the
other 118 assertions are verbatim substrings of a **non-displayed** source event
in the same record's `events[]` collection.

## 2. Schema fields used

Curation record (`<record_id>.json`):
- `id`, `group`, `project`, `workspace`, `session_id`, `state`,
  `remote_episode_uuid`, `origin`, `decision`, `reason`,
  `created_at`, `updated_at`
- `events[]`: `event_id`, `source_refs[]`, `kind`, `evidence_class`,
  `source_strength`, `excerpt`, `observed_at`, `related_event_ids[]`
- `facts[]`: `assertion`, `kind`, `source_refs[]`, `evidence_class`, `scope`,
  `observed_at`, `temporal_status`

Operator packet item:
- `item`, `record_id`, `group/project/workspace`, `remote_episode_uuid`,
  `remote_episode_name`, `state`, `fact{...}`, `source_refs[]`,
  `native_source_excerpt`, `native_source_excerpt_count`,
  `automated_source_match{...}`, `human_verdict{...}` (all null, awaiting operator)

## 3. Join algorithm (per item)

1. Load the curation record by `record_id`; compute `source_snapshot_digest`
   = SHA-256 of the record file bytes.
2. Take `fact = record.facts[0]` and `fact_ref = fact.source_refs[0]`.
3. Parse `fact_ref` (`opencode:<session>:message:<msgid>[:span:<n>]` or
   `opencode:<session>:tool:<callid>`) into `session_id`, `ref_kind`,
   `native_id`, span flag/offset.
4. **Source-ref-consistent match**: the event `e` in `record.events[]` with
   `e.source_refs[0] == fact_ref`. Exactly one such event exists for all 126
   items (`source_ref_consistent_match_found = 126`).
5. **Qualifying matches**: every event whose `excerpt` contains the assertion
   verbatim. For 125 items this is a single event (the source-ref-consistent
   one); for item 60 two tool-outcome events contain the assertion, and the
   source-ref-consistent event is the authoritative one.
6. Compute exact offsets into the **original decoded** event excerpt
   (`source_text`), see §4.
7. Assign evidence status (§5).

The join is by exact `source_ref` equality (native-id source strength), not by
text similarity. Text similarity is used only to enumerate *qualifying*
matches, never to select the authoritative source.

## 4. Offset algorithm

- `source_text` = the original decoded `excerpt` string (UTF-8).
- `source_text_sha256` = SHA-256(`source_text.encode('utf-8')`).
- `assertion_sha256` = SHA-256(`assertion.encode('utf-8')`).
- Offsets are **UTF-8 byte** positions of `assertion` inside `source_text`
  (not the serialized JSON-escape representation). `start_utf8_byte` is the
  first occurrence; `end_utf8_byte_exclusive = start + len(assertion_bytes)`;
  `match_count` = total occurrences.
- `exact_original_byte_match` = (`match_count >= 1`).
- `slice_reproduces_assertion` = independent re-check that
  `source_text_bytes[start:end] == assertion_bytes`.
- Character (code-point) offsets are also recorded with
  `offset_encoding = "utf-8"` for completeness.

No case-insensitive, whitespace-normalized, fuzzy, or semantic match is treated
as verbatim. A match is verbatim only when the UTF-8 byte slice reproduces the
assertion exactly.

## 5. Evidence status assignment

| Status | Meaning |
| --- | --- |
| `EXACT_NATIVE_SOURCE_MATCH` | assertion is a verbatim UTF-8 substring of the source-ref-consistent event's excerpt; `evidence_class` matches the fact's class; `source_strength = native-id` |
| `MATCH_IN_DIFFERENT_SOURCE` | assertion found verbatim only in a non-source-ref event |
| `SOURCE_REF_MISMATCH` | the source-ref event is absent from `events[]` |
| `EVIDENCE_CLASS_MISMATCH` | the matched event's `evidence_class` differs from the fact's |
| `ASSERTION_NOT_FOUND` | assertion not found verbatim in the source-ref event |
| `SOURCE_TEXT_UNAVAILABLE` | no matched/qualifying event with an excerpt |
| `TIMESTAMP_UNAVAILABLE` / `ACTOR_UNAVAILABLE` | `observed_at` / role not independently present |
| `PRIVATELY_VERIFIED_REDACTED` | match verified only in the private unredacted store |
| `OTHER_WITH_EXPLANATION` | anything else, with explanation |

Result: all 126 items = `EXACT_NATIVE_SOURCE_MATCH` (see
`source-match-reproduction.json`).

## 6. Independent matching checks performed

- Population invariants verified: 126 items, 126 unique record ids, 126 unique
  episode UUIDs, exactly one `source_ref` per fact, evidence classes
  103 assistant / 18 tool / 5 user.
- Offset math re-verified by a **separate** one-shot check (independent of the
  binder's internal logic) on items 1, 11, 13, 55, 60, 79, 124: the UTF-8 byte
  slice at the recorded offsets reproduces the assertion exactly.
- The 8 items whose assertion is a verbatim substring of the *single displayed*
  packet excerpt are {11, 38, 47, 70, 75, 79, 80, 124}; the remaining 118 are
  verbatim in a non-displayed source event of the same record.

## 7. Actor / timestamp / redaction

- Role is derived independently from `event.kind`
  (`user_turn`→user, `assistant_turn`→assistant, `tool_outcome`→tool). No
  separate account-actor identity is recorded in a curation event; the actor
  is therefore the *role* only, and this is stated rather than inferred from
  `evidence_class`.
- Source timestamp = `events[].observed_at` (the native-event observation
  time). Distinct curation timestamps are `record.created_at` /
  `record.updated_at`. Neither is substituted for the native event time.
- Sanitization: `source_text` is the full **unredacted** original excerpt and
  is published with `source_text_sha256` so the byte match is independently
  reproducible from Git. A `public_display_excerpt` redacts only non-secret
  host metadata (operator username in `/home/...` paths, host hostname) for
  human readability; those rows carry `public_excerpt_redacted=true` and are
  **not** presented as byte-identical to the unredacted source at the original
  offsets. The raw exact match is verified against the unredacted source
  (`raw_exact_match_verified`) and re-derivable from Git
  (`independently_publicly_reproducible`).

## 8. Helper

`helpers/bind-source-events.py` is the executed read-only helper (parsing, joins,
offsets, sanitization). It is included in this packet and is deterministic; it
reads only the packet and the curation store and writes the JSONL/JSON evidence
files. It is not a second retrieval implementation and issues no Graphiti calls.
