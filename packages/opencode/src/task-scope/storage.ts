import { Identifier } from "@/id/id"
import { TaskScopeRecord } from "./types"
import { PolicyRecord } from "@/adaptation/types"
import { ensureProject, getProjectProfile, putProjectProfile } from "@/adaptation/profile"
import { syncBinding } from "@/adaptation/session"
import { bindingFile, ensureDir, nowISO, projectFile, readJSON, taskScopeFile, taskScopeRoot, writeJSON } from "@/adaptation/storage"

const dir = (scope_id: string) => taskScopeRoot(scope_id)
const file = (scope_id: string) => taskScopeFile(scope_id, "scope.json")
const policyFile = (scope_id: string) => taskScopeFile(scope_id, "policy.json")
const summaryRoot = (scope_id: string) => taskScopeFile(scope_id, "summaries")
const proposalRoot = (scope_id: string) => taskScopeFile(scope_id, "proposals")
const legacyFile = (project_id: string, scope_id: string) => projectFile(project_id, "task-scopes", scope_id, "scope.json")
const legacyPolicyFile = (project_id: string, scope_id: string) => projectFile(project_id, "task-scopes", scope_id, "policy.json")

const proposalStatus = ["pending", "confirmed", "rejected", "deferred"] as const

const basePolicy = (scope_id: string) => ({
  scope: {
    level: "task_scope",
    target: scope_id,
  },
  response_policy: [],
  operation_policy: [],
  updated_at: nowISO(),
})

const ensureScope = async (scope_id: string) => {
  await ensureDir(dir(scope_id))
  await ensureDir(summaryRoot(scope_id))
  await ensureDir(proposalRoot(scope_id))
  await Promise.all(proposalStatus.map((item) => ensureDir(taskScopeFile(scope_id, "proposals", item))))
}

export const createScope = async (input: {
  project_id: string
  title: string
  kind: string
  goal: string
  active_subjects?: string[]
}) => {
  const id = Identifier.ascending("scope")
  await ensureProject(input.project_id)
  await ensureScope(id)
  const stamp = nowISO()
  const scope = TaskScopeRecord.parse({
    id,
    project_id: input.project_id,
    title: input.title,
    kind: input.kind,
    goal: input.goal,
    active_subjects: input.active_subjects ?? [],
    principles: [],
    status_summary: "",
    done: [],
    decisions: [],
    open_questions: [],
    open_question_refs: [],
    decision_refs: [],
    linked_pieces: [],
    artifacts: [],
    created_at: stamp,
    updated_at: stamp,
  })
  await writeJSON(file(id), scope, "scope")
  await writeJSON(policyFile(id), basePolicy(id), "policy")

  const profile = await getProjectProfile(input.project_id)
  if (!profile.task_scope_refs.includes(id)) {
    await putProjectProfile(input.project_id, {
      ...profile,
      task_scope_refs: [...profile.task_scope_refs, id],
    })
  }

  return scope
}

export const listScopes = async (project_id: string) => {
  const profile = await getProjectProfile(project_id)
  const items = Array.from(new Set(profile.task_scope_refs))
  const rows = await Promise.all(
    items.map(async (id) => {
      const row = await readJSON<TaskScopeRecord | undefined>(file(id), undefined)
      if (row) return row
      return await readJSON<TaskScopeRecord | undefined>(legacyFile(project_id, id), undefined)
    }),
  )
  return rows
    .filter((item): item is TaskScopeRecord => Boolean(item))
    .filter((item) => item.project_id === project_id)
}

export const getScope = async (project_id: string, scope_id: string) => {
  await ensureProject(project_id)
  const scope = (await readJSON<TaskScopeRecord | undefined>(file(scope_id), undefined)) ?? (await readJSON(legacyFile(project_id, scope_id), undefined))
  if (!scope) return
  if (scope.project_id !== project_id) return
  const policy = (await readJSON<PolicyRecord | undefined>(policyFile(scope_id), undefined)) ?? (await readJSON(legacyPolicyFile(project_id, scope_id), basePolicy(scope_id)))
  return {
    scope: TaskScopeRecord.parse(scope),
    policy: PolicyRecord.parse(policy),
  }
}

export const patchScope = async (
  project_id: string,
  scope_id: string,
  patch: Partial<{
    status_summary: string
    done: string[]
    open_question_refs: Array<{ artifact_id: string; path: string; note?: string }>
    decision_refs: Array<{ artifact_id: string; path: string; note?: string }>
    linked_pieces: string[]
    artifacts: string[]
    open_questions: string[]
    decisions: string[]
    principles: string[]
  }>,
) => {
  const old = await getScope(project_id, scope_id)
  if (!old) return
  await ensureScope(scope_id)
  const next = TaskScopeRecord.parse({
    ...old.scope,
    ...patch,
    updated_at: nowISO(),
  })
  await writeJSON(file(scope_id), next, "scope")
  return {
    scope: next,
    policy: old.policy,
  }
}

export const bindScopeSession = async (project_id: string, scope_id: string, session_id: string) => {
  await ensureScope(scope_id)
  const bind = await syncBinding(session_id, {
    project_id,
    task_scope_id: scope_id,
  })
  await writeJSON(bindingFile("task-scopes", scope_id), {
    task_scope_id: scope_id,
    session_id,
    project_id,
    updated_at: nowISO(),
  })
  return bind
}

export const scopePolicyFile = policyFile
export const scopeSummaryRoot = summaryRoot
export const scopeProposalRoot = proposalRoot
export const scopeRecordFile = file
