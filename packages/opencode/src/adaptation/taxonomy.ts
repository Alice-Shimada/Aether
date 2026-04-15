import { ensure, readJSON, root, safeJoin, writeJSON } from "./storage"

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
    .replace(/-{2,}/gu, "-") || "misc"

const file = () => safeJoin(root(), "taxonomy.json")

const empty = (): Index => ({
  version: "v1",
  updated_at: now(),
  items: [],
})

const read = async () => {
  await ensure()
  const raw = await readJSON<Index>(file(), empty())
  if (Array.isArray(raw.items) && raw.items.length > 0) {
    return {
      ...raw,
      items: raw.items.map((item) => ({
        id: item.id,
        label: item.label,
        aliases: Array.from(new Set([item.id, item.label, ...(item.aliases ?? [])])).filter(Boolean),
      })),
    }
  }
  return empty()
}

const write = async (index: Index) => {
  const next: Index = {
    ...index,
    version: "v1",
    updated_at: now(),
  }
  await writeJSON(file(), next)
  return next
}

export namespace AdaptationTaxonomy {
  /** Return the list of existing canonical trait IDs (for prompt injection). */
  export async function labels(): Promise<string[]> {
    const index = await read()
    return index.items.map((item) => item.id)
  }

  /**
   * Normalize raw trait strings from LLM output.
   * - If a trait matches an existing item (by id/label/alias), reuse its canonical id.
   * - Otherwise create a new item with a slug-based id.
   * - New aliases are always accumulated.
   */
  export async function normalize(values: string[]): Promise<string[]> {
    const index = await read()
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
      const id = slug(value)
      index.items.push({
        id,
        label: value,
        aliases: [id, value],
      })
      ids.push(id)
      dirty = true
    })

    if (dirty) await write(index)
    return Array.from(new Set(ids))
  }
}
