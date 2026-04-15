import { Draft } from "./draft"
import { Indexes } from "./indexes"
import { Piece } from "./piece"
import { Search } from "./search"
import { Associate } from "./associate"
import { IpkModel } from "./model"
import type { IpkModelMap } from "./model"
import type { CompileProgress } from "./compile"
import { ensure } from "./storage"
import type { DraftMode } from "./types"

export * from "./types"
export * as Storage from "./storage"
export * from "./events"
export * from "./model"

export namespace Ipk {
  export async function listDrafts() {
    await ensure()
    return Draft.listStashed()
  }

  export async function listPieces() {
    await ensure()
    return Piece.list()
  }

  export async function getDraft(id: string) {
    await ensure()
    return Draft.get(id)
  }

  export async function draft(input: { session_id?: string; message_ids: string[]; mode: DraftMode; piece_id?: string }) {
    await ensure()
    return Draft.create(input)
  }

  export async function draftStream(
    input: { session_id?: string; message_ids: string[]; mode: DraftMode; piece_id?: string },
    onProgress?: (progress: CompileProgress) => Promise<void> | void,
  ) {
    await ensure()
    return Draft.createStream(input, onProgress)
  }

  export async function revise(input: { draft_id: string; instruction: string }) {
    await ensure()
    return Draft.revise(input)
  }

  export async function reviseStream(
    input: { draft_id: string; instruction: string },
    onProgress?: (progress: CompileProgress) => Promise<void> | void,
  ) {
    await ensure()
    return Draft.reviseStream(input, onProgress)
  }

  export async function stash(input: { draft_id: string }) {
    await ensure()
    return Draft.stash(input.draft_id)
  }

  export async function commit(input: { draft_id: string }) {
    await ensure()
    return Piece.commit(input.draft_id)
  }

  export async function editStart(input: { piece_id: string }) {
    await ensure()
    return Piece.editStart(input.piece_id)
  }

  export async function reindex() {
    await ensure()
    return Indexes.rebuild()
  }

  export async function search(input: { query: string; limit?: number }) {
    await ensure()
    return Search.run(input)
  }

  export async function associate(input: { query: string; limit?: number; seed_piece_id?: string }) {
    await ensure()
    return Associate.run(input)
  }

  export async function getModel() {
    await ensure()
    return IpkModel.get()
  }

  export async function setModel(input: Partial<IpkModelMap>) {
    await ensure()
    return IpkModel.set(input)
  }
}
