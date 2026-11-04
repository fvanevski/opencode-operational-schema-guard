/** Opt-in Stage-1 capture wrapper. Existing Issue #75 recall remains the control. */
import path from 'node:path';
import os from 'node:os';
import baseline from '../../issue-75/v2-candidate/plugin.mjs';
import { fromPromptCandidates, fromTool, fromFinishedTurn } from './events.mjs';
import { CandidateQueue } from './queue.mjs';
import { sourcedEpisodeResolver } from '../v2-curator/sourced-recall.mjs';

export { fromFinishedTurn }; // For a separately authenticated completed-turn adapter.
export default {
  id: 'local.ghdev-graphiti-memory-candidate-v1',
  async setup(ctx) {
    const options = ctx.options || {};
    if (options.enabled !== true || !options.group) return;
    const workspace = options.workspace || ctx.directory || '';
    const project = options.project || (path.isAbsolute(workspace) ? path.basename(workspace) : '');
    const scope = { group: options.group, workspace, project };
    const root = options.stateDir || path.join(process.env.XDG_STATE_HOME ||
      path.join(os.homedir(), '.local', 'state'), 'ghdev-graphiti');
    const resolver = path.isAbsolute(workspace) && project
      ? ids => sourcedEpisodeResolver(root,options.group,workspace,project,ids) : null;
    // Preserve the accepted Issue #75 native context/recall adapter. In
    // addition to its legacy journal, admit only confirmed curated episode
    // mappings from the same exact group/workspace, without LLM in hooks.
    const baselineCleanup = await baseline.setup({ ...ctx,
      options: { ...options, capture: false, sourcedEpisodeResolver: resolver } });
    if (options.capture !== true) return baselineCleanup;
    if (!path.isAbsolute(workspace) || !project) {
      if (baselineCleanup) await baselineCleanup();
      throw Error('Capture requires an explicit absolute workspace/project binding');
    }
    const queue = new CandidateQueue(root, options.group, { maxItems: options.maxItems || 4000 });
    const pending = new Map();
    const lastAdmittedPrompt = new Map();
    // Stock-V2 context exposes earlier finished assistant messages with native IDs.
    // Seen IDs fence redelivery in a process; the durable queue dedups across restarts.
    const seenAssistant = new Map();
    // Bounded process-local hints only; the durable queue owns dedup across
    // evictions, restarts and compactions.
    const MAX_SESSIONS = 64, MAX_SEEN_PER_SESSION = 256;
    const MAX_CONTEXT_MESSAGES = 512, MAX_INFLIGHT = 128;
    const registrations = [], inflight = new Set();
    let stopped = false;
    const warn = reason => { try { ctx.logger?.warn?.('candidate capture: ' + reason); } catch {} };
    const track = p => { inflight.add(p); p.finally(() => inflight.delete(p)); };
    const noteDrop = reason => track(queue.recordDrop(reason)
      .catch(() => warn('drop_counter_write_failure')));
    const enqueue = event => {
      if (!event || stopped) return;
      if (inflight.size >= MAX_INFLIGHT) {
        warn('capture_backpressure'); noteDrop('capture_backpressure'); return;
      }
      const p = queue.stage(event).then(outcome => {
        if (!['staged', 'duplicate'].includes(outcome.status))
          warn('queue ' + outcome.status);
      }).catch(err => warn(err?.message?.startsWith('candidate_queue_busy') ?
        'queue_busy' : 'queue_write_failure'));
      track(p);
    };
    try {
      registrations.push(await ctx.session.hook('prompt', event => {
        if (stopped || !event?.sessionID) return;
        const list = pending.get(event.sessionID) || [];
        if (!pending.has(event.sessionID) && pending.size >= MAX_SESSIONS) {
          warn('pending_session_overflow'); noteDrop('pending_session_overflow'); return;
        }
        if (list.length >= 4) {
          warn('pending_prompt_overflow'); noteDrop('pending_prompt_overflow'); return;
        }
        list.push(event); pending.set(event.sessionID, list);
      }));
      registrations.push(await ctx.session.hook('context', event => {
        if (stopped || !event?.sessionID || !Array.isArray(event.system)) return;
        const list = pending.get(event.sessionID) || [];
        pending.delete(event.sessionID);
        for (const observed of list) {
          const sources = fromPromptCandidates(observed, scope, { admitted: true });
          if (!sources.length) continue;
          // Anchor downstream tool/assistant outcomes to the first original
          // message span, never a synthetic assertion or an inferred result.
          lastAdmittedPrompt.delete(event.sessionID);
          lastAdmittedPrompt.set(event.sessionID, sources[0].event_id);
          if (lastAdmittedPrompt.size > MAX_SESSIONS)
            lastAdmittedPrompt.delete(lastAdmittedPrompt.keys().next().value);
          for (const source of sources) enqueue(source);
        }
        // Only messages already present when a later context is built are treated
        // as completed. No speculative finished-turn bus hook is registered.
        const msgs = Array.isArray(event.messages) ? event.messages : [];
        if (msgs.length > MAX_CONTEXT_MESSAGES) {
          warn('assistant_context_truncated'); noteDrop('assistant_context_truncated');
        }
        const recent = msgs.slice(-MAX_CONTEXT_MESSAGES);
        const seen = seenAssistant.get(event.sessionID) || new Set();
        for (const m of recent) {
          if (m?.role !== 'assistant' || typeof m?.id !== 'string' || seen.has(m.id)) continue;
          seen.add(m.id);
          if (seen.size > MAX_SEEN_PER_SESSION) seen.delete(seen.values().next().value);
          const parts = Array.isArray(m.parts) ? m.parts
            : Array.isArray(m.content) ? m.content : [];
          const text = parts.filter(p => p?.type === 'text' && typeof p.text === 'string')
            .map(p => p.text).join(' ');
          const turn = fromFinishedTurn({ sessionID: event.sessionID, messageID: m.id,
            role: 'assistant', status: 'completed', text }, scope);
          const anchor = lastAdmittedPrompt.get(event.sessionID);
          enqueue(turn && anchor ? { ...turn, related_event_ids:
            [...turn.related_event_ids, anchor].slice(0, 8) } : turn);
        }
        if (seen.size) {
          seenAssistant.delete(event.sessionID);
          seenAssistant.set(event.sessionID, seen);
          if (seenAssistant.size > MAX_SESSIONS)
            seenAssistant.delete(seenAssistant.keys().next().value);
        }
      }));
      registrations.push(await ctx.tool.hook('execute.after', event => {
        if (stopped) return;
        const outcome = fromTool(event, scope);
        const anchor = lastAdmittedPrompt.get(event?.sessionID);
        enqueue(outcome && anchor ? { ...outcome, related_event_ids:
          [...outcome.related_event_ids, anchor].slice(0, 8) } : outcome);
      }));
      registrations.push(await ctx.session.hook('compaction', event => {
        if (event?.sessionID) pending.delete(event.sessionID);
      }));
    } catch (e) {
      await Promise.allSettled(registrations.map(x => x.dispose()));
      if (baselineCleanup) await baselineCleanup();
      throw e;
    }
    // No Graphiti write, local LLM or remote admission during interactive hooks.
    // Native stock V2.2.5 qualification observed finished assistant messages
    // through later context builds (not message.updated/session.idle bus events).
    return async () => {
      stopped = true; pending.clear(); seenAssistant.clear(); lastAdmittedPrompt.clear();
      await Promise.allSettled(registrations.map(x => x.dispose()));
      await Promise.allSettled([...inflight]);
      if (baselineCleanup) await baselineCleanup();
    };
  },
};
