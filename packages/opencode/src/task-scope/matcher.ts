import path from "path"
import { ScopeMatchInput, ScopeMatchResult, TaskScopeRecord } from "./types"
import { ensureMap } from "@/adaptation/project"
import { getBinding, syncBinding } from "@/adaptation/session"
import { listScopes } from "./storage"
import { listArtifacts } from "@/artifact/storage"
import { getGlobalProfile, getProjectProfile } from "@/adaptation/profile"
import { rerankScopes } from "./rerank"

const words = (text: string) =>
  text
    .toLowerCase()
    .split(/[^\p{L}\p{N}_-]+/u)
    .map((item) => item.trim())
    .filter(Boolean)

const hit = (text: string, keys: string[]) => {
  if (!text) return 0
  if (keys.length === 0) return 0
  const bag = new Set(words(text))
  let sum = 0
  keys.forEach((item) => {
    if (bag.has(item.toLowerCase())) sum += 1
  })
  return sum
}

/** Bag-of-words fallback scoring. */
const bestScopeBow = (scopes: TaskScopeRecord[], request: string, paths: string[], bound?: string) => {
  const req = words(request)
  const rows = scopes.map((scope) => {
    const keys = words(`${scope.title} ${scope.goal} ${scope.kind} ${scope.status_summary}`)
    const base = hit(keys.join(" "), req)
    const pathScore = paths.reduce((sum, item) => {
      const name = path.basename(item).toLowerCase()
      if (scope.title.toLowerCase().includes(name)) return sum + 1
      return sum
    }, 0)
    const bind = bound && scope.id === bound ? 3 : 0
    return {
      scope,
      score: base + pathScore + bind,
    }
  })

  rows.sort((a, b) => b.score - a.score || b.scope.updated_at.localeCompare(a.scope.updated_at))
  return rows
}

export const matchScope = async (input: ScopeMatchInput) => {
  const map = await ensureMap({ session_id: input.session_id })
  const bind = await getBinding(input.session_id)
  const project_id = map.project_id

  const [scopes, arts, profile, global] = await Promise.all([
    listScopes(project_id),
    listArtifacts(project_id),
    getProjectProfile(project_id),
    getGlobalProfile(),
  ])

  // Try LLM reranking first, fallback to bag-of-words
  const llmResult = await rerankScopes({
    request: input.request,
    open_paths: input.open_paths,
    scopes,
  })

  let task_scope_id: string | undefined
  let topScore = 0
  let nextScore = 0
  let usedLlm = false

  if (llmResult && llmResult.length > 0) {
    // LLM succeeded — use its ranking
    usedLlm = true
    task_scope_id = input.user_scope_id ?? llmResult[0].id
    topScore = llmResult[0].confidence * 12 // normalize to comparable scale
    nextScore = llmResult.length > 1 ? llmResult[1].confidence * 12 : 0
  } else {
    // Fallback to bag-of-words
    const picks = bestScopeBow(scopes, input.request, input.open_paths, input.user_scope_id ?? bind.task_scope_id)
    const top = picks[0]
    const next = picks[1]
    task_scope_id = input.user_scope_id ?? top?.scope.id
    topScore = top?.score ?? 0
    nextScore = next?.score ?? 0
  }

  const artHits = arts
    .map((item) => {
      const score = input.open_paths.reduce((sum, p) => {
        if (p === item.path) return sum + 5
        if (p.endsWith(item.path)) return sum + 3
        return sum
      }, 0)
      if (score === 0 && input.request.includes(item.role)) return { item, score: 1 }
      return { item, score }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)

  const subject_ids = Array.from(new Set([...profile.subject_ids, ...global.subject_ids]))
    .filter((item) => input.request.toLowerCase().includes(item.toLowerCase()))
    .slice(0, 3)

  const needs =
    Boolean(input.user_scope_id) ? false : !task_scope_id || (topScore - nextScore < 2 && topScore < 2)

  const confidence_task_scope = usedLlm
    ? (llmResult && llmResult.length > 0 ? Math.min(0.95, llmResult[0].confidence) : 0.1)
    : (task_scope_id ? Math.min(0.95, 0.45 + topScore * 0.08) : 0.1)

  const reasons: string[] = []
  reasons.push("当前 project 与工作区 guidance 提供了基础候选范围。")
  if (task_scope_id) reasons.push(usedLlm ? "LLM 判断请求内容与 task_scope 匹配。" : "请求内容与 task_scope 标题/目标词袋匹配。")
  if (artHits.length > 0) reasons.push("打开路径命中 artifact_contract。")
  if (subject_ids.length > 0) reasons.push("请求文本命中工作区 guidance subject 标签。")
  if (needs) reasons.push("候选冲突或证据不足，需要用户确认。")

  const out = ScopeMatchResult.parse({
    session_id: input.session_id,
    project_id,
    task_scope: {
      primary: task_scope_id,
      secondary: [],
    },
    subject_ids,
    artifact_ids: artHits.slice(0, 3).map((item) => item.item.id),
    confidence: {
      project: 0.95,
      task_scope: confidence_task_scope,
      subject: subject_ids.length > 0 ? 0.8 : 0.3,
      artifact: artHits.length > 0 ? 0.88 : 0.2,
    },
    reasons,
    needs_user_confirmation: needs,
    clarification_question: needs ? "当前请求更接近哪个任务范围？" : undefined,
  })

  await syncBinding(input.session_id, {
    project_id,
    task_scope_id: needs ? bind.task_scope_id : out.task_scope.primary,
    subject_ids: !needs && out.subject_ids.length > 0 ? out.subject_ids : bind.subject_ids,
    artifact_ids: out.artifact_ids,
    match_snapshot: out,
  })

  return out
}
