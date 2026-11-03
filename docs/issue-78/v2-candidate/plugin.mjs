/** Opt-in Stage-1 capture wrapper. Existing Issue #75 recall remains the control. */
import path from 'node:path';
import os from 'node:os';
import baseline from '../../issue-75/v2-candidate/plugin.mjs';
import { fromPrompt, fromTool, fromFinishedTurn } from './events.mjs';
import { CandidateQueue } from './queue.mjs';

export { fromFinishedTurn }; // For a separately authenticated completed-turn adapter.
export default {
  id: 'local.ghdev-graphiti-memory-candidate-v1',
  async setup(ctx) {
    const options = ctx.options || {};
    if (options.enabled !== true || !options.group) return;
    // Disable OLD capture in this isolated candidate; keep old verified recall.
    const baselineCleanup = await baseline.setup({ ...ctx,
      options: { ...options, capture: false } });
    if (options.capture !== true) return baselineCleanup;
    const workspace = options.workspace || ctx.directory || '';
    const project = options.project || (path.isAbsolute(workspace) ? path.basename(workspace) : '');
    const scope = { group: options.group, workspace, project };
    if (!path.isAbsolute(workspace) || !project) {
      if (baselineCleanup) await baselineCleanup();
      throw Error('Capture requires an explicit absolute workspace/project binding');
    }
    const root = options.stateDir || path.join(process.env.XDG_STATE_HOME ||
      path.join(os.homedir(), '.local', 'state'), 'ghdev-graphiti');
    const queue = new CandidateQueue(root, options.group, { maxItems: options.maxItems || 4000 });
    const pending = new Map();
    // Stock-V2 context exposes earlier finished assistant messages with native IDs.
    // Seen IDs fence redelivery in a process; the durable queue dedups across restarts.
    const seenAssistant = new Map();
    const registrations = [], inflight = new Set();
    let stopped = false;
    const warn = reason => { try { ctx.logger?.warn?.('candidate capture: ' + reason); } catch {} };
    const enqueue = event => {
      if (!event || stopped) return;
      const p = queue.stage(event).then(outcome => {
        if (!['staged', 'duplicate'].includes(outcome.status))
          warn('queue ' + outcome.status);
      }).catch(err => warn(err?.message?.startsWith('candidate_queue_busy') ?
        'queue_busy' : 'queue_write_failure'));
      inflight.add(p); p.finally(() => inflight.delete(p));
    };
    try {
      registrations.push(await ctx.session.hook('prompt', event => {
        if (stopped || !event?.sessionID) return;
        const list = pending.get(event.sessionID) || [];
        if (list.length >= 4) { warn('pending_prompt_overflow'); return; }
        list.push(event); pending.set(event.sessionID, list);
      }));
      registrations.push(await ctx.session.hook('context', event => {
        if (stopped || !event?.sessionID || !Array.isArray(event.system)) return;
        const list = pending.get(event.sessionID) || [];
        pending.delete(event.sessionID);
        for (const observed of list) enqueue(fromPrompt(observed, scope, { admitted: true }));
        // Only messages already present when a later context is built are treated
        // as completed. No speculative finished-turn bus hook is registered.
        const msgs = Array.isArray(event.messages) ? event.messages : [];
        const seen = seenAssistant.get(event.sessionID) || new Set();
        let fresh = 0;
        for (const m of msgs) {
          if (m?.role !== 'assistant' || typeof m?.id !== 'string' || seen.has(m.id)) continue;
          seen.add(m.id); fresh++;
          const parts = Array.isArray(m.parts) ? m.parts
            : Array.isArray(m.content) ? m.content : [];
          const text = parts.filter(p => p?.type === 'text' && typeof p.text === 'string')
            .map(p => p.text).join(' ');
          enqueue(fromFinishedTurn({ sessionID: event.sessionID, messageID: m.id,
            role: 'assistant', status: 'completed', text }, scope));
        }
        if (fresh > 0) seenAssistant.set(event.sessionID, seen);
      }));
      registrations.push(await ctx.tool.hook('execute.after', event => {
        if (!stopped) enqueue(fromTool(event, scope));
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
      stopped = true; pending.clear(); seenAssistant.clear();
      await Promise.allSettled(registrations.map(x => x.dispose()));
      await Promise.allSettled([...inflight]);
      if (baselineCleanup) await baselineCleanup();
    };
  },
};
