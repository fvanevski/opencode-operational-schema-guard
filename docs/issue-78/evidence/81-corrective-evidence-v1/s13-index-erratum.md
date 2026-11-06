# S13 Source-Index Erratum (additive)

**Packet:** `docs/issue-78/evidence/81-native-source-audit-v1`
**Status:** ADDITIVE CORRECTION — the original `recall-case-diagnostics.json` and its
summary are **unchanged**; this erratum supersedes the S13 source-index conclusion.

## Original claim

The prior diagnostic classified S13's historical no-injection as
**missing-source-index**: the expected episode `009974d2-f051-45fd-ac0c-f259dcfdd1a8`
was reported as *not present* in `_episode-index`, and `sourcedEpisodeResolver`
was reported as unable to admit it.

## Defective comparison

`helpers/build-recall-diagnostics.py` (prior packet):

- line 43: `epindex = set(os.listdir(<store>/_episode-index))` — a set of
  **filenames**, each carrying the `.json` suffix
  (e.g. `009974d2-....json`).
- line 115: `case['source_index_present'] = (ep in epindex) if ep else None` —
  membership tested with the **bare episode UUID** (no suffix).

A bare UUID can never equal a suffixed filename, so `source_index_present`
was **always False** for every case, and S13's "missing index" conclusion was an
artifact of this comparison, not of the store state.

## Corrected test

Presence must be tested against the resolver's actual read path
(`sourcedEpisodeResolver`, `docs/issue-78/v2-curator/sourced-recall.mjs:15`):
`_episode-index/<uuid>.json` — i.e. test `f"{uuid}.json" in filenames` (or read
the file).

## Actual result (current authoritative production state)

All predicates PASS (evidence in `s13-index-readback.json`):

| Predicate | Result |
| --- | --- |
| `INDEX_FILE_EXISTS` | **PASS** (135 bytes, inode 40289879, mtime 2026-11-05 20:45:45 -0800) |
| `INDEX_JSON_VALID` | **PASS** (`remote_episode_uuid` matches; `id` is 64-hex) |
| `INDEX_RECORD_MATCHES` | **PASS** (record `78f3c529…`; state `persisted`; group/project/workspace match the production resolver binding) |
| `PERSISTED_RECORD_VALID` | **PASS** (`facts.length == 1`; `assistant-reported`; `source_refs` within bounds and represented in a `native-id` event) |
| `SOURCE_BINDING_ADMISSIBLE` | **PASS** |
| `RESOLVER_RETURNS_EXPECTED_EPISODE` | **PASS** — the real `sourcedEpisodeResolver` (installed module, read-only call with the production binding) returned `[{status: 'persisted', remoteEpisodeUuid: 009974d2-…, sourceRef: opencode:ses_e50efdb27ffep7alMZaj9wkl3x:message:msg_1af1287e7001qq7UBQ8qBctKK1, evidenceClass: 'assistant-reported'}]`, matching the roster's expected source ref |

**`MISSING_SOURCE_INDEX_RULED_OUT = yes`.**

## Downstream implications

1. The S13 source-index/resolver path is **valid and admitting**; the historical
   no-injection is **not** a source-index or resolver failure.
2. The corrected diagnosis for S13 (this packet, `nine-case-diagnostics.json`):
   - the expected episode is **absent from the current Graphiti top-12** for the
     frozen prompt (`SEMANTIC_SEARCH_RETRIEVAL_MISS`), and
   - all 11 admitted candidates fail the lexical floor (single-group overlap < 2)
     (`RELEVANCE_FILTER_REJECTION`), so nothing is injected today — the historical
     MISS is reproduced.
3. The historical run's 300 ms `Promise.race` censored path
   (`docs/issue-75/v2-candidate/plugin.mjs:169-171`) **remains a candidate
   explanation** for the original no-injection (absence is censored-or-no-match);
   no timing evidence exists in the frozen run, so it is **UNVERIFIED** and not
   excluded.
4. Index presence is **not** proof that Graphiti search returned the expected
   episode; that is established (or not) by the search probe itself.
