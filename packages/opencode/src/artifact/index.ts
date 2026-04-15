import { ArtifactMatchInput } from "./types"
import { ArtifactContractService } from "./contract"

export * from "./types"
export * as ArtifactStorage from "./storage"

export namespace Artifact {
  export async function list(project_id: string) {
    return ArtifactContractService.list(project_id)
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
    return ArtifactContractService.create(input)
  }

  export async function get(project_id: string, artifact_id: string) {
    return ArtifactContractService.get(project_id, artifact_id)
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
    return ArtifactContractService.patch(project_id, artifact_id, patch)
  }

  export async function match(input: ArtifactMatchInput) {
    return ArtifactContractService.match(ArtifactMatchInput.parse(input))
  }
}
