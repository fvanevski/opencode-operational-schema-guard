import { spawnSync } from "node:child_process"
import { createHash, randomUUID } from "node:crypto"
import { constants } from "node:fs"
import {
  chmod,
  copyFile,
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  readlink,
  realpath,
  rename,
  rm,
  stat,
  symlink,
} from "node:fs/promises"
import { dirname, join, relative, resolve, sep } from "node:path"
import { TextDecoder } from "node:util"

export const UNTRACKED_QUARANTINE_SCHEMA = "opencode-untracked-quarantine-v1"
export const UNTRACKED_QUARANTINE_RECEIPT_SCHEMA = "opencode-untracked-quarantine-receipt-v1"
export const UNTRACKED_QUARANTINE_ROOT = "/tmp/opencode/verify/untracked-quarantine"
export const UNTRACKED_QUARANTINE_SPEC_ROOT = `${UNTRACKED_QUARANTINE_ROOT}/specs`
const UNTRACKED_QUARANTINE_OPERATION_ROOT = `${UNTRACKED_QUARANTINE_ROOT}/operations`

const SHA40 = /^[0-9a-f]{40}$/
const SHA256 = /^[0-9a-f]{64}$/
const OPERATION_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/
const MAX_SPEC_BYTES = 64 * 1024
const MAX_RECEIPT_BYTES = 4 * 1024 * 1024
const MAX_PATHS = 32
const MAX_INVENTORY_ENTRIES = 4096
const MAX_TOTAL_FILE_BYTES = 256 * 1024 * 1024
const UTF8 = new TextDecoder("utf-8", { fatal: true })
const NUL = Buffer.from([0])

export class QuarantineBlockedError extends Error {
  constructor(message) {
    super(message)
    this.name = "QuarantineBlockedError"
    this.result = "BLOCKED"
  }
}

function blocked(message) {
  throw new QuarantineBlockedError(message)
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex")
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === "object" && !Buffer.isBuffer(value)) {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]))
  }
  return value
}

function stableJSON(value) {
  return `${JSON.stringify(stableValue(value), null, 2)}\n`
}

function inside(path, root) {
  const rel = relative(resolve(root), resolve(path))
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`))
}

function exactObjectKeys(value, allowed, label) {
  const keys = Object.keys(value ?? {}).sort()
  const expected = [...allowed].sort()
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    blocked(`${label} must contain exactly: ${expected.join(", ")}`)
  }
}

function decodeUTF8(bytes, label) {
  try {
    return UTF8.decode(bytes)
  } catch {
    blocked(`${label} contains non-UTF-8 path bytes; this helper rejects them fail-closed without lossy decoding`)
  }
}

function normalizeRepoPath(value) {
  if (typeof value !== "string" || !value || value.includes("\0") || value.includes("\\") || value.startsWith("/")) {
    blocked("quarantine paths must be non-empty repository-relative UTF-8 paths using '/' separators")
  }
  const parts = value.split("/")
  if (parts.some((part) => !part || part === "." || part === "..")) blocked(`ambiguous or escaping repository path: ${value}`)
  if (parts[0] === ".git") blocked(`Git control paths cannot be quarantined: ${value}`)
  const normalized = parts.join("/")
  if (normalized !== value) blocked(`repository path is not canonical: ${value}`)
  return normalized
}

function normalizePaths(paths) {
  if (!Array.isArray(paths) || paths.length < 1 || paths.length > MAX_PATHS) blocked(`paths must contain 1-${MAX_PATHS} entries`)
  const normalized = paths.map(normalizeRepoPath)
  const sorted = [...normalized].sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)))
  for (let index = 0; index < sorted.length; index += 1) {
    if (index > 0 && sorted[index] === sorted[index - 1]) blocked(`duplicate quarantine path: ${sorted[index]}`)
    for (let prior = 0; prior < index; prior += 1) {
      if (sorted[index].startsWith(`${sorted[prior]}/`)) blocked(`ambiguous overlapping quarantine paths: ${sorted[prior]} and ${sorted[index]}`)
    }
  }
  return sorted
}

function validateAuthority(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) blocked("authority must be an object")
  exactObjectKeys(value, ["binding", "mode"], "authority")
  if (!new Set(["target", "strict-start"]).has(value.mode)) blocked("authority.mode must be target or strict-start")
  if (!SHA40.test(value.binding ?? "")) blocked("authority.binding must be a lowercase 40-character SHA")
  return { mode: value.mode, binding: value.binding }
}

function validateWorkspaceRoot(value) {
  if (typeof value !== "string" || !value.startsWith("/") || /[\r\n\0]/.test(value)) blocked("workspace_root must be one absolute path")
  return resolve(value)
}

function operationDirectory(operationID) {
  return resolve(UNTRACKED_QUARANTINE_OPERATION_ROOT, operationID)
}

function dataPath(operationID) {
  return join(operationDirectory(operationID), "data")
}

export function receiptPath(operationID) {
  return join(operationDirectory(operationID), "receipt.json")
}

function validateSpecDocument(document) {
  if (!document || typeof document !== "object" || Array.isArray(document)) blocked("spec must be a JSON object")
  const action = document.action
  if (!new Set(["inspect", "quarantine", "restore"]).has(action)) blocked("action must be inspect, quarantine, or restore")
  const common = ["schema_version", "action", "operation_id", "workspace_root", "authority", "paths"]
  const extra = action === "inspect"
    ? []
    : action === "quarantine"
      ? ["expected_workspace_sha256", "expected_status_sha256", "expected_paths_sha256", "expected_inventory_sha256"]
      : ["receipt_path", "expected_receipt_sha256"]
  exactObjectKeys(document, [...common, ...extra], "spec")
  if (document.schema_version !== UNTRACKED_QUARANTINE_SCHEMA) blocked(`schema_version must be ${UNTRACKED_QUARANTINE_SCHEMA}`)
  if (!OPERATION_ID.test(document.operation_id ?? "")) blocked("operation_id is invalid")
  const workspaceRoot = validateWorkspaceRoot(document.workspace_root)
  const authority = validateAuthority(document.authority)
  const paths = normalizePaths(document.paths)
  if (action === "quarantine") {
    for (const field of ["expected_workspace_sha256", "expected_status_sha256", "expected_paths_sha256", "expected_inventory_sha256"]) {
      if (!SHA256.test(document[field] ?? "")) blocked(`${field} must be a lowercase SHA-256`)
    }
  }
  if (action === "restore") {
    if (!SHA256.test(document.expected_receipt_sha256 ?? "")) blocked("expected_receipt_sha256 must be a lowercase SHA-256")
    const expectedReceipt = receiptPath(document.operation_id)
    if (resolve(document.receipt_path) !== expectedReceipt) blocked(`receipt_path must be exactly ${expectedReceipt}`)
  }
  return { ...document, workspace_root: workspaceRoot, authority, paths }
}

export async function loadUntrackedQuarantineSpec(path) {
  const resolved = resolve(String(path ?? ""))
  if (
    !resolved.endsWith(".json")
    || !inside(resolved, UNTRACKED_QUARANTINE_SPEC_ROOT)
    || dirname(resolved) !== resolve(UNTRACKED_QUARANTINE_SPEC_ROOT)
    || /[*?\[\]{}]/.test(resolved)
  ) {
    blocked(`spec must be one direct concrete .json file under ${UNTRACKED_QUARANTINE_SPEC_ROOT}`)
  }
  let handle
  try {
    handle = await open(resolved, constants.O_RDONLY | constants.O_NOFOLLOW)
    const info = await handle.stat()
    if (!info.isFile() || info.size < 2 || info.size > MAX_SPEC_BYTES) blocked("spec must be a bounded regular non-symlink file")
    const bytes = await handle.readFile()
    let document
    try {
      document = JSON.parse(decodeUTF8(bytes, "spec"))
    } catch (error) {
      if (error instanceof QuarantineBlockedError) throw error
      blocked(`spec is not strict JSON (${error.message})`)
    }
    return { path: resolved, sha256: sha256(bytes), spec: validateSpecDocument(document) }
  } catch (error) {
    if (error instanceof QuarantineBlockedError) throw error
    blocked(`spec is unreadable (${error.code ?? error.message})`)
  } finally {
    await handle?.close().catch(() => {})
  }
}

function runGit(workspaceRoot, args, label) {
  const result = spawnSync("git", ["-C", workspaceRoot, ...args], {
    encoding: null,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0", LC_ALL: "C" },
    maxBuffer: 32 * 1024 * 1024,
    timeout: 30_000,
  })
  if (result.error || result.status !== 0) {
    const stderr = Buffer.isBuffer(result.stderr) ? result.stderr.toString("utf8").trim() : ""
    blocked(`${label} failed (${result.error?.message ?? `exit ${result.status}`}${stderr ? `: ${stderr}` : ""})`)
  }
  return Buffer.from(result.stdout ?? Buffer.alloc(0))
}

function oneGitLine(workspaceRoot, args, label) {
  const output = runGit(workspaceRoot, args, label)
  const lines = output.toString("utf8").split(/\r?\n/).filter(Boolean)
  if (lines.length !== 1) blocked(`${label} returned an ambiguous result`)
  return lines[0]
}

async function assertDirectoryNotSymlink(path, label) {
  const resolved = resolve(path)
  const info = await lstat(resolved).catch((error) => blocked(`${label} is unavailable (${error.code ?? error.message})`))
  if (!info.isDirectory() || info.isSymbolicLink()) blocked(`${label} must be a real directory, not a symlink`)
  const canonical = await realpath(resolved).catch((error) => blocked(`${label} cannot be resolved (${error.code ?? error.message})`))
  if (canonical !== resolved) blocked(`${label} must not traverse symlinked ancestors`)
}

async function ensureHarnessRoots() {
  await mkdir(UNTRACKED_QUARANTINE_SPEC_ROOT, { recursive: true, mode: 0o700 })
  await mkdir(UNTRACKED_QUARANTINE_OPERATION_ROOT, { recursive: true, mode: 0o700 })
  await assertDirectoryNotSymlink(UNTRACKED_QUARANTINE_ROOT, "untracked-quarantine root")
  await assertDirectoryNotSymlink(UNTRACKED_QUARANTINE_SPEC_ROOT, "untracked-quarantine spec root")
  await assertDirectoryNotSymlink(UNTRACKED_QUARANTINE_OPERATION_ROOT, "untracked-quarantine operation root")
}

async function workspaceIdentity(workspaceRoot) {
  const canonical = await realpath(workspaceRoot).catch((error) => blocked(`workspace_root cannot be resolved (${error.code ?? error.message})`))
  if (canonical !== workspaceRoot) blocked(`workspace_root must be canonical; expected ${canonical}`)
  const top = oneGitLine(workspaceRoot, ["rev-parse", "--show-toplevel"], "Git workspace identity")
  const canonicalTop = await realpath(top).catch(() => blocked("Git top-level cannot be resolved"))
  if (canonicalTop !== workspaceRoot) blocked("workspace_root is not the exact Git top-level")
  const gitDirRaw = oneGitLine(workspaceRoot, ["rev-parse", "--absolute-git-dir"], "Git directory identity")
  const gitDir = await realpath(gitDirRaw).catch(() => blocked("Git directory cannot be resolved"))
  const rootStat = await stat(workspaceRoot)
  const gitStat = await stat(gitDir)
  const payload = stableJSON({
    workspace_root: workspaceRoot,
    workspace_dev: String(rootStat.dev),
    workspace_ino: String(rootStat.ino),
    git_dir: gitDir,
    git_dev: String(gitStat.dev),
    git_ino: String(gitStat.ino),
  })
  return { root: workspaceRoot, gitDir, sha256: sha256(payload) }
}

function splitNul(buffer) {
  const fields = []
  let start = 0
  for (let index = 0; index < buffer.length; index += 1) {
    if (buffer[index] !== 0) continue
    fields.push(buffer.subarray(start, index))
    start = index + 1
  }
  if (start !== buffer.length) blocked("Git NUL-delimited output is truncated")
  return fields
}

function parseStatus(buffer) {
  const fields = splitNul(buffer)
  const records = []
  for (let index = 0; index < fields.length; index += 1) {
    const field = fields[index]
    if (field.length < 4 || field[2] !== 0x20) blocked("Git status emitted an unexpected porcelain record")
    const status = field.subarray(0, 2).toString("ascii")
    const pathBytes = Buffer.from(field.subarray(3))
    const path = decodeUTF8(pathBytes, "Git status")
    const rawFields = [Buffer.from(field)]
    let secondaryPathBytes
    if (/[RC]/.test(status)) {
      index += 1
      if (index >= fields.length) blocked("Git rename/copy status record is truncated")
      secondaryPathBytes = Buffer.from(fields[index])
      decodeUTF8(secondaryPathBytes, "Git rename/copy status")
      rawFields.push(Buffer.from(fields[index]))
    }
    records.push({ status, path, pathBytes, secondaryPathBytes, rawFields })
  }
  return records
}

function rawStatusBytes(records) {
  const pieces = []
  for (const record of records) {
    for (const field of record.rawFields) pieces.push(field, NUL)
  }
  return Buffer.concat(pieces)
}

function pathWithin(recordPath, requestedPath) {
  return recordPath === requestedPath || recordPath.startsWith(`${requestedPath}/`)
}

function selectedStatus(records, paths) {
  const selected = []
  for (const record of records) {
    const matching = paths.filter((path) => pathWithin(record.path, path))
    if (matching.length > 0) selected.push({ record, matching })
  }
  return selected
}

function statusAndPathEvidence(workspaceRoot, paths) {
  const statusBytes = runGit(workspaceRoot, ["status", "--porcelain=v1", "-z", "--untracked-files=all", "--ignored=matching"], "Git dirty-state readback")
  const records = parseStatus(statusBytes)
  const selected = selectedStatus(records, paths)
  for (const path of paths) {
    const matches = selected.filter(({ record }) => pathWithin(record.path, path))
    if (matches.length === 0) blocked(`requested path is not represented as untracked Git state: ${path}`)
    if (matches.some(({ record }) => record.status !== "??")) blocked(`requested path contains non-untracked Git state: ${path}`)
  }
  const tracked = runGit(workspaceRoot, ["--literal-pathspecs", "ls-files", "-z", "--stage", "--", ...paths], "Git tracked/index preflight")
  if (tracked.length > 0) blocked("requested quarantine scope contains tracked, staged, conflicted, or submodule index state")
  const selectedSet = new Set(selected.map(({ record }) => record))
  const expectedAfter = rawStatusBytes(records.filter((record) => !selectedSet.has(record)))
  const pathPieces = [Buffer.from("opencode-untracked-quarantine-paths-v1\0")]
  for (const path of paths) pathPieces.push(Buffer.from(path), NUL)
  for (const { record } of selected) for (const field of record.rawFields) pathPieces.push(field, NUL)
  return {
    statusBytes,
    records,
    statusSha256: sha256(statusBytes),
    pathsSha256: sha256(Buffer.concat(pathPieces)),
    expectedAfterSha256: sha256(expectedAfter),
  }
}

async function assertNoSymlinkAncestors(workspaceRoot, repoPath) {
  const parts = repoPath.split("/")
  let current = workspaceRoot
  for (let index = 0; index < parts.length - 1; index += 1) {
    current = join(current, parts[index])
    const info = await lstat(current).catch((error) => blocked(`quarantine path ancestor is unavailable (${repoPath}: ${error.code ?? error.message})`))
    if (!info.isDirectory() || info.isSymbolicLink()) blocked(`quarantine path traverses a non-directory or symlink ancestor: ${repoPath}`)
  }
}

function inventoryHash(entries) {
  return sha256(stableJSON(entries))
}

async function inventoryOne(root, repoPath, counters, { allowMissing = false } = {}) {
  const absolute = join(root, ...repoPath.split("/"))
  let info
  try {
    info = await lstat(absolute)
  } catch (error) {
    if (allowMissing && error?.code === "ENOENT") return []
    blocked(`quarantine path is unavailable (${repoPath}: ${error.code ?? error.message})`)
  }
  const mode = info.mode & 0o7777
  counters.entries += 1
  if (counters.entries > MAX_INVENTORY_ENTRIES) blocked(`inventory exceeds ${MAX_INVENTORY_ENTRIES} entries`)
  if (info.isFile()) {
    const bytes = await readFile(absolute)
    counters.bytes += bytes.length
    if (counters.bytes > MAX_TOTAL_FILE_BYTES) blocked(`inventory exceeds ${MAX_TOTAL_FILE_BYTES} file bytes`)
    return [{ path: repoPath, type: "file", mode, size: bytes.length, sha256: sha256(bytes) }]
  }
  if (info.isSymbolicLink()) {
    const target = await readlink(absolute, { encoding: "buffer" })
    return [{ path: repoPath, type: "symlink", mode, size: target.length, sha256: sha256(target) }]
  }
  if (!info.isDirectory()) blocked(`unsupported special filesystem object at ${repoPath}`)
  const result = [{ path: repoPath, type: "directory", mode, size: 0, sha256: sha256(Buffer.alloc(0)) }]
  const names = await readdir(absolute, { encoding: "buffer" })
  names.sort(Buffer.compare)
  for (const nameBytes of names) {
    const name = decodeUTF8(nameBytes, `directory ${repoPath}`)
    if (name === "." || name === ".." || name.includes("/")) blocked(`ambiguous directory entry under ${repoPath}`)
    result.push(...await inventoryOne(root, `${repoPath}/${name}`, counters))
  }
  return result
}

async function inventoryPaths(root, paths, options = {}) {
  const counters = { entries: 0, bytes: 0 }
  const entries = []
  for (const path of paths) entries.push(...await inventoryOne(root, path, counters, options))
  return { entries, sha256: inventoryHash(entries), total_bytes: counters.bytes }
}

function entryMap(entries) {
  return new Map(entries.map((entry) => [entry.path, entry]))
}

function equalEntry(left, right) {
  return Boolean(left && right && left.path === right.path && left.type === right.type && left.mode === right.mode && left.size === right.size && left.sha256 === right.sha256)
}

async function assertCurrentSourceSubset(workspaceRoot, paths, expectedEntries) {
  const expected = entryMap(expectedEntries)
  for (const path of paths) {
    const current = await inventoryPaths(workspaceRoot, [path], { allowMissing: true })
    for (const entry of current.entries) {
      if (!equalEntry(entry, expected.get(entry.path))) blocked(`current source no longer matches the receipt inventory at ${entry.path}`)
    }
  }
}

async function copyTree(sourceRoot, destinationRoot, repoPath) {
  const source = join(sourceRoot, ...repoPath.split("/"))
  const destination = join(destinationRoot, ...repoPath.split("/"))
  const info = await lstat(source)
  const mode = info.mode & 0o7777
  if (info.isFile()) {
    await mkdir(dirname(destination), { recursive: true, mode: 0o700 })
    await copyFile(source, destination, constants.COPYFILE_EXCL)
    await chmod(destination, mode)
    return
  }
  if (info.isSymbolicLink()) {
    await mkdir(dirname(destination), { recursive: true, mode: 0o700 })
    const target = await readlink(source, { encoding: "buffer" })
    await symlink(target, destination)
    return
  }
  if (!info.isDirectory()) blocked(`unsupported special filesystem object at ${repoPath}`)
  await mkdir(dirname(destination), { recursive: true, mode: 0o700 })
  await mkdir(destination, { mode: 0o700 })
  const names = await readdir(source, { encoding: "buffer" })
  names.sort(Buffer.compare)
  for (const nameBytes of names) {
    const name = decodeUTF8(nameBytes, `directory ${repoPath}`)
    await copyTree(sourceRoot, destinationRoot, `${repoPath}/${name}`)
  }
  await chmod(destination, mode)
}

async function writeExclusiveJSON(path, document) {
  const bytes = Buffer.from(stableJSON(document))
  let handle
  try {
    handle = await open(path, "wx", 0o400)
    await handle.writeFile(bytes)
    await handle.sync()
    await handle.chmod(0o400)
    await handle.close()
    handle = undefined
  } catch (error) {
    if (handle) await handle.close().catch(() => {})
    if (error?.code !== "EEXIST") throw error
    let existingHandle
    try {
      existingHandle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW)
      const info = await existingHandle.stat()
      if (!info.isFile() || info.isSymbolicLink() || info.size !== bytes.length) blocked(`existing immutable receipt is not the exact regular receipt for this operation: ${path}`)
      const existing = await existingHandle.readFile()
      if (!existing.equals(bytes)) blocked(`existing immutable receipt conflicts with requested operation: ${path}`)
    } catch (existingError) {
      if (existingError instanceof QuarantineBlockedError) throw existingError
      blocked(`existing immutable receipt cannot be authenticated (${existingError.code ?? existingError.message})`)
    } finally {
      await existingHandle?.close().catch(() => {})
    }
  }
  return { bytes, sha256: sha256(bytes) }
}

function validateReceiptDocument(receipt) {
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) blocked("receipt must be a JSON object")
  exactObjectKeys(receipt, ["schema_version", "operation_id", "workspace", "authority", "paths", "status", "inventory", "quarantine"], "receipt")
  if (receipt.schema_version !== UNTRACKED_QUARANTINE_RECEIPT_SCHEMA) blocked("receipt schema is invalid")
  if (!OPERATION_ID.test(receipt.operation_id ?? "")) blocked("receipt operation_id is invalid")
  if (!receipt.workspace || typeof receipt.workspace !== "object" || Array.isArray(receipt.workspace)) blocked("receipt workspace is invalid")
  exactObjectKeys(receipt.workspace, ["root", "sha256"], "receipt.workspace")
  const workspaceRoot = validateWorkspaceRoot(receipt.workspace.root)
  if (!SHA256.test(receipt.workspace.sha256 ?? "")) blocked("receipt workspace fingerprint is invalid")
  const authority = validateAuthority(receipt.authority)
  const paths = normalizePaths(receipt.paths)
  if (!receipt.status || typeof receipt.status !== "object" || Array.isArray(receipt.status)) blocked("receipt status is invalid")
  exactObjectKeys(receipt.status, ["before_sha256", "expected_after_sha256", "paths_sha256"], "receipt.status")
  for (const field of ["before_sha256", "expected_after_sha256", "paths_sha256"]) {
    if (!SHA256.test(receipt.status[field] ?? "")) blocked(`receipt.status.${field} is invalid`)
  }
  if (!receipt.inventory || typeof receipt.inventory !== "object" || Array.isArray(receipt.inventory)) blocked("receipt inventory is invalid")
  exactObjectKeys(receipt.inventory, ["sha256", "total_bytes", "entries"], "receipt.inventory")
  if (!SHA256.test(receipt.inventory.sha256 ?? "") || !Number.isSafeInteger(receipt.inventory.total_bytes) || receipt.inventory.total_bytes < 0 || receipt.inventory.total_bytes > MAX_TOTAL_FILE_BYTES || !Array.isArray(receipt.inventory.entries) || receipt.inventory.entries.length < 1 || receipt.inventory.entries.length > MAX_INVENTORY_ENTRIES) {
    blocked("receipt inventory bounds are invalid")
  }
  const seen = new Set()
  let fileBytes = 0
  for (const entry of receipt.inventory.entries) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) blocked("receipt inventory entry is invalid")
    exactObjectKeys(entry, ["path", "type", "mode", "size", "sha256"], "receipt inventory entry")
    const path = normalizeRepoPath(entry.path)
    if (seen.has(path)) blocked(`receipt inventory contains duplicate path: ${path}`)
    seen.add(path)
    if (!new Set(["file", "directory", "symlink"]).has(entry.type)) blocked(`receipt inventory has invalid type at ${path}`)
    if (!Number.isSafeInteger(entry.mode) || entry.mode < 0 || entry.mode > 0o7777 || !Number.isSafeInteger(entry.size) || entry.size < 0 || !SHA256.test(entry.sha256 ?? "")) blocked(`receipt inventory metadata is invalid at ${path}`)
    if (entry.type === "directory" && (entry.size !== 0 || entry.sha256 !== sha256(Buffer.alloc(0)))) blocked(`receipt directory metadata is invalid at ${path}`)
    if (entry.type === "file") fileBytes += entry.size
    if (fileBytes > MAX_TOTAL_FILE_BYTES) blocked(`receipt inventory exceeds ${MAX_TOTAL_FILE_BYTES} file bytes`)
  }
  if (fileBytes !== receipt.inventory.total_bytes || inventoryHash(receipt.inventory.entries) !== receipt.inventory.sha256) blocked("receipt inventory fingerprint is invalid")
  if (!receipt.quarantine || typeof receipt.quarantine !== "object" || Array.isArray(receipt.quarantine)) blocked("receipt quarantine identity is invalid")
  exactObjectKeys(receipt.quarantine, ["root", "data_path", "inventory_sha256"], "receipt.quarantine")
  if (receipt.quarantine.root !== operationDirectory(receipt.operation_id) || receipt.quarantine.data_path !== dataPath(receipt.operation_id) || receipt.quarantine.inventory_sha256 !== receipt.inventory.sha256) blocked("receipt quarantine paths or fingerprint are invalid")
  return { ...receipt, workspace: { ...receipt.workspace, root: workspaceRoot }, authority, paths }
}

export async function loadUntrackedQuarantineReceipt(path, expectedSha256) {
  let handle
  try {
    handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW)
    const info = await handle.stat()
    if (!info.isFile() || info.isSymbolicLink() || info.size < 2 || info.size > MAX_RECEIPT_BYTES) blocked("receipt must be a bounded regular non-symlink file")
    const bytes = await handle.readFile()
    const digest = sha256(bytes)
    if (expectedSha256 !== undefined && digest !== expectedSha256) blocked("receipt SHA-256 does not match the restore spec")
    let document
    try {
      document = JSON.parse(decodeUTF8(bytes, "receipt"))
    } catch (error) {
      if (error instanceof QuarantineBlockedError) throw error
      blocked(`receipt is invalid JSON (${error.message})`)
    }
    return { document: validateReceiptDocument(document), bytes, sha256: digest }
  } catch (error) {
    if (error instanceof QuarantineBlockedError) throw error
    blocked(`receipt is unreadable (${error.code ?? error.message})`)
  } finally {
    await handle?.close().catch(() => {})
  }
}

function validateReceiptAgainstSpec(receipt, spec, identity) {
  if (
    receipt.operation_id !== spec.operation_id
    || receipt.workspace.root !== identity.root
    || receipt.workspace.sha256 !== identity.sha256
    || receipt.authority.mode !== spec.authority.mode
    || receipt.authority.binding !== spec.authority.binding
    || stableJSON(receipt.paths) !== stableJSON(spec.paths)
    || (spec.action === "quarantine" && (
      receipt.status.before_sha256 !== spec.expected_status_sha256
      || receipt.status.paths_sha256 !== spec.expected_paths_sha256
      || receipt.inventory.sha256 !== spec.expected_inventory_sha256
    ))
  ) blocked("receipt does not match the exact workspace, authority, path set, status evidence, or inventory declared by the spec")
  for (const entry of receipt.inventory.entries) {
    if (!spec.paths.some((path) => entry.path === path || entry.path.startsWith(`${path}/`))) blocked(`receipt inventory escapes the declared path set at ${entry.path}`)
  }
}

async function stageQuarantine(spec, identity, statusEvidence, sourceInventory) {
  await ensureHarnessRoots()
  const opDir = operationDirectory(spec.operation_id)
  const finalData = dataPath(spec.operation_id)
  await mkdir(opDir, { recursive: true, mode: 0o700 })
  await assertDirectoryNotSymlink(opDir, "quarantine operation directory")
  const receipt = {
    schema_version: UNTRACKED_QUARANTINE_RECEIPT_SCHEMA,
    operation_id: spec.operation_id,
    workspace: { root: identity.root, sha256: identity.sha256 },
    authority: spec.authority,
    paths: spec.paths,
    status: {
      before_sha256: statusEvidence.statusSha256,
      expected_after_sha256: statusEvidence.expectedAfterSha256,
      paths_sha256: statusEvidence.pathsSha256,
    },
    inventory: {
      sha256: sourceInventory.sha256,
      total_bytes: sourceInventory.total_bytes,
      entries: sourceInventory.entries,
    },
    quarantine: { root: opDir, data_path: finalData, inventory_sha256: sourceInventory.sha256 },
  }
  const existingData = await lstat(finalData).catch((error) => error?.code === "ENOENT" ? undefined : Promise.reject(error))
  if (existingData) {
    if (!existingData.isDirectory() || existingData.isSymbolicLink()) blocked("existing quarantine data path is not a real directory")
    const existingInventory = await inventoryPaths(finalData, spec.paths)
    if (existingInventory.sha256 !== sourceInventory.sha256) blocked("existing quarantine data does not match the current source inventory")
  } else {
    const temporary = join(opDir, `.data.${process.pid}.${randomUUID()}.tmp`)
    await mkdir(temporary, { mode: 0o700 })
    try {
      for (const path of spec.paths) await copyTree(spec.workspace_root, temporary, path)
      const copied = await inventoryPaths(temporary, spec.paths)
      if (copied.sha256 !== sourceInventory.sha256) blocked("quarantine copy verification failed before source removal")
      await rename(temporary, finalData)
    } catch (error) {
      await rm(temporary, { recursive: true, force: true }).catch(() => {})
      throw error
    }
  }
  const copied = await inventoryPaths(finalData, spec.paths)
  if (copied.sha256 !== sourceInventory.sha256) blocked("quarantine representation failed inventory verification")
  const receiptIdentity = await writeExclusiveJSON(receiptPath(spec.operation_id), receipt)
  return { receipt, receiptIdentity }
}

async function removeOriginals(spec, receipt) {
  await assertCurrentSourceSubset(spec.workspace_root, spec.paths, receipt.inventory.entries)
  for (const path of spec.paths) {
    const absolute = join(spec.workspace_root, ...path.split("/"))
    const info = await lstat(absolute).catch((error) => error?.code === "ENOENT" ? undefined : Promise.reject(error))
    if (!info) continue
    await rm(absolute, { recursive: info.isDirectory() && !info.isSymbolicLink(), force: false })
  }
}

async function assertDestinationsAbsent(workspaceRoot, paths) {
  for (const path of paths) {
    const absolute = join(workspaceRoot, ...path.split("/"))
    const info = await lstat(absolute).catch((error) => error?.code === "ENOENT" ? undefined : Promise.reject(error))
    if (info) blocked(`restore refuses to overwrite an existing destination: ${path}`)
  }
}

function trackedStateSha256(records) {
  return sha256(rawStatusBytes(records.filter((record) => record.status !== "??" && record.status !== "!!")))
}

function statusAndPathEvidenceForRestore(workspaceRoot, paths) {
  const statusBytes = runGit(workspaceRoot, ["status", "--porcelain=v1", "-z", "--untracked-files=all", "--ignored=matching"], "Git pre-restore dirty-state readback")
  const records = parseStatus(statusBytes)
  for (const record of records) {
    if (paths.some((path) => pathWithin(record.path, path))) blocked("restore destination already has Git-visible state")
  }
  return { trackedSha256: trackedStateSha256(records) }
}

async function restoreFromReceipt(spec, identity) {
  const loaded = await readReceipt(spec.receipt_path, spec.expected_receipt_sha256)
  const receipt = loaded.document
  validateReceiptAgainstSpec(receipt, spec, identity)
  const qData = receipt.quarantine.data_path
  const qInfo = await lstat(qData).catch((error) => blocked(`quarantine data is unavailable (${error.code ?? error.message})`))
  if (!qInfo.isDirectory() || qInfo.isSymbolicLink()) blocked("quarantine data is not a real directory")
  const quarantineInventory = await inventoryPaths(qData, spec.paths)
  if (quarantineInventory.sha256 !== receipt.inventory.sha256) blocked("quarantine bytes/inventory no longer match the receipt")
  await assertDestinationsAbsent(spec.workspace_root, spec.paths)
  const before = statusAndPathEvidenceForRestore(spec.workspace_root, spec.paths)
  for (const path of spec.paths) await copyTree(qData, spec.workspace_root, path)
  const restored = await inventoryPaths(spec.workspace_root, spec.paths)
  if (restored.sha256 !== receipt.inventory.sha256) blocked("restored paths do not match receipt inventory")
  const after = statusAndPathEvidence(spec.workspace_root, spec.paths)
  if (after.statusSha256 !== receipt.status.before_sha256 || after.pathsSha256 !== receipt.status.paths_sha256) {
    blocked("restored Git status does not reproduce the exact pre-quarantine dirty-state/path fingerprints")
  }
  if (before.trackedSha256 !== trackedStateSha256(after.records)) blocked("restore changed tracked/staged Git state")
  return { receipt, receiptSha256: loaded.sha256, statusSha256: after.statusSha256, pathsSha256: after.pathsSha256 }
}

export async function runUntrackedQuarantine(specInput) {
  const spec = validateSpecDocument(specInput)
  await ensureHarnessRoots()
  const identity = await workspaceIdentity(spec.workspace_root)
  for (const path of spec.paths) await assertNoSymlinkAncestors(spec.workspace_root, path)
  if (spec.action === "inspect") {
    const evidence = statusAndPathEvidence(spec.workspace_root, spec.paths)
    const inventory = await inventoryPaths(spec.workspace_root, spec.paths)
    return {
      result: "PASS",
      action: "inspect",
      operation_id: spec.operation_id,
      workspace_sha256: identity.sha256,
      status_sha256: evidence.statusSha256,
      paths_sha256: evidence.pathsSha256,
      expected_after_status_sha256: evidence.expectedAfterSha256,
      inventory_sha256: inventory.sha256,
      paths: spec.paths.length,
    }
  }
  if (spec.action === "quarantine") {
    if (identity.sha256 !== spec.expected_workspace_sha256) blocked("workspace identity fingerprint changed after inspection")
    const evidence = statusAndPathEvidence(spec.workspace_root, spec.paths)
    if (evidence.statusSha256 !== spec.expected_status_sha256 || evidence.pathsSha256 !== spec.expected_paths_sha256) blocked("dirty-state or requested-path fingerprint changed after inspection")
    const sourceInventory = await inventoryPaths(spec.workspace_root, spec.paths)
    const { receipt, receiptIdentity } = await stageQuarantine(spec, identity, evidence, sourceInventory)
    await removeOriginals(spec, receipt)
    const afterBytes = runGit(spec.workspace_root, ["status", "--porcelain=v1", "-z", "--untracked-files=all", "--ignored=matching"], "Git post-quarantine readback")
    const afterRecords = parseStatus(afterBytes)
    if (sha256(afterBytes) !== receipt.status.expected_after_sha256) blocked("post-quarantine dirty-state fingerprint differs from the precomputed expected state")
    if (afterRecords.some((record) => spec.paths.some((path) => pathWithin(record.path, path)))) blocked("a quarantined path remains Git-visible after removal")
    if (trackedStateSha256(evidence.records) !== trackedStateSha256(afterRecords)) blocked("quarantine changed tracked/staged Git state")
    return {
      result: "PASS",
      action: "quarantine",
      operation_id: spec.operation_id,
      workspace_sha256: identity.sha256,
      receipt_path: receiptPath(spec.operation_id),
      receipt_sha256: receiptIdentity.sha256,
      before_status_sha256: receipt.status.before_sha256,
      after_status_sha256: sha256(afterBytes),
      inventory_sha256: receipt.inventory.sha256,
      paths: spec.paths.length,
    }
  }
  const restored = await restoreFromReceipt(spec, identity)
  return {
    result: "PASS",
    action: "restore",
    operation_id: spec.operation_id,
    workspace_sha256: identity.sha256,
    receipt_path: spec.receipt_path,
    receipt_sha256: restored.receiptSha256,
    status_sha256: restored.statusSha256,
    paths_sha256: restored.pathsSha256,
    inventory_sha256: restored.receipt.inventory.sha256,
    paths: spec.paths.length,
  }
}
