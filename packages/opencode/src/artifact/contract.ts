import { ArtifactMatchInput } from "./types"
import { createArtifact, getArtifact, listArtifacts, matchArtifacts, patchArtifact } from "./storage"

export namespace ArtifactContractService {
  export async function list(project_id: string) {
    return listArtifacts(project_id)
  }

  export async function create(input: {
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
  }) {
    return createArtifact(input)
  }

  export async function get(project_id: string, artifact_id: string) {
    return getArtifact(project_id, artifact_id)
  }

  export async function patch(
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
  ) {
    return patchArtifact(project_id, artifact_id, patch)
  }

  export async function match(input: ArtifactMatchInput) {
    return matchArtifacts(ArtifactMatchInput.parse(input))
  }
}
