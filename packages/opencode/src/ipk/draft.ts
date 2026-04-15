import fs from "fs/promises"
import path from "path"
import { Identifier } from "@/id/id"
import { Compile, type CompileProgress } from "./compile"
import { IpkEvent } from "./events"
import { Taxonomy } from "./taxonomy"
import { draftDir, draftsRoot, ensure, writeText } from "./storage"
import { DraftRecord, type DraftView } from "./types"

const now = () => new Date().toISOString()

const file = (id: string) => path.join(draftDir(id), "draft.json")

const toView = (item: DraftRecord): DraftView => ({
  draft_id: item.draft_id,
  mode: item.mode,
  state: item.state,
  session_id: item.session_id,
  message_ids: item.message_ids,
  piece_id: item.piece_id,
  title: item.title,
  body_summary: item.body_summary,
  body: item.body,
  meta: item.meta,
  surface: item.surface,
  links: item.links,
  updated_at: item.updated_at,
})

const syncSurface = (input: { item: DraftRecord; body_summary: string }) => ({
  ...input.item.surface,
  human: {
    body_summary: input.body_summary,
  },
  associate: {
    ...input.item.surface.associate,
    methods: input.item.meta.methods,
  },
})

const parse = async (id: string) => {
  const raw = await Bun.file(file(id))
    .json()
    .catch(() => undefined)
  const next = DraftRecord.safeParse(raw)
  if (!next.success) return
  return next.data
}

const save = async (item: DraftRecord) => {
  await ensure()
  await fs.mkdir(draftDir(item.draft_id), { recursive: true })
  await writeText(file(item.draft_id), JSON.stringify(item, null, 2))
  return item
}

const list = async () => {
  await ensure()
  const dirs = await fs.readdir(draftsRoot(), { withFileTypes: true }).catch(() => [])
  const items = await Promise.all(
    dirs
      .filter((item) => item.isDirectory())
      .map((item) => parse(item.name)),
  )
  return items
    .filter((item): item is DraftRecord => !!item)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
}

const createOne = async (input: {
  mode: "new" | "edit"
  session_id?: string
  message_ids: string[]
  piece_id?: string
  onProgress?: (progress: CompileProgress) => Promise<void> | void
}) => {
  const draft_id = Identifier.ascending("draft")
  const compiled = await Compile.make({
    mode: input.mode,
    session_id: input.session_id,
    message_ids: input.message_ids,
    piece_id: input.piece_id,
    onProgress: input.onProgress,
  })
  const meta = await Taxonomy.normalizeMeta(compiled.meta)
  const stamp = now()
  const item: DraftRecord = {
    draft_id,
    mode: input.mode,
    state: "review",
    session_id: input.session_id,
    message_ids: input.message_ids,
    piece_id: input.piece_id ?? meta.id,
    title: compiled.title,
    body_summary: compiled.body_summary,
    body: compiled.body,
    meta,
    surface: {
      ...compiled.surface,
      associate: {
        ...compiled.surface.associate,
        methods: meta.methods,
      },
    },
    links: compiled.links,
    created_at: stamp,
    updated_at: stamp,
  }
  const stored = await save(item)
  await IpkEvent.draft({ draft_id: stored.draft_id, state: stored.state })
  return toView(stored)
}

const reviseOne = async (input: {
  draft_id: string
  instruction: string
  onProgress?: (progress: CompileProgress) => Promise<void> | void
}) => {
  const item = await parse(input.draft_id)
  if (!item) return
  const compiled = await Compile.revise(item, input.instruction, input.onProgress)
  const meta = await Taxonomy.normalizeMeta(compiled.meta)
  const stamp = now()
  const base: DraftRecord = {
    ...item,
    state: "review",
    updated_at: stamp,
    title: compiled.title,
    body_summary: compiled.body_summary,
    body: compiled.body,
    meta: {
      ...meta,
      updated_at: stamp,
    },
    surface: {
      ...compiled.surface,
    },
    links: compiled.links,
  }
  const next: DraftRecord = {
    ...base,
    surface: syncSurface({
      item: base,
      body_summary: base.body_summary,
    }),
  }
  const stored = await save(next)
  await IpkEvent.draft({ draft_id: stored.draft_id, state: stored.state })
  return toView(stored)
}

export namespace Draft {
  export async function create(input: {
    mode: "new" | "edit"
    session_id?: string
    message_ids: string[]
    piece_id?: string
  }) {
    return createOne({
      mode: input.mode,
      session_id: input.session_id,
      message_ids: input.message_ids,
      piece_id: input.piece_id,
    })
  }

  export async function createStream(
    input: { mode: "new" | "edit"; session_id?: string; message_ids: string[]; piece_id?: string },
    onProgress?: (progress: CompileProgress) => Promise<void> | void,
  ) {
    return createOne({
      ...input,
      onProgress,
    })
  }

  export async function get(id: string) {
    const item = await parse(id)
    if (!item) return
    return toView(item)
  }

  export async function load(id: string) {
    return parse(id)
  }

  export async function store(item: DraftRecord) {
    return save(item)
  }

  export async function revise(input: { draft_id: string; instruction: string }) {
    return reviseOne(input)
  }

  export async function reviseStream(
    input: { draft_id: string; instruction: string },
    onProgress?: (progress: CompileProgress) => Promise<void> | void,
  ) {
    return reviseOne({
      ...input,
      onProgress,
    })
  }

  export async function stash(draft_id: string) {
    const item = await parse(draft_id)
    if (!item) return
    const next: DraftRecord = {
      ...item,
      state: "stashed",
      updated_at: now(),
    }
    const stored = await save(next)
    await IpkEvent.draft({ draft_id: stored.draft_id, state: stored.state })
    return toView(stored)
  }

  export async function listStashed() {
    const items = await list()
    return items.filter((item) => item.state === "stashed").map(toView)
  }
}
