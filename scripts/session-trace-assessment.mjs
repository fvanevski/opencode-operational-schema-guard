#!/usr/bin/env node
import { createHash } from "node:crypto"
import { lstat, readFile, realpath } from "node:fs/promises"
import { relative, resolve } from "node:path"
import { assessSessionTrace, TRACE_AUDIT_PROFILES } from "../lib/session-trace-assessment.mjs"

const ROOT = "/tmp/opencode/verify/materials"
const MIN_BYTES = 2
const MAX_BYTES = 32 * 1024 * 1024

function fail(message, code = 2) {
  process.stderr.write(`OPERATIONAL_TRACE_RESULT: BLOCKED; ${message}\n`)
  process.exit(code)
}

function parseArgs(argv) {
  if (argv.length !== 6 || argv[0] !== "--input" || argv[2] !== "--session-id" || argv[4] !== "--profile") {
    fail(`expected --input <json> --session-id <ses_*> --profile ${TRACE_AUDIT_PROFILES.join("|")}`)
  }
  const [, input, , sessionID, , profile] = argv
  if (!/^ses_[A-Za-z0-9]+$/.test(sessionID)) fail("invalid session id")
  if (!TRACE_AUDIT_PROFILES.includes(profile)) fail("unsupported profile")
  return { input, sessionID, profile }
}

function inside(path, root) {
  const rel = relative(resolve(root), resolve(path))
  return rel === "" || (!rel.startsWith("..") && !rel.startsWith("/"))
}

async function loadInput(input) {
  if (!resolve(input).endsWith(".json")) fail("input must be JSON")
  const stat = await lstat(input).catch((error) => fail(`input unavailable (${error.code ?? error.name})`))
  if (!stat.isFile() || stat.isSymbolicLink()) fail("input must be a regular non-symlink file")
  if (stat.size < MIN_BYTES || stat.size > MAX_BYTES) fail(`input size outside ${MIN_BYTES}..${MAX_BYTES} bytes`)
  const rootReal = await realpath(ROOT).catch((error) => fail(`material root unavailable (${error.code ?? error.name})`))
  const inputReal = await realpath(input).catch((error) => fail(`input unavailable (${error.code ?? error.name})`))
  if (!inside(inputReal, rootReal)) fail("input escapes material root")
  const bytes = await readFile(inputReal)
  try {
    return {
      value: JSON.parse(bytes.toString("utf8")),
      source: { bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") },
    }
  } catch {
    fail("malformed JSON")
  }
}

const args = parseArgs(process.argv.slice(2))
const loaded = await loadInput(args.input)
let report
try {
  report = assessSessionTrace(loaded.value, { ...args, source: loaded.source })
} catch (error) {
  fail(error.message)
}
process.stdout.write(`${JSON.stringify(report)}\n`)
if (args.profile === "guard-friction-v1") {
  const metrics = report.metrics
  process.stdout.write(`OPERATIONAL_TRACE_RESULT: PASS; session=${args.sessionID}; nodes=${metrics.nodes}; guard_blocks=${metrics.guardBlocks}; incomplete=${metrics.incompleteDelegations}; capability_mismatches=${metrics.capabilityMismatches}; advisories=${metrics.advisories}\n`)
} else {
  process.stdout.write(`OPERATIONAL_TRACE_RESULT: PASS; session=${args.sessionID}; profile=${args.profile}; events=${report.summary.events}; candidates=${report.summary.remediation_candidates}\n`)
}
