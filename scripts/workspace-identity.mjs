#!/usr/bin/env node

import { spawnSync } from "node:child_process"
import { isAbsolute } from "node:path"
import { parseArgs } from "node:util"

const OPTIONS = {
  fetch: { type: "boolean", default: false },
  "check-bin": { type: "string", multiple: true, default: [] },
  base: { type: "string" },
}

function identityError(message) {
  return new Error(`workspace-identity: ${message}`)
}

export function parseIdentityArgs(argv) {
  let parsed
  try {
    parsed = parseArgs({ args: argv, options: OPTIONS, strict: true, allowPositionals: false })
  } catch (error) {
    throw identityError(error.message)
  }
  const base = parsed.values.base
  if (base !== undefined && !/^[0-9a-f]{40}$/.test(base)) throw identityError("--base must be a 40-character lowercase hexadecimal commit SHA")
  const checkBins = parsed.values["check-bin"] ?? []
  for (const bin of checkBins) {
    if (!isAbsolute(bin) || bin.length > 1024 || /[\r\n\0;&|`$()<>{}*?!\[\]\\]/.test(bin)) {
      throw identityError("--check-bin values must be bounded shell-neutral absolute paths")
    }
  }
  return { fetch: Boolean(parsed.values.fetch), base, checkBins: [...checkBins] }
}

function run(command, argv, { allowFailure = true } = {}) {
  const result = spawnSync(command, argv, {
    encoding: "utf8",
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 4 * 1024 * 1024,
  })
  if (result.error) {
    const output = result.error.code ?? result.error.message
    if (!allowFailure) throw identityError(`${command} failed to start (${output})`)
    return { success: false, output: String(output), status: 127 }
  }
  const status = result.status ?? 1
  const stdout = String(result.stdout ?? "").trim()
  const stderr = String(result.stderr ?? "").trim()
  const output = stderr || stdout
  if (status !== 0 && !allowFailure) throw identityError(`${command} ${argv.join(" ")} failed (exit=${status}${output ? `; ${output}` : ""})`)
  return { success: status === 0, output: status === 0 ? stdout : output, status }
}

function git(argv, options) {
  return run("git", argv, options)
}

export function collectWorkspaceIdentity(argv = process.argv.slice(2)) {
  const args = parseIdentityArgs(argv)
  const lines = ["=== Workspace Identity Report ==="]
  const isGit = git(["rev-parse", "--is-inside-work-tree"])
  if (!isGit.success || isGit.output !== "true") throw identityError("not a Git worktree")

  if (args.fetch) {
    lines.push("[Git] Fetching origin...")
    git(["fetch", "origin"], { allowFailure: false })
    lines.push("[Git] Fetch: OK")
  }

  const headSha = git(["rev-parse", "HEAD"])
  const branch = git(["branch", "--show-current"])
  if (!headSha.success || !/^[0-9a-f]{40}$/.test(headSha.output)) throw identityError("could not resolve an exact HEAD SHA")
  lines.push(`[Git] HEAD SHA: ${headSha.output}`)
  lines.push(`[Git] Branch: ${branch.success && branch.output ? branch.output : "(detached HEAD)"}`)

  const status = git(["status", "--porcelain=v1", "--untracked-files=normal"])
  if (status.success && !status.output) {
    lines.push("[Git] Worktree Status: CLEAN")
  } else {
    lines.push("[Git] Worktree Status: DIRTY")
    if (status.output) lines.push(...status.output.split("\n").map((line) => `      ${line}`))
  }

  const diffCheck = git(["diff", "--check"])
  if (diffCheck.success && !diffCheck.output) {
    lines.push("[Git] Diff Check: CLEAN")
  } else {
    lines.push("[Git] Diff Check: ISSUES FOUND")
    if (diffCheck.output) lines.push(...diffCheck.output.split("\n").slice(0, 15).map((line) => `      ${line}`))
  }

  if (args.base) {
    lines.push("")
    lines.push(`=== Lineage & Changes against ${args.base} ===`)
    const mergeBase = git(["merge-base", args.base, "HEAD"])
    if (!mergeBase.success || !/^[0-9a-f]{40}$/.test(mergeBase.output)) {
      lines.push(`[Git] Error computing merge-base: ${mergeBase.output || "unknown failure"}`)
    } else {
      const isAncestor = git(["merge-base", "--is-ancestor", args.base, "HEAD"])
      lines.push(`[Git] Merge Base: ${mergeBase.output}`)
      lines.push(`[Git] Ancestry: ${isAncestor.success ? "HEAD is descendant of base" : "HEAD is NOT descendant of base (diverged)"}`)
      const revCount = git(["rev-list", "--count", `${args.base}..HEAD`])
      if (revCount.success) lines.push(`[Git] Commits between base and HEAD: ${revCount.output}`)
      const changedFiles = git(["diff", "--name-status", `${mergeBase.output}..HEAD`])
      if (changedFiles.success && changedFiles.output) {
        lines.push("[Git] Changed Files:")
        lines.push(...changedFiles.output.split("\n").map((line) => `      ${line}`))
      } else if (changedFiles.success) {
        lines.push("[Git] Changed Files: NONE")
      }
    }
  }

  if (args.checkBins.length > 0) {
    lines.push("")
    lines.push("=== Binaries Health ===")
    for (const bin of args.checkBins) {
      const version = run(bin, ["--version"])
      if (version.success) lines.push(`[OK] ${bin}: ${version.output.split("\n")[0]}`)
      else lines.push(`[FAIL] ${bin}: Not found or failed to execute`)
    }
  }

  return `${lines.join("\n")}\n`
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    process.stdout.write(collectWorkspaceIdentity())
  } catch (error) {
    process.stderr.write(`${error.message}\n`)
    process.exitCode = 2
  }
}
