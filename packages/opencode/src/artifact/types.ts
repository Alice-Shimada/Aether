import z from "zod"
import { Identifier } from "@/id/id"

export const ArtifactContract = z.object({
  id: Identifier.schema("artifact"),
  project_id: z.string(),
  task_scope_id: Identifier.schema("scope").optional(),
  role: z.string(),
  path: z.string(),
  format: z.string().default("markdown"),
  write_mode: z.enum(["revise_in_place", "append", "replace"]).default("revise_in_place"),
  update_triggers: z.array(z.string()).default([]),
  partner_artifacts: z.array(Identifier.schema("artifact")).default([]),
  style_focus: z.array(z.string()).default([]),
  protected_regions: z.array(z.string()).default([]),
  created_at: z.string(),
  updated_at: z.string(),
  confirmed: z.boolean().default(false),
})

export const ArtifactView = z.object({
  contract: ArtifactContract,
})

export const ArtifactMatchInput = z.object({
  project_id: z.string(),
  task_scope_id: Identifier.schema("scope").optional(),
  paths: z.array(z.string()).default([]),
  request: z.string().default(""),
})

export const ArtifactMatchResult = z.object({
  project_id: z.string(),
  artifact_ids: z.array(Identifier.schema("artifact")).default([]),
  confidence: z.number().min(0).max(1),
  reasons: z.array(z.string()).default([]),
  needs_user_confirmation: z.boolean().default(false),
})

export type ArtifactContract = z.infer<typeof ArtifactContract>
export type ArtifactView = z.infer<typeof ArtifactView>
export type ArtifactMatchInput = z.infer<typeof ArtifactMatchInput>
export type ArtifactMatchResult = z.infer<typeof ArtifactMatchResult>
