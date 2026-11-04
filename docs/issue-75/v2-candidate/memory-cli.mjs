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
const endpoint = option('endpoint') || 'http://127.0.0.1:8766/mcp';
const allowed = ['list', 'reconcile', 'reconcile-only', 'forget', 'drain'];
const maxSeconds = Number(option('max-seconds') || '600');
if (!group || !allowed.includes(command) || !Number.isFinite(maxSeconds) ||
  maxSeconds < 5 || maxSeconds > 3600) {
  console.error('Usage: node memory-cli.mjs list|reconcile|reconcile-only|forget|drain --group GROUP ' +
    '[--id UUID --yes] [--state-dir ABSOLUTE] [--endpoint LOOPBACK_URL] ' +
    '[--max-seconds 600]');
  process.exitCode = 2;
} else {
  const journal = new Journal(dir, group);
  const client = new GraphitiMcp(endpoint, { timeoutMs: 5000 });
  const memory = new Memory({ journal, graphiti: client, group });
  // The old Journal.list() retained a 500-row defensive ceiling; all active
  // consumers now traverse bounded pages instead of failing at 501 episodes.
  async function allRows() {
    const rows = [];
    for await (const page of journal.pages()) rows.push(...page);
    return rows;
  }
  if (command === 'list') {
    for await (const page of journal.pages()) for (const x of page)
      console.log(JSON.stringify({
      id: x.uuid, remoteEpisodeUuid: x.remoteEpisodeUuid ?? null,
      status: x.status, kind: x.kind, source: x.sourceRef, assertion: x.assertion,
    }));
  } else if (command === 'reconcile') {
    console.log(JSON.stringify({ persisted: await memory.reconcile() }));
  } else if (command === 'reconcile-only') {
    // Shared Python EX holder invokes this after an ambiguous timeout.
    // It may reconcile positive remote persistence, but MUST NOT drain,
    // call add_memory, or release EX with pending local work.
    if (process.env.GHDEV_MEMORY_POST_EXIT_LEASE !== 'admitted')
      throw Error('EX_POST_EXIT_ADMISSION_REQUIRED');
    const reconciled = await memory.reconcile();
    const rows = await allRows();
    const unresolved = rows.filter(x=>
      x.status==='submission_unknown'||x.status==='queued').length;
    const pending = rows.filter(x=>x.status==='pending').length;
    const status = unresolved?'unresolved':pending?'work_remaining':'settled';
    console.log(JSON.stringify({mode:'reconcile-only',group,
      reconciled_persisted:reconciled.length,unresolved,pending,status}));
    if (unresolved) process.exitCode=3;
    else if (pending) process.exitCode=4;
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
    const before = await allRows();
    const persistedBefore = before.filter(x => x.status === 'persisted').length;
    const submittedThisRun = new Set();
    const reconciledThisRun = new Set();
    let settled = false;
    while (Date.now() < deadline) {
      for (const id of await memory.reconcile()) reconciledThisRun.add(id);
      const states = await allRows();
      const unresolved = states.filter(x =>
        x.status === 'submission_unknown' || x.status === 'queued');
      const pending = states.filter(x => x.status === 'pending');
      if (!unresolved.length && pending.length) {
        const submitted = await memory.drain();
        for (const id of submitted) submittedThisRun.add(id);
        console.log(JSON.stringify({ event: 'submitted', candidateIDs: submitted }));
      }
      const latest = await allRows();
      if (!latest.some(x => ['pending','queued','submission_unknown'].includes(x.status))) {
        settled = true;
        console.log(JSON.stringify({ event: 'settled',
          persisted: latest.filter(x => x.status === 'persisted').length,
          persisted_before: persistedBefore,
          submitted_this_run: submittedThisRun.size,
          reconciled_this_run: reconciledThisRun.size,
          submitted_and_reconciled_this_run: [...submittedThisRun].some(id => reconciledThisRun.has(id)) }));
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 2500));
    }
    if (!settled) {
      const remaining = (await allRows()).filter(x =>
        ['pending','queued','submission_unknown'].includes(x.status))
        .map(x => ({ id: x.uuid, status: x.status }));
      console.error(JSON.stringify({ event: 'unresolved_not_replayed', remaining }));
      process.exitCode = 3;
    }
  }
}
