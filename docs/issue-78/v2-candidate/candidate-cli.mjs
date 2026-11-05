#!/usr/bin/env node
/** Read-only bounded inspection of the new event queue, no Graphiti connection. */
import path from 'node:path';
import os from 'node:os';
import { CandidateQueue } from './queue.mjs';
import {describeFixtureGroup} from '../fixture-groups.mjs';
const [, , command, ...args] = process.argv;
function opt(key) { const i = args.indexOf('--' + key); return i === -1 ? '' : args[i + 1] || ''; }
const group = opt('group');
const stateDir = opt('state-dir') || path.join(process.env.XDG_STATE_HOME ||
  path.join(os.homedir(), '.local', 'state'), 'ghdev-graphiti');
const n = Number(opt('limit') || 100);
if (!['status', 'list'].includes(command) || !group || !Number.isInteger(n) || n < 1 || n > 500) {
  console.error('Usage: node candidate-cli.mjs status|list --group SAFE_GROUP [--state-dir ABSOLUTE] [--limit 100]');
  process.exitCode = 2;
} else {
  const q = new CandidateQueue(stateDir, group);
  const result = command === 'status' ? await q.status() : await q.list({ limit: n });
  console.log(JSON.stringify({...result,fixture:describeFixtureGroup(group)}, null, 2));
}
