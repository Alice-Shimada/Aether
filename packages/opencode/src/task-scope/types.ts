import z from "zod"
import { Identifier } from "@/id/id"
import { ScopeRef, PolicyRecord } from "@/adaptation/types"

export const ScopeBinding = z.object({
  session_id: Identifier.schema("session"),
  task_scope_id: Identifier.schema("scope"),
  project_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const TaskScopeRecord = z.object({
  id: Identifier.schema("scope"),
  project_id: z.string(),
  title: z.string(),
  kind: z.string(),
  goal: z.string(),
  active_subjects: z.array(z.string()).default([]),
  principles: z.array(z.string()).default([]),
  status_summary: z.string().default(""),
  done: z.array(z.string()).default([]),
  decisions: z.array(z.string()).default([]),
  open_questions: z.array(z.string()).default([]),
  open_question_refs: z.array(z.object({ artifact_id: z.string(), path: z.string(), note: z.string().optional() })).default([]),
  decision_refs: z.array(z.object({ artifact_id: z.string(), path: z.string(), note: z.string().optional() })).default([]),
  linked_pieces: z.array(z.string()).default([]),
  artifacts: z.array(z.string()).default([]),
  created_at: z.string(),
  updated_at: z.string(),
})

export const TaskScopeView = z.object({
  scope: TaskScopeRecord,
  policy: PolicyRecord,
})

export const ScopeMatchInput = z.object({
  session_id: Identifier.schema("session"),
  request: z.string(),
  cwd: z.string().optional(),
  open_paths: z.array(z.string()).default([]),
  selected_message_ids: z.array(Identifier.schema("message")).default([]),
  user_scope_id: Identifier.schema("scope").optional(),
})

export const ScopeMatchResult = z.object({
  session_id: Identifier.schema("session"),
  project_id: z.string(),
  task_scope: z.object({
    primary: Identifier.schema("scope").optional(),
    secondary: z.array(Identifier.schema("scope")).default([]),
  }),
  subject_ids: z.array(z.string()).default([]),
  artifact_ids: z.array(Identifier.schema("artifact")).default([]),
  confidence: z.object({
    project: z.number().min(0).max(1),
    task_scope: z.number().min(0).max(1),
    subject: z.number().min(0).max(1),
    artifact: z.number().min(0).max(1),
  }),
  reasons: z.array(z.string()).default([]),
  needs_user_confirmation: z.boolean().default(false),
  clarification_question: z.string().optional(),
})

export const ScopeReadInput = z.object({
  project_id: z.string(),
  task_scope_id: Identifier.schema("scope").optional(),
  subjects: z.array(z.string()).default([]),
  artifacts: z.array(Identifier.schema("artifact")).default([]),
  scope: ScopeRef.optional(),
})

export type ScopeBinding = z.infer<typeof ScopeBinding>
export type TaskScopeRecord = z.infer<typeof TaskScopeRecord>
export type TaskScopeView = z.infer<typeof TaskScopeView>
export type ScopeMatchInput = z.infer<typeof ScopeMatchInput>
export type ScopeMatchResult = z.infer<typeof ScopeMatchResult>
