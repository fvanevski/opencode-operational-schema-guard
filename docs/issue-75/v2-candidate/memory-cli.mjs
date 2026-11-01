#!/usr/bin/env node
/** Local opt-in inspection / correction. Delete only on explicit command. */
import path from 'node:path';
import os from 'node:os';
import { Journal, GraphitiMcp, Memory } from './memory-core.mjs';
const [, , command, ...args] = process.argv;
function option(name) { const i = args.indexOf('--' + name); return i < 0 ? '' : args[i + 1] || ''; }
const group = option('group');
const dir = option('state-dir') || path.join(process.env.XDG_STATE_HOME || path.join(os.homedir(), '.local', 'state'), 'ghdev-graphiti');
if (!group || !['list', 'reconcile', 'forget'].includes(command)) {
  console.error('Usage: node memory-cli.mjs list|reconcile|forget --group GROUP [--id UUID --yes] [--state-dir ABSOLUTE] [--endpoint LOOPBACK_URL]');
  process.exitCode = 2;
} else {
  const journal = new Journal(dir, group);
  const endpoint = option('endpoint') || 'http://127.0.0.1:8000/mcp/';
  const client = new GraphitiMcp(endpoint, { timeoutMs: 3000 });
  const memory = new Memory({ journal, graphiti: client, group });
  if (command === 'list') {
    for (const x of await journal.list()) {
      console.log(JSON.stringify({ id: x.uuid, status: x.status, kind: x.kind,
        source: x.sourceRef, assertion: x.assertion }));
    }
  } else if (command === 'reconcile') {
    console.log(JSON.stringify({ persisted: await memory.reconcile() }));
  } else {
    const id = option('id');
    const item = await journal.get(id);
    if (!item) throw new Error('No local record with this id in this group');
    if (item.status !== 'persisted') throw new Error('Only confirmed persisted episodes may be forgotten; reconcile queued/unknown first');
    if (!args.includes('--yes')) throw new Error('Explicit --yes required for destructive remote deletion');
    // No implicit delete for an in-flight or unknown write.
    await client.call('delete_episode', { uuid: id, group_id: group });
    await journal.update(id, item.status, 'forgotten');
    console.log(JSON.stringify({ deleted: id, group }));
  }
}
