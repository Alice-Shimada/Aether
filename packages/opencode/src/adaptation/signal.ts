import { Identifier } from "@/id/id"
import { Session } from "@/session"
import { MessageV2 } from "@/session/message-v2"
import { SessionID } from "@/session/schema"
import { SignalRecord, ScopeRef, type ExtractedHabitCandidate } from "./types"
import { appendText, indexesRoot, nowISO, readJSON, safeJoin, signalsRoot, writeJSON } from "./storage"
import { getBinding, patchBinding, syncBinding } from "./session"
import { getSubjectProfile } from "./profile"
import { semanticMerge } from "./semantic"
import { extractCandidateBatch } from "./llm"
import { applyCandidate, beginScratchSession, commitScratchSession, ScratchComparatorError } from "./scratch"
import { ensureMap } from "./project"

type SignalIndex = {
  version: "v1"
  updated_at: string
  ids: Record<string, string>
  sessions: Record<string, string[]>
  processed: Record<string, string[]>
}

type ExtractInput = {
  session_id: string
  mode: "manual_current_session" | "after_user_message" | "after_summary"
  message_ids?: string[]
}

export type ProposalCandidate = {
  project_id?: string
  initiative_id?: string
  scope: ScopeRef
  kind: string
  merge_key: string
  summary: string
  impact: "low" | "medium" | "high"
  confidence: number
  evidence_refs: string[]
  promotion?: {
    source_scope: ScopeRef
    target_scope: ScopeRef
    kind: string
    reason: string
  }
  session_review?: {
    session_id: string
    mode: "suggest_add" | "suggest_keep_attention" | "suggest_remove" | "suggest_replace" | "suggest_rescope"
    habit_id: string
    habit_scope?: ScopeRef
    replacement_id?: string
    reason: string
  }
  target_patch?: {
    object:
      | "global_guidance"
      | "global_policy"
      | "subject_profile"
      | "subject_policy"
      | "project_guidance"
      | "initiative_profile"
      | "initiative_policy"
      | "task_scope"
      | "task_scope_policy"
      | "artifact_contract"
    id: string
    fields: string[]
    payload: Record<string, unknown>
  }
  future_effect: string
}

export type ExtractOutput = {
  signals: SignalRecord[]
  candidates: ExtractedHabitCandidate[]
  proposal_candidates: ProposalCandidate[]
  scratch: {
    created: string[]
    pending: string[]
    merged: string[]
    superseded: string[]
    reviews: string[]
    hits: string[]
  }
  skipped: string[]
}

const quote = (text: string, max = 200) => (text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1))}…`)
const uniq = <T,>(rows: T[]) => Array.from(new Set(rows))
const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/giu, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48) || "semantic"

const scope = (bind: Awaited<ReturnType<typeof getBinding>>) => {
  if (bind.task_scope_id) {
    return {
      level: "task_scope" as const,
      target: bind.task_scope_id,
    }
  }
  if (bind.initiative_id) {
    return {
      level: "initiative" as const,
      target: bind.initiative_id,
    }
  }
  return undefined
}

const indexFile = () => safeJoin(indexesRoot(), "signal-index.json")

const loadIndex = async () =>
  readJSON<SignalIndex>(indexFile(), {
    version: "v1",
    updated_at: nowISO(),
    ids: {},
    sessions: {},
    processed: {},
  })

const saveIndex = async (value: SignalIndex) => {
  await writeJSON(indexFile(), {
    ...value,
    updated_at: nowISO(),
    processed: value.processed ?? {},
  })
}

const markProcessed = async (session_id: string, refs: string[]) => {
  if (refs.length === 0) return
  const idx = await loadIndex()
  idx.processed = {
    ...(idx.processed ?? {}),
    [session_id]: Array.from(new Set([...(idx.processed?.[session_id] ?? []), ...refs])),
  }
  await saveIndex(idx)
}

const file = (stamp: string) => {
  const date = new Date(stamp)
  const year = String(date.getUTCFullYear())
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  return safeJoin(signalsRoot(), year, month, "signals.jsonl")
}

const title = (key: string) => {
  if (key === "workflow:planning_doc_sync") return "规划讨论文档收敛规则"
  if (key === "pref_response:physics_intuition") return "偏好物理直觉解释"
  if (key === "pref_response:calculation_detail") return "偏好计算与推导细节"
  if (key === "cap_subject:statistical-mechanics:familiarity_low") return "统计物理当前熟悉度较低"
  if (key === "cap_subject:statistical-mechanics:familiarity_high") return "统计物理当前熟悉度较高"
  if (key === "cap_subject:quantum-field-theory:familiarity_high") return "量子场论熟悉度较高"
  return key
}

const prefKey = (key: string) => {
  if (key.startsWith("cap_subject:statistical-mechanics:familiarity_")) return "statistical_mechanics_familiarity"
  if (key.startsWith("cap_subject:quantum-field-theory:familiarity_")) return "quantum_field_theory_familiarity"
  if (key === "pref_response:physics_intuition") return "prefer_physics_intuition"
  if (key === "pref_response:calculation_detail") return "prefer_calculation_detail"
  return
}

const prefVal = (key: string) => {
  if (key.endsWith(":familiarity_low")) return 0.2
  if (key.endsWith(":familiarity_high")) return 0.86
  if (key === "pref_response:physics_intuition") return 0.84
  if (key === "pref_response:calculation_detail") return 0.82
  return 0.78
}

const subjectOf = (key: string, bind: Awaited<ReturnType<typeof getBinding>>) => {
  if (key.startsWith("cap_subject:")) {
    return key.split(":")[1]
  }
  if (bind.subject_ids.length === 1) return bind.subject_ids[0]
  return
}

const gather = async (session_id: string, message_ids: string[]) => {
  const all = await Session.messages({ sessionID: SessionID.make(session_id) })
  const keep = message_ids.length > 0 ? new Set(message_ids) : undefined
  return all
    .filter((msg) => msg.info.role === "user")
    .filter((msg) => (keep ? keep.has(msg.info.id) : true))
    .map((msg) => ({
      id: msg.info.id,
      role: msg.info.role,
      text: msg.parts
        .filter((part): part is MessageV2.TextPart => part.type === "text")
        .filter((part) => !part.synthetic && !part.ignored)
        .map((part) => part.text.trim())
        .filter((part) => part.length > 0)
        .join("\n\n")
        .trim(),
    }))
    .filter((part) => part.text.length > 0)
}

type Buck = {
  key: string
  ids: string[]
  sessions: Set<string>
  explicit: number
  strong: number
  high: number
  scope: ScopeRef
  sample: string
  stability: "stable" | "mutable" | "transient"
}

const build = (signals: SignalRecord[], scope: ScopeRef) => {
  const map = new Map<string, Buck>()
  signals
    .filter((item) => item.scope.level === scope.level && item.scope.target === scope.target)
    .filter((item) => !item.temporary)
    .forEach((item) => {
      const keys = item.traits.length > 0 ? item.traits : [item.kind]
      keys.forEach((key) => {
        const old = map.get(key)
        if (!old) {
          map.set(key, {
            key,
            ids: [item.id],
            sessions: new Set([item.session_id]),
            explicit: item.explicit ? 1 : 0,
            strong: item.confidence >= 0.82 ? 1 : 0,
            high: item.impact === "high" ? 1 : 0,
            scope: item.scope,
            sample: item.note || item.evidence[0]?.quote || key,
            stability: item.stability,
          })
          return
        }
        old.ids.push(item.id)
        old.sessions.add(item.session_id)
        old.explicit += item.explicit ? 1 : 0
        old.strong += item.confidence >= 0.82 ? 1 : 0
        old.high += item.impact === "high" ? 1 : 0
        if (!old.sample && item.note) old.sample = item.note
        if (old.stability !== "mutable" && item.stability === "mutable") old.stability = "mutable"
      })
    })
  return Array.from(map.values())
}

/** @internal Exported for testing */
export const localGate = (buck: { explicit: number; strong: number; sessions: Set<string> }) => {
  const fast = buck.explicit >= 1
  const slow = buck.strong >= 2 && buck.sessions.size >= 2
  return {
    fast,
    slow,
    pass: fast || slow,
  }
}

const policyPatch = (input: {
  object: "task_scope_policy" | "initiative_policy"
  id: string
  key: string
  signal_id: string
  text: string
}) => ({
  object: input.object,
  id: input.id,
  fields: ["operation_policy"],
  payload: {
    operation_policy: [
      {
        id: `pol_${input.key.replace(/[^a-z0-9]+/giu, "_").slice(-40)}_${input.signal_id.slice(-6)}`,
        text: quote(input.text, 120),
        impact: "high",
        source: "proposal_confirmed",
      },
    ],
  },
})

const localCandidate = (input: {
  buck: Buck
  bind: Awaited<ReturnType<typeof getBinding>>
  fresh: Set<string>
}): ProposalCandidate | undefined => {
  if (!input.buck.ids.some((id) => input.fresh.has(id))) return
  const gate = localGate(input.buck)
  if (!gate.pass) return
  if (input.buck.scope.level !== "task_scope" && input.buck.scope.level !== "initiative") return
  const key = input.buck.key
  const text = input.buck.sample || title(key)
  const object = input.buck.scope.level === "task_scope" ? "task_scope_policy" : "initiative_policy"
  return {
    project_id: input.bind.project_id,
    initiative_id: input.buck.scope.level === "initiative" ? input.buck.scope.target : input.bind.initiative_id,
    scope: input.buck.scope,
    kind: "workflow_principle",
    merge_key: `${input.buck.scope.level}:${input.buck.scope.target}:habit:${key}`,
    summary: `建议在当前${input.buck.scope.level === "task_scope" ? "任务" : "长期事项"}默认采用：${quote(text, 90)}`,
    impact: "high" as const,
    confidence: Math.min(0.96, 0.74 + input.buck.explicit * 0.05 + input.buck.strong * 0.03 + input.buck.high * 0.01),
    evidence_refs: input.buck.ids.slice(-6),
    promotion: {
      source_scope: {
        level: "session" as const,
        target: input.bind.session_id,
      },
      target_scope: input.buck.scope,
      kind: "scope_promotion",
      reason: gate.fast ? "LLM 判断用户显式设定了可复用规则。" : "同类高置信信号跨会话达到阈值。",
    },
    target_patch: policyPatch({
      object,
      id: input.buck.scope.target,
      key,
      signal_id: input.buck.ids[input.buck.ids.length - 1],
      text,
    }),
    future_effect: "确认后系统会在同作用域后续请求中优先应用该规则。",
  }
}

const semanticCandidate = (input: {
  label: string
  ids: string[]
  conf: number
  scope: ScopeRef
  bind: Awaited<ReturnType<typeof getBinding>>
  stats: {
    explicit: number
    strong: number
    high: number
    sessions: Set<string>
    sample: string
  }
}): ProposalCandidate | undefined => {
  const gate = localGate({
    explicit: input.stats.explicit,
    strong: input.stats.strong,
    sessions: input.stats.sessions,
  })
  if (!gate.pass) return
  if (input.scope.level !== "task_scope" && input.scope.level !== "initiative") return
  const key = `semantic_${slug(input.label)}`
  const text = input.label || input.stats.sample
  const object = input.scope.level === "task_scope" ? "task_scope_policy" : "initiative_policy"
  return {
    project_id: input.bind.project_id,
    initiative_id: input.scope.level === "initiative" ? input.scope.target : input.bind.initiative_id,
    scope: input.scope,
    kind: "workflow_principle",
    merge_key: `${input.scope.level}:${input.scope.target}:semantic:${slug(input.label)}`,
    summary: `建议（语义归并候选）在当前${input.scope.level === "task_scope" ? "任务" : "长期事项"}默认采用：${quote(text, 90)}`,
    impact: "high",
    confidence: Math.min(
      0.95,
      0.66 + input.stats.explicit * 0.05 + input.stats.strong * 0.03 + input.stats.high * 0.01 + input.conf * 0.12,
    ),
    evidence_refs: input.ids.slice(-8),
    promotion: {
      source_scope: {
        level: "session",
        target: input.bind.session_id,
      },
      target_scope: input.scope,
      kind: "scope_promotion",
      reason: gate.fast ? "语义归并命中且包含显式未来规则表达。" : "语义归并显示同类高置信信号跨会话重复。",
    },
    target_patch: policyPatch({
      object,
      id: input.scope.target,
      key,
      signal_id: input.ids[input.ids.length - 1],
      text,
    }),
    future_effect: "确认后系统会在同作用域后续请求中优先应用该规则。",
  }
}

const taskToInitiative = (input: {
  buck: Buck
  bind: Awaited<ReturnType<typeof getBinding>>
  fresh: Set<string>
}): ProposalCandidate | undefined => {
  if (input.buck.scope.level !== "task_scope") return
  if (!input.buck.ids.some((id) => input.fresh.has(id))) return
  if (input.buck.explicit < 1 || input.buck.sessions.size < 2) return
  const key = input.buck.key
  const text = input.buck.sample || title(key)
  if (!input.bind.initiative_id) return
  return {
    project_id: input.bind.project_id,
    initiative_id: input.bind.initiative_id,
    scope: {
      level: "initiative",
      target: input.bind.initiative_id,
    },
    kind: "workflow_principle",
    merge_key: `initiative:${input.bind.initiative_id}:promotion:${key}`,
    summary: `建议把任务习惯提升为长期事项默认规则：${quote(text, 90)}`,
    impact: "high",
    confidence: Math.min(0.97, 0.8 + input.buck.sessions.size * 0.03),
    evidence_refs: input.buck.ids.slice(-8),
    promotion: {
      source_scope: input.buck.scope,
      target_scope: {
        level: "initiative",
        target: input.bind.initiative_id,
      },
      kind: "scope_promotion",
      reason: "至少跨 2 个会话重复出现，且有显式确认。",
    },
    target_patch: policyPatch({
      object: "initiative_policy",
      id: input.bind.initiative_id,
      key,
      signal_id: input.buck.ids[input.buck.ids.length - 1],
      text,
    }),
    future_effect: "确认后该习惯会在当前长期事项内跨任务复用。",
  }
}

const initiativeUp = (input: {
  buck: Buck
  bind: Awaited<ReturnType<typeof getBinding>>
  fresh: Set<string>
}): ProposalCandidate | undefined => {
  if (input.buck.scope.level !== "initiative") return
  if (!input.buck.ids.some((id) => input.fresh.has(id))) return
  if (input.buck.explicit < 1 || input.buck.sessions.size < 3) return

  const key = prefKey(input.buck.key)
  if (!key) return
  const val = prefVal(input.buck.key)
  const sid = subjectOf(input.buck.key, input.bind)
  if (sid) {
    return {
      scope: {
        level: "subject",
        target: sid,
      },
      kind: "subject_preference",
      merge_key: `subject:${sid}:promotion:${key}`,
      summary: `建议提升为主题层偏好：${title(input.buck.key)}`,
      impact: "high",
      confidence: Math.min(0.96, 0.8 + input.buck.sessions.size * 0.03),
      evidence_refs: input.buck.ids.slice(-8),
      promotion: {
        source_scope: input.buck.scope,
        target_scope: {
          level: "subject",
          target: sid,
        },
        kind: "scope_promotion",
        reason: "长期事项层信号跨会话稳定重复，且存在显式确认。",
      },
      target_patch: {
        object: "subject_profile",
        id: sid,
        fields: ["response_preferences"],
        payload: {
          response_preferences: {
            [key]: val,
          },
          derived_from: input.buck.ids.slice(-8),
        },
      },
      future_effect: "确认后该主题下会优先使用此解释/工作偏好。",
    }
  }

  return {
    scope: {
      level: "global",
      target: "user",
    },
    kind: "global_preference",
    merge_key: `global:user:promotion:${key}`,
    summary: `建议提升为全局偏好：${title(input.buck.key)}`,
    impact: "high",
    confidence: Math.min(0.95, 0.78 + input.buck.sessions.size * 0.03),
    evidence_refs: input.buck.ids.slice(-8),
    promotion: {
      source_scope: input.buck.scope,
      target_scope: {
        level: "global",
        target: "user",
      },
      kind: "scope_promotion",
      reason: "长期事项层偏好达到跨会话稳定阈值，建议用户审阅是否全局化。",
    },
    target_patch: {
      object: "global_policy",
      id: "user",
      fields: ["response_policy"],
      payload: {
        response_policy: [
          {
            id: `pol_global_${key.replace(/[^a-z0-9]+/giu, "_").slice(-40)}_${input.buck.ids[input.buck.ids.length - 1]?.slice(-6) ?? "latest"}`,
            text: title(input.buck.key),
            impact: "high",
            source: "proposal_confirmed",
          },
        ],
      },
    },
    future_effect: "确认后系统在更多场景会优先采用该偏好。",
  }
}

const recalibrate = async (input: {
  signal: SignalRecord
  bind: Awaited<ReturnType<typeof getBinding>>
  cache: Map<string, Awaited<ReturnType<typeof getSubjectProfile>>>
}) => {
  if (input.signal.stability !== "mutable") return [] as ProposalCandidate[]
  const out: ProposalCandidate[] = []
  for (const tag of input.signal.traits) {
    const key = prefKey(tag)
    if (!key) continue
    const sid = subjectOf(tag, input.bind)
    if (!sid) continue
    const val = prefVal(tag)
    const old = input.cache.get(sid) ?? (await getSubjectProfile(sid))
    input.cache.set(sid, old)
    const cur = old.response_preferences[key]
    if (typeof cur !== "number") continue
    if (Math.abs(cur - val) < 0.35) continue
    if ((cur > 0.55 && val > 0.55) || (cur < 0.45 && val < 0.45)) continue
    out.push({
      scope: {
        level: "subject",
        target: sid,
      },
      kind: "subject_capability_recalibration",
      merge_key: `subject:${sid}:recalibrate:${key}`,
      summary: `检测到能力画像变化，建议更新“${sid}”熟悉度记录。`,
      impact: "high",
      confidence: Math.max(0.8, input.signal.confidence),
      evidence_refs: [input.signal.id],
      promotion: {
        source_scope: input.signal.scope,
        target_scope: {
          level: "subject",
          target: sid,
        },
        kind: "scope_promotion",
        reason: "新证据与历史画像方向相反，建议用户确认后收窄或更新。",
      },
      target_patch: {
        object: "subject_profile",
        id: sid,
        fields: ["response_preferences"],
        payload: {
          response_preferences: {
            [key]: val,
          },
          derived_from: [input.signal.id],
        },
      },
      future_effect: "确认后系统会避免继续使用过时的能力假设。",
    })
  }
  return out
}

export const appendSignal = async (item: SignalRecord) => {
  const target = file(item.created_at)
  await appendText(target, `${JSON.stringify(item)}\n`)

  const idx = await loadIndex()
  idx.ids[item.id] = target
  idx.sessions[item.session_id] = Array.from(new Set([...(idx.sessions[item.session_id] ?? []), item.id]))
  await saveIndex(idx)

  await patchBinding(item.session_id, {
    signal_ids: [item.id],
  })

  return item
}

const stabilityFrom = (cand: ExtractedHabitCandidate) => {
  if (cand.temporary) return "transient" as const
  if (cand.traits.some((item) => item.startsWith("cap_subject:") || item.includes("familiarity"))) return "mutable" as const
  return "stable" as const
}

export const extractSignals = async (
  input: ExtractInput,
  deps?: {
    extract?: typeof extractCandidateBatch
  },
): Promise<ExtractOutput> => {
  const map = await ensureMap({ session_id: input.session_id })
  await syncBinding(input.session_id, {
    project_id: map.project_id,
  })
  const bind = await getBinding(input.session_id)
  const seen = new Set((await loadIndex()).processed?.[input.session_id] ?? [])
  const refs = (await gather(input.session_id, input.message_ids ?? [])).filter((item) => !seen.has(item.id))
  if (refs.length === 0) {
    return {
      signals: [],
      candidates: [],
      proposal_candidates: [],
      scratch: {
        created: [],
        pending: [],
        merged: [],
        superseded: [],
        reviews: [],
        hits: [],
      },
      skipped: ["no_new_evidence"],
    }
  }

  const llm = await (deps?.extract ?? extractCandidateBatch)({
    session_id: input.session_id,
    messages: refs.map((row) => ({
      id: row.id,
      text: row.text,
    })),
  })
  const base = scope(bind)
  const stamp = nowISO()
  const out: SignalRecord[] = []
  const candidates: ExtractedHabitCandidate[] = []
  const picks: ProposalCandidate[] = []
  const cache = new Map<string, Awaited<ReturnType<typeof getSubjectProfile>>>()
  const scratch = {
    created: [] as string[],
    pending: [] as string[],
    merged: [] as string[],
    superseded: [] as string[],
    reviews: [] as string[],
    hits: [] as string[],
  }

  if (!llm.llm_ok) {
    return {
      signals: [],
      candidates: [],
      proposal_candidates: [],
      scratch,
      skipped: ["llm_unavailable"],
    }
  }

  const store = await beginScratchSession(input.session_id, bind.project_id)

  for (const row of refs) {
    const rows = llm.results.get(row.id) ?? []
    const skip = new Set<string>()

    for (const cand of rows) {
      candidates.push(cand)
      try {
        const add = await applyCandidate({
          store,
          project_id: bind.project_id,
          session_id: input.session_id,
          candidate: cand,
          skip_ids: skip,
        })
        scratch.created.push(...add.created.map((hit) => hit.id))
        scratch.pending.push(...add.pending.map((hit) => hit.id))
        scratch.merged.push(...add.merged.map((hit) => hit.id))
        scratch.superseded.push(...add.superseded.map((hit) => hit.id))
        scratch.reviews.push(...add.reviews.map((hit) => hit.id))
        scratch.hits.push(...add.hits.map((hit) => hit.id))
        add.created.concat(add.pending).forEach((hit) => skip.add(hit.id))
      } catch (error) {
        if (error instanceof ScratchComparatorError) {
          return {
            signals: [],
            candidates: [],
            proposal_candidates: [],
            scratch: {
              created: [],
              pending: [],
              merged: [],
              superseded: [],
              reviews: [],
              hits: [],
            },
            skipped: ["llm_unavailable"],
          }
        }
        throw error
      }

      if (!base) continue

      const item = SignalRecord.parse({
        id: Identifier.ascending("signal"),
        session_id: input.session_id,
        created_at: stamp,
        scope: base,
        kind: cand.kind,
        polarity: "positive",
        confidence: cand.confidence,
        impact: cand.impact,
        explicit: cand.explicit,
        temporary: cand.temporary,
        stability: stabilityFrom(cand),
        traits: cand.traits,
        evidence: cand.evidence
          .filter((ev) => ev.source === "user_message" && ev.message_id)
          .map((ev) => ({
            source: "user_message" as const,
            ref: ev.message_id!,
            quote: quote(ev.quote),
          })),
        note: cand.summary,
      })

      if (item.evidence.length === 0) continue
      out.push(item)
      const fix = await recalibrate({
        signal: item,
        bind,
        cache,
      })
      picks.push(...fix)
    }
  }

  await commitScratchSession(input.session_id, store)
  await Promise.all(out.map((item) => appendSignal(item)))
  await markProcessed(input.session_id, refs.map((item) => item.id))

  if (!base) {
    return {
      signals: [],
      candidates,
      proposal_candidates: [],
      scratch,
      skipped: ["no_scope_binding"],
    }
  }

  const fresh = new Set(out.map((item) => item.id))
  const all = await listSignals()
  const rows = build(all, base)
  const byid = new Map(all.map((item) => [item.id, item]))
  rows.forEach((buck) => {
    const local = localCandidate({ buck, bind, fresh })
    if (local) picks.push(local)
    const up = taskToInitiative({ buck, bind, fresh })
    if (up) picks.push(up)
    const top = initiativeUp({ buck, bind, fresh })
    if (top) picks.push(top)
  })

  const sem = await semanticMerge({
    scope: base,
    signals: all.filter((item) => item.scope.level === base.level && item.scope.target === base.target).filter((item) => !item.temporary).slice(0, 30),
    fresh,
    mode: input.mode,
  })

  sem.forEach((item) => {
    const list = item.signal_ids.map((id) => byid.get(id)).filter((row): row is SignalRecord => Boolean(row))
    if (list.length < 2) return
    const ids = list.map((row) => row.id)
    const dup = picks.some(
      (row) =>
        row.scope.level === base.level &&
        row.scope.target === base.target &&
        row.evidence_refs.filter((id) => ids.includes(id)).length >= Math.min(2, ids.length),
    )
    if (dup) return
    const hit = semanticCandidate({
      label: item.label,
      ids,
      conf: item.confidence,
      scope: base,
      bind,
      stats: {
        explicit: list.filter((row) => row.explicit).length,
        strong: list.filter((row) => row.confidence >= 0.82).length,
        high: list.filter((row) => row.impact === "high").length,
        sessions: new Set(list.map((row) => row.session_id)),
        sample: list[0]?.note || list[0]?.evidence[0]?.quote || item.label,
      },
    })
    if (hit) picks.push(hit)
  })

  const keep = new Map<string, ProposalCandidate>()
  picks.forEach((item) => {
    const old = keep.get(item.merge_key)
    if (!old) {
      keep.set(item.merge_key, item)
      return
    }
    keep.set(item.merge_key, {
      ...old,
      confidence: Math.max(old.confidence, item.confidence),
      evidence_refs: uniq([...old.evidence_refs, ...item.evidence_refs]),
    })
  })

  return {
    signals: out,
    candidates,
    proposal_candidates: Array.from(keep.values()),
    scratch: {
      created: uniq(scratch.created),
      pending: uniq(scratch.pending),
      merged: uniq(scratch.merged),
      superseded: uniq(scratch.superseded),
      reviews: uniq(scratch.reviews),
      hits: uniq(scratch.hits),
    },
    skipped: [],
  }
}

const readFile = async (target: string) => {
  const raw = await Bun.file(target).text().catch(() => "")
  if (!raw.trim()) return []
  return raw
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const row = JSON.parse(item) as unknown
      return SignalRecord.safeParse(row)
    })
    .filter((item) => item.success)
    .map((item) => item.data)
}

export const listSignals = async (session_id?: string) => {
  const idx = await loadIndex()
  if (!session_id) {
    const files = Array.from(new Set(Object.values(idx.ids)))
    const rows = await Promise.all(files.map((item) => readFile(item)))
    return rows.flat().sort((a, b) => b.created_at.localeCompare(a.created_at))
  }

  const ids = idx.sessions[session_id] ?? []
  const groups = new Map<string, string[]>()
  ids.forEach((id) => {
    const file = idx.ids[id]
    if (!file) return
    const list = groups.get(file)
    if (list) list.push(id)
    else groups.set(file, [id])
  })

  const rows = await Promise.all(
    Array.from(groups.entries()).map(async ([target, keep]) => {
      const set = new Set(keep)
      const list = await readFile(target)
      return list.filter((item) => set.has(item.id))
    }),
  )

  return rows.flat().sort((a, b) => b.created_at.localeCompare(a.created_at))
}
