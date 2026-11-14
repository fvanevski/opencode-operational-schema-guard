#!/usr/bin/env node
/** Issue #92: audit and request ONE operator reevaluation of failed model-only reviews.
 * No model requests, Graphiti calls, queue reset, submission retry or production writes.
 * This helper is intentionally pinned to the first disposable four-arm campaign.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = '/tmp/opencode/issue92-a1-a3';
const RETRY_REASON = 'Retry after confirmed local model endpoint recovery';
const FAIL_REASON = 'curator_unavailable_or_invalid';
const HEX = /^[0-9a-f]{64}$/;
const ARMS = Object.freeze([
  { key: 'base-dev', worktree: 'baseline', sha: 'c8eb5260f2b10832346234b1b5d0cf28302ffba8', group: 'graphiti-curator-utility-development-r01', count: 3 },
  { key: 'cand-dev', worktree: 'candidate', sha: '270848aa108df22b9d12738cc6f4903ec45da9c1', group: 'graphiti-curator-utility-development-r02', count: 3 },
  { key: 'base-holdout', worktree: 'baseline', sha: 'c8eb5260f2b10832346234b1b5d0cf28302ffba8', group: 'graphiti-curator-utility-holdout-r03', count: 17 },
  { key: 'cand-holdout', worktree: 'candidate', sha: '270848aa108df22b9d12738cc6f4903ec45da9c1', group: 'graphiti-curator-utility-holdout-r04', count: 17 }
]);

export function classifyFailedReview(r) {
  if (!r || !HEX.test(r.id || '') || r.state !== 'deferred' || r.decision !== 'DEFER' ||
      r.origin !== 'curated' || !Array.isArray(r.facts) || r.facts.length !== 0 ||
      r.remote_episode_uuid !== null || !Array.isArray(r.source_event_ids) ||
      r.source_event_ids.length === 0 || !Array.isArray(r.audit)) {
    throw Error('REVIEW_NOT_SAFE_FOR_REEVALUATION');
  }
  if (r.reevaluate_requested === false && r.reason === FAIL_REASON &&
      r.revision === 1 && r.audit.length === 1 && r.audit[0].action === 'curated') {
    return 'fresh';
  }
  if (r.reevaluate_requested === true && r.reason === RETRY_REASON &&
      r.revision === 2 && r.audit.some(a => a.action === 'reevaluate')) {
    return 'previously_marked';
  }
  throw Error('REVIEW_RECOVERY_HISTORY_MISMATCH');
}

function git(cwd, ...args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }).trim();
}

async function verifyModelListing() {
  // This is ONLY a no-inference routing/availability check, not a completion test.
  const res = await fetch('http://127.0.0.1:8002/v1/models', {
    headers: { Authorization: 'Bearer local' },
    signal: AbortSignal.timeout(8000)
  });
  if (!res.ok) throw Error('MODEL_LIST_UNHEALTHY_HTTP_' + res.status);
  const body = await res.json();
  if (!Array.isArray(body?.data) || !body.data.some(x => x?.id === 'chat-fast')) {
    throw Error('FROZEN_CHAT_FAST_ALIAS_NOT_LISTED');
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== '--apply')) {
    throw Error('Usage: node a3-request-reevaluation.mjs [--apply]');
  }
  const apply = args[0] === '--apply';
  const stores = [];
  const all = [];
  for (const arm of ARMS) {
    const cwd = path.join(ROOT, arm.worktree);
    if (git(cwd, 'rev-parse', '--verify', 'HEAD') !== arm.sha) {
      throw Error('WORKTREE_SHA_MISMATCH_' + arm.key);
    }
    if (git(cwd, 'status', '--porcelain').length !== 0) {
      throw Error('WORKTREE_NOT_CLEAN_' + arm.key);
    }
    const { ReviewStore } = await import(pathToFileURL(path.join(cwd, 'docs/issue-78/v2-curator/core.mjs')).href);
    const root = path.join(ROOT, 'state', arm.key);
    const store = new ReviewStore(root, arm.group);
    const page = await store.list({limit: 500});
    if (page.has_more || page.total !== arm.count) {
      throw Error('REVIEW_COUNT_MISMATCH_' + arm.key + '_ACTUAL_' + page.total);
    }
    const rows = page.items.map(record => {
      let category;
      try { category = classifyFailedReview(record); }
      catch (e) { throw Error(arm.key + ':' + record.id + ':' + e.message); }
      return {arm, store, id: record.id, revision: record.revision, category};
    });
    stores.push({arm: arm.key, count: rows.length, fresh: rows.filter(x=>x.category==='fresh').length,
      previously_marked: rows.filter(x=>x.category==='previously_marked').length});
    all.push(...rows);
  }
  if (all.length !== 40) throw Error('TOTAL_REVIEW_COUNT_MISMATCH');
  console.log(JSON.stringify({status:'PRECHECK_OK', mode: apply?'apply':'dry_run', stores,
    total: all.length, fresh: all.filter(x=>x.category==='fresh').length}, null, 2));
  if (!apply) return;
  await verifyModelListing();
  // Preconditions for ALL records were checked before ANY mutation. CAS per
  // record preserves source identity/audit and rejects concurrent operators.
  for (const row of all) {
    if (row.category === 'previously_marked') continue;
    const updated = await row.store.change(row.id,row.revision,'reevaluate',{reason:RETRY_REASON});
    if (classifyFailedReview(updated) !== 'previously_marked') throw Error('POST_CHANGE_READBACK_INVALID');
  }
  console.log('REEVALUATION_REQUESTS_RECORDED=40');
  console.log('NEXT=exit interactive harness, then invoke existing post-exit EX runner ONCE');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(e => {console.error('A3_REEVALUATION_BLOCKED:',e.message); process.exitCode=2;});
}
