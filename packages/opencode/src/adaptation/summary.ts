import fs from "fs/promises"
import { Identifier } from "@/id/id"
import { SummaryRecord, ScopeRef } from "./types"
import { listSignals } from "./signal"
import type { ProposalCandidate } from "./signal"
import { artifactFile, ensureDir, indexesRoot, nowISO, readJSON, safeJoin, summariesRoot, taskScopeFile, writeJSON } from "./storage"
import { listScopes } from "@/task-scope/storage"
import { listArtifacts } from "@/artifact/storage"

type SignalState = {
  version: "v1"
  updated_at: string
  absorbed: Record<string, string>
}

type RunInput = {
  scope: ScopeRef
  project_id?: string
  initiative_id?: string
  session_ids?: string[]
  signal_ids?: string[]
  mode?: "manual" | "after_user_message" | "after_summary"
}

const stateFile = () => safeJoin(indexesRoot(), "signal-state.json")

const loadState = async () =>
  readJSON<SignalState>(stateFile(), {
    version: "v1",
    updated_at: nowISO(),
    absorbed: {},
  })

const saveState = async (value: SignalState) => {
  await writeJSON(stateFile(), {
    ...value,
    updated_at: nowISO(),
  })
}

const root = async (scope: ScopeRef, project_id?: string) => {
  if (scope.level === "task_scope") {
    const dir = taskScopeFile(scope.target, "summaries")
    await ensureDir(dir)
    return dir
  }
  if (scope.level === "artifact") {
    const dir = artifactFile(scope.target, "summaries")
    await ensureDir(dir)
    return dir
  }
  const dir = summariesRoot()
  await ensureDir(dir)
  return dir
}

const summaryFile = async (scope: ScopeRef, id: string, project_id?: string) => {
  const dir = await root(scope, project_id)
  return safeJoin(dir, `${id}.json`)
}

const quote = (text: string, max = 120) => (text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1))}…`)
const uniq = <T,>(rows: T[]) => Array.from(new Set(rows))

const pick = (input: {
  scope: ScopeRef
  session_ids?: string[]
  signal_ids?: string[]
  signals: Awaited<ReturnType<typeof listSignals>>
  state: SignalState
}) => {
  const keep = input.signal_ids ? new Set(input.signal_ids) : undefined
  const sessions = input.session_ids ? new Set(input.session_ids) : undefined
  return input.signals
    .filter((item) => item.scope.level === input.scope.level && item.scope.target === input.scope.target)
    .filter((item) => (keep ? keep.has(item.id) : true))
    .filter((item) => (sessions ? sessions.has(item.session_id) : true))
    .filter((item) => !input.state.absorbed[item.id])
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

const line = (input: { key: string; text: string; id: string }) => ({
  id: `pol_${input.key.replace(/[^a-z0-9]+/giu, "_").slice(-40)}_${input.id.slice(-6)}`,
  text: quote(input.text, 120),
  impact: "high" as const,
  source: "proposal_confirmed",
})

const fold = (list: Awaited<ReturnType<typeof listSignals>>) => {
  const map = new Map<
    string,
    {
      kind: string
      conf: number
      evidence_count: number
      sessions: Set<string>
      explicit_count: number
      stability: "stable" | "mutable" | "transient"
      ids: string[]
      sample: string
    }
  >()

  list.forEach((item) => {
    const keys = item.traits.length > 0 ? item.traits : [item.kind]
    keys.forEach((key) => {
      const old = map.get(key)
      if (!old) {
        map.set(key, {
          kind: key,
          conf: item.confidence,
          evidence_count: 1,
          sessions: new Set([item.session_id]),
          explicit_count: item.explicit ? 1 : 0,
          stability: item.stability,
          ids: [item.id],
          sample: item.note || item.evidence[0]?.quote || title(key),
        })
        return
      }
      old.conf += item.confidence
      old.evidence_count += 1
      old.sessions.add(item.session_id)
      old.explicit_count += item.explicit ? 1 : 0
      old.ids.push(item.id)
      if (!old.sample && item.note) old.sample = item.note
      if (old.stability !== "mutable" && item.stability === "mutable") old.stability = "mutable"
    })
  })

  return Array.from(map.values())
    .map((item) => ({
      kind: item.kind,
      strength: Math.min(0.97, item.conf / Math.max(1, item.evidence_count) + item.explicit_count * 0.03),
      evidence_count: item.evidence_count,
      session_count: item.sessions.size,
      explicit_count: item.explicit_count,
      stability: item.stability,
      ids: item.ids,
      sample: item.sample,
    }))
    .sort((a, b) => b.strength - a.strength || b.evidence_count - a.evidence_count)
}

const proposal = (summary: SummaryRecord, project_id?: string, initiative_id?: string): ProposalCandidate[] => {
  const high = summary.patterns.filter(
    (item) => item.strength >= 0.72 && (item.explicit_count >= 1 || item.evidence_count >= 2) && item.stability !== "transient",
  )
  if (high.length === 0 || !project_id) return []
  if (summary.scope.level !== "task_scope" && summary.scope.level !== "initiative") return []
  const out: ProposalCandidate[] = []

  high.forEach((item) => {
    const refs = uniq(item.signal_ids).slice(-8)
    const text = quote(item.sample || title(item.kind), 100)
    out.push({
      project_id,
      initiative_id: summary.scope.level === "initiative" ? summary.scope.target : initiative_id,
      scope: summary.scope,
      kind: "workflow_principle",
      merge_key: `${summary.scope.level}:${summary.scope.target}:${item.kind}`,
      summary: `建议在当前${summary.scope.level === "task_scope" ? "任务" : "长期事项"}默认采用：${text}`,
      impact: "high",
      confidence: item.strength,
      evidence_refs: refs,
      promotion: {
        source_scope: summary.scope,
        target_scope: summary.scope,
        kind: "scope_promotion",
        reason: item.explicit_count > 0 ? "窗口内包含显式确认。" : "窗口内同类高置信信号达到阈值。",
      },
      target_patch: {
        object: summary.scope.level === "initiative" ? "initiative_policy" : "task_scope_policy",
        id: summary.scope.target,
        fields: ["operation_policy"],
        payload: {
          operation_policy: [line({ key: item.kind, text, id: summary.id })],
        },
      },
      future_effect: "确认后会在同作用域后续请求中默认执行该工作规则。",
    })

    if (summary.scope.level === "task_scope" && item.session_count >= 2 && item.explicit_count >= 1) {
      if (!initiative_id) return
      out.push({
        project_id,
        initiative_id,
        scope: {
          level: "initiative",
          target: initiative_id,
        },
        kind: "workflow_principle",
        merge_key: `initiative:${initiative_id}:promotion:${item.kind}`,
        summary: `建议把任务习惯提升为长期事项默认规则：${text}`,
        impact: "high",
        confidence: Math.min(0.97, item.strength + 0.04),
        evidence_refs: refs,
        promotion: {
          source_scope: summary.scope,
          target_scope: {
            level: "initiative",
            target: initiative_id,
          },
          kind: "scope_promotion",
          reason: "跨会话重复且存在显式确认。",
        },
        target_patch: {
          object: "initiative_policy",
          id: initiative_id,
          fields: ["operation_policy"],
          payload: {
            operation_policy: [line({ key: item.kind, text, id: summary.id })],
          },
        },
        future_effect: "确认后该习惯将在当前长期事项跨任务复用。",
      })
    }
  })

  return out
}

export const runSummary = async (input: RunInput) => {
  const [signals, state] = await Promise.all([listSignals(), loadState()])
  const pickList = pick({
    scope: input.scope,
    session_ids: input.session_ids,
    signal_ids: input.signal_ids,
    signals,
    state,
  })
  if (pickList.length === 0) {
    return {
      summary: undefined,
      proposal_candidates: [] as ProposalCandidate[],
      skipped: ["no_unabsorbed_signal"],
    }
  }

  if (input.mode !== "manual") {
    const enough = pickList.length >= 3
    const strong = pickList.filter((item) => item.impact === "high" && item.explicit).length >= 1
    if (!enough && !strong) {
      return {
        summary: undefined,
        proposal_candidates: [] as ProposalCandidate[],
        skipped: ["summary_threshold_not_met"],
      }
    }
  }

  const stamp = nowISO()
  const agg = fold(pickList)
  const item = SummaryRecord.parse({
    id: Identifier.ascending("summary"),
    created_at: stamp,
    updated_at: stamp,
    window: {
      start: pickList.map((x) => x.created_at).sort()[0],
      end: pickList.map((x) => x.created_at).sort().slice(-1)[0],
    },
    scope: input.scope,
    session_ids: Array.from(new Set(pickList.map((x) => x.session_id))),
    signal_ids: pickList.map((x) => x.id),
    highlights: pickList.slice(0, 4).map((x) => quote(x.note || x.evidence[0]?.quote || x.kind)),
    patterns: agg.slice(0, 6).map((x) => ({
      kind: x.kind,
      strength: x.strength,
      evidence_count: x.evidence_count,
      session_count: x.session_count,
      explicit_count: x.explicit_count,
      stability: x.stability,
      signal_ids: x.ids,
      sample: x.sample,
    })),
    recommendations: agg.some((x) => x.explicit_count >= 1 || x.evidence_count >= 2) ? ["生成高影响 proposal 候选。"] : [],
  })

  const file = await summaryFile(input.scope, item.id, input.project_id)
  await writeJSON(file, item)

  pickList.forEach((x) => {
    state.absorbed[x.id] = item.id
  })
  await saveState(state)

  return {
    summary: item,
    proposal_candidates: proposal(item, input.project_id, input.initiative_id),
    skipped: [] as string[],
  }
}

const listDir = async (dir: string) => {
  const rows = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
  const files = rows.filter((x) => x.isFile() && x.name.endsWith(".json")).map((x) => safeJoin(dir, x.name))
  const list = await Promise.all(files.map((item) => readJSON<SummaryRecord | undefined>(item, undefined)))
  return list.filter((item): item is SummaryRecord => Boolean(item))
}

export const listSummaries = async (input: { scope_level?: string; scope_id?: string; project_id?: string }) => {
  if (input.scope_level && input.scope_id) {
    if (input.scope_level === "task_scope") {
      const dir = taskScopeFile(input.scope_id, "summaries")
      return listDir(dir)
    }
    if (input.scope_level === "artifact") {
      const dir = artifactFile(input.scope_id, "summaries")
      return listDir(dir)
    }
    const list = await listDir(summariesRoot())
    return list.filter((item) => item.scope.level === input.scope_level && item.scope.target === input.scope_id)
  }

  const rows = [await listDir(summariesRoot())]
  if (!input.project_id) return rows.flat().sort((a, b) => b.updated_at.localeCompare(a.updated_at))

  const [task, art] = await Promise.all([listScopes(input.project_id), listArtifacts(input.project_id)])
  const scoped = await Promise.all(task.map((item) => listDir(taskScopeFile(item.id, "summaries"))))
  const linked = await Promise.all(art.map((item) => listDir(artifactFile(item.id, "summaries"))))

  return [...rows.flat(), ...scoped.flat(), ...linked.flat()].sort((a, b) => b.updated_at.localeCompare(a.updated_at))
}
