import path from "path"
import { Identifier } from "@/id/id"
import { MemoryPath } from "@/memory/path"
import { Instance } from "@/project/instance"
import { ArtifactContract, ArtifactMatchInput, ArtifactMatchResult } from "./types"
import { ensureProject, getProjectGuidance, putProjectGuidance } from "@/adaptation/profile"
import { artifactFile, artifactRoot, ensureDir, nowISO, projectFile, readJSON, writeJSON } from "@/adaptation/storage"

const file = (artifact_id: string) => artifactFile(artifact_id, "contract.json")
const legacyFile = (project_id: string, artifact_id: string) => projectFile(project_id, "artifacts", `${artifact_id}.json`)

const okPath = (target: string) => {
  if (!target.trim()) return false
  const full = path.isAbsolute(target) ? path.resolve(target) : path.resolve(Instance.worktree, target)
  if (MemoryPath.contains(MemoryPath.adaptationRoot(), full)) return false
  if (MemoryPath.contains(MemoryPath.cacheRoot(), full)) return false
  return true
}

export const createArtifact = async (input: {
  project_id: string
  task_scope_id?: string
  role: string
  path: string
  format?: string
  write_mode?: "revise_in_place" | "append" | "replace"
  update_triggers?: string[]
  partner_artifacts?: string[]
  style_focus?: string[]
  protected_regions?: string[]
  preview_confirmed?: boolean
}) => {
  await ensureProject(input.project_id)
  if (!okPath(input.path)) throw new Error("artifact path is not allowed")
  const id = Identifier.ascending("artifact")
  await ensureDir(artifactRoot(id))

  const stamp = nowISO()
  const item = ArtifactContract.parse({
    id,
    project_id: input.project_id,
    task_scope_id: input.task_scope_id,
    role: input.role,
    path: input.path,
    format: input.format ?? "markdown",
    write_mode: input.write_mode ?? "revise_in_place",
    update_triggers: input.update_triggers ?? [],
    partner_artifacts: input.partner_artifacts ?? [],
    style_focus: input.style_focus ?? [],
    protected_regions: input.protected_regions ?? [],
    created_at: stamp,
    updated_at: stamp,
    confirmed: Boolean(input.preview_confirmed),
  })

  await writeJSON(file(item.id), item, "artifact")

  const guidance = await getProjectGuidance(input.project_id)
  if (!guidance.artifact_refs.includes(item.id)) {
    await putProjectGuidance(input.project_id, {
      ...guidance,
      artifact_refs: [...guidance.artifact_refs, item.id],
    })
  }

  return item
}

export const listArtifacts = async (project_id: string) => {
  const guidance = await getProjectGuidance(project_id)
  const files = Array.from(new Set(guidance.artifact_refs))
  const items = await Promise.all(
    files.map(async (id) => {
      const item = await readJSON<ArtifactContract | undefined>(file(id), undefined)
      if (item) return item
      return await readJSON<ArtifactContract | undefined>(legacyFile(project_id, id), undefined)
    }),
  )
  return items
    .filter((item): item is ArtifactContract => Boolean(item))
    .filter((item) => item.project_id === project_id)
}

export const getArtifact = async (project_id: string, artifact_id: string) => {
  await ensureProject(project_id)
  const item = (await readJSON<ArtifactContract | undefined>(file(artifact_id), undefined)) ?? (await readJSON(legacyFile(project_id, artifact_id), undefined))
  if (!item) return
  if (item.project_id !== project_id) return
  return ArtifactContract.parse(item)
}

export const patchArtifact = async (
  project_id: string,
  artifact_id: string,
  patch: Partial<{
    role: string
    format: string
    write_mode: "revise_in_place" | "append" | "replace"
    update_triggers: string[]
    partner_artifacts: string[]
    style_focus: string[]
    protected_regions: string[]
    confirmed: boolean
  }>,
) => {
  const old = await getArtifact(project_id, artifact_id)
  if (!old) return
  await ensureDir(artifactRoot(artifact_id))
  const item = ArtifactContract.parse({
    ...old,
    ...patch,
    updated_at: nowISO(),
  })
  await writeJSON(file(artifact_id), item, "artifact")
  return item
}

export const matchArtifacts = async (input: ArtifactMatchInput) => {
  const item = ArtifactMatchInput.parse(input)
  const list = await listArtifacts(item.project_id)
  const rows = list
    .map((row) => {
      const score = item.paths.reduce((sum, target) => {
        if (target === row.path) return sum + 6
        if (target.endsWith(row.path)) return sum + 4
        if (row.path.endsWith(target)) return sum + 2
        return sum
      }, 0)
      const role = item.request.toLowerCase().includes(row.role.toLowerCase()) ? 1 : 0
      return {
        row,
        score: score + role,
      }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)

  const out = ArtifactMatchResult.parse({
    project_id: item.project_id,
    artifact_ids: rows.slice(0, 5).map((x) => x.row.id),
    confidence: rows.length > 0 ? Math.min(0.96, 0.55 + rows[0].score * 0.08) : 0.2,
    reasons: rows.length > 0 ? ["请求路径与 artifact 合同命中。"] : ["未命中现有 artifact 合同。"],
    needs_user_confirmation: rows.length === 0,
  })

  return out
}

export const artifactRecordFile = file
