/** Opt-in Stage-1 capture wrapper. Existing Issue #75 recall remains the control. */
import path from 'node:path';
import os from 'node:os';
import baseline from '../../issue-75/v2-candidate/plugin.mjs';
import { fromPromptCandidates, fromTool, fromFinishedTurn } from './events.mjs';
import { CandidateQueue } from './queue.mjs';
import { sourcedEpisodeResolver } from '../v2-curator/sourced-recall.mjs';
import { curatedRecallRetriever } from '../v2-curator/curated-recall-candidates.mjs';

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
    const candidateRetriever = path.isAbsolute(workspace) && project &&
      options.curatedRecall !== false
      ? curatedRecallRetriever(root,options.group,workspace,project) : null;
    // Preserve the accepted Issue #75 native context/recall adapter. In
    // addition to its legacy journal, admit only confirmed curated episode
    // mappings from the same exact group/workspace, without LLM in hooks.
    const baselineCleanup = await baseline.setup({ ...ctx,
      options: { ...options, capture: false,
        recallPolicy: options.recallPolicy === 'strict' ? 'strict' : 'semantic',
        sourcedEpisodeResolver: resolver,
        curatedCandidateRetriever: candidateRetriever } });
    if (options.capture !== true) return baselineCleanup;
    if (!path.isAbsolute(workspace) || !project) {
      if (baselineCleanup) await baselineCleanup();
      throw Error('Capture requires an explicit absolute workspace/project binding');
    }
    const queue = new CandidateQueue(root, options.group, { maxItems: options.maxItems || 4000 });
    const pending = new Map();
    const lastAdmittedPrompt = new Map();
    // Only authenticated native user message IDs may anchor historical assistant turns.
    const admittedNativePrompts = new Map();
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
        // A new user prompt terminates the previous tool-source association,
        // including when the new prompt will be rejected by safety filters.
        lastAdmittedPrompt.delete(event.sessionID);
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
        const sessionID = event.sessionID;
        const list = pending.get(sessionID) || [];
        pending.delete(sessionID);
        // Context contains older completed assistant turns. Associate each
        // with the preceding user message ONLY if that native ID was admitted.
        // Unknown or filtered user turns break the relationship; a new prompt
        // must never become the anchor for an earlier assistant message.
        const msgs = Array.isArray(event.messages) ? event.messages : [];
        if (msgs.length > MAX_CONTEXT_MESSAGES) {
          warn('assistant_context_truncated'); noteDrop('assistant_context_truncated');
        }
        const recent = msgs.slice(-MAX_CONTEXT_MESSAGES);
        const known = admittedNativePrompts.get(sessionID);
        const seen = seenAssistant.get(sessionID) || new Set();
        let historicalAnchor = null;
        for (const m of recent) {
          if (m?.role === 'user') {
            historicalAnchor = typeof m.id === 'string'
              ? known?.get(m.id) || null : null;
            continue;
          }
          if (m?.role !== 'assistant' || typeof m?.id !== 'string' || seen.has(m.id)) continue;
          seen.add(m.id);
          if (seen.size > MAX_SEEN_PER_SESSION) seen.delete(seen.values().next().value);
          const parts = Array.isArray(m.parts) ? m.parts
            : Array.isArray(m.content) ? m.content : [];
          const text = parts.filter(p => p?.type === 'text' && typeof p.text === 'string')
            .map(p => p.text).join(' ');
          const turn = fromFinishedTurn({ sessionID, messageID: m.id,
            role: 'assistant', status: 'completed', text }, scope);
          enqueue(turn && historicalAnchor ? { ...turn, related_event_ids:
            [...turn.related_event_ids, historicalAnchor].slice(0, 8) } : turn);
        }
        if (seen.size) {
          seenAssistant.delete(sessionID);
          seenAssistant.set(sessionID, seen);
          if (seenAssistant.size > MAX_SESSIONS)
            seenAssistant.delete(seenAssistant.keys().next().value);
        }
        // The most recent prompt of a pending batch determines the tool anchor.
        // In particular, an accepted prompt followed by a rejected prompt
        // must not retain the accepted prompt's association.
        for (const observed of list) {
          lastAdmittedPrompt.delete(sessionID);
          const sources = fromPromptCandidates(observed, scope, { admitted: true });
          if (!sources.length) { noteDrop('prompt_admission_filtered'); continue; }
          // Current tool outcomes may cite this admitted original source span.
          lastAdmittedPrompt.set(sessionID, sources[0].event_id);
          if (lastAdmittedPrompt.size > MAX_SESSIONS)
            lastAdmittedPrompt.delete(lastAdmittedPrompt.keys().next().value);
          // Historical assistant links require actual native user IDs; never
          // map the weak session-scoped content-hash fallback as a native ID.
          const nativeID = observed?.messageID || observed?.messageId ||
            observed?.promptID || observed?.promptId ||
            observed?.prompt?.messageID || observed?.prompt?.messageId ||
            observed?.prompt?.id;
          const ref = 'opencode:' + sessionID + ':message:' + nativeID;
          if (sources[0].source_strength === 'native-id' &&
            typeof nativeID === 'string' &&
            (sources[0].source_refs[0] === ref ||
             sources[0].source_refs[0].startsWith(ref + ':span:'))) {
            const remembered = admittedNativePrompts.get(sessionID) || new Map();
            remembered.delete(nativeID);
            remembered.set(nativeID, sources[0].event_id);
            if (remembered.size > MAX_SEEN_PER_SESSION)
              remembered.delete(remembered.keys().next().value);
            admittedNativePrompts.delete(sessionID);
            admittedNativePrompts.set(sessionID, remembered);
            if (admittedNativePrompts.size > MAX_SESSIONS)
              admittedNativePrompts.delete(admittedNativePrompts.keys().next().value);
          }
          for (const source of sources) enqueue(source);
        }
      }));
      registrations.push(await ctx.tool.hook('execute.after', event => {
        if (stopped) return;
        const outcome = fromTool(event, scope);
        if (!outcome) noteDrop('tool_admission_filtered');
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
      stopped = true; pending.clear(); seenAssistant.clear(); lastAdmittedPrompt.clear(); admittedNativePrompts.clear();
      await Promise.allSettled(registrations.map(x => x.dispose()));
      await Promise.allSettled([...inflight]);
      if (baselineCleanup) await baselineCleanup();
    };
  },
};
