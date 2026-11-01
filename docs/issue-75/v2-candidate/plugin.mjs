/** Stock OpenCode V2 candidate. Opt-in only; no host mutation on import. */
import { Plugin } from '@opencode/plugin';
import path from 'node:path';
import os from 'node:os';
import { GraphitiMcp, Journal, Memory, selectUserDecision, selectCompletedTest, formatContext } from './memory-core.mjs';
import { localReranker } from './relevance.mjs';
const OPEN = '[GHDEV_GRAPHITI_CONTEXT]';
const CLOSE = '[/GHDEV_GRAPHITI_CONTEXT]';
function config(ctx) {
  const x = ctx.options ?? {};
  return {
    enabled: x.enabled === true,
    capture: x.capture === true,
    group: typeof x.group === 'string' ? x.group : '',
    endpoint: typeof x.endpoint === 'string' ? x.endpoint : 'http://127.0.0.1:8000/mcp/',
    // Disabled by default until the independent reranker service and latency
    // are qualified without sharing the single-concurrency extraction LLM.
    rerankEndpoint: typeof x.rerankEndpoint === 'string' ? x.rerankEndpoint : '',
    stateDir: typeof x.stateDir === 'string' ? x.stateDir :
      path.join(process.env.XDG_STATE_HOME || path.join(os.homedir(), '.local', 'state'), 'ghdev-graphiti'),
  };
}
function removeOwn(parts) {
  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i]?.type === 'text' && parts[i].text?.startsWith(OPEN)) parts.splice(i, 1);
  }
}
export default Plugin.define({
  id: 'local.ghdev-graphiti-memory',
  async setup(ctx) {
    const settings = config(ctx);
    if (!settings.enabled || !settings.group) return;
    const graphiti = new GraphitiMcp(settings.endpoint);
    const store = new Journal(settings.stateDir, settings.group);
    const ranker = settings.rerankEndpoint ? localReranker(settings.rerankEndpoint) : null;
    const memory = new Memory({ journal: store, graphiti, group: settings.group, ranker });
    const registrations = [];
    const pending = new Map();
    const latest = new Map();
    let stopped = false;
    // Only stage candidates in live hooks. A post-harness exclusive runner
    // owns Graphiti submissions and must hold the lease until terminal readback.
    const register = async (f) => registrations.push(await f());
    try {
      await register(() => ctx.session.hook('prompt', event => {
        if (!event?.sessionID) return;
        const text = event.prompt?.text;
        if (typeof text !== 'string') return;
        // Only remember after the admitted prompt reaches a model context build.
        if (settings.capture) {
          const candidate = selectUserDecision(text);
          if (candidate) pending.set(event.sessionID, { candidate, time: new Date().toISOString() });
        }
        const request = memory.search(text).catch(() => []);
        latest.set(event.sessionID, { text, request });
        if (latest.size > 100) latest.delete(latest.keys().next().value);
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
        const selected = latest.get(event.sessionID);
        if (!selected) return;
        // Never wait for Graphiti beyond this context allowance.
        const items = await Promise.race([
          selected.request, new Promise(resolve => setTimeout(() => resolve([]), 300)),
        ]);
        const body = formatContext(items);
        if (body) event.system.push({ type: 'text', text: OPEN + '\n' + body + '\n' + CLOSE });
      }));
      await register(() => ctx.session.hook('compaction', event => {
        if (event?.sessionID) latest.delete(event.sessionID);
        // Broad compaction content stays with OpenViking, not Graphiti.
      }));
    } catch (error) {
      await Promise.allSettled(registrations.map(r => r.dispose()));
      throw error;
    }
    // No startup ingestion or reconciliation while the interactive model is active.
    return async () => {
      stopped = true;
      pending.clear(); latest.clear();
      await Promise.allSettled(registrations.map(r => r.dispose()));
    };
  },
});
