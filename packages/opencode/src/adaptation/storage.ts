import fs from "fs/promises"
import path from "path"
import { MemoryManifest } from "@/memory/manifest"
import { MemoryPath } from "@/memory/path"
import { renderMirror } from "./render"

const base = () => MemoryPath.adaptationRoot()
const global = () => safeJoin(base(), "global")
const subjects = () => safeJoin(base(), "subjects")
const initiatives = () => safeJoin(base(), "initiatives")
const projects = () => safeJoin(base(), "projects")
const taskScopes = () => safeJoin(base(), "task-scopes")
const artifacts = () => safeJoin(base(), "artifacts")
const signals = () => safeJoin(base(), "signals")
const summaries = () => safeJoin(base(), "summaries")
const proposals = () => safeJoin(base(), "proposals")
const indexes = () => safeJoin(base(), "indexes")
const bindings = () => safeJoin(base(), "bindings")
const cache = () => safeJoin(MemoryPath.cacheRoot(), "adaptation")

const state = {
  run: undefined as Promise<void> | undefined,
}

const now = () => new Date().toISOString()

const seg = (item: string) => {
  if (!item || item === "." || item === ".." || path.isAbsolute(item) || /[/\\]/u.test(item)) {
    throw new Error(`invalid adaptation path segment: ${item}`)
  }
  return item
}

const own = (target: string) => {
  if (MemoryPath.contains(base(), target)) return base()
  if (MemoryPath.contains(cache(), target)) return cache()
  throw new Error(`adaptation write escaped root: ${target}`)
}

const mirror = (target: string) => {
  if (target.endsWith(".json")) return `${target.slice(0, -5)}.md`
  return `${target}.md`
}

const seedJSON = async (target: string, value: unknown) => {
  const exists = await fs
    .access(target)
    .then(() => true)
    .catch(() => false)
  if (exists) return
  await MemoryPath.assertFile(own(target), target)
  await Bun.write(target, JSON.stringify(value, null, 2))
}

const setup = async () => {
  const dirs = [
    base(),
    global(),
    safeJoin(global(), "user"),
    subjects(),
    initiatives(),
    projects(),
    taskScopes(),
    artifacts(),
    signals(),
    summaries(),
    proposals(),
    safeJoin(proposals(), "pending"),
    safeJoin(proposals(), "confirmed"),
    safeJoin(proposals(), "rejected"),
    safeJoin(proposals(), "deferred"),
    indexes(),
    bindings(),
    safeJoin(bindings(), "sessions"),
    safeJoin(bindings(), "projects"),
    safeJoin(bindings(), "task-scopes"),
    cache(),
    safeJoin(cache(), "context-packets"),
  ]
  await Promise.all(dirs.map((dir) => fs.mkdir(dir, { recursive: true })))
  await Promise.all(dirs.map((dir) => MemoryPath.assertDir(MemoryPath.root(), dir)))

  await MemoryManifest.ensure()

  const globalProfile = safeJoin(global(), "user", "global-profile.json")
  const globalPolicy = safeJoin(global(), "user", "global-policy.json")
  const seed = [
    seedJSON(globalProfile, {
      version: "v1",
      updated_at: now(),
      summary: "",
      stable_context: [],
      subject_ids: [],
      task_scope_refs: [],
      artifact_refs: [],
      ipk_piece_refs: [],
    }).catch(() => undefined),
    seedJSON(globalPolicy, {
      scope: { level: "global", target: "user" },
      response_policy: [],
      operation_policy: [],
      updated_at: now(),
    }).catch(() => undefined),
  ]
  await Promise.all(seed)
}

export const ensure = () => {
  if (state.run) return state.run
  state.run = setup()
  return state.run
}

export const root = () => {
  void ensure()
  return base()
}

export const globalRoot = () => {
  void ensure()
  return global()
}

export const subjectsRoot = () => {
  void ensure()
  return subjects()
}

export const projectsRoot = () => {
  void ensure()
  return projects()
}

export const initiativesRoot = () => {
  void ensure()
  return initiatives()
}

export const taskScopesRoot = () => {
  void ensure()
  return taskScopes()
}

export const artifactsRoot = () => {
  void ensure()
  return artifacts()
}

export const projectRoot = (project_id: string) => {
  void ensure()
  return safeJoin(projects(), project_id)
}

export const initiativeRoot = (initiative_id: string) => {
  void ensure()
  return safeJoin(initiatives(), initiative_id)
}

export const taskScopeRoot = (scope_id: string) => {
  void ensure()
  return safeJoin(taskScopes(), scope_id)
}

export const artifactRoot = (artifact_id: string) => {
  void ensure()
  return safeJoin(artifacts(), artifact_id)
}

export const signalsRoot = () => {
  void ensure()
  return signals()
}

export const summariesRoot = () => {
  void ensure()
  return summaries()
}

export const proposalsRoot = () => {
  void ensure()
  return proposals()
}

export const indexesRoot = () => {
  void ensure()
  return indexes()
}

export const bindingsRoot = () => {
  void ensure()
  return bindings()
}

export const cacheRoot = () => {
  void ensure()
  return cache()
}

export const safeJoin = (dir: string, ...parts: string[]) => {
  const file = path.join(dir, ...parts.map(seg))
  if (!MemoryPath.contains(dir, file)) throw new Error(`adaptation path escaped root: ${file}`)
  return file
}

export const ensureDir = async (dir: string) => {
  await ensure()
  await fs.mkdir(dir, { recursive: true })
  await MemoryPath.assertDir(own(dir), dir)
}

export const atomicWriteText = async (target: string, value: string) => {
  await ensure()
  await ensureDir(path.dirname(target))
  await MemoryPath.assertFile(own(target), target)
  const dir = path.dirname(target)
  const tmp = safeJoin(dir, `.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}`)
  await MemoryPath.assertFile(own(tmp), tmp)
  await Bun.write(tmp, value)
  await fs.rename(tmp, target)
}

export const atomicWriteJSON = async (target: string, value: unknown) => {
  await atomicWriteText(target, JSON.stringify(value, null, 2))
}

export const readJSON = async <T>(target: string, fallback: T) => {
  await ensure()
  const next = await Bun.file(target)
    .json()
    .catch(() => fallback)
  return next as T
}

export const render = (kind: string, value: unknown) => renderMirror(kind, value)

export const writeJSON = async (target: string, value: unknown, kind?: string) => {
  await atomicWriteJSON(target, value)
  if (!kind) return
  await atomicWriteText(mirror(target), render(kind, value))
}

export const writeText = async (target: string, value: string) => {
  await atomicWriteText(target, value)
}

export const appendText = async (target: string, value: string) => {
  await ensure()
  await ensureDir(path.dirname(target))
  await MemoryPath.assertFile(own(target), target)
  await fs.appendFile(target, value)
}

export const remove = async (target: string) => {
  await ensure()
  const root = own(target)
  await MemoryPath.assertFile(root, target)
  await fs.unlink(target).catch(() => undefined)
}

export const projectFile = (project_id: string, ...parts: string[]) => safeJoin(projectRoot(project_id), ...parts)
export const initiativeFile = (initiative_id: string, ...parts: string[]) => safeJoin(initiativeRoot(initiative_id), ...parts)
export const taskScopeFile = (scope_id: string, ...parts: string[]) => safeJoin(taskScopeRoot(scope_id), ...parts)
export const artifactFile = (artifact_id: string, ...parts: string[]) => safeJoin(artifactRoot(artifact_id), ...parts)

export const bindingFile = (kind: "sessions" | "projects" | "task-scopes", id: string) =>
  safeJoin(bindingsRoot(), kind, `${seg(id)}.json`)

export const contextPacketFile = (id: string) => safeJoin(cacheRoot(), "context-packets", `${seg(id)}.json`)

export const nowISO = now
