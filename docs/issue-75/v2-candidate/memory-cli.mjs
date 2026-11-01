#!/usr/bin/env node
/** Inspect/reconcile/forget; bounded post-harness ingest under caller-held EX lease. */
import path from 'node:path';
import os from 'node:os';
import { Journal, GraphitiMcp, Memory } from './memory-core.mjs';
const [, , command, ...args] = process.argv;
function option(name) {
  const i = args.indexOf('--' + name);
  return i < 0 ? '' : args[i + 1] || '';
}
const group = option('group');
const dir = option('state-dir') || path.join(process.env.XDG_STATE_HOME ||
  path.join(os.homedir(), '.local', 'state'), 'ghdev-graphiti');
const endpoint = option('endpoint') || 'http://127.0.0.1:8000/mcp/';
const allowed = ['list', 'reconcile', 'forget', 'drain'];
const maxSeconds = Number(option('max-seconds') || '600');
if (!group || !allowed.includes(command) || !Number.isFinite(maxSeconds) ||
  maxSeconds < 5 || maxSeconds > 3600) {
  console.error('Usage: node memory-cli.mjs list|reconcile|forget|drain --group GROUP ' +
    '[--id UUID --yes] [--state-dir ABSOLUTE] [--endpoint LOOPBACK_URL] ' +
    '[--max-seconds 600]');
  process.exitCode = 2;
} else {
  const journal = new Journal(dir, group);
  const client = new GraphitiMcp(endpoint, { timeoutMs: 5000 });
  const memory = new Memory({ journal, graphiti: client, group });
  if (command === 'list') {
    for (const x of await journal.list()) console.log(JSON.stringify({
      id: x.uuid, remoteEpisodeUuid: x.remoteEpisodeUuid ?? null,
      status: x.status, kind: x.kind, source: x.sourceRef, assertion: x.assertion,
    }));
  } else if (command === 'reconcile') {
    console.log(JSON.stringify({ persisted: await memory.reconcile() }));
  } else if (command === 'forget') {
    const id = option('id');
    const item = await journal.get(id);
    if (!item) throw new Error('No local record with this id in this group');
    if (item.status !== 'persisted' || !item.remoteEpisodeUuid)
      throw new Error('Only confirmed remote persisted episodes may be forgotten');
    if (!args.includes('--yes'))
      throw new Error('Explicit --yes required for destructive remote deletion');
    await client.call('delete_episode', { uuid: item.remoteEpisodeUuid, group_id: group });
    await journal.update(id, item.status, 'forgotten');
    console.log(JSON.stringify({ deletedLocalId: id, remoteId: item.remoteEpisodeUuid, group }));
  } else {
    // This is NOT a scheduler or a security assertion. The Python one-shot
    // wrapper obtains the actual existing admission lease, checks active
    // harnesses + scheduler and holds the lease while this process runs.
    if (process.env.GHDEV_MEMORY_POST_EXIT_LEASE !== 'admitted')
      throw new Error('Drain requires the admitted post-exit runner, not an interactive hook');
    const deadline = Date.now() + maxSeconds * 1000;
    let settled = false;
    while (Date.now() < deadline) {
      await memory.reconcile();
      const states = await journal.list();
      const unresolved = states.filter(x =>
        x.status === 'submission_unknown' || x.status === 'queued');
      const pending = states.filter(x => x.status === 'pending');
      if (!unresolved.length && pending.length) {
        const submitted = await memory.drain();
        console.log(JSON.stringify({ event: 'submitted', candidateIDs: submitted }));
      }
      const latest = await journal.list();
      if (!latest.some(x => ['pending','queued','submission_unknown'].includes(x.status))) {
        settled = true;
        console.log(JSON.stringify({ event: 'settled',
          persisted: latest.filter(x => x.status === 'persisted').length }));
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 2500));
    }
    if (!settled) {
      const remaining = (await journal.list()).filter(x =>
        ['pending','queued','submission_unknown'].includes(x.status))
        .map(x => ({ id: x.uuid, status: x.status }));
      console.error(JSON.stringify({ event: 'unresolved_not_replayed', remaining }));
      process.exitCode = 3;
    }
  }
}
