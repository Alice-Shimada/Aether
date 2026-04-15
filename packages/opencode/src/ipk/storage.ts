import fs from "fs/promises"
import path from "path"
import { MemoryManifest } from "@/memory/manifest"
import { MemoryPath } from "@/memory/path"
import type { PieceMeta } from "./types"

const base = MemoryPath.ipkRoot()
const pieces = path.join(base, "pieces")
const drafts = path.join(base, "drafts")
const indexes = path.join(base, "indexes")
const maps = path.join(base, "maps")
const taxonomy = path.join(base, "taxonomy")

const state = {
  run: undefined as Promise<void> | undefined,
}

const setup = async () => {
  await Promise.all([
    fs.mkdir(base, { recursive: true }),
    fs.mkdir(pieces, { recursive: true }),
    fs.mkdir(drafts, { recursive: true }),
    fs.mkdir(indexes, { recursive: true }),
    fs.mkdir(maps, { recursive: true }),
    fs.mkdir(taxonomy, { recursive: true }),
  ])
  await Promise.all([base, pieces, drafts, indexes, maps, taxonomy].map((dir) => MemoryPath.assertDir(MemoryPath.root(), dir)))
  await MemoryManifest.ensure()
}

export const ensure = () => {
  if (state.run) return state.run
  state.run = setup()
  return state.run
}

const year = (stamp: string) => {
  const raw = Number.parseInt(stamp.slice(0, 4), 10)
  if (Number.isFinite(raw) && raw >= 1970 && raw <= 9999) return String(raw)
  return String(new Date().getUTCFullYear())
}

export const root = () => {
  void ensure()
  return base
}

export const piecesRoot = () => {
  void ensure()
  return pieces
}

export const draftsRoot = () => {
  void ensure()
  return drafts
}

export const indexesRoot = () => {
  void ensure()
  return indexes
}

export const mapsRoot = () => {
  void ensure()
  return maps
}

export const taxonomyRoot = () => {
  void ensure()
  return taxonomy
}

export const pieceDir = (meta: PieceMeta) => {
  void ensure()
  return MemoryPath.child(piecesRoot(), meta.type, year(meta.created_at), meta.id)
}

export const draftDir = (id: string) => {
  void ensure()
  return MemoryPath.child(draftsRoot(), id)
}

export const file = (dir: string, name: string) => MemoryPath.child(dir, name)

export const assertWritable = (target: string) => MemoryPath.assertFile(MemoryPath.root(), target)

export const writeText = async (target: string, content: string) => {
  await assertWritable(target)
  const tmp = file(path.dirname(target), `.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}`)
  await assertWritable(tmp)
  await Bun.write(tmp, content)
  await fs.rename(tmp, target)
}
