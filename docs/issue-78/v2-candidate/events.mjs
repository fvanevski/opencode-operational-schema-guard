/** Source-attributed, bounded candidate evidence; nothing here is a verified Graphiti fact. */
import { createHash } from 'node:crypto';
import path from 'node:path';

const SAFE_ID = /^[A-Za-z0-9_.:-]{1,160}$/;
const SAFE_SCOPE = /^[A-Za-z0-9_.-]{1,100}$/;
const PRIVATE = /<private\b|<\/private>|BEGIN (?:[A-Z ]+ )?PRIVATE KEY|(?:(?:api[_-]?key|access[_-]?token|password|secret|client_secret)\s*[:=]|["'](?:api[_-]?key|access[_-]?token|password|secret|client_secret)["']\s*:)|authorization\s*:\s*bearer|gh[pousr]_[A-Za-z0-9]{18,}|sk-[A-Za-z0-9_-]{16,}|AKIA[0-9A-Z]{16}/i;
const PRIVATE_VALUE = /\b(?:api[_ -]?key|api[_ -]?token|access[_ -]?token|client[_ -]?secret|bearer[_ -]?token|password|passwd|secret)\b(?:\s+for\s+[a-z0-9_.-]+)?\s*(?:(?::|=|=>)\s*|(?:is|was|were|are|equals|set\s+to)\s+)(?!["'\u0060]?(?:in|at|under|inside|on|stored|located|available|missing|unset|blank|redacted|configured|required|valid|invalid|needed|generated|included|found|specified|removed)\b)["'\u0060]?[a-z0-9_./+=!@#$%^&*-]{4,}/i;
const containsPrivateValue = text => PRIVATE.test(text) || PRIVATE_VALUE.test(text);
const SELF = /\[GHDEV_GRAPHITI_CONTEXT\]|\[\/GHDEV_GRAPHITI_CONTEXT\]|\[OPENVIKING_CONTEXT\]|Source reference:\s*opencode:/i;
const CHATTER = /^(?:ok(?:ay)?|thanks|thank you|great|yes|no|continue|proceed|got it|hello|hi|done)[.! ]*$/i;
// Tool/command names are no longer eligibility vetoes. Preserve source
// authenticity and hard privacy limits; model curation judges usefulness.
const RESULT_INTEREST = /\b(?:pass(?:ed)?|fail(?:ed|ure)?|error|exception|traceback|warning|changed|modified|created|deleted|exit(?:ed)?|timeout|denied|success|diff|build|test)\b/i;

export const sha = text => createHash('sha256').update(text).digest('hex');
const valid = (s, re = SAFE_ID) => typeof s === 'string' && re.test(s);
export function cleanExcerpt(value, max = 1100) {
  if (typeof value !== 'string' || value.length > 16000 || /[\0-\u0008\u000b\u000e-\u001f]/u.test(value)) return '';
  // The excerpt itself is evidence: retain its literal internal whitespace.
  const text = value.trim();
  if (!text || text.length > max || containsPrivateValue(text) || SELF.test(text)) return '';
  return text;
}
// Only assistant text parts qualify. Scan the ENTIRE bounded message before
// truncating, so a secret or memory-context marker past the excerpt boundary
// cannot be hidden by truncation.
function assistantExcerpt(raw) {
  if (typeof raw !== 'string' || raw.length > 16000 ||
    containsPrivateValue(raw) || SELF.test(raw) ||
    /[\0-\u0008\u000b\u000e-\u001f]/u.test(raw)) return '';
  const literal = raw.trim();
  if (literal.length <= 1100) return cleanExcerpt(literal);
  const head = literal.slice(0, 1050);
  const wordEnd = head.lastIndexOf(' ');
  // A synthetic truncation marker would not be a verbatim source quotation.
  return cleanExcerpt(wordEnd >= 800 ? head.slice(0, wordEnd) : head);
}

function stamp(time) {
  const v = time ? new Date(time) : new Date();
  return Number.isFinite(v.getTime()) ? v.toISOString() : null;
}
function field(event, names) {
  for (const name of names) {
    if (typeof event?.[name] === 'string' && event[name]) return event[name];
  }
  return '';
}
function envelope(scope, data) {
  const { group, project, workspace } = scope || {};
  if (!valid(group, SAFE_SCOPE) || !valid(project, SAFE_SCOPE) ||
    typeof workspace !== 'string' || !workspace.startsWith('/') || workspace.length > 1024 ||
    workspace.includes('\0') || workspace.includes('\n')) return null;
  const session = data.sessionID;
  const sourceID = data.sourceID;
  const excerpt = cleanExcerpt(data.excerpt);
  const when = stamp(data.time);
  if (!valid(session) || !valid(sourceID) || !excerpt || !when) return null;
  // Event identity is source occurrence identity, NOT normalized assertion text.
  // A native message/tool ID distinguishes two identical statements. The
  // prompt fallback coalesces identical texts *within one session* and is
  // explicitly labelled weak until native message identifiers are qualified.
  const identity = [1, group, project, workspace, session, data.kind, sourceID].join('\n');
  const eventID = sha(identity);
  const sourceRef = 'opencode:' + session + ':' + data.sourceType + ':' + sourceID;
  const related = (data.related || []).filter(x => typeof x === 'string' && /^[0-9a-f]{64}$/.test(x)).slice(0, 8);
  return Object.freeze({
    schema_version: 1, event_id: eventID, session_id: session,
    project, workspace, group, observed_at: when,
    evidence_class: data.evidenceClass, kind: data.kind,
    source_refs: [sourceRef], source_strength: data.weak ? 'session-scoped-fallback' : 'native-id',
    related_event_ids: [...new Set(related)], cluster_key: sha(group + '\n' + session).slice(0, 24),
    excerpt, state: 'new',
  });
}
// Long admitted user prompts have bounded, independent *contiguous* source
// spans. Full-input privacy/SELF checks run BEFORE any span is derived; omitted
// context is not a fact. This is not summary generation and runs without an LLM.
// At most six small spans from one native message bound hook/queue/curator load.
const MAX_LONG_PROMPT_CHARS = 16000;
const PROMPT_SPAN_CHARS = 900;
const MAX_PROMPT_SPANS = 6;
function promptText(event) {
  const raw = event?.prompt?.text;
  if (typeof raw !== 'string') return '';
  if (!raw.startsWith('"')) return raw;
  let decoded;
  try { decoded = JSON.parse(raw); }
  catch {
    // Some live native producers quote an entire multi-line user message
    // without escaping literal CR/LF/TAB. Repair only those whitespace
    // controls inside a complete string wrapper. Do NOT repair arbitrary
    // invalid JSON, or strip other controls that must fail closed.
    if (!raw.endsWith('"') || !/[\r\n\t]/.test(raw)) return '';
    const escaped = raw.replace(/[\r\n\t]/g, c =>
      c === '\r' ? '\\r' : c === '\n' ? '\\n' : '\\t');
    try { decoded = JSON.parse(escaped); }
    catch { return ''; }
  }
  // fromPromptCandidates still scans the entire decoded text for secrets,
  // SELF injection, disallowed controls and length before any span exists.
  return typeof decoded === 'string' ? decoded : '';
}
function promptSpans(text) {
  const spans = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + PROMPT_SPAN_CHARS, text.length);
    if (end < text.length) {
      const wordEnd = text.lastIndexOf(' ', end);
      if (wordEnd >= start + 600) end = wordEnd;
    }
    const raw = text.slice(start, end);
    const leading = raw.length - raw.trimStart().length;
    const excerpt = raw.trim();
    if (excerpt.length >= 24 && !CHATTER.test(excerpt) && /\s/.test(excerpt))
      spans.push({ excerpt, offset: start + leading });
    start = end;
    while (text[start] === ' ') start++;
  }
  return spans;
}
/** Remove externally injected memory without ever joining nonadjacent
 * authored source regions. Each returned offset references the original,
 * decoded native prompt, not the normalized/rendered Graphiti assertion.
 * Malformed, nested or unmatched wrapper tags fail closed.
 */
export function authoredPromptFragments(text) {
  if (typeof text !== 'string') return null;
  const open = /<openviking-context(?:\s[^>]*)?>/gi;
  const close = /<\/openviking-context\s*>/i;
  const fragments = [];
  let match, offset = 0, removed = false;
  while ((match = open.exec(text))) {
    const before = text.slice(offset, match.index);
    if (close.test(before)) return null;
    if (before.trim()) fragments.push({ text: before, offset });
    const from = match.index + match[0].length;
    const remaining = text.slice(from);
    const closing = close.exec(remaining);
    if (!closing) return null;
    const nested = /<openviking-context(?:\s[^>]*)?>/i.exec(remaining);
    if (nested && nested.index < closing.index) return null;
    offset = from + closing.index + closing[0].length;
    removed = true;
    open.lastIndex = offset;
  }
  const trailing = text.slice(offset);
  if (close.test(trailing)) return null;
  if (trailing.trim()) fragments.push({ text: trailing, offset });
  return { fragments, removed };
}
// Backward-compatible single-fragment convenience. Multiple disjoint source
// regions have no legitimate single contiguous string representation.
export function withoutInjectedOpenVikingContext(text) {
  const result = authoredPromptFragments(text);
  return result?.fragments.length === 1
    ? result.fragments[0].text.trim() : '';
}
export function fromPromptCandidates(event, scope, { admitted = false } = {}) {
  if (!admitted) return [];
  const sessionID = field(event, ['sessionID', 'sessionId']);
  const text = promptText(event);
  // Scan the complete ORIGINAL decoded message before removing any injected
  // content, truncation or segmentation. Rejected original input stays out.
  if (!text || text.length > MAX_LONG_PROMPT_CHARS ||
    containsPrivateValue(text) ||
    /[\0-\u0008\u000b\u000e-\u001f]/u.test(text)) return [];
  const authored = authoredPromptFragments(text);
  if (!authored || !authored.fragments.length ||
    authored.fragments.some(f => SELF.test(f.text))) return [];
  const nativeID = field(event, ['messageID', 'messageId', 'promptID', 'promptId']) ||
    field(event?.prompt, ['messageID', 'messageId', 'id']);
  const qualified = valid(nativeID);
  // Weak source IDs cannot authenticate long, split or memory-stripped input.
  if (!qualified && (text.length > 1100 || authored.removed ||
    authored.fragments.length !== 1)) return [];
  const segments = [];
  for (const fragment of authored.fragments) {
    const original = fragment.text;
    const stripped = original.trim();
    if (!stripped || CHATTER.test(stripped) || /^[?!. ]+$/.test(stripped))
      continue;
    const local = original.length > 1100
      ? promptSpans(original)
      : (() => {
          const leading = original.length - original.trimStart().length;
          return [{ excerpt: stripped, offset: leading }];
        })();
    for (const part of local) {
      if (part.excerpt.length < 24 || !cleanExcerpt(part.excerpt)) continue;
      if (!text.includes(part.excerpt) ||
        text.slice(fragment.offset + part.offset,
          fragment.offset + part.offset + part.excerpt.length) !== part.excerpt)
        throw Error('NATIVE_SOURCE_OFFSET_INVALID');
      segments.push({ excerpt: part.excerpt,
        offset: fragment.offset + part.offset });
    }
  }
  // Reserve the opening scope AND the first detailed continuation. Uniform
  // sampling skipped actionable evidence immediately after long preambles.
  // Keep the remaining four positions distributed through the message, tail
  // included; every selected excerpt remains an authentic contiguous span.
  const selected = segments.length <= MAX_PROMPT_SPANS ? segments :
    [segments[0], segments[1],
      ...Array.from({length: MAX_PROMPT_SPANS - 2}, (_, i) =>
        segments[Math.round(1 + (i + 1) * (segments.length - 2) /
          (MAX_PROMPT_SPANS - 2))])];
  const partial = text.length > 1100 || authored.removed ||
    authored.fragments.length > 1;
  return selected.map(({ excerpt, offset }) => {
    const sourceID = qualified
      ? (partial || offset !== 0 ? nativeID + ':span:' + offset : nativeID)
      : sha(excerpt).slice(0, 32);
    if (!valid(sourceID)) return null;
    return envelope(scope, { kind: 'user_turn', evidenceClass: 'user-stated',
      sourceType: qualified ? 'message' : 'prompt', sourceID, weak: !qualified,
      sessionID, excerpt, time: event?.timestamp || event?.time,
      related: event?.related_event_ids });
  }).filter(Boolean);
}
export function fromPrompt(event, scope, options = {}) {
  // Compatibility with existing binary capture/evaluation consumers. The
  // installed native plugin stages ALL authenticated spans separately.
  return fromPromptCandidates(event, scope, options)[0] || null;
}
// Host-qualified execute.after exposes tool/callID, but native edit/write
// tools do not have shell-command inputs. Their receipts are observations,
// NOT independently verified repository changes. Never persist file contents,
// patch hunks, raw tool output, or external/secret-looking filenames.
const FILE_TOOLS = new Set(['edit', 'write', 'apply_patch', 'read']);
const PRIVATE_PATH = /(?:^|\/)(?:\.env(?:\.[^/]*)?|\.ssh|\.npmrc|\.pypirc|id_(?:rsa|ed25519)|credentials?(?:\.[^/]*)?|secrets?(?:\.[^/]*)?)(?:\/|$)/i;
function scopedFile(raw, workspace) {
  if (typeof raw !== 'string' || raw.length < 1 || raw.length > 512 ||
    /[\0-\u001f]/u.test(raw) || !path.isAbsolute(workspace)) return null;
  const candidate = path.resolve(workspace, raw);
  const relative = path.relative(workspace, candidate);
  if (!relative || relative === '..' || relative.startsWith('..' + path.sep) ||
    path.isAbsolute(relative) || relative.length > 180 ||
    PRIVATE_PATH.test(relative)) return null;
  return relative.split(path.sep).join('/');
}
function fromFileTool(event, scope, sessionID, callID) {
  const name = typeof event.tool === 'string' ? event.tool.toLowerCase() : '';
  if (!FILE_TOOLS.has(name)) return null;
  if (typeof scope?.workspace !== 'string' || !path.isAbsolute(scope.workspace)) return null;
  const input = event.input || {};
  let files;
  if (name === 'apply_patch') {
    const patch = input.patch ?? input.patchText ?? input.patch_text;
    if (typeof patch !== 'string' || patch.length > 32000 ||
      containsPrivateValue(patch) || SELF.test(patch)) return null;
    files = [...patch.matchAll(/^\*\*\* (?:Add|Update|Delete) File: (.+)$/gm)]
      .map(m => m[1]);
    if (!files.length || files.length > 4) return null;
  } else {
    const body = input.content ?? input.newString ?? input.oldString ?? '';
    if (typeof body !== 'string' || body.length > 32000 ||
      containsPrivateValue(body) || SELF.test(body)) return null;
    files = [input.filePath ?? input.file_path ?? input.path];
  }
  const relative = files.map(file => scopedFile(file, scope.workspace));
  if (relative.some(x => !x)) return null;
  const reading=name==='read';
  const excerpt = cleanExcerpt('tool ' + event.status + ': ' + name +
    (reading?' reported file access to ':' reported file operation on ') + relative.join(', ') +
    (reading?' (contents not stored; not independently verified)':' (not independently verified)'));
  if (!excerpt) return null;
  return envelope(scope, { kind: reading?'file_access':'file_change', evidenceClass: 'tool-reported',
    sourceType: 'tool', sourceID: callID, sessionID, excerpt,
    time: event.timestamp || event.time, related: event.related_event_ids });
}

export function fromTool(event, scope) {
  if (!['completed', 'error', 'failed'].includes(event?.status)) return null;
  const sessionID = field(event, ['sessionID', 'sessionId']);
  const callID = field(event, ['callID', 'callId', 'id']);
  if (!valid(callID)) return null; // No stable call, no claim of tool provenance.
  if (FILE_TOOLS.has(event?.tool?.toLowerCase?.())) {
    return fromFileTool(event, scope, sessionID, callID);
  }
  const cmd = cleanExcerpt(event?.input?.command ?? event?.input?.cmd ?? '', 250);
  // Commands referencing sensitive paths cannot become private memory evidence.
  if (!cmd || PRIVATE_PATH.test(cmd.replace(/\s+/g,'/'))) return null;
  const result = event.result;
  const exit = result?.exitCode ?? result?.exit_code ?? result?.code ??
    result?.output?.exit ?? result?.metadata?.exit;
  const output = result?.output?.output ?? result?.output?.stdout ??
    (typeof result?.output === 'string' ? result.output : result?.stdout ?? '');
  if (typeof output !== 'string' || output.length > 16000 || containsPrivateValue(output) || SELF.test(output)) return null;
  const boundedLines=output.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  // Error/result markers prioritize, but never gate eligibility. Preserve
  // ordinary read-only command outputs when no marker exists.
  const matched=boundedLines.filter(x=>RESULT_INTEREST.test(x)).slice(0,3);
  const lines=matched.length?matched:boundedLines.slice(0,3);
  const evidence=lines.join(' ').slice(0,650);
  if (!evidence && exit === undefined && event.status === 'completed') return null;
  const label = exit === undefined ? 'tool status ' + event.status :
    'tool exit ' + String(exit);
  const excerpt = cleanExcerpt(label + '; command: ' + cmd + (evidence ? '; output: ' + evidence : ''), 1100);
  if (!excerpt) return null;
  return envelope(scope, { kind: 'tool_outcome', evidenceClass: 'tool-reported',
    sourceType: 'tool', sourceID: callID, sessionID, excerpt,
    time: event?.timestamp || event?.time, related: event?.related_event_ids });
}
export function fromFinishedTurn(event, scope) {
  // Adapter only: DO NOT register a guessed stock-V2 completion hook.
  // A host-qualified completed native message/event is required.
  if (event?.status !== 'completed' || event?.role !== 'assistant') return null;
  const messageID = field(event, ['messageID', 'messageId', 'id']);
  const excerpt = assistantExcerpt(event?.text || '');
  if (!valid(messageID) || !excerpt || excerpt.length < 35 || CHATTER.test(excerpt)) return null;
  return envelope(scope, { kind: 'assistant_turn', evidenceClass: 'assistant-reported',
    sourceType: 'message', sourceID: messageID, sessionID: field(event, ['sessionID', 'sessionId']),
    excerpt, time: event?.timestamp || event?.time, related: event?.related_event_ids });
}
