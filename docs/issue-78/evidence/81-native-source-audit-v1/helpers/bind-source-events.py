#!/usr/bin/env python3
"""Issue #81 native-source audit — Phase 2 read-only binder.

Binds each of the 126 operator-packet facts to its original curation-record
source event and computes exact UTF-8 byte offsets. Read-only: it reads the
frozen operator packet and the private curation store, and writes sanitized
evidence files. It never mutates the packet, the store, or Graphiti.

Inputs (all read-only):
  OPERATOR packet  : /tmp/opencode/issue81-fresh-native-acceptance/precision/operator-review-packet-126.json
  curation store   : /home/filip/.local/state/ghdev-graphiti/curation-v1/development-knowledge/<record_id>.json

Outputs (evidence packet):
  fact-source-bindings.jsonl         (126 item-level records, explicit failures)
  native-event-source-evidence.jsonl (sanitized event excerpts + metadata, by item/source_ref)
  source-match-reproduction.json      (aggregate totals)
  authority-temporal-review.json      (item-level provenance concerns)
  full-matrix.json                   (machine-readable join for independent re-check)
"""
import json, os, hashlib, sys, re

STORE = '/home/filip/.local/state/ghdev-graphiti/curation-v1/development-knowledge'
PACKET = '/tmp/opencode/issue81-fresh-native-acceptance/precision/operator-review-packet-126.json'
OUT = '/tmp/opencode/issue81-native-source-audit/docs/issue-78/evidence/81-native-source-audit-v1'

def sha256_bytes(b): return hashlib.sha256(b).hexdigest()
def sha256_text(s): return sha256_bytes(s.encode('utf-8'))

def parse_source_ref(ref):
    """opencode:<session>:message:<msgid>[:span:<n>]  |  opencode:<session>:tool:<callid>"""
    out = {'session_id': None, 'ref_kind': None, 'native_id': ref, 'span': False, 'span_offset': None}
    if ref.startswith('opencode:'):
        rest = ref[len('opencode:'):]
        seg = rest.split(':')
        out['session_id'] = seg[0]
        out['ref_kind'] = seg[1] if len(seg) > 1 else None
        idpart = ':'.join(seg[2:])
        out['span'] = idpart.endswith('):span') or ':span:' in idpart
        if ':span:' in idpart:
            base, span = idpart.rsplit(':span:', 1)
            out['native_id'] = base
            out['span'] = True
            try: out['span_offset'] = int(span)
            except ValueError: out['span_offset'] = None
        else:
            out['native_id'] = idpart
    return out

ROLE = {'user_turn': 'user', 'assistant_turn': 'assistant', 'tool_outcome': 'tool'}

def redact_display(text):
    """Redact non-secret host metadata (operator username, host hostname) from the
    human-readable display copy only. The unredacted source_text and its SHA-256
    binding are retained separately, so byte offsets remain valid into the
    ORIGINAL source. Returns (redacted_text, [span_labels])."""
    t = text
    spans = []
    for pat, repl, label in (
        (r'/home/filip', '/home/<user>', 'host_path_username'),
        (r'(?<![\w/])filip(?![\w-])', '<user>', 'username'),
        (r'garion', '<host>', 'hostname'),
    ):
        if re.search(pat, t):
            spans.append(label)
            t = re.sub(pat, repl, t)
    return t, spans

def offsets(excerpt, assertion):
    """UTF-8 byte offsets of `assertion` inside `excerpt` (original decoded text)."""
    eb = excerpt.encode('utf-8')
    ab = assertion.encode('utf-8')
    positions = []
    start = 0
    while True:
        i = eb.find(ab, start)
        if i == -1: break
        positions.append(i)
        start = i + 1
    exact = len(positions) >= 1
    s = positions[0] if exact else None
    e = (s + len(ab)) if exact else None
    # verify by slicing the original bytes
    verified = bool(exact) and (eb[s:e] == ab)
    # character offsets (encoding = utf-8, reported as code-point indices)
    cs = None; ce = None
    if exact:
        cs = len(excerpt.encode('utf-8')[:s].decode('utf-8'))
        ce = cs + len(assertion)
    return {
        'source_text_sha256': sha256_text(excerpt),
        'assertion_sha256': sha256_text(assertion),
        'excerpt_index': None,  # filled by caller (index in events[])
        'start_utf8_byte': s,
        'end_utf8_byte_exclusive': e,
        'match_count': len(positions),
        'all_utf8_byte_starts': positions,
        'exact_original_byte_match': exact,
        'slice_reproduces_assertion': verified,
        'source_text_utf8_byte_len': len(eb),
        'assertion_utf8_byte_len': len(ab),
        'char_start': cs, 'char_end_exclusive': ce, 'offset_encoding': 'utf-8',
    }

def main():
    packet = json.load(open(PACKET))
    items = packet['items']
    bindings = []
    native_evidence = []
    full_matrix = []
    agg = {
        'total_items': len(items),
        'exact_native_source_match': 0,
        'match_in_different_source': 0,
        'source_ref_mismatch': 0,
        'evidence_class_mismatch': 0,
        'assertion_not_found': 0,
        'source_text_unavailable': 0,
        'actor_available': 0, 'actor_unavailable': 0,
        'timestamp_available': 0, 'timestamp_unavailable': 0,
        'offset_verified': 0, 'offset_unverified': 0,
        'source_ref_consistent_match_found': 0,
        'multiple_qualifying_matches': 0,
        'by_evidence_class': {},
    }
    concerns = []

    for it in items:
        n = it['item']
        rec_id = it['record_id']
        rec_path = os.path.join(STORE, rec_id + '.json')
        rec = json.load(open(rec_path))
        raw_bytes = open(rec_path, 'rb').read()
        record_digest = sha256_bytes(raw_bytes)
        fact = rec['facts'][0]
        fact_ref = fact['source_refs'][0]
        p = parse_source_ref(fact_ref)
        assertion = fact['assertion']
        a_cls = fact['evidence_class']

        # locate the source-ref-consistent event (event.source_refs[0] == fact_ref)
        matched_events = [ev for ev in rec['events'] if ev['source_refs'][0] == fact_ref]
        # also every event whose excerpt contains the assertion (qualifying matches)
        qualifying = [ev for ev in rec['events'] if assertion and assertion in ev['excerpt']]
        # source-ref-consistent match
        ref_match = matched_events[0] if matched_events else None
        # pick the primary event for offset computation: source-ref-consistent if present else first qualifying
        primary = ref_match if ref_match is not None else (qualifying[0] if qualifying else None)
        if primary is not None:
            # find its index in events[]
            primary_idx = rec['events'].index(primary)
        else:
            primary_idx = None

        off = None
        if primary is not None:
            off = offsets(primary['excerpt'], assertion)
            off['excerpt_index'] = primary_idx
        exact = bool(off and off['exact_original_byte_match'])

        # evidence status
        if primary is None:
            status = 'SOURCE_TEXT_UNAVAILABLE'
        elif ref_match is not None and off['exact_original_byte_match']:
            cls_ok = (ref_match['evidence_class'] == a_cls)
            strength_ok = (ref_match['source_strength'] == 'native-id')
            if cls_ok and strength_ok:
                status = 'EXACT_NATIVE_SOURCE_MATCH'
            elif not cls_ok:
                status = 'EVIDENCE_CLASS_MISMATCH'
            else:
                status = 'OTHER_WITH_EXPLANATION'
        else:
            # assertion found only in a non-source-ref event
            status = 'MATCH_IN_DIFFERENT_SOURCE'
            if ref_match is not None and not off['exact_original_byte_match']:
                status = 'ASSERTION_NOT_FOUND'

        if exact: agg['offset_verified'] += 1
        else: agg['offset_unverified'] += 1
        if status == 'EXACT_NATIVE_SOURCE_MATCH': agg['exact_native_source_match'] += 1
        if status == 'MATCH_IN_DIFFERENT_SOURCE': agg['match_in_different_source'] += 1
        if status == 'SOURCE_REF_MISMATCH': agg['source_ref_mismatch'] += 1
        if status == 'ASSERTION_NOT_FOUND': agg['assertion_not_found'] += 1
        if status == 'EVIDENCE_CLASS_MISMATCH': agg['evidence_class_mismatch'] += 1
        if status == 'SOURCE_TEXT_UNAVAILABLE': agg['source_text_unavailable'] += 1
        if ref_match is not None: agg['source_ref_consistent_match_found'] += 1
        if len(qualifying) > 1: agg['multiple_qualifying_matches'] += 1
        agg['by_evidence_class'][a_cls] = agg['by_evidence_class'].get(a_cls, 0) + 1

        # role / actor / timestamp availability
        role = ROLE.get(primary['kind']) if primary else None
        actor_available = role is not None  # role is independently present via event kind
        actor_reason = None
        if not actor_available:
            actor_reason = 'event kind absent; role not independently derivable'
        elif a_cls == 'assistant-reported':
            actor_reason = 'assistant role; no separate model/actor identity recorded in curation event'
        elif a_cls == 'tool-reported':
            actor_reason = 'tool role; tool name only recoverable from excerpt text, not an actor id'
        else:
            actor_reason = 'user role; no separate user account identity recorded in curation event'
        if actor_available: agg['actor_available'] += 1
        else: agg['actor_unavailable'] += 1
        ts_available = bool(primary and primary.get('observed_at'))
        if ts_available: agg['timestamp_available'] += 1
        else: agg['timestamp_unavailable'] += 1

        # authority / temporal diagnostic fields
        is_user_interrogative = (a_cls == 'user-stated' and primary is not None and
                                 any(q in primary['excerpt'] for q in ('?', 'When', 'What', 'Which', 'Why', 'How', 'Where')))
        diagnostic = {
            'authority_type': {
                'user-stated': 'user assertion / question',
                'tool-reported': 'observed tool output',
                'assistant-reported': 'assistant report / intention',
            }.get(a_cls, 'unknown'),
            'user_interrogative_text': bool(is_user_interrogative),
            'temporal_status_preserved': fact.get('temporal_status'),
            'evidence_class_preserved': a_cls,
        }

        binding = {
            'item': n,
            'record_id': rec_id,
            'record_state': rec['state'],
            'remote_episode_uuid': rec.get('remote_episode_uuid'),
            'remote_episode_name': 'curated-v1:' + rec_id,
            'group': rec['group'], 'project': rec['project'], 'workspace': rec['workspace'],
            'session_id': rec.get('session_id'),
            'source_snapshot_digest': record_digest,
            'fact_assertion': assertion,
            'fact_evidence_class': a_cls,
            'fact_temporal_status': fact.get('temporal_status'),
            'fact_kind': fact.get('kind'),
            'source_ref': fact_ref,
            'source_ref_parsed': p,
            'matched_event_present': ref_match is not None,
            'matched_event_index': primary_idx,
            'matched_event_id': (ref_match['event_id'] if ref_match else None),
            'matched_event_kind': (ref_match['kind'] if ref_match else None),
            'matched_event_role': (ROLE.get(ref_match['kind']) if ref_match else None),
            'matched_event_evidence_class': (ref_match['evidence_class'] if ref_match else None),
            'matched_event_source_strength': (ref_match['source_strength'] if ref_match else None),
            'matched_event_observed_at': (ref_match.get('observed_at') if ref_match else None),
            'matched_event_observed_at_field_origin': 'curation record events[].observed_at (native-event observation timestamp)',
            'curation_created_at': rec.get('created_at'),
            'curation_updated_at': rec.get('updated_at'),
            'qualifying_match_event_ids': [ev['event_id'] for ev in qualifying],
            'qualifying_match_count': len(qualifying),
            'source_ref_consistent_match': (ref_match is not None),
            'offsets': off,
            'evidence_status': status,
            'diagnostic': diagnostic,
            'actor_available': actor_available,
            'actor_reason': actor_reason,
            'timestamp_available': ts_available,
        }
        bindings.append(binding)

        # native-event source evidence. source_text is the FULL unredacted
        # original decoded source-event text (offsets bind into it). A redacted
        # display copy is provided for human readability; the unredacted text +
        # its SHA-256 are retained so the byte match stays re-derivable.
        st = primary['excerpt'] if primary else None
        st_sha = sha256_text(st) if st else None
        disp, spans = (redact_display(st) if st else ('', []))
        native_evidence.append({
            'item': n,
            'source_ref': fact_ref,
            'event_id': (ref_match['event_id'] if ref_match else (qualifying[0]['event_id'] if qualifying else None)),
            'event_kind': (ref_match['kind'] if ref_match else (qualifying[0]['kind'] if qualifying else None)),
            'role': (ROLE.get(ref_match['kind']) if ref_match else (ROLE.get(qualifying[0]['kind']) if qualifying else None)),
            'evidence_class': a_cls,
            'session_id': p['session_id'],
            'native_id': p['native_id'],
            'ref_kind': p['ref_kind'],
            'span': p['span'], 'span_offset': p.get('span_offset'),
            'observed_at': (ref_match.get('observed_at') if ref_match else (qualifying[0].get('observed_at') if qualifying else None)),
            'source_text': st,
            'source_text_sha256': st_sha,
            'public_display_excerpt': disp,
            'redacted_spans': spans,
            'public_excerpt_redacted': bool(spans),
            'raw_exact_match_verified': exact,
            'independently_publicly_reproducible': bool(st is not None),
            'assertion': assertion,
            'assertion_sha256': sha256_text(assertion),
            'exact_match': exact,
            'start_utf8_byte': (off['start_utf8_byte'] if off else None),
            'end_utf8_byte_exclusive': (off['end_utf8_byte_exclusive'] if off else None),
            'evidence_status': status,
        })

        full_matrix.append(binding)

        # provenance concerns
        item_concerns = []
        if a_cls == 'assistant-reported':
            item_concerns.append('assistant-reported: source proves the assistant said this; not independent verification of the proposition')
        if a_cls == 'user-stated':
            item_concerns.append('user-stated: source is user text; interrogative/instructional user text is not by itself a verified fact')
            if is_user_interrogative:
                item_concerns.append('user interrogative/instructional text promoted into a factual assertion')
        if a_cls == 'tool-reported':
            item_concerns.append('tool-reported: source is observed tool output; authority limited to the tool run itself')
        if fact.get('temporal_status') == 'observed' and a_cls == 'assistant-reported':
            item_concerns.append('temporal_status=observed retained, but assistant observation is not independently verified (not a currently verified fact)')
        concerns.append({'item': n, 'record_id': rec_id, 'evidence_class': a_cls,
                        'evidence_status': status, 'concerns': item_concerns,
                        'human_verdict_required': True,
                        'operator_review_recommendation': 'independent operator verdict required for grounded/authority/scope; local match is extractive only'})

    with open(os.path.join(OUT, 'fact-source-bindings.jsonl'), 'w') as f:
        for b in bindings: f.write(json.dumps(b) + '\n')
    with open(os.path.join(OUT, 'native-event-source-evidence.jsonl'), 'w') as f:
        for e in native_evidence: f.write(json.dumps(e) + '\n')
    agg['counts_by_status'] = {}
    for b in bindings:
        agg['counts_by_status'][b['evidence_status']] = agg['counts_by_status'].get(b['evidence_status'], 0) + 1
    with open(os.path.join(OUT, 'source-match-reproduction.json'), 'w') as f:
        json.dump(agg, f, indent=2)
    with open(os.path.join(OUT, 'authority-temporal-review.json'), 'w') as f:
        json.dump({'items': concerns}, f, indent=2)
    with open(os.path.join(OUT, 'full-matrix.json'), 'w') as f:
        json.dump(full_matrix, f, indent=2)

    print('wrote', len(bindings), 'bindings')
    print('status counts:', agg['counts_by_status'])
    print('offset_verified:', agg['offset_verified'], 'offset_unverified:', agg['offset_unverified'])
    print('actor_available:', agg['actor_available'], 'actor_unavailable:', agg['actor_unavailable'])
    print('timestamp_available:', agg['timestamp_available'], 'timestamp_unavailable:', agg['timestamp_unavailable'])
    print('multiple_qualifying_matches:', agg['multiple_qualifying_matches'])
    print('source_ref_consistent_match_found:', agg['source_ref_consistent_match_found'])

if __name__ == '__main__':
    main()
