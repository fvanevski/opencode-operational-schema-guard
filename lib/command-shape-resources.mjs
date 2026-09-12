import { spawnSync } from "node:child_process"
import { lstat, readFile, realpath } from "node:fs/promises"
import { isAbsolute, relative, resolve } from "node:path"

export const COMMAND_SHAPE_INDEX_SCHEMA = "opencode-command-shape-index-v1"
const MAX_INDEX_BYTES = 64 * 1024
const MAX_RESOURCE_BYTES = 128 * 1024
const CORRECTION_CODE = /^[A-Z0-9_]+$/
const SECTION_NAME = /^[a-z0-9][a-z0-9-]{0,79}$/
const REPOSITORY_SEGMENT = /^[A-Za-z0-9_.-]+$/

function inside(path, root) {
  const rel = relative(resolve(root), resolve(path))
  return rel === "" || (rel !== ".." && !rel.startsWith("../") && !rel.startsWith("..\\"))
}

function canonicalRepositoryParts(owner, repository) {
  const repo = String(repository ?? "").replace(/\.git$/i, "")
  if (!REPOSITORY_SEGMENT.test(owner ?? "") || !REPOSITORY_SEGMENT.test(repo) || !owner || !repo) return undefined
  return `${String(owner).toLowerCase()}/${repo.toLowerCase()}`
}

export function canonicalRepositoryIdentity(remote) {
  const value = String(remote ?? "").trim()
  if (!value || /[\r\n\0%]/.test(value)) return undefined

  const scp = value.match(/^(?:git@)?github\.com:([^/\s]+)\/([^/\s]+)\/?$/i)
  if (scp) return canonicalRepositoryParts(scp[1], scp[2])

  let url
  try {
    url = new URL(value)
  } catch {
    return undefined
  }
  if (url.hostname.toLowerCase() !== "github.com" || url.search || url.hash) return undefined
  if (!new Set(["https:", "http:", "ssh:", "git:"]).has(url.protocol)) return undefined
  const parts = url.pathname.split("/").filter(Boolean)
  if (parts.length !== 2) return undefined
  return canonicalRepositoryParts(parts[0], parts[1])
}

export function repositoryIdentityFromRemoteListing(output, { preferredRemote = "origin" } = {}) {
  const byRemote = new Map()
  for (const line of String(output ?? "").split(/\r?\n/)) {
    const match = line.trim().match(/^(\S+)\s+(\S+)\s+\((?:fetch|push)\)$/)
    if (!match) continue
    const identity = canonicalRepositoryIdentity(match[2])
    if (!identity) continue
    const identities = byRemote.get(match[1]) ?? new Set()
    identities.add(identity)
    byRemote.set(match[1], identities)
  }

  const preferred = byRemote.get(preferredRemote)
  if (preferred?.size === 1) return [...preferred][0]
  if (preferred && preferred.size > 1) return undefined

  const identities = new Set([...byRemote.values()].flatMap((values) => [...values]))
  return identities.size === 1 ? [...identities][0] : undefined
}

export function resolveRepositoryIdentity(directory, { spawn = spawnSync, preferredRemote = "origin" } = {}) {
  let result
  try {
    result = spawn("git", ["-C", resolve(directory), "remote", "-v"], {
      encoding: "utf8",
      timeout: 5_000,
      maxBuffer: 128 * 1024,
      env: { ...process.env, GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0" },
    })
  } catch {
    return undefined
  }
  if (result?.error || result?.status !== 0) return undefined
  return repositoryIdentityFromRemoteListing(result.stdout, { preferredRemote })
}

async function boundedRegularFile(path, maxBytes, root) {
  const lexical = resolve(path)
  const lexicalRoot = resolve(root)
  if (!inside(lexical, lexicalRoot)) return undefined
  let rootReal
  let targetReal
  let info
  try {
    ;[rootReal, targetReal, info] = await Promise.all([realpath(lexicalRoot), realpath(lexical), lstat(lexical)])
  } catch {
    return undefined
  }
  if (!inside(targetReal, rootReal) || !info.isFile() || info.isSymbolicLink() || info.size < 1 || info.size > maxBytes) return undefined
  return lexical
}

async function loadIndex(commandShapeRoot) {
  const indexPath = await boundedRegularFile(resolve(commandShapeRoot, "index.json"), MAX_INDEX_BYTES, commandShapeRoot)
  if (!indexPath) return undefined
  try {
    const document = JSON.parse(await readFile(indexPath, "utf8"))
    if (
      !document || typeof document !== "object" || Array.isArray(document)
      || document.schema_version !== COMMAND_SHAPE_INDEX_SCHEMA
      || !document.global || typeof document.global !== "object" || Array.isArray(document.global)
      || !document.repositories || typeof document.repositories !== "object" || Array.isArray(document.repositories)
    ) return undefined
    return document
  } catch {
    return undefined
  }
}

function resourceConfig(entry, correction) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return undefined
  if (typeof entry.path !== "string" || !entry.path.endsWith(".md") || isAbsolute(entry.path) || entry.path.includes("\0")) return undefined
  const segments = entry.path.split(/[\\/]/)
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) return undefined
  const section = entry.corrections?.[correction]
  if (typeof section !== "string" || !SECTION_NAME.test(section)) return undefined
  return { path: entry.path, section }
}

async function validatedResource(commandShapeRoot, config) {
  if (!config) return undefined
  const path = await boundedRegularFile(resolve(commandShapeRoot, config.path), MAX_RESOURCE_BYTES, commandShapeRoot)
  if (!path) return undefined
  try {
    const content = await readFile(path, "utf8")
    const marker = `<!-- command-shape-section:${config.section} -->`
    if (!content.includes(marker)) return undefined
    return { path, section: config.section }
  } catch {
    return undefined
  }
}

export async function resolveCommandShapeResource({ correction, directory, pluginRoot }) {
  if (!CORRECTION_CODE.test(String(correction ?? "")) || !pluginRoot) return undefined
  const commandShapeRoot = resolve(pluginRoot, "resources", "command-shapes")
  const index = await loadIndex(commandShapeRoot)
  if (!index) return undefined

  const repository = resolveRepositoryIdentity(directory)
  const repositoryEntry = repository ? index.repositories?.[repository] : undefined
  const candidates = [
    { repository, config: resourceConfig(repositoryEntry, correction) },
    { repository: "global", config: resourceConfig(index.global, correction) },
  ]
  for (const candidate of candidates) {
    const resource = await validatedResource(commandShapeRoot, candidate.config)
    if (!resource) continue
    return {
      correction,
      repository: candidate.repository ?? "global",
      path: resource.path,
      section: resource.section,
      marker: `OPERATIONAL_RESOURCE: kind=command-shape; repository=${candidate.repository ?? "global"}; correction=${correction}; path=${JSON.stringify(resource.path)}; section=${resource.section}`,
    }
  }
  return undefined
}

export async function appendCommandShapeResource(message, options) {
  const text = String(message ?? "")
  if (/^OPERATIONAL_RESOURCE:/m.test(text)) return text
  const correction = text.match(/OPERATIONAL_CORRECTION:\s*([A-Z0-9_]+)\s*;/)?.[1]
  if (!correction) return text
  try {
    const resource = await resolveCommandShapeResource({ correction, ...options })
    return resource ? `${text}\n${resource.marker}` : text
  } catch {
    return text
  }
}
