import fs from "fs/promises"
import path from "path"
import { Identifier } from "@/id/id"
import { Draft } from "./draft"
import { ensure, file, pieceDir, piecesRoot, writeText } from "./storage"
import { Compile } from "./compile"
import { IpkEvent } from "./events"
import { Indexes } from "./indexes"
import { type DraftRecord, PieceCard, PieceLinks, PieceMeta, PieceSurface, type DraftView } from "./types"

const now = () => new Date().toISOString()

const read = async (dir: string) => {
  const [meta_raw, surface_raw, links_raw, body] = await Promise.all([
    Bun.file(path.join(dir, "meta.json"))
      .json()
      .catch(() => undefined),
    Bun.file(path.join(dir, "surface.json"))
      .json()
      .catch(() => undefined),
    Bun.file(path.join(dir, "links.json"))
      .json()
      .catch(() => undefined),
    Bun.file(path.join(dir, "piece.md"))
      .text()
      .catch(() => ""),
  ])

  const meta = PieceMeta.safeParse(meta_raw)
  const surface = PieceSurface.safeParse(surface_raw)
  const links = PieceLinks.safeParse(links_raw)
  if (!meta.success || !surface.success || !links.success) return

  return {
    meta: meta.data,
    surface: surface.data,
    links: links.data,
    body,
    dir,
  }
}

const walk = async () => {
  await ensure()
  const kinds = await fs.readdir(piecesRoot(), { withFileTypes: true }).catch(() => [])
  const years = await Promise.all(
    kinds
      .filter((item) => item.isDirectory())
      .map(async (item) => ({
        kind: item.name,
        years: await fs.readdir(path.join(piecesRoot(), item.name), { withFileTypes: true }).catch(() => []),
      })),
  )

  const dirs = years.flatMap((item) =>
    item.years.flatMap((year) =>
      year.isDirectory()
        ? [
            fs
              .readdir(path.join(piecesRoot(), item.kind, year.name), { withFileTypes: true })
              .then((rows) =>
                rows
                  .filter((row) => row.isDirectory())
                  .map((row) => path.join(piecesRoot(), item.kind, year.name, row.name)),
              )
              .catch(() => [] as string[]),
          ]
        : [],
    ),
  )

  const list = await Promise.all(dirs)
  return list.flat()
}

const card = (meta: PieceMeta, surface: PieceSurface) =>
  PieceCard.parse({
    piece_id: meta.id,
    title: meta.title,
    body_summary: surface.human.body_summary,
    type: meta.type,
    status: meta.status,
    created_at: meta.created_at,
    updated_at: meta.updated_at,
    projects: meta.projects ?? [],
  })

const render = (item: DraftRecord) => `# ${item.meta.title}

## Summary

${item.surface.human.body_summary}

## Body

${item.body}
`

const body = (raw: string) => {
  const match = raw.match(/##\s+Body\s+([\s\S]*)$/u)
  if (!match) return raw.trim()
  return match[1].trim()
}

const write = async (item: DraftRecord) => {
  const dir = pieceDir(item.meta)
  await ensure()
  await fs.mkdir(dir, { recursive: true })
  await Promise.all([
    writeText(file(dir, "piece.md"), render(item)),
    writeText(file(dir, "meta.json"), JSON.stringify(item.meta, null, 2)),
    writeText(file(dir, "surface.json"), JSON.stringify(item.surface, null, 2)),
    writeText(file(dir, "links.json"), JSON.stringify(item.links, null, 2)),
  ])
  return dir
}

export namespace Piece {
  export type Doc = {
    meta: PieceMeta
    surface: PieceSurface
    links: PieceLinks
    body: string
    dir: string
  }

  export async function docs() {
    const dirs = await walk()
    const items = await Promise.all(dirs.map(read))
    return items.filter((item): item is Doc => !!item)
  }

  export async function list() {
    const items = await docs()
    return items
      .map((item) => card(item.meta, item.surface))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  }

  export async function get(id: string) {
    return (await docs()).find((item) => item.meta.id === id)
  }

  export async function commit(draft_id: string) {
    const item = await Draft.load(draft_id)
    if (!item) return
    const stamp = now()
    const next: DraftRecord = {
      ...item,
      state: "committed",
      piece_id: item.piece_id ?? item.meta.id,
      updated_at: stamp,
      meta: {
        ...item.meta,
        id: item.piece_id ?? item.meta.id,
        updated_at: stamp,
      },
      surface: {
        ...item.surface,
        human: {
          body_summary: item.body_summary,
        },
      },
    }
    await write(next)
    await Draft.store(next)
    await IpkEvent.committed({
      piece_id: next.meta.id,
      draft_id,
    })
    await Indexes.rebuild().catch(() => undefined)
    return {
      piece_id: next.meta.id,
      card: card(next.meta, next.surface),
    }
  }

  export async function editStart(piece_id: string): Promise<DraftView | undefined> {
    const item = await get(piece_id)
    if (!item) return
    const stamp = now()
    const body_text = body(item.body)
    const compiled = await Compile.make({
      mode: "edit",
      piece_id: item.meta.id,
      message_ids: [],
      instruction: body_text,
    })
    const next: DraftRecord = {
      draft_id: Identifier.ascending("draft"),
      mode: "edit",
      state: "review",
      piece_id: item.meta.id,
      session_id: item.meta.origin.session_id,
      message_ids: item.meta.origin.message_range ?? [],
      title: item.meta.title,
      body_summary: item.surface.human.body_summary,
      body: body_text,
      meta: {
        ...compiled.meta,
        id: item.meta.id,
        created_at: item.meta.created_at,
        updated_at: stamp,
        title: item.meta.title,
        origin: item.meta.origin,
        status: item.meta.status,
        domains: item.meta.domains,
        methods: item.meta.methods,
        contexts: item.meta.contexts,
        projects: item.meta.projects,
        sources: item.meta.sources,
      },
      surface: {
        ...compiled.surface,
        ...item.surface,
        human: {
          body_summary: item.surface.human.body_summary,
        },
      },
      links: item.links,
      created_at: stamp,
      updated_at: stamp,
    }
    await Draft.store(next)
    await IpkEvent.draft({ draft_id: next.draft_id, state: next.state })
    return Draft.get(next.draft_id)
  }
}
