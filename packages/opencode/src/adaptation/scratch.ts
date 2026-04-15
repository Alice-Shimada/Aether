import fs from "fs/promises"
import { Identifier } from "@/id/id"
import { getBinding, patchBinding, replaceHabitIDs } from "./session"
import { listProjectHabits } from "./habit"
import { getGlobalProfile, getProjectProfile } from "./profile"
import { nowISO, projectFile, projectsRoot, readJSON, safeJoin, writeJSON } from "./storage"
import { ScratchConflict, ScratchHabit, type ScopeRef } from "./types"

const norm = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]+/giu, " ")
    .trim()
    .replace(/\s+/g, " ")

const tokens = (text: string) =>
  norm(text)
    .split(" ")
    .filter(Boolean)
    .filter((item) => !["这次", "当前", "以后", "默认", "都", "请", "用", "不要", "不用", "别", "先", "暂时"].includes(item))

const neg = (text: string) => /不要|不用|别用|禁止|避免|do not|don't|avoid|no longer/iu.test(text)
const high = (text: string) =>
  /默认|以后|都按|记住|不要|不用|别用|禁止|必须|优先|请用|统一|后面都|这次|暂时|仅本次|先按|先用|请按照|写 decisions|open-questions|decisions/u.test(text)
const low = (text: string) => /喜欢|不喜欢|倾向|偏好|更希望|最好|prefer|like|dislike|would rather/iu.test(text)
const gate = (text: string) => {
  if (high(text)) {
    return {
      state: "active" as const,
      capture_confidence: "high" as const,
      capture_reason: "用户用了明确指令语气，适合直接作为当前 session 生效的暂存习惯。",
    }
  }
  if (low(text)) {
    return {
      state: "pending" as const,
      capture_confidence: "low" as const,
      capture_reason: "用户表达了可能的偏好，但还需要确认是否要在当前 session 生效。",
    }
  }
  return
}

const score = (a: string, b: string) => {
  if (!a || !b) return 0
  if (a === b) return 1
  const x = new Set(tokens(a))
  const y = new Set(tokens(b))
  if (x.size === 0 || y.size === 0) return 0
  let hit = 0
  x.forEach((item) => {
    if (y.has(item)) hit += 1
  })
  return hit / Math.max(1, Math.min(x.size, y.size))
}

const clash = (a: string, b: string) => {
  if (neg(a) === neg(b)) return false
  return score(a, b) >= 0.45
}

const quote = (text: string, max = 160) => (text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1))}…`)

const file = (project_id: string, session_id: string) => projectFile(project_id, "sessions", session_id, "scratch-habits.json")
const conflictFile = (project_id: string, session_id: string) => projectFile(project_id, "sessions", session_id, "scratch-conflicts.json")

const load = async (project_id: string, session_id: string) =>
  readJSON<{ version: "v1"; updated_at: string; items: Array<ReturnType<typeof ScratchHabit.parse>> }>(file(project_id, session_id), {
    version: "v1",
    updated_at: nowISO(),
    items: [],
  })

const loadConflicts = async (project_id: string, session_id: string) =>
  readJSON<{ version: "v1"; updated_at: string; items: Array<ReturnType<typeof ScratchConflict.parse>> }>(
    conflictFile(project_id, session_id),
    {
      version: "v1",
      updated_at: nowISO(),
      items: [],
    },
  )

const save = async (project_id: string, session_id: string, items: Array<ReturnType<typeof ScratchHabit.parse>>) => {
  await writeJSON(
    file(project_id, session_id),
    {
      version: "v1",
      updated_at: nowISO(),
      items,
    },
    "scratch-habits",
  )
}

const saveConflicts = async (project_id: string, session_id: string, items: Array<ReturnType<typeof ScratchConflict.parse>>) => {
  await writeJSON(
    conflictFile(project_id, session_id),
    {
      version: "v1",
      updated_at: nowISO(),
      items,
    },
    "scratch-conflicts",
  )
}

const itemId = () => `scratch_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
const conflictId = () => `scratch_conflict_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`

const locate = async (session_id: string, project_id?: string) => {
  if (project_id) return project_id
  const bind = await getBinding(session_id)
  const current = file(bind.project_id, session_id)
  const found = await fs
    .access(current)
    .then(() => true)
    .catch(() => false)
  if (found) return bind.project_id
  const rows = await fs.readdir(projectsRoot(), { withFileTypes: true }).catch(() => [])
  for (const row of rows.filter((item) => item.isDirectory()).map((item) => item.name)) {
    const target = file(row, session_id)
    const exists = await fs
      .access(target)
      .then(() => true)
      .catch(() => false)
    if (exists) return row
  }
  return bind.project_id
}

const impact = (text: string) => {
  if (/必须|禁止|默认|以后|都按|记住|统一|always|default/u.test(text)) return "high" as const
  if (/优先|尽量|prefer|should|建议/u.test(text)) return "medium" as const
  return "low" as const
}

const kind = (text: string) => {
  if (/python|c\+\+|rust|javascript|typescript|java|语言|language/iu.test(text)) return "tool_preference"
  if (/文件|路径|markdown|latex|json|yaml|格式|write|path|file/iu.test(text)) return "artifact_rule"
  if (/计划|规划|设计|workflow|decisions|open-questions|步骤|项目/u.test(text)) return "workflow_preference"
  return "response_preference"
}

const active = (item: ReturnType<typeof ScratchHabit.parse>) => item.state === "active"
const open = (item: ReturnType<typeof ScratchHabit.parse>) => item.state === "active" || item.state === "pending"

const summary = (text: string) => quote(text.replace(/\s+/g, " ").trim(), 120)

const from = (input: {
  project_id: string
  session_id: string
  message_id: string
  text: string
  gate: NonNullable<ReturnType<typeof gate>>
}) =>
  ScratchHabit.parse({
    id: itemId(),
    project_id: input.project_id,
    session_id: input.session_id,
    state: input.gate.state,
    kind: kind(input.text),
    summary: summary(input.text),
    text: input.text.trim(),
    text_norm: norm(input.text),
    impact: impact(input.text),
    capture_confidence: input.gate.capture_confidence,
    capture_reason: input.gate.capture_reason,
    evidence: [
      {
        message_id: Identifier.schema("message").parse(input.message_id),
        quote: quote(input.text),
      },
    ],
    merged_from: [],
    conflicts: [],
    created_at: nowISO(),
    updated_at: nowISO(),
  })

const imported = async (session_id: string, project_id: string) => {
  const bind = await getBinding(session_id)
  return listProjectHabits(project_id, {
    initiative_id: bind.initiative_id,
    task_scope_id: bind.task_scope_id,
    subject_ids: bind.subject_ids,
    current: true,
    habit_ids: bind.habit_ids,
  })
}

const mark = (
  item: ReturnType<typeof ScratchHabit.parse>,
  mode: "superseded" | "invalidated" | "promoted" | "discarded",
  note: string,
) =>
  ScratchHabit.parse({
    ...item,
    state: mode,
    note,
    updated_at: nowISO(),
  })

const shadow = async (session_id: string, rows: Awaited<ReturnType<typeof imported>>, text: string) => {
  const set = new Set(rows.filter((item) => clash(text, `${item.title} ${item.summary} ${item.triggers.join(" ")}`)).map((item) => item.id))
  if (set.size === 0) return []
  const bind = await getBinding(session_id)
  await replaceHabitIDs(session_id, bind.habit_ids.filter((id) => !set.has(id)))
  return rows.filter((item) => set.has(item.id))
}

export const listScratch = async (session_id: string, project_id?: string) => {
  const root = await locate(session_id, project_id)
  const row = await load(root, session_id)
  return row.items
    .map((item) => ScratchHabit.parse(item))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
}

export const listScratchConflicts = async (session_id: string, project_id?: string) => {
  const root = await locate(session_id, project_id)
  const row = await loadConflicts(root, session_id)
  return row.items
    .map((item) => ScratchConflict.parse(item))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
}

export const listProjectScratch = async (project_id: string) => {
  const dir = projectFile(project_id, "sessions")
  const rows = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
  const all = await Promise.all(
    rows
      .filter((item) => item.isDirectory())
      .map((item) => listScratch(item.name, project_id)),
  )
  return all.flat().filter(active)
}

const listAllScratch = async () => {
  const rows = await fs.readdir(projectsRoot(), { withFileTypes: true }).catch(() => [])
  const all = await Promise.all(
    rows
      .filter((item) => item.isDirectory())
      .map(async (proj) => {
        const dir = projectFile(proj.name, "sessions")
        const sessions = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
        const found = await Promise.all(
          sessions
            .filter((item) => item.isDirectory())
            .map((item) => listScratch(item.name, proj.name)),
        )
        return found.flat()
      }),
  )
  return all.flat()
}

const similar = (item: ReturnType<typeof ScratchHabit.parse>, rows: Array<ReturnType<typeof ScratchHabit.parse>>) =>
  rows
    .filter((row) => row.id !== item.id)
    .filter(open)
    .filter((row) => score(item.text, row.text) >= 0.82)

export const reviewScratch = async (project_id: string) => {
  const rows = await listProjectScratch(project_id)
  const all = await listAllScratch()
  return rows.map((item) => {
    const dup = similar(item, all)
    return {
      ...item,
      similar_count: dup.length + 1,
      similar_session_count: new Set([item.session_id, ...dup.map((row) => row.session_id)]).size,
      similar_ids: dup.map((row) => row.id),
    }
  })
}

export const captureScratch = async (input: {
  project_id: string
  session_id: string
  message_id: string
  text: string
}) => {
  const level = gate(input.text)
  if (!level) {
    return {
      created: [] as Array<ReturnType<typeof ScratchHabit.parse>>,
      pending: [] as Array<ReturnType<typeof ScratchHabit.parse>>,
      merged: [] as Array<ReturnType<typeof ScratchHabit.parse>>,
      superseded: [] as Array<ReturnType<typeof ScratchHabit.parse>>,
      shadowed: [] as Awaited<ReturnType<typeof imported>>,
    }
  }

  const row = await load(input.project_id, input.session_id)
  const conflicts = await loadConflicts(input.project_id, input.session_id)
  const next = from({ ...input, gate: level })
  const same = row.items.find((item) => open(item) && (item.text_norm === next.text_norm || score(item.text, next.text) >= 0.92))
  if (same) {
    const promote = same.state === "pending" && next.state === "active"
    const merged = ScratchHabit.parse({
      ...same,
      state: promote ? "pending" : same.state === "active" || next.state === "pending" ? same.state : "active",
      capture_confidence: same.capture_confidence === "high" || next.capture_confidence === "low" ? same.capture_confidence : "high",
      capture_reason: same.capture_confidence === "high" ? same.capture_reason : next.capture_reason,
      evidence: [
        ...same.evidence,
        {
          message_id: Identifier.schema("message").parse(input.message_id),
          quote: quote(input.text),
        },
      ],
      updated_at: nowISO(),
    })
    const items = row.items.map((item) => (item.id === same.id ? merged : item))
    await save(input.project_id, input.session_id, items)
    const ready = promote ? await activateScratch({ session_id: input.session_id, id: merged.id }) : merged
    return {
      created: [] as Array<ReturnType<typeof ScratchHabit.parse>>,
      pending: [] as Array<ReturnType<typeof ScratchHabit.parse>>,
      merged: ready ? [ready] : [merged],
      superseded: [] as Array<ReturnType<typeof ScratchHabit.parse>>,
      shadowed: [] as Awaited<ReturnType<typeof imported>>,
    }
  }

  if (next.state === "pending") {
    await save(input.project_id, input.session_id, [...row.items, next])
    return {
      created: [] as Array<ReturnType<typeof ScratchHabit.parse>>,
      pending: [next],
      merged: [] as Array<ReturnType<typeof ScratchHabit.parse>>,
      superseded: [] as Array<ReturnType<typeof ScratchHabit.parse>>,
      shadowed: [] as Awaited<ReturnType<typeof imported>>,
    }
  }

  const stale = row.items.filter((item) => active(item) && clash(item.text, next.text))
  const items = row.items.map((item) =>
    stale.some((old) => old.id === item.id) ? mark(item, "superseded", "被当前 session 中更新的明确要求覆盖。") : item,
  )
  const current = await imported(input.session_id, input.project_id)
  const gone = await shadow(input.session_id, current, next.text)
  const fresh = gone.length
    ? ScratchHabit.parse({
        ...next,
        conflicts: gone.map((item) => item.id),
      })
    : next

  const extra = [
    ...stale.map((item) =>
      ScratchConflict.parse({
        id: conflictId(),
        project_id: input.project_id,
        session_id: input.session_id,
        habit_id: fresh.id,
        target_kind: "scratch",
        target_id: item.id,
        mode: "superseded",
        note: "旧暂存习惯被更新的明确要求覆盖。",
        created_at: nowISO(),
        updated_at: nowISO(),
      }),
    ),
    ...gone.map((item) =>
      ScratchConflict.parse({
        id: conflictId(),
        project_id: input.project_id,
        session_id: input.session_id,
        habit_id: fresh.id,
        target_kind: "imported",
        target_id: item.id,
        mode: "shadowed",
        note: "当前 session 的最新明确要求覆盖了已引用正式习惯。",
        created_at: nowISO(),
        updated_at: nowISO(),
      }),
    ),
  ]

  await save(input.project_id, input.session_id, [...items, fresh])
  await saveConflicts(input.project_id, input.session_id, [...conflicts.items, ...extra])
  return {
    created: [fresh],
    pending: [] as Array<ReturnType<typeof ScratchHabit.parse>>,
    merged: [] as Array<ReturnType<typeof ScratchHabit.parse>>,
    superseded: stale.map((item) => mark(item, "superseded", "被当前 session 中更新的明确要求覆盖。")),
    shadowed: gone,
  }
}

export const dismissScratch = async (input: { session_id: string; id: string }) => {
  const project_id = await locate(input.session_id)
  const row = await load(project_id, input.session_id)
  const next = row.items.map((item) => (item.id === input.id ? mark(item, "discarded", "用户在审查暂存习惯中丢弃。") : item))
  await save(project_id, input.session_id, next)
  return next.find((item) => item.id === input.id)
}

export const activateScratch = async (input: { session_id: string; id: string }) => {
  const project_id = await locate(input.session_id)
  const row = await load(project_id, input.session_id)
  const conflicts = await loadConflicts(project_id, input.session_id)
  const item = row.items.find((row) => row.id === input.id)
  if (!item) return
  if (item.state === "active") return item
  if (item.state !== "pending") return item

  const stale = row.items.filter((row) => active(row) && clash(row.text, item.text))
  const current = await imported(input.session_id, project_id)
  const gone = await shadow(input.session_id, current, item.text)
  const fresh = ScratchHabit.parse({
    ...item,
    state: "active",
    note: "用户已确认这条低置信暂存习惯在当前 session 生效。",
    conflicts: Array.from(new Set([...item.conflicts, ...gone.map((row) => row.id)])),
    updated_at: nowISO(),
  })
  const next = row.items.map((row) => {
    if (row.id === item.id) return fresh
    if (stale.some((old) => old.id === row.id)) return mark(row, "superseded", "被用户确认生效的新暂存习惯覆盖。")
    return row
  })
  const extra = [
    ...stale.map((row) =>
      ScratchConflict.parse({
        id: conflictId(),
        project_id,
        session_id: input.session_id,
        habit_id: fresh.id,
        target_kind: "scratch",
        target_id: row.id,
        mode: "superseded",
        note: "用户确认的新暂存习惯覆盖了旧暂存习惯。",
        created_at: nowISO(),
        updated_at: nowISO(),
      }),
    ),
    ...gone.map((row) =>
      ScratchConflict.parse({
        id: conflictId(),
        project_id,
        session_id: input.session_id,
        habit_id: fresh.id,
        target_kind: "imported",
        target_id: row.id,
        mode: "shadowed",
        note: "用户确认的新暂存习惯覆盖了已引用正式习惯。",
        created_at: nowISO(),
        updated_at: nowISO(),
      }),
    ),
  ]
  await save(project_id, input.session_id, next)
  await saveConflicts(project_id, input.session_id, [...conflicts.items, ...extra])
  return fresh
}

export const setScratchState = async (input: {
  session_id: string
  id: string
  state: "promoted" | "invalidated"
  note: string
  promoted_proposal_id?: string
  promoted_habit_id?: string
}) => {
  const project_id = await locate(input.session_id)
  const row = await load(project_id, input.session_id)
  const next = row.items.map((item) =>
    item.id === input.id
      ? ScratchHabit.parse({
          ...item,
          state: input.state,
          note: input.note,
          promoted_proposal_id: input.promoted_proposal_id,
          promoted_habit_id: input.promoted_habit_id,
          updated_at: nowISO(),
        })
      : item,
  )
  await save(project_id, input.session_id, next)
  return next.find((item) => item.id === input.id)
}

export const resolveSimilarScratch = async (input: {
  id: string
  promoted_proposal_id?: string
  promoted_habit_id?: string
}) => {
  const all = await listAllScratch()
  const base = all.find((item) => item.id === input.id)
  if (!base) return []
  const rows = similar(base, all)
  await Promise.all(
    rows.map(async (item) => {
      const row = await load(item.project_id, item.session_id)
      await save(
        item.project_id,
        item.session_id,
        row.items.map((old) =>
          old.id === item.id
            ? ScratchHabit.parse({
                ...old,
                state: "promoted",
                note: "相似暂存习惯已随同一条正式习惯入库处理。",
                promoted_proposal_id: input.promoted_proposal_id,
                promoted_habit_id: input.promoted_habit_id,
                updated_at: nowISO(),
              })
            : old,
        ),
      )
    }),
  )
  return rows
}

export const activeScratch = async (session_id: string) => {
  const rows = await listScratch(session_id)
  return rows.filter(active)
}

export const scratchSections = (rows: Awaited<ReturnType<typeof activeScratch>>) =>
  rows.map((item) => ({
    id: item.id,
    text: item.summary,
    source: "current_session_scratch",
  }))

export const scratchOptions = async (session_id: string) => {
  const bind = await getBinding(session_id)
  const [proj, global] = await Promise.all([getProjectProfile(bind.project_id), getGlobalProfile()])
  const out: ScopeRef[] = []

  if (bind.task_scope_id) {
    out.push({ level: "task_scope", target: bind.task_scope_id })
  }

  out.push(
    ...Array.from(new Set([...proj.task_scope_refs, ...global.task_scope_refs])).map((target) => ({
      level: "task_scope" as const,
      target,
    })),
  )

  if (bind.initiative_id) out.push({ level: "initiative", target: bind.initiative_id })

  out.push(
    ...Array.from(new Set([...bind.artifact_ids, ...proj.artifact_refs, ...global.artifact_refs])).map((target) => ({
      level: "artifact" as const,
      target,
    })),
    ...Array.from(new Set([...bind.subject_ids, ...proj.subject_ids, ...global.subject_ids])).map((target) => ({
      level: "subject" as const,
      target,
    })),
    { level: "global", target: "user" },
  )

  return Array.from(new Map(out.map((item) => [`${item.level}:${item.target}`, item])).values())
}
