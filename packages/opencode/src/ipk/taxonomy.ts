import fs from "fs/promises"
import path from "path"
import type { PieceMeta } from "./types"
import { ensure, file as safeFile, taxonomyRoot, writeText } from "./storage"

type Kind = "domains" | "methods" | "projects" | "contexts"

type Item = {
  id: string
  label: string
  aliases: string[]
}

type Index = {
  version: string
  updated_at: string
  items: Item[]
}

const now = () => new Date().toISOString()

const clean = (text: string) => text.trim().toLowerCase()

const slug = (text: string) =>
  clean(text)
    .replace(/[^a-z0-9\u4e00-\u9fff]+/giu, "-")
    .replace(/^-+|-+$/gu, "")
    .replace(/-{2,}/gu, "-")

const defaults = (kind: Kind): Item[] => {
  if (kind === "domains") {
    return [
      { id: "general", label: "general", aliases: ["通用"] },
      { id: "statistical-physics", label: "statistical physics", aliases: ["统计物理", "ising"] },
      { id: "quantum-physics", label: "quantum physics", aliases: ["量子", "quantum"] },
    ]
  }
  if (kind === "methods") {
    return [
      { id: "analysis", label: "analysis", aliases: ["分析"] },
      { id: "rg", label: "renormalization group", aliases: ["RG", "rg", "重整化群", "renormalization group"] },
      { id: "duality", label: "duality", aliases: ["对偶", "self-duality"] },
    ]
  }
  if (kind === "contexts") {
    return [
      { id: "discussion", label: "discussion", aliases: ["讨论", "聊天"] },
      { id: "research", label: "research", aliases: ["研究"] },
      { id: "writing", label: "writing", aliases: ["写作"] },
      { id: "reflection", label: "reflection", aliases: ["反思"] },
      { id: "learning", label: "learning", aliases: ["学习"] },
    ]
  }
  return []
}

const pathFor = (kind: Kind) =>
  kind === "contexts" ? safeFile(taxonomyRoot(), "contexts.json") : path.join(taxonomyRoot(), kind, "index.json")

const setup = async (kind: Kind) => {
  await ensure()
  if (kind === "contexts") {
    await fs.mkdir(taxonomyRoot(), { recursive: true })
    return
  }
  await Promise.all([fs.mkdir(path.join(taxonomyRoot(), kind), { recursive: true }), fs.mkdir(path.join(taxonomyRoot(), kind, "items"), { recursive: true })])
}

const read = async (kind: Kind) => {
  await setup(kind)
  const raw = await Bun.file(pathFor(kind))
    .json()
    .catch(() => undefined)
  const list = Array.isArray((raw as Index | undefined)?.items) ? (raw as Index).items : undefined
  if (list && list.length > 0) {
    return {
      version: "v1",
      updated_at: now(),
      items: list.map((item) => ({
        id: item.id,
        label: item.label,
        aliases: Array.from(new Set([item.id, item.label, ...(item.aliases ?? [])])).filter(Boolean),
      })),
    } as Index
  }
  const index: Index = {
    version: "v1",
    updated_at: now(),
    items: defaults(kind),
  }
  await writeText(pathFor(kind), JSON.stringify(index, null, 2))
  return index
}

const write = async (kind: Kind, index: Index) => {
  const next: Index = {
    ...index,
    version: "v1",
    updated_at: now(),
  }
  await writeText(pathFor(kind), JSON.stringify(next, null, 2))
  return next
}

const terms = (query: string) => {
  const list = query
    .split(/[\s,，、:：;；/()（）[\]{}]+/u)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2)
  return Array.from(new Set(list))
}

export namespace Taxonomy {
  export async function normalize(kind: Kind, values: string[]) {
    const index = await read(kind)
    const list = values.map((item) => item.trim()).filter(Boolean)
    const ids: string[] = []
    let dirty = false

    list.forEach((value) => {
      const key = clean(value)
      const hit = index.items.find((item) => {
        if (clean(item.id) === key) return true
        if (clean(item.label) === key) return true
        return item.aliases.map(clean).includes(key)
      })
      if (hit) {
        ids.push(hit.id)
        if (!hit.aliases.map(clean).includes(key)) {
          hit.aliases = Array.from(new Set([...hit.aliases, value]))
          dirty = true
        }
        return
      }
      const id = slug(value) || "misc"
      index.items.push({
        id,
        label: value,
        aliases: [value],
      })
      ids.push(id)
      dirty = true
    })

    if (dirty) await write(kind, index)
    return Array.from(new Set(ids))
  }

  export async function normalizeMeta(meta: PieceMeta): Promise<PieceMeta> {
    const [domains, methods, projects, contexts] = await Promise.all([
      normalize("domains", meta.domains ?? []),
      normalize("methods", meta.methods ?? []),
      normalize("projects", meta.projects ?? []),
      normalize("contexts", meta.contexts ?? []),
    ])
    return {
      ...meta,
      domains,
      methods,
      projects,
      contexts,
    }
  }

  export async function expand(query: string) {
    const words = terms(query)
    const kinds: Kind[] = ["domains", "methods", "projects", "contexts"]
    const rows = await Promise.all(
      kinds.map(async (kind) => ({
        kind,
        index: await read(kind),
      })),
    )

    return rows.reduce(
      (acc, row) => {
        const matched = row.index.items
          .filter((item) => {
            const all = [item.id, item.label, ...item.aliases].map(clean)
            return words.some((word) => all.some((value) => value.includes(clean(word))))
          })
          .map((item) => item.id)
        acc[row.kind] = matched
        return acc
      },
      {
        domains: [] as string[],
        methods: [] as string[],
        projects: [] as string[],
        contexts: [] as string[],
      },
    )
  }

  export function split(query: string) {
    return terms(query)
  }
}
