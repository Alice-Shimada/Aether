import fs from "fs/promises"
import path from "path"
import { Global } from "@/global"
import { AppIdentity, MemoryEnv } from "./identity"

const expand = (input: string) => {
  if (input === "~") return Global.Path.home
  if (input.startsWith("~/") || input.startsWith("~\\")) return path.join(Global.Path.home, input.slice(2))
  return input
}

const value = (key: string) => process.env[key]?.trim()

const base = () => path.resolve(expand(value(MemoryEnv.home) || Global.Path.data))

const unique = (items: string[]) => Array.from(new Set(items.map((item) => path.resolve(item))))

const ok = (part: string) => {
  if (!part || part === "." || part === ".." || path.isAbsolute(part) || /[/\\]/u.test(part)) {
    throw new Error(`invalid memory path segment: ${part}`)
  }
  return part
}

export namespace MemoryRootResolver {
  export function identity() {
    return AppIdentity
  }

  export function env() {
    return MemoryEnv
  }

  export function root() {
    return base()
  }

  export function legacyIpkRoots() {
    return unique([path.join(Global.Path.data, "ipk")]).filter((item) => item !== MemoryPath.ipkRoot())
  }

  export function legacyAdaptationRoots() {
    return unique([path.join(Global.Path.config, "adaptation")]).filter((item) => item !== MemoryPath.adaptationRoot())
  }
}

export namespace MemoryPath {
  export function root() {
    return MemoryRootResolver.root()
  }

  export function ipkRoot() {
    return path.join(root(), "ipk")
  }

  export function adaptationRoot() {
    return path.join(root(), "adaptation")
  }

  export function cacheRoot() {
    return path.join(root(), "cache")
  }

  export function stateRoot() {
    return path.join(root(), "state")
  }

  export function child(dir: string, ...parts: string[]) {
    const file = path.join(dir, ...parts.map(ok))
    if (!contains(dir, file)) throw new Error(`memory path escaped root: ${file}`)
    return file
  }

  export function contains(dir: string, file: string) {
    const rel = path.relative(path.resolve(dir), path.resolve(file))
    return rel === "" || (!!rel && !rel.startsWith("..") && !path.isAbsolute(rel))
  }

  export async function assertDir(root: string, dir: string) {
    const base = await fs.realpath(root).catch(() => path.resolve(root))
    const real = await fs.realpath(dir).catch(() => path.resolve(dir))
    if (!contains(base, real)) throw new Error(`memory directory escaped root: ${dir}`)
    if (path.resolve(root) === path.resolve(dir)) return
    const stat = await fs.lstat(dir).catch(() => undefined)
    if (stat?.isSymbolicLink()) throw new Error(`memory directory must not be a symlink: ${dir}`)
  }

  export async function assertFile(root: string, file: string) {
    await assertDir(root, path.dirname(file))
    const stat = await fs.lstat(file).catch(() => undefined)
    if (stat?.isSymbolicLink()) throw new Error(`memory file must not be a symlink: ${file}`)
  }
}
