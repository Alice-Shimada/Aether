import { Identifier } from "@/id/id"
import { Artifact } from "@/artifact"
import { TaskScope } from "@/task-scope"
import { ContextPacket } from "@/adaptation/types"
import type { ContextSection } from "@/adaptation/types"
import { ensureMap } from "@/adaptation/project"
import { getBinding, syncBinding } from "@/adaptation/session"
import {
  getGlobalPolicy,
  getGlobalProfile,
  getInitiativePolicy,
  getInitiativeProfile,
  getProjectProfile,
  getSubjectPolicy,
  getSubjectProfile,
} from "@/adaptation/profile"
import { listProposals, mergeProposals } from "@/adaptation/proposal"
import { contextPacketFile, nowISO, writeJSON, readJSON } from "@/adaptation/storage"
import { mergePolicy } from "@/adaptation/policy"
import { getProjectSuppression, listProjectHabits, suppressionHit } from "@/adaptation/habit"
import type { ProposalCandidate } from "@/adaptation/signal"
import { activeScratch } from "@/adaptation/scratch"
import { clipSections } from "./priority"
import type { Budget } from "./priority"
import { renderPacket } from "./packet"

const short = (text: string, max = 220) => (text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1))}…`)

const toText = (value: unknown) => {
  if (typeof value === "string") return value
  if (Array.isArray(value)) return value.map((item) => String(item)).join("; ")
  if (!value || typeof value !== "object") return ""
  const row = value as Record<string, unknown>
  const out: string[] = []
  if (typeof row.summary === "string" && row.summary) out.push(row.summary)
  if (typeof row.status_summary === "string" && row.status_summary) out.push(row.status_summary)
  ;["stable_context", "principles", "decisions", "open_questions", "aliases", "known_anchors", "preferred_formalisms"].forEach(
    (key) => {
      const val = row[key]
      if (!Array.isArray(val)) return
      const text = val
        .map((item) => (typeof item === "string" ? item : ""))
        .filter(Boolean)
        .join("; ")
      if (text) out.push(text)
    },
  )
  ;["response_preferences"].forEach((key) => {
    const val = row[key]
    if (!val || typeof val !== "object" || Array.isArray(val)) return
    const text = Object.entries(val as Record<string, unknown>)
      .map(([k, v]) => (typeof v === "string" || typeof v === "number" || typeof v === "boolean" ? `${k}: ${v}` : ""))
      .filter(Boolean)
      .join("; ")
    if (text) out.push(text)
  })
  ;["subject_ids", "task_scope_refs", "artifact_refs", "ipk_piece_refs"].forEach((key) => {
    const val = row[key]
    if (!Array.isArray(val)) return
    const text = val
      .map((item) => (typeof item === "string" ? item : ""))
      .filter(Boolean)
      .join("; ")
    if (text) out.push(text)
  })
  if (out.length > 0) return out.join("; ")
  return Object.values(row)
    .map((item) => (typeof item === "string" ? item : ""))
    .filter(Boolean)
    .join("; ")
}

const section = (kind: ContextSection["kind"], source: string, id: string, text: string): ContextSection => ({
  kind,
  source,
  id,
  text: short(text),
})

const asksHabits = (text: string) =>
  /当前\s*(session|会话)?\s*习惯|当前范围.*习惯|current\s+session\s+habits?|current\s+habits?|习惯列表|有哪些习惯|看到.*习惯/iu.test(text)

type Habit = Awaited<ReturnType<typeof listProjectHabits>>[number]
type ReviewMode = NonNullable<ProposalCandidate["session_review"]>["mode"]

const terms = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKC")
    .split(/[^\p{L}\p{N}]+/iu)
    .map((item) => item.trim())
    .filter((item) => item.length > 1)

const norm = (text: string) => terms(text).join(" ")
const neg = (text: string) => /不要|不用|别用|禁止|避免|do not|don't|avoid|no longer/iu.test(text)
const overlap = (a: string, b: string) => {
  const x = new Set(terms(a).filter((item) => !["默认", "以后", "请", "用", "不要", "不用", "别用"].includes(item)))
  const y = new Set(terms(b).filter((item) => !["默认", "以后", "请", "用", "不要", "不用", "别用"].includes(item)))
  if (x.size === 0 || y.size === 0) return 0
  let hit = 0
  x.forEach((item) => {
    if (y.has(item)) hit += 1
  })
  return hit / Math.max(1, Math.min(x.size, y.size))
}
const shadow = (scratch: string, habit: Habit) => neg(scratch) !== neg(`${habit.title} ${habit.summary}`) && overlap(scratch, `${habit.title} ${habit.summary} ${habit.triggers.join(" ")}`) >= 0.45

const related = (item: Habit, text: string) => {
  const raw = text.toLowerCase().normalize("NFKC")
  if (item.triggers.some((key) => key && raw.includes(key.toLowerCase().normalize("NFKC")))) return true
  const req = new Set(terms(text))
  if (req.size === 0) return false
  return terms(`${item.title} ${item.summary} ${item.triggers.join(" ")}`).some((key) => req.has(key))
}

const active = (item: Habit, input: { text: string; task_scope_id?: string; subject_ids: string[]; habit_ids: Set<string> }) => {
  if (input.habit_ids.has(item.id) || item.legacy_ids.some((id) => input.habit_ids.has(id))) return true
  return related(item, input.text)
}

const reviewKey = (session_id: string, mode: ReviewMode, habit_id: string) => `session:${session_id}:${mode}:${habit_id}`

const reviewSummary = (mode: ReviewMode, summary: string) => {
  if (mode === "suggest_add") return `建议加入当前 session：${summary}`
  if (mode === "suggest_remove") return `建议移出当前 session：${summary}`
  return summary
}

const reviewEffect = (mode: ReviewMode) => {
  if (mode === "suggest_add") return "确认后，这条习惯会进入当前 session，并在后续消息中持续作为 current session habit 注入。"
  if (mode === "suggest_remove") return "确认后，这条习惯会从当前 session 的已生效习惯集合中移出，不再继续注入。"
  return ""
}

const reviewCandidate = (input: {
  session_id: string
  project_id: string
  mode: ReviewMode
  habit_id: string
  summary: string
  impact: Habit["impact"]
  confidence: number
  reason: string
  habit_scope?: Habit["scope"]
  replacement_id?: string
}): ProposalCandidate => ({
  project_id: input.project_id,
  scope: {
    level: "session",
    target: input.session_id,
  },
  kind: "session_habit_review",
  merge_key: reviewKey(input.session_id, input.mode, input.habit_id),
  summary: reviewSummary(input.mode, input.summary),
  impact: input.impact === "low" ? "medium" : input.impact,
  confidence: input.confidence,
  evidence_refs: [],
  session_review: {
    session_id: input.session_id,
    mode: input.mode,
    habit_id: input.habit_id,
    habit_scope: input.habit_scope,
    replacement_id: input.replacement_id,
    reason: input.reason,
  },
  future_effect: reviewEffect(input.mode),
})

export const buildSessionReviewCandidates = (input: {
  session_id: string
  project_id: string
  matched: Habit[]
  current: Habit[]
  habit_ids: string[]
}) => {
  const bound = new Set(input.habit_ids)
  const known = new Set(input.current.flatMap((item) => [item.id, ...item.legacy_ids]))
  const out = new Map<string, ProposalCandidate>()

  input.matched
    .filter((item) => !item.suppressed)
    .filter((item) => !bound.has(item.id) && !item.legacy_ids.some((id) => bound.has(id)))
    .forEach((item) => {
      const row = reviewCandidate({
        session_id: input.session_id,
        project_id: input.project_id,
        mode: "suggest_add",
        habit_id: item.id,
        summary: item.summary,
        impact: item.impact,
        confidence: Math.max(0.72, item.confidence || 0),
        reason: "本轮请求命中了这条已确认习惯，但它尚未进入当前 session。",
        habit_scope: item.scope,
      })
      out.set(row.merge_key, row)
    })

  input.current
    .filter((item) => item.suppressed)
    .forEach((item) => {
      const row = reviewCandidate({
        session_id: input.session_id,
        project_id: input.project_id,
        mode: "suggest_remove",
        habit_id: item.id,
        summary: item.summary,
        impact: item.impact,
        confidence: 0.9,
        reason: `这条习惯当前已被本项目 suppression 命中${item.suppress_reason ? `（${item.suppress_reason}）` : ""}，建议从当前 session 移出。`,
        habit_scope: item.scope,
      })
      out.set(row.merge_key, row)
    })

  input.habit_ids
    .filter((id) => !known.has(id))
    .forEach((id) => {
      const row = reviewCandidate({
        session_id: input.session_id,
        project_id: input.project_id,
        mode: "suggest_remove",
        habit_id: id,
        summary: `失效引用 ${id}`,
        impact: "medium",
        confidence: 0.95,
        reason: "当前 session 仍引用一条已无法在习惯库中解析的 habit，建议移出这个失效引用。",
      })
      out.set(row.merge_key, row)
    })

  return Array.from(out.values())
}

export type CompileInput = {
  session_id: string
  request_id: string
  request: string
  budget?: Budget
}

export const compileContext = async (input: CompileInput) => {
  const map = await ensureMap({ session_id: input.session_id })
  const bind = await getBinding(input.session_id)

  const match = await TaskScope.match({
    session_id: input.session_id,
    request: input.request,
    cwd: undefined,
    open_paths: [],
    selected_message_ids: [],
    user_scope_id: bind.task_scope_id,
  })

  const project_id = map.project_id
  const initiative_id = bind.initiative_id
  const task_scope_id = match.task_scope.primary ?? bind.task_scope_id
  const subject_ids = Array.from(new Set([...bind.subject_ids, ...match.subject_ids])).slice(0, 4)
  const artifact_ids = Array.from(new Set([...bind.artifact_ids, ...match.artifact_ids])).slice(0, 4)

  const [projectProfile, initiativeProfile, initiativePolicy, globalProfile, globalPolicy, task, arts, pending, suppression] = await Promise.all([
    getProjectProfile(project_id),
    initiative_id ? getInitiativeProfile(initiative_id) : Promise.resolve(undefined),
    initiative_id ? getInitiativePolicy(initiative_id) : Promise.resolve(undefined),
    getGlobalProfile(),
    getGlobalPolicy(),
    task_scope_id ? TaskScope.get(project_id, task_scope_id) : Promise.resolve(undefined),
    Promise.all(artifact_ids.map((item) => Artifact.get(project_id, item))),
    listProposals(["pending"]),
    getProjectSuppression(project_id),
  ])

  const guide_subject_ids =
    subject_ids.length > 0
      ? subject_ids
      : Array.from(new Set([...projectProfile.subject_ids, ...globalProfile.subject_ids])).slice(0, 4)
  const guide_task_scope_refs = Array.from(new Set([...projectProfile.task_scope_refs, ...globalProfile.task_scope_refs]))
  const guide_task_scope_id = task_scope_id ?? (guide_task_scope_refs.length === 1 ? guide_task_scope_refs[0] : undefined)

  const subjects = await Promise.all(
    guide_subject_ids.map(async (id) => ({
      profile: await getSubjectProfile(id),
      policy: await getSubjectPolicy(id),
    })),
  )

  const artifactPolicy = arts.find((item) => item && item.confirmed)
    ? {
        scope: {
          level: "artifact" as const,
          target: arts.find((item) => item && item.confirmed)?.id ?? "",
        },
        response_policy: [],
        operation_policy: [
          {
            id: "artifact_contract",
            text: `遵循当前文件规则：${arts.find((item) => item && item.confirmed)?.path ?? ""}`,
            impact: "high" as const,
            source: "artifact_contract",
          },
        ],
        updated_at: nowISO(),
      }
    : undefined

  const subjectPolicy =
    subjects.length > 0
      ? {
          scope: {
            level: "subject" as const,
            target: guide_subject_ids.join(",") || "current",
          },
          response_policy: subjects.flatMap((item) => item.policy.response_policy),
          operation_policy: subjects.flatMap((item) => item.policy.operation_policy),
          updated_at: subjects.map((item) => item.policy.updated_at).sort().slice(-1)[0] ?? nowISO(),
        }
      : undefined

  const explain = asksHabits(input.request)
  const seed = await listProjectHabits(project_id, {
    initiative_id,
    task_scope_id: guide_task_scope_id,
    subject_ids: guide_subject_ids,
  })
  const matched = seed.filter((item) =>
    active(item, {
      text: input.request,
      task_scope_id: guide_task_scope_id,
      subject_ids: guide_subject_ids,
      habit_ids: new Set(bind.habit_ids),
    }),
  )
  const omitted: string[] = []
  const scratch = await activeScratch(input.session_id)
  const currentImported = await listProjectHabits(project_id, {
    initiative_id,
    task_scope_id: guide_task_scope_id,
    subject_ids: guide_subject_ids,
    current: true,
    habit_ids: bind.habit_ids,
  })
  const currentHabits = currentImported.filter((item) => !scratch.some((row) => shadow(row.text, item)))
  scratch
    .flatMap((row) =>
      currentImported
        .filter((item) => shadow(row.text, item))
        .map((item) => `${item.summary} omitted by current session scratch ${row.id}`),
    )
    .forEach((item) => omitted.push(item))
  const review = buildSessionReviewCandidates({
    session_id: input.session_id,
    project_id,
    matched,
    current: currentImported,
    habit_ids: bind.habit_ids,
  })
  if (review.length > 0) await mergeProposals(review)

  const applies = (level: "global" | "initiative", text: string) =>
    currentHabits.some((item) => !item.suppressed && item.scope.level === level && norm(item.summary) === norm(text))
  const keep = (text: string, src: string) => {
    const gate = suppressionHit({
      rules: suppression.rules,
      text,
    })
    if (!gate.hit) return true
    omitted.push(`${src} omitted by project suppression`)
    return false
  }

  const initiativePolicyFiltered = initiativePolicy
    ? {
        ...initiativePolicy,
        response_policy: initiativePolicy.response_policy.filter((item) => keep(item.text, "initiative policy")),
        operation_policy: initiativePolicy.operation_policy
          .filter((item) => applies("initiative", item.text))
          .filter((item) => keep(item.text, "initiative policy")),
      }
    : undefined

  const globalPolicyFiltered = {
    ...globalPolicy,
    response_policy: globalPolicy.response_policy,
    operation_policy: globalPolicy.operation_policy.filter((item) => applies("global", item.text)),
  }

  const subjectPolicyFiltered = subjectPolicy
    ? {
        ...subjectPolicy,
        operation_policy: subjectPolicy.operation_policy.filter((item) =>
          currentHabits.some((row) => !row.suppressed && row.scope.level === "subject" && norm(row.summary) === norm(item.text)),
        ),
      }
    : undefined

  const taskPolicyFiltered = task?.policy
    ? {
        ...task.policy,
        response_policy: task.policy.response_policy.filter((item) => keep(item.text, "task scope policy")),
        operation_policy: task.policy.operation_policy.filter((item) => keep(item.text, "task scope policy")),
      }
    : undefined

  const taskScopeFiltered = task?.scope
    ? {
        ...task.scope,
        principles: task.scope.principles.filter((item) => keep(item, "task scope principles")),
      }
    : undefined

  const scratchPolicyLines = scratch.map((item) => ({
    id: item.id,
    text: item.text,
    impact: item.impact,
    source: "current_session_scratch",
    confirmed: false,
    updated_at: item.updated_at,
  }))

  const merged = mergePolicy({
    session: { operation_policy: scratchPolicyLines },
    artifact: artifactPolicy,
    task_scope: taskPolicyFiltered,
    initiative: initiativePolicyFiltered,
    subject: subjectPolicyFiltered,
    global: globalPolicyFiltered,
  })

  const sections: ContextSection[] = []

  sections.push(section("project_profile", "project_profile", project_id, toText(projectProfile)))
  if (initiative_id && initiativeProfile) {
    sections.push(section("initiative_profile", "initiative_profile", initiative_id, toText(initiativeProfile)))
  }
  if (taskScopeFiltered) sections.push(section("task_scope", "task_scope", taskScopeFiltered.id, toText(taskScopeFiltered)))

  currentHabits.forEach((item) => {
    sections.push(
      section(
        "operation_policy",
        "current_session_habit",
        item.id,
        [
          `scope=${item.scope.level}:${item.scope.target}`,
          `type=${item.kind}`,
          `status=${item.suppressed ? "suppressed" : "active"}`,
          item.summary,
        ].join("; "),
      ),
    )
  })
  scratch.forEach((item) => {
    sections.push(
      section(
        "operation_policy",
        "current_session_scratch",
        item.id,
        [`scope=session:${item.session_id}`, `type=${item.kind}`, `status=${item.state}`, item.summary].join("; "),
      ),
    )
  })

  for (const row of subjects) {
    sections.push(section("subject_profile", "subject_profile", row.profile.subject_id, toText(row.profile)))
  }

  const seen = new Set<string>()
  for (const row of arts) {
    if (!row || !row.confirmed) continue
    if (seen.has(row.id)) continue
    seen.add(row.id)
    sections.push(section("artifact_contract", "artifact_contract", row.id, `${row.role}: ${row.path}`))
  }

  const global = toText(globalProfile)
  if (global) {
    sections.push(section("global_profile", "global_profile", "workspace-global", global))
  }

  merged.response.slice(0, 6).forEach((item) => {
    sections.push(section("response_policy", "policy", item.id, item.text))
  })
  merged.operation.slice(0, 6).forEach((item) => {
    sections.push(section("operation_policy", "policy", item.id, item.text))
  })

  const budget = explain
    ? {
        max_sections: Math.max(input.budget?.max_sections ?? 0, sections.length),
        max_chars: Math.max(
          input.budget?.max_chars ?? 0,
          sections.reduce((sum, item) => sum + item.text.length, 0),
        ),
      }
    : {
        ...input.budget,
        max_sections: Math.max(input.budget?.max_sections ?? 8, currentHabits.length + 8),
        max_chars: Math.max(
          input.budget?.max_chars ?? 4000,
          currentHabits.reduce((sum, item) => sum + short(item.summary).length, 0) + 4000,
        ),
      }
  const clip = clipSections(sections, budget)
  const active_task_scope_id = match.needs_user_confirmation ? bind.task_scope_id : task_scope_id
  const active_subject_ids =
    !match.needs_user_confirmation && match.subject_ids.length > 0 ? match.subject_ids.slice(0, 4) : bind.subject_ids
  const active_artifact_ids = match.artifact_ids.slice(0, 4)
  const packet = ContextPacket.parse({
    id: Identifier.ascending("packet"),
    request_id: input.request_id,
    session_id: input.session_id,
    project_id,
    initiative_id,
    task_scope_id: active_task_scope_id,
    subject_ids: active_subject_ids,
    artifact_ids: active_artifact_ids,
    habit_ids: currentHabits.map((item) => item.id),
    scratch_ids: scratch.map((item) => item.id),
    sections: clip,
    audit: {
      used_records: [
        "global-profile.json",
        "global-policy.json",
        "project-profile.json",
        ...(initiative_id ? [`initiatives/${initiative_id}/initiative-profile.json`, `initiatives/${initiative_id}/initiative-policy.json`] : []),
        ...guide_subject_ids.map((id) => `subjects/${id}/profile.json`),
        ...guide_subject_ids.map((id) => `subjects/${id}/policy.json`),
        ...(task_scope_id ? [`task-scopes/${task_scope_id}/scope.json`] : []),
        ...active_artifact_ids.map((id) => `artifacts/${id}/contract.json`),
      ],
      omitted_reason: [
        ...merged.omit,
        ...omitted,
        pending.length > 0 ? "pending proposals are excluded from active context rules." : "",
      ].filter(Boolean),
    },
    created_at: nowISO(),
  })

  await writeJSON(contextPacketFile(packet.id), packet)

  await syncBinding(input.session_id, {
    project_id,
    initiative_id,
    task_scope_id: active_task_scope_id,
    subject_ids: active_subject_ids,
    artifact_ids: active_artifact_ids,
    context_packet_id: packet.id,
    context_packet_snapshot: packet,
  })

  return {
    packet,
    text: renderPacket(packet),
    match,
  }
}

export const getPacket = async (id: string) => {
  const row = await readJSON<ContextPacket | undefined>(contextPacketFile(id), undefined)
  if (!row) return
  return ContextPacket.parse(row)
}
