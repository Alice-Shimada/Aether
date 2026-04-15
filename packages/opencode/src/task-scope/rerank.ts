import { generateText } from "ai"
import { Provider } from "@/provider/provider"
import { AdaptationModel } from "@/adaptation/model"
import type { TaskScopeRecord } from "./types"

type Candidate = {
  id: string
  title: string
  goal: string
  kind: string
  status_summary: string
}

type RerankResult = {
  id: string
  confidence: number
  reason: string
}

const json = (text: string) => {
  const raw = text.trim()
  const direct = (() => {
    try {
      return JSON.parse(raw)
    } catch {
      return undefined
    }
  })()
  if (direct) return direct
  const block = raw.match(/```json\s*([\s\S]*?)```/iu) ?? raw.match(/(\[[\s\S]*\])/u)
  if (!block?.[1]) return
  return (() => {
    try {
      return JSON.parse(block[1].trim())
    } catch {
      return undefined
    }
  })()
}

const quote = (text: string, max = 120) => (text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1))}…`)

const buildPrompt = (input: { request: string; open_paths: string[]; candidates: Candidate[] }) => {
  const pathLine = input.open_paths.length > 0 ? `当前打开文件：${input.open_paths.slice(0, 5).join(", ")}\n` : ""
  return [
    "你是任务范围匹配器。根据用户请求，从候选任务范围中选出最匹配的。",
    "",
    `用户请求：${quote(input.request, 300)}`,
    pathLine,
    "候选任务范围：",
    ...input.candidates.map(
      (item, i) =>
        `${i + 1}. id=${item.id}; title=${quote(item.title, 60)}; goal=${quote(item.goal, 80)}; kind=${item.kind}; status=${quote(item.status_summary, 60)}`,
    ),
    "",
    "输出 JSON 数组，按匹配度从高到低排序，每项格式：",
    '{ "id": "scope_id", "confidence": 0.0~1.0, "reason": "一句话说明匹配原因" }',
    "如果没有匹配的范围，输出空数组 []。只输出 JSON。",
  ]
    .filter((line) => line !== undefined)
    .join("\n")
}

const parseResult = (text: string, validIds: Set<string>): RerankResult[] => {
  const raw = json(text)
  if (!Array.isArray(raw)) return []
  return raw
    .filter((item): item is { id: string; confidence: number; reason: string } => {
      return typeof item?.id === "string" && validIds.has(item.id)
    })
    .map((item) => ({
      id: item.id,
      confidence: typeof item.confidence === "number" ? Math.max(0, Math.min(1, item.confidence)) : 0.5,
      reason: typeof item.reason === "string" ? item.reason : "",
    }))
}

/**
 * Use LLM to rerank task scope candidates against a user request.
 * Returns ranked results or undefined if LLM is unavailable.
 * Uses the `signal_extract` model slot (lightweight classification task).
 */
export const rerankScopes = async (input: {
  request: string
  open_paths: string[]
  scopes: TaskScopeRecord[]
}): Promise<RerankResult[] | undefined> => {
  if (input.scopes.length === 0) return []
  if (input.scopes.length === 1) {
    return [{ id: input.scopes[0].id, confidence: 0.7, reason: "唯一候选" }]
  }

  const model = await AdaptationModel.pick("scope_match")
  if (!model) return undefined
  const lang = await Provider.getLanguage(model).catch(() => undefined)
  if (!lang) return undefined

  const candidates: Candidate[] = input.scopes.map((scope) => ({
    id: scope.id,
    title: scope.title,
    goal: scope.goal,
    kind: scope.kind,
    status_summary: scope.status_summary,
  }))

  const prompt = buildPrompt({ request: input.request, open_paths: input.open_paths, candidates })
  const validIds = new Set(input.scopes.map((item) => item.id))

  const done = await generateText({
    model: lang,
    messages: [{ role: "user", content: prompt }],
    maxOutputTokens: 300,
    temperature: 0.1,
  }).catch(() => undefined)

  if (!done?.text) return undefined
  return parseResult(done.text, validIds)
}
