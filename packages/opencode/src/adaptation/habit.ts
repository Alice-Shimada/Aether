import { getScope, patchScope, scopePolicyFile } from "@/task-scope/storage"
import { markIndexDirty, rebuildIndexes } from "./indexes"
import { ensureMap } from "./project"
import { getInitiativePolicy, putInitiativePolicy } from "./profile"
import { getBinding } from "./session"
import { indexesRoot, nowISO, safeJoin, writeJSON } from "./storage"
import { HabitSurface, HabitView } from "./types"

const file = () => safeJoin(indexesRoot(), "habit-index.jsonl")

const norm = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]+/giu, " ")
    .trim()
    .replace(/\s+/g, " ")

const list = async () => {
  const raw = await Bun.file(file())
    .text()
    .catch(() => "")
  if (!raw.trim()) return [] as Array<ReturnType<typeof HabitSurface.parse>>
  return raw
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const row = (() => {
        try {
          return JSON.parse(item) as unknown
        } catch {
          return undefined
        }
      })()
      const parsed = HabitSurface.safeParse(row)
      if (!parsed.success) return
      return parsed.data
    })
    .filter((item): item is ReturnType<typeof HabitSurface.parse> => Boolean(item))
}

/** Affinity score: how useful this habit is as a retrieval candidate. */
const affinity = (
  item: ReturnType<typeof HabitSurface.parse>,
  ctx: { project_id: string; initiative_id?: string; task_scope_id?: string; subject_ids?: string[] },
) => {
  const sameInitiative = item.scope.level === "initiative" && item.scope.target === ctx.initiative_id
  const sameTask = item.scope.level === "task_scope" && item.scope.target === ctx.task_scope_id
  const sameSubject = item.scope.level === "subject" && (ctx.subject_ids?.includes(item.scope.target) ?? false)

  if (sameTask) return 9
  if (sameSubject) return 8
  if (sameInitiative) return 7
  if (item.scope.level === "global") return 4
  if (item.scope.level === "subject") return 3
  if (item.scope.level === "initiative") return 2
  if (item.scope.level === "task_scope") return 2
  return 1
}

const matchId = (item: ReturnType<typeof HabitSurface.parse>, ids: Set<string>) =>
  ids.has(item.id) || item.legacy_ids.some((id) => ids.has(id))

export const listProjectHabits = async (
  project_id: string,
  input: { initiative_id?: string; task_scope_id?: string; subject_ids?: string[]; current?: boolean; habit_ids?: string[] } = {},
) => {
  const all = await list()
  const initiative_id = input.initiative_id
  const ctx = { project_id, initiative_id, task_scope_id: input.task_scope_id, subject_ids: input.subject_ids }
  const ids = new Set(input.habit_ids ?? [])

  const scoped = all.filter((item) => {
    if (matchId(item, ids)) return true
    if (item.scope.level === "global" || item.scope.level === "subject") return true
    if (item.scope.level === "initiative") return Boolean(initiative_id) && item.scope.target === initiative_id
    if (item.scope.level === "task_scope") return Boolean(input.task_scope_id) && item.scope.target === input.task_scope_id
    return false
  })

  const filtered = input.current ? scoped.filter((item) => matchId(item, ids)) : scoped

  const rows = filtered.map((item) => ({
    view: HabitView.parse(item),
    affinity: affinity(item, ctx),
  }))

  const uniq = new Map<string, { view: ReturnType<typeof HabitView.parse>; affinity: number }>()
  rows.forEach((item) => {
    const key = norm(item.view.summary)
    const old = uniq.get(key)
    if (!old || item.affinity > old.affinity || (item.affinity === old.affinity && item.view.impact.localeCompare(old.view.impact) > 0)) {
      uniq.set(key, item)
    }
  })

  return Array.from(uniq.values())
    .sort(
      (a, b) => b.affinity - a.affinity || b.view.impact.localeCompare(a.view.impact) || a.view.summary.localeCompare(b.view.summary),
    )
    .map((item) => item.view)
}

const matches = (item: ReturnType<typeof HabitView.parse>, id: string) => item.id === id || item.legacy_ids.includes(id)

const pick = (
  rows: ReturnType<typeof HabitView.parse>[],
  input: {
    habit_id: string
    scope_level: "initiative" | "task_scope"
    scope_id: string
    kind: "initiative_policy" | "task_scope" | "task_scope_policy"
  },
) => {
  return rows.find(
    (item) =>
      matches(item, input.habit_id) &&
      item.scope.level === input.scope_level &&
      item.scope.target === input.scope_id &&
      item.kind === input.kind,
  )
}

export const removeHabitSource = async (input: {
  session_id: string
  habit_id: string
  scope_level: "initiative" | "task_scope"
  scope_id: string
  kind: "initiative_policy" | "task_scope" | "task_scope_policy"
}) => {
  const map = await ensureMap({ session_id: input.session_id })
  const bind = await getBinding(input.session_id)
  const project_id = map.project_id
  const rows = await listProjectHabits(project_id, {
    initiative_id: bind.initiative_id,
    ...(input.scope_level === "task_scope" ? { task_scope_id: input.scope_id } : {}),
  })
  const row = pick(rows, input)
  if (!row) throw new Error("habit not found in current project")

  if (row.kind === "initiative_policy") {
    const old = await getInitiativePolicy(row.scope.target)
    const next = old.operation_policy.filter((item) => norm(item.text) !== norm(row.summary))
    if (next.length === old.operation_policy.length) {
      return {
        mode: "source",
        project_id,
        removed: false,
      }
    }
    await putInitiativePolicy(row.scope.target, {
      ...old,
      operation_policy: next,
    })
    await markIndexDirty("habit_source_removed")
    await rebuildIndexes()
    return {
      mode: "source",
      project_id,
      removed: true,
    }
  }

  const got = await getScope(project_id, row.scope.target)
  if (!got) {
    return {
      mode: "source",
      project_id,
      removed: false,
    }
  }

  if (row.kind === "task_scope_policy") {
    const next = got.policy.operation_policy.filter((item) => norm(item.text) !== norm(row.summary))
    if (next.length === got.policy.operation_policy.length) {
      return {
        mode: "source",
        project_id,
        removed: false,
      }
    }
    await writeJSON(
      scopePolicyFile(row.scope.target),
      {
        ...got.policy,
        operation_policy: next,
        updated_at: nowISO(),
      },
      "policy",
    )
    await markIndexDirty("habit_source_removed")
    await rebuildIndexes()
    return {
      mode: "source",
      project_id,
      removed: true,
    }
  }

  const next = got.scope.principles.filter((item) => norm(item) !== norm(row.summary))
  if (next.length === got.scope.principles.length) {
    return {
      mode: "source",
      project_id,
      removed: false,
    }
  }
  await patchScope(project_id, row.scope.target, {
    principles: next,
  })
  await markIndexDirty("habit_source_removed")
  await rebuildIndexes()
  return {
    mode: "source",
    project_id,
    removed: true,
  }
}
