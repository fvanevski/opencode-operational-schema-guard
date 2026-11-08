/**
 * Issue #81 temporary stock-V2 native Graphiti context callback observer.
 * Diagnostic only. This MUST replace exactly one Graphiti plugin entry in a
 * private standalone configuration, never in standing production config.
 *
 * GH81_TARGET_PLUGIN=/absolute/path/docs/issue-78/v2-candidate/plugin.mjs
 * GH81_TIMING_FILE=/absolute/owned-0700-dir/new-trace.jsonl
 */
import { constants, openSync, writeSync, closeSync, lstatSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ID = 'local.ghdev-graphiti-memory-candidate-v1';
const MARKER = '[GHDEV_GRAPHITI_CONTEXT]';
const SCHEMA = 'gh81.native-graphiti-context-hook.v1';
const SUFFIX = path.join('docs', 'issue-78', 'v2-candidate', 'plugin.mjs');

function checkedPaths() {
  const target = process.env.GH81_TARGET_PLUGIN;
  const report = process.env.GH81_TIMING_FILE;
  if (!target || !path.isAbsolute(target) || !target.endsWith(SUFFIX)) {
    throw Error('GH81_TARGET_PLUGIN must be an absolute installed Stage-2 plugin path');
  }
  if (!report || !path.isAbsolute(report) || path.extname(report) !== '.jsonl') {
    throw Error('GH81_TIMING_FILE must be an absolute new private JSONL path');
  }
  const dir = path.dirname(report);
  const stat = lstatSync(dir);
  if (!stat.isDirectory() || stat.isSymbolicLink() ||
      (process.getuid?.() !== undefined && stat.uid !== process.getuid()) ||
      (stat.mode & 0o077) !== 0) {
    throw Error('GH81_TIMING_FILE parent must be an owned, private 0700 directory');
  }
  if (path.resolve(realpathSync(target)) === path.resolve(report)) {
    throw Error('Observer must not overwrite the target plugin');
  }
  return { target: realpathSync(target), report };
}

function hasInjectedBlock(event) {
  return Array.isArray(event?.system) && event.system.some(part =>
    part?.type === 'text' && typeof part.text === 'string' &&
    part.text.startsWith(MARKER));
}

export default {
  id: ID,
  async setup(ctx) {
    if (typeof ctx?.session?.hook !== 'function') throw Error('Missing stock-V2 session.hook');
    const { target, report } = checkedPaths();
    const fd = openSync(report, constants.O_WRONLY | constants.O_CREAT |
      constants.O_EXCL | constants.O_APPEND, 0o600);
    let closed = false, registrations = 0, sequence = 0, innerCleanup;
    const record = entry => {
      if (!closed) writeSync(fd, JSON.stringify({ schema: SCHEMA, ...entry }) + '\n');
    };
    try {
      const plugin = (await import(pathToFileURL(target).href)).default;
      if (plugin?.id !== ID || typeof plugin.setup !== 'function') {
        throw Error('Installed target plugin identity mismatch');
      }
      const register = ctx.session.hook.bind(ctx.session);
      const proxySession = Object.create(ctx.session);
      proxySession.hook = (kind, callback) => {
        if (kind !== 'context') return register(kind, callback);
        registrations += 1;
        // Stage-2 wrapper registers Issue-75 Graphiti recall context FIRST,
        // then its own candidate-capture context callback.
        if (registrations !== 1) return register(kind, callback);
        return register(kind, async event => {
          const seq = ++sequence;
          const start = process.hrtime.bigint();
          let outcome = 'returned';
          try { return await callback(event); }
          catch (error) { outcome = 'threw'; throw error; }
          finally {
            // Measure before logging. No prompt/source/session/model text.
            const elapsed = Number(process.hrtime.bigint() - start) / 1e6;
            record({ kind: 'context', seq, elapsed_ms: Number(elapsed.toFixed(3)),
              outcome, graphiti_block_after: hasInjectedBlock(event) });
          }
        });
      };
      // The Stage-2 plugin forwards context using {...ctx}; host-owned
      // properties must be own properties here, not inherited via prototype.
      const proxyCtx = { ...ctx, session: proxySession };
      innerCleanup = await plugin.setup(proxyCtx);
      if (registrations < 1) throw Error('Graphiti context callback was not registered');
      record({ kind: 'setup', registered_context_callbacks: registrations });
      return async () => {
        try { if (typeof innerCleanup === 'function') await innerCleanup(); }
        finally {
          try { record({ kind: 'cleanup' }); }
          finally { closed = true; closeSync(fd); }
        }
      };
    } catch (error) {
      if (!closed) { closed = true; closeSync(fd); }
      throw error;
    }
  },
};
