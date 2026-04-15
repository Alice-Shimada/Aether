import { IpkEvent } from "./events"
import { file, indexesRoot, writeText } from "./storage"
import { Piece } from "./piece"

type Entry = {
  key: string
  label: string
  summary: string
  piece_ids: string[]
  count: number
}

type File = {
  version: string
  updated_at: string
  entries: Entry[]
}

const now = () => new Date().toISOString()

const clip = (text: string, max: number) => {
  if (text.length <= max) return text
  return `${text.slice(0, Math.max(0, max - 1))}…`
}

const fromMap = (
  map: Map<
    string,
    {
      label: string
      summary: string
      piece_ids: Set<string>
    }
  >,
) =>
  Array.from(map.entries())
    .map(([key, item]) => ({
      key,
      label: item.label,
      summary: item.summary,
      piece_ids: Array.from(item.piece_ids),
      count: item.piece_ids.size,
    }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))

const ensure = (
  map: Map<
    string,
    {
      label: string
      summary: string
      piece_ids: Set<string>
    }
  >,
  key: string,
  label: string,
  summary: string,
  piece_id: string,
) => {
  const old = map.get(key)
  if (old) {
    old.piece_ids.add(piece_id)
    return
  }
  map.set(key, {
    label,
    summary,
    piece_ids: new Set([piece_id]),
  })
}

const shell = (entries: Entry[], updated_at: string): File => ({
  version: "v1",
  updated_at,
  entries,
})

export namespace Indexes {
  export async function rebuild() {
    const docs = await Piece.docs()
    const updated_at = now()

    const by_type = new Map<string, { label: string; summary: string; piece_ids: Set<string> }>()
    const by_project = new Map<string, { label: string; summary: string; piece_ids: Set<string> }>()
    const by_time = new Map<string, { label: string; summary: string; piece_ids: Set<string> }>()
    const by_domain = new Map<string, { label: string; summary: string; piece_ids: Set<string> }>()
    const by_method = new Map<string, { label: string; summary: string; piece_ids: Set<string> }>()
    const open_questions = new Map<string, { label: string; summary: string; piece_ids: Set<string> }>()
    const graph_links = new Map<string, { label: string; summary: string; piece_ids: Set<string> }>()

    docs.forEach((doc) => {
      const piece_id = doc.meta.id
      const summary = doc.surface.catalog.summary
      const year = Number.parseInt(doc.meta.created_at.slice(0, 4), 10)
      const key = Number.isFinite(year) ? String(year) : "unknown"

      ensure(by_type, doc.meta.type, doc.meta.type, summary, piece_id)
      ensure(by_time, key, key, summary, piece_id)
      ;(doc.meta.projects ?? []).forEach((item) => ensure(by_project, item, item, summary, piece_id))
      ;(doc.meta.domains ?? []).forEach((item) => ensure(by_domain, item, item, summary, piece_id))
      ;(doc.meta.methods ?? []).forEach((item) => ensure(by_method, item, item, summary, piece_id))
      ;(doc.surface.retrieve.open_questions ?? []).forEach((item) => {
        const q = item.trim()
        if (!q) return
        const key = clip(q, 120)
        ensure(open_questions, key, clip(q, 72), `open question from ${doc.meta.title}`, piece_id)
      })

      doc.links.links.forEach((link) => {
        const key = `${doc.meta.id}->${link.target}`
        const old = graph_links.get(key)
        if (old) {
          old.piece_ids.add(doc.meta.id)
          old.piece_ids.add(link.target)
          return
        }
        graph_links.set(key, {
          label: `${doc.meta.id} -> ${link.target}`,
          summary: clip(link.reason, 120),
          piece_ids: new Set([doc.meta.id, link.target]),
        })
      })
    })

    await Promise.all([
      writeText(file(indexesRoot(), "by_type.json"), JSON.stringify(shell(fromMap(by_type), updated_at), null, 2)),
      writeText(
        file(indexesRoot(), "by_project.json"),
        JSON.stringify(shell(fromMap(by_project), updated_at), null, 2),
      ),
      writeText(file(indexesRoot(), "by_time.json"), JSON.stringify(shell(fromMap(by_time), updated_at), null, 2)),
      writeText(
        file(indexesRoot(), "by_domain.json"),
        JSON.stringify(shell(fromMap(by_domain), updated_at), null, 2),
      ),
      writeText(
        file(indexesRoot(), "by_method.json"),
        JSON.stringify(shell(fromMap(by_method), updated_at), null, 2),
      ),
      writeText(
        file(indexesRoot(), "open_questions.json"),
        JSON.stringify(shell(fromMap(open_questions), updated_at), null, 2),
      ),
      writeText(
        file(indexesRoot(), "graph_links.json"),
        JSON.stringify(shell(fromMap(graph_links), updated_at), null, 2),
      ),
    ])

    await IpkEvent.reindexed({ at: updated_at })

    return {
      updated_at,
      count: docs.length,
    }
  }
}
