/** Source-attributed, bounded candidate evidence; nothing here is a verified Graphiti fact. */
import { createHash } from 'node:crypto';

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
export function fromPrompt(event, scope, { admitted = false } = {}) {
  if (!admitted) return null; // Do not record an unadmitted speculative prompt.
  const sessionID = field(event, ['sessionID', 'sessionId']);
  const raw = event?.prompt?.text;
  let text = typeof raw === 'string' ? raw : '';
  if (text.startsWith('"')) {
    try { const value = JSON.parse(text); text = typeof value === 'string' ? value : ''; }
    catch { text = ''; }
  }
  const excerpt = cleanExcerpt(text);
  if (!excerpt || excerpt.length < 24 || CHATTER.test(excerpt) || /^[?!. ]+$/.test(excerpt)) return null;
  if (/[{}]/.test(excerpt) && excerpt.length > 400) return null; // JSON/source dumps are not candidate prose.
  const nativeID = field(event, ['messageID', 'messageId', 'promptID', 'promptId']) ||
    field(event?.prompt, ['messageID', 'messageId', 'id']);
  const sourceID = valid(nativeID) ? nativeID : sha(excerpt).slice(0, 32);
  return envelope(scope, { kind: 'user_turn', evidenceClass: 'user-stated',
    sourceType: valid(nativeID) ? 'message' : 'prompt', sourceID, weak: !valid(nativeID),
    sessionID, excerpt, time: event?.timestamp || event?.time, related: event?.related_event_ids });
}
export function fromTool(event, scope) {
  if (!['completed', 'error', 'failed'].includes(event?.status)) return null;
  const sessionID = field(event, ['sessionID', 'sessionId']);
  const callID = field(event, ['callID', 'callId', 'id']);
  if (!valid(callID)) return null; // No stable call, no claim of tool provenance.
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
  const excerpt = cleanExcerpt(event?.text || '');
  if (!valid(messageID) || !excerpt || excerpt.length < 35 || CHATTER.test(excerpt)) return null;
  return envelope(scope, { kind: 'assistant_turn', evidenceClass: 'assistant-reported',
    sourceType: 'message', sourceID: messageID, sessionID: field(event, ['sessionID', 'sessionId']),
    excerpt, time: event?.timestamp || event?.time, related: event?.related_event_ids });
}
