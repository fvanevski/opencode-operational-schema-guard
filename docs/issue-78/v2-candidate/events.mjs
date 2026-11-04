/** Source-attributed, bounded candidate evidence; nothing here is a verified Graphiti fact. */
import { createHash } from 'node:crypto';
import path from 'node:path';

const SAFE_ID = /^[A-Za-z0-9_.:-]{1,160}$/;
const SAFE_SCOPE = /^[A-Za-z0-9_.-]{1,100}$/;
const PRIVATE = /<private\b|<\/private>|BEGIN (?:[A-Z ]+ )?PRIVATE KEY|(?:api[_-]?key|access[_-]?token|password|secret|client_secret)\s*[:=]|authorization\s*:\s*bearer|gh[pousr]_[A-Za-z0-9]{18,}|sk-[A-Za-z0-9_-]{16,}|AKIA[0-9A-Z]{16}/i;
const SELF = /\[GHDEV_GRAPHITI_CONTEXT\]|\[\/GHDEV_GRAPHITI_CONTEXT\]|\[OPENVIKING_CONTEXT\]|Source reference:\s*opencode:/i;
const CHATTER = /^(?:ok(?:ay)?|thanks|thank you|great|yes|no|continue|proceed|got it|hello|hi|done)[.! ]*$/i;
const READ_ONLY_NOISE = /^(?:pwd|ls|cat|head|tail|grep|rg|find|wc|sed|awk)\b/i;
const TOOL_INTEREST = /\b(?:pytest|test|spec|build|compile|lint|format|check|error|fail|pass|exception|traceback|migration|npm|node|python|cargo|go|git|gh|patch|install|deploy|permission|config|service|docker|curl|timeout)\b/i;
const RESULT_INTEREST = /\b(?:pass(?:ed)?|fail(?:ed|ure)?|error|exception|traceback|warning|changed|modified|created|deleted|exit(?:ed)?|timeout|denied|success|diff|build|test)\b/i;

export const sha = text => createHash('sha256').update(text).digest('hex');
const valid = (s, re = SAFE_ID) => typeof s === 'string' && re.test(s);
export function cleanExcerpt(value, max = 1100) {
  if (typeof value !== 'string' || value.length > 16000 || /[\0-\u0008\u000b\u000e-\u001f]/u.test(value)) return '';
  const text = value.replace(/\s+/g, ' ').trim();
  if (!text || text.length > max || PRIVATE.test(text) || SELF.test(text)) return '';
  return text;
}
// Only assistant text parts qualify. Scan the ENTIRE bounded message before
// truncating, so a secret or memory-context marker past the excerpt boundary
// cannot be hidden by truncation.
function assistantExcerpt(raw) {
  if (typeof raw !== 'string' || raw.length > 16000 ||
    PRIVATE.test(raw) || SELF.test(raw) ||
    /[\0-\u0008\u000b\u000e-\u001f]/u.test(raw)) return '';
  const condensed = raw.replace(/\s+/g, ' ').trim();
  if (condensed.length <= 1100) return cleanExcerpt(condensed);
  const head = condensed.slice(0, 1050);
  const wordEnd = head.lastIndexOf(' ');
  return cleanExcerpt((wordEnd >= 800 ? head.slice(0, wordEnd) : head) +
    ' [truncated; source is a completed assistant turn]');
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
  let text = typeof raw === 'string' ? raw : '';
  if (text.startsWith('"')) {
    try { const value = JSON.parse(text); text = typeof value === 'string' ? value : ''; }
    catch { return ''; }
  }
  return text;
}
function promptSpans(text) {
  const spans = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + PROMPT_SPAN_CHARS, text.length);
    if (end < text.length) {
      const wordEnd = text.lastIndexOf(' ', end);
      // Do not cut a word if a nearby boundary is available.
      if (wordEnd >= start + 600) end = wordEnd;
    }
    const excerpt = text.slice(start, end).trim();
    // Retain narrative spans, not source/JSON fragments. This check is
    // applied per span, not to an otherwise useful entire long message.
    if (excerpt.length >= 24 && !CHATTER.test(excerpt) &&
      !/[{}]/.test(excerpt) && /\s/.test(excerpt))
      spans.push({ excerpt, offset: start });
    start = end;
    while (text[start] === ' ') start++;
  }
  if (spans.length <= MAX_PROMPT_SPANS) return spans;
  // Deterministic coverage of the whole source (including its tail), rather
  // than silently capturing only the beginning of a large user message.
  return Array.from({ length: MAX_PROMPT_SPANS }, (_, i) =>
    spans[Math.round(i * (spans.length - 1) / (MAX_PROMPT_SPANS - 1))]);
}
export function fromPromptCandidates(event, scope, { admitted = false } = {}) {
  if (!admitted) return []; // Only prompts observed in an admitted native context.
  const sessionID = field(event, ['sessionID', 'sessionId']);
  const text = promptText(event);
  if (!text || text.length > MAX_LONG_PROMPT_CHARS ||
    PRIVATE.test(text) || SELF.test(text) ||
    /[\0-\u0008\u000b\u000e-\u001f]/u.test(text)) return [];
  const condensed = text.replace(/\s+/g, ' ').trim();
  if (!condensed || CHATTER.test(condensed) || /^[?!. ]+$/.test(condensed) ||
    (condensed.length <= 1100 && condensed.length > 400 && /[{}]/.test(condensed))) return [];
  const nativeID = field(event, ['messageID', 'messageId', 'promptID', 'promptId']) ||
    field(event?.prompt, ['messageID', 'messageId', 'id']);
  const qualified = valid(nativeID);
  // Weak content-hash fallback is retained for short prompts only. Long
  // message segmentation requires an authentic stable native message ID.
  if (condensed.length > 1100 && !qualified) return [];
  const isLong = condensed.length > 1100;
  const segments = !isLong
    ? [{ excerpt: condensed, offset: 0 }]
    : promptSpans(condensed);
  return segments.map(({ excerpt, offset }) => {
    if (!cleanExcerpt(excerpt) || excerpt.length < 24) return null;
    // Even one surviving span of a long message remains PARTIAL evidence.
    const sourceID = qualified
      ? (isLong ? nativeID + ':span:' + offset : nativeID)
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
const FILE_TOOLS = new Set(['edit', 'write', 'apply_patch']);
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
      PRIVATE.test(patch) || SELF.test(patch)) return null;
    files = [...patch.matchAll(/^\*\*\* (?:Add|Update|Delete) File: (.+)$/gm)]
      .map(m => m[1]);
    if (!files.length || files.length > 4) return null;
  } else {
    const body = input.content ?? input.newString ?? input.oldString ?? '';
    if (typeof body !== 'string' || body.length > 32000 ||
      PRIVATE.test(body) || SELF.test(body)) return null;
    files = [input.filePath ?? input.file_path ?? input.path];
  }
  const relative = files.map(file => scopedFile(file, scope.workspace));
  if (relative.some(x => !x)) return null;
  const excerpt = cleanExcerpt('tool ' + event.status + ': ' + name +
    ' reported file operation on ' + relative.join(', ') +
    ' (not independently verified)');
  if (!excerpt) return null;
  return envelope(scope, { kind: 'file_change', evidenceClass: 'tool-reported',
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
  if (!cmd || READ_ONLY_NOISE.test(cmd) || !TOOL_INTEREST.test(cmd)) return null;
  const result = event.result;
  const exit = result?.exitCode ?? result?.exit_code ?? result?.code ??
    result?.output?.exit ?? result?.metadata?.exit;
  const output = result?.output?.output ?? result?.output?.stdout ??
    (typeof result?.output === 'string' ? result.output : result?.stdout ?? '');
  if (typeof output !== 'string' || output.length > 16000 || PRIVATE.test(output) || SELF.test(output)) return null;
  const lines = output.split(/\r?\n/).filter(x => RESULT_INTEREST.test(x)).slice(0, 3);
  const evidence = lines.join(' ').slice(0, 650);
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
