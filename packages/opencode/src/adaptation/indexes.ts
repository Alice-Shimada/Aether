import fs from "fs/promises"
import { createHash } from "crypto"
import {
  getGlobalPolicy,
  getInitiativePolicy,
  getProjectGuidance,
  listSubjects,
  getSubjectPolicy,
  getSubjectProfile,
} from "./profile"
import { getScope, listScopes } from "@/task-scope/storage"
import { listArtifacts } from "@/artifact/storage"
import { HabitSurface } from "./types"
import { indexesRoot, initiativesRoot, nowISO, projectsRoot, safeJoin, writeJSON, writeText, readJSON } from "./storage"
import { classifyHabits } from "./habit-classify"

const taskIndex = (rows: Awaited<ReturnType<typeof listScopes>>, arts: Awaited<ReturnType<typeof listArtifacts>>) =>
  rows.map((row) => ({
    id: row.id,
    title: row.title,
    recent_session_ids: [],
    artifact_ids: arts.filter((art) => art.task_scope_id === row.id).map((art) => art.id),
  }))

const subjectIndex = async (subject_ids: string[]) => {
  const out: Record<string, { aliases: string[]; profile_ref: string }> = {}
  for (const id of subject_ids) {
    const row = await getSubjectProfile(id)
    out[id] = {
      aliases: row.aliases,
      profile_ref: `subjects/${id}/profile.json`,
    }
  }
  return out
}

const norm = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]+/giu, " ")
    .trim()
    .replace(/\s+/g, " ")

const sha = (parts: string[]) => createHash("sha1").update(parts.join("\0")).digest("hex").slice(0, 16)
const legacyHabitId = (object: string, scope: string, text: string) =>
  `habit_${object}_${createHash("sha1").update(`${scope}:${norm(text)}`).digest("hex").slice(0, 16)}`
const makeHabitId = (object: string, scope: { level: string; target: string }, text: string) =>
  `habit_${object}_${sha([object, scope.level, scope.target, norm(text)])}`

const habit = (input: {
  scope: { level: "global" | "subject" | "initiative" | "task_scope"; target: string }
  text: string
  object: string
  path: string
  triggers: string[]
  impact: "high" | "medium" | "low"
}) => {
  const id = makeHabitId(input.object, input.scope, input.text)
  return HabitSurface.parse({
    id,
    legacy_ids: [legacyHabitId(input.object, input.scope.target, input.text)].filter((item) => item !== id),
    scope: {
      level: input.scope.level,
      target: input.scope.target,
    },
    kind: input.object,
    title: input.text.slice(0, 48),
    summary: input.text,
    triggers: input.triggers,
    priority: 70,
    impact: input.impact,
    confidence: 0.92,
    confirmed: true,
    target_ref: {
      object: input.object,
      path: input.path,
      fields: [input.object.includes("policy") ? "operation_policy" : "summary"],
    },
  })
}

const dirtyFile = () => safeJoin(indexesRoot(), "dirty.json")

const indexFiles = () => ({
  scope_map: safeJoin(indexesRoot(), "scope-map.json"),
  habit_index: safeJoin(indexesRoot(), "habit-index.jsonl"),
  trigger_index: safeJoin(indexesRoot(), "trigger-index.json"),
  path_index: safeJoin(indexesRoot(), "path-index.json"),
  subject_index: safeJoin(indexesRoot(), "subject-index.json"),
  task_scope_index: safeJoin(indexesRoot(), "task-scope-index.json"),
  conflict_index: safeJoin(indexesRoot(), "conflict-index.json"),
})

const listProjects = async () => {
  const rows = await fs.readdir(projectsRoot(), { withFileTypes: true }).catch(() => [])
  return rows.filter((item) => item.isDirectory()).map((item) => item.name)
}

const listInitiatives = async () => {
  const rows = await fs.readdir(initiativesRoot(), { withFileTypes: true }).catch(() => [])
  return rows.filter((item) => item.isDirectory()).map((item) => item.name)
}

export const markIndexDirty = async (reason: string) => {
  const old = await readJSON<{ version: "v1"; reasons: string[]; updated_at: string }>(dirtyFile(), {
    version: "v1",
    reasons: [],
    updated_at: nowISO(),
  })
  await writeJSON(dirtyFile(), {
    ...old,
    updated_at: nowISO(),
    reasons: Array.from(new Set([...old.reasons, reason])),
  })
}

export const rebuildIndexes = async () => {
  const files = indexFiles()
  const stamp = nowISO()
  const projects = await listProjects()

  const scope_map: Record<string, { task_scope_ids: string[]; artifact_ids: string[]; subject_ids: string[] }> = {}
  const trigger_index: Record<string, string[]> = {}
  const path_index: Record<string, string[]> = {}
  const task_scope_index: Record<string, Array<{ id: string; title: string; recent_session_ids: string[]; artifact_ids: string[] }>> = {}
  const habit_index: HabitSurface[] = []
  const subject_ids = new Set(await listSubjects())
  const initiatives = await listInitiatives()

  const global = await getGlobalPolicy()
  global.operation_policy.forEach((line) => {
    habit_index.push(
      habit({
        scope: { level: "global", target: "user" },
        text: line.text,
        object: "global_policy",
        path: "global/global-policy.json",
        triggers: [],
        impact: line.impact,
      }),
    )
  })

  for (const project_id of projects) {
    const [guidance, scopes, arts] = await Promise.all([
      getProjectGuidance(project_id),
      listScopes(project_id),
      listArtifacts(project_id),
    ])

    guidance.subject_ids.forEach((id) => subject_ids.add(id))

    scope_map[project_id] = {
      task_scope_ids: scopes.map((item) => item.id),
      artifact_ids: arts.map((item) => item.id),
      subject_ids: guidance.subject_ids,
    }

    task_scope_index[project_id] = taskIndex(scopes, arts)

    arts.forEach((item) => {
      path_index[item.path] = Array.from(new Set([...(path_index[item.path] ?? []), item.id]))
    })

    // Collect all habit texts for batch LLM classification
    type PendingHabit = {
      id: string
      text: string
      scope: { level: "initiative" | "task_scope"; target: string }
      object: string
      path: string
    }
    const pending: PendingHabit[] = []

    scopes.forEach((item) => {
      item.principles.forEach((line) => {
        const id = makeHabitId("task_scope", { level: "task_scope", target: item.id }, line)
        pending.push({
          id,
          text: line,
          scope: { level: "task_scope", target: item.id },
          object: "task_scope",
          path: `task-scopes/${item.id}/scope.json`,
        })
      })
    })

    const scopePolicyRows = await Promise.all(scopes.map((item) => getScope(project_id, item.id)))
    scopePolicyRows
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .forEach((item) => {
        item.policy.operation_policy.forEach((line) => {
          const id = makeHabitId("task_scope_policy", { level: "task_scope", target: item.scope.id }, line.text)
          pending.push({
            id,
            text: line.text,
            scope: { level: "task_scope", target: item.scope.id },
            object: "task_scope_policy",
            path: `task-scopes/${item.scope.id}/policy.json`,
          })
        })
      })

    const uniq = new Map<string, PendingHabit>()
    pending.forEach((item) => {
      const key = `${item.scope.level}:${item.scope.target}:${item.object}:${norm(item.text)}`
      if (!uniq.has(key)) uniq.set(key, item)
    })

    const rows = Array.from(uniq.values())

    // Batch classify all habits via LLM; unclassified rows keep safe defaults.
    const classified = await classifyHabits(rows.map((item) => ({ id: item.id, text: item.text })))

    rows.forEach((item) => {
      const cls = classified.get(item.id)
      const next = habit({
        scope: item.scope,
        text: item.text,
        object: item.object,
        path: item.path,
        triggers: cls?.triggers ?? [],
        impact: cls?.impact ?? "medium",
      })
      habit_index.push(next)
    })
  }

  for (const initiative_id of initiatives) {
    const policy = await getInitiativePolicy(initiative_id)
    policy.operation_policy.forEach((line) => {
      habit_index.push(
        habit({
          scope: { level: "initiative", target: initiative_id },
          text: line.text,
          object: "initiative_policy",
          path: `initiatives/${initiative_id}/initiative-policy.json`,
          triggers: [],
          impact: line.impact,
        }),
      )
    })
  }

  for (const id of subject_ids) {
    const policy = await getSubjectPolicy(id)
    policy.operation_policy.forEach((line) => {
      habit_index.push(
        habit({
          scope: { level: "subject", target: id },
          text: line.text,
          object: "subject_policy",
          path: `subjects/${id}/policy.json`,
          triggers: [],
          impact: line.impact,
        }),
      )
    })
  }

  habit_index.forEach((item) => {
    item.triggers.forEach((key) => {
      trigger_index[key] = Array.from(new Set([...(trigger_index[key] ?? []), item.id]))
    })
  })

  await Promise.all([
    writeJSON(files.scope_map, {
      version: "v1",
      updated_at: stamp,
      projects: scope_map,
    }),
    writeText(files.habit_index, habit_index.map((item) => JSON.stringify(item)).join("\n") + (habit_index.length > 0 ? "\n" : "")),
    writeJSON(files.trigger_index, trigger_index),
    writeJSON(files.path_index, path_index),
    writeJSON(files.subject_index, await subjectIndex(Array.from(subject_ids))),
    writeJSON(files.task_scope_index, task_scope_index),
    writeJSON(files.conflict_index, {
      version: "v1",
      conflicts: [],
    }),
    writeJSON(dirtyFile(), {
      version: "v1",
      updated_at: stamp,
      reasons: [],
    }),
  ])

  return {
    updated_at: stamp,
    count: habit_index.length,
  }
}

export const ensureIndexes = async () => {
  const files = indexFiles()
  const exists = await Promise.all(
    Object.values(files).map(async (file) => {
      return await fs.access(file).then(() => true).catch(() => false)
    }),
  )
  if (exists.every(Boolean)) return
  await rebuildIndexes()
}
