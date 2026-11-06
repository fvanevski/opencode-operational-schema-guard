/** Stock OpenCode V2 candidate. Opt-in only; no host mutation on import. */
import path from 'node:path';
import os from 'node:os';
import { GraphitiMcp, Journal, Memory, selectUserDecision, selectCompletedTest, formatContext, safeText } from './memory-core.mjs';
import { localReranker } from './relevance.mjs';
const OPEN = '[GHDEV_GRAPHITI_CONTEXT]';
const CLOSE = '[/GHDEV_GRAPHITI_CONTEXT]';
function config(ctx) {
  const x = ctx.options ?? {};
  return {
    enabled: x.enabled === true,
    capture: x.capture === true,
    group: typeof x.group === 'string' ? x.group : '',
    endpoint: typeof x.endpoint === 'string' ? x.endpoint : 'http://127.0.0.1:8766/mcp',
    // Disabled by default until the independent reranker service and latency
    // are qualified without sharing the single-concurrency extraction LLM.
    rerankEndpoint: typeof x.rerankEndpoint === 'string' ? x.rerankEndpoint : '',
    stateDir: typeof x.stateDir === 'string' ? x.stateDir :
      path.join(process.env.XDG_STATE_HOME || path.join(os.homedir(), '.local', 'state'), 'ghdev-graphiti'),
  };
}
// Installed stock-V2 wire may encode prompt.text as a JSON string literal.
// Decode only a complete string literal, not arbitrary JSON or model text.
export function promptText(value) {
  if (typeof value !== 'string') return '';
  if (value.startsWith('{') || value.startsWith('[')) return '';
  if (!value.startsWith('"')) return value;
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'string' ? parsed : '';
  } catch { return ''; }
}

const MAX_RECALL_PROMPTS_PER_SESSION = 8;
const MAX_RECALL_SESSIONS = 100;
function nativePromptID(event) {
  const id = event?.messageID ?? event?.messageId ?? event?.promptID ??
    event?.promptId ?? event?.prompt?.messageID ?? event?.prompt?.messageId ??
    event?.prompt?.id;
  return typeof id === 'string' && id.length > 0 && id.length <= 200 ? id : null;
}
function nativeUserText(message) {
  const parts = Array.isArray(message?.parts) ? message.parts :
    Array.isArray(message?.content) ? message.content : [];
  return safeText(parts.filter(p => p?.type === 'text' && typeof p.text === 'string')
    .map(p => p.text).join(' '), 500);
}
// Associate native context with an actual user message, not whichever
// auxiliary/title prompt happened to fire last for this session.
function requestForContext(entries, event) {
  if (!entries?.length) return null;
  const messages = event.messages;
  if (Array.isArray(messages) && messages.length) {
    const currentUser = [...messages].reverse().find(m => m?.role === 'user');
    if (!currentUser) return null;
    const id = typeof currentUser.id === 'string' ? currentUser.id :
      (typeof currentUser.messageID === 'string' ? currentUser.messageID : null);
    if (id) {
      const exact = entries.filter(e => e.nativeID === id);
      if (exact.length) return exact[exact.length - 1];
    }
    // Some stock-V2 prompt hooks lack a native ID. A text-exact match
    // against the current native user is then admissible, but a different
    // native ID is never silently treated as the same message.
    const text = nativeUserText(currentUser);
    if (!text) return null;
    const exactText = entries.filter(e => e.nativeID === null && e.text === text);
    return exactText.length ? exactText[exactText.length - 1] : null;
  }
  // Legacy hook surfaces expose no native messages. Never select an
  // arbitrary winner after multiple same-session prompts.
  return entries.length === 1 ? entries[0] : null;
}

function removeOwn(parts) {
  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i]?.type === 'text' && parts[i].text?.startsWith(OPEN)) parts.splice(i, 1);
  }
}
// Stock V2 accepts this standard plugin object directly; do not require a
// separately resolved @opencode/plugin shim at runtime.
export default {
  id: 'local.ghdev-graphiti-memory',
  async setup(ctx) {
    const settings = config(ctx);
    if (!settings.enabled || !settings.group) return;
    const graphiti = new GraphitiMcp(settings.endpoint);
    const store = new Journal(settings.stateDir, settings.group);
    const ranker = settings.rerankEndpoint ? localReranker(settings.rerankEndpoint) : null;
    const extraSourceResolver = typeof ctx.options?.sourcedEpisodeResolver === 'function'
      ? ctx.options.sourcedEpisodeResolver : null;
    const memory = new Memory({ journal: store, graphiti, group: settings.group,
      ranker, extraSourceResolver });
    const registrations = [];
    const pending = new Map();
    const recallPrompts = new Map();
    let stopped = false;
    // Only stage candidates in live hooks. A post-harness exclusive runner
    // owns Graphiti submissions and must hold the lease until terminal readback.
    const register = async (f) => registrations.push(await f());
    try {
      await register(() => ctx.session.hook('prompt', event => {
        if (!event?.sessionID) return;
        const text = promptText(event.prompt?.text);
        if (!text) return;
        // Only remember after the admitted prompt reaches a model context build.
        if (settings.capture) {
          const candidate = selectUserDecision(text);
          if (candidate) pending.set(event.sessionID, { candidate, time: new Date().toISOString() });
        }
        // The entire normalized query is subject to the original privacy,
        // control-character and 500-character fence. Rejected auxiliary
        // prompts must not evict a valid, source-bound user search.
        const bounded = safeText(text, 500);
        if (!bounded || bounded.length < 10) return;
        const entries = recallPrompts.get(event.sessionID) || [];
        entries.push({ nativeID: nativePromptID(event), text: bounded,
          request: memory.search(bounded).catch(() => []) });
        if (entries.length > MAX_RECALL_PROMPTS_PER_SESSION) entries.shift();
        recallPrompts.delete(event.sessionID);
        recallPrompts.set(event.sessionID, entries);
        if (recallPrompts.size > MAX_RECALL_SESSIONS)
          recallPrompts.delete(recallPrompts.keys().next().value);
      }));
      await register(() => ctx.tool.hook('execute.after', async event => {
        if (!settings.capture || !event?.sessionID || stopped) return;
        const selected = selectCompletedTest(event);
        if (!selected) return;
        await memory.stage(selected, { sessionID: event.sessionID,
          toolID: event.callID || event.id || 'completed-tool', time: new Date().toISOString() });
      }));
      await register(() => ctx.session.hook('context', async event => {
        if (stopped || !event?.sessionID || !Array.isArray(event.system)) return;
        removeOwn(event.system);
        const queued = pending.get(event.sessionID);
        if (queued) {
          pending.delete(event.sessionID);
          try {
            await memory.stage(queued.candidate, { sessionID: event.sessionID, time: queued.time });
          } catch { /* Nonessential memory cannot block agent operation. */ }
        }
        const selected = requestForContext(recallPrompts.get(event.sessionID), event);
        if (!selected) return;
        // Never wait for Graphiti beyond this context allowance.
        const items = await Promise.race([
          selected.request, new Promise(resolve => setTimeout(() => resolve([]), 300)),
        ]);
        const body = formatContext(items);
        if (body) event.system.push({ type: 'text', text: OPEN + '\n' + body + '\n' + CLOSE });
      }));
      await register(() => ctx.session.hook('compaction', event => {
        if (event?.sessionID) recallPrompts.delete(event.sessionID);
        // Broad compaction content stays with OpenViking, not Graphiti.
      }));
    } catch (error) {
      await Promise.allSettled(registrations.map(r => r.dispose()));
      throw error;
    }
    // No startup ingestion or reconciliation while the interactive model is active.
    return async () => {
      stopped = true;
      pending.clear(); recallPrompts.clear();
      await Promise.allSettled(registrations.map(r => r.dispose()));
    };
  },
};
