import { generateText } from "ai"
import { Provider } from "@/provider/provider"
import { AdaptationModel } from "./model"

type HabitInput = {
  id: string
  text: string
}

type HabitClassification = {
  id: string
  triggers: string[]
  impact: "high" | "medium" | "low"
}

const CHUNK_SIZE = 30

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

const buildPrompt = (habits: HabitInput[]) =>
  [
    "你是用户习惯索引构建器。对每条已确认的习惯规则，提取触发关键词和影响级别。",
    "",
    "字段说明：",
    "- triggers: 3~8 个关键词/短语，用于后续检索该规则。包含核心概念、同义词、中英双语关键词。",
    '- impact: "high"=强制性或默认性规则 / "medium"=偏好性规则 / "low"=弱建议',
    "",
    "习惯规则：",
    ...habits.map((item, i) => `${i + 1}. [${item.id}] ${quote(item.text)}`),
    "",
    "输出 JSON 数组：",
    '[{ "id": "habit_xxx", "triggers": ["keyword1", "keyword2"], "impact": "high" }]',
    "不要使用固定关键词列表作为判断依据；请根据整条规则的语义判断。",
    "只输出 JSON。",
  ].join("\n")

const parseResult = (text: string, validIds: Set<string>): HabitClassification[] => {
  const raw = json(text)
  if (!Array.isArray(raw)) return []
  return raw
    .filter((item): item is { id: string; triggers: string[]; impact: string } => {
      return typeof item?.id === "string" && validIds.has(item.id) && Array.isArray(item.triggers)
    })
    .map((item) => ({
      id: item.id,
      triggers: item.triggers
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 8),
      impact: (["high", "medium", "low"].includes(item.impact) ? item.impact : "medium") as "high" | "medium" | "low",
    }))
}

/**
 * Classify habit rules in batches using LLM.
 * Extracts semantic triggers and impact level for each habit.
 * If the LLM is unavailable, leaves the habit unclassified instead of using hard-coded keyword rules.
 */
export const classifyHabits = async (habits: HabitInput[]): Promise<Map<string, HabitClassification>> => {
  const results = new Map<string, HabitClassification>()
  if (habits.length === 0) return results

  const model = await AdaptationModel.pick("signal_extract")
  if (!model) return results

  const lang = await Provider.getLanguage(model).catch(() => undefined)
  if (!lang) return results

  const chunks: HabitInput[][] = []
  for (let i = 0; i < habits.length; i += CHUNK_SIZE) {
    chunks.push(habits.slice(i, i + CHUNK_SIZE))
  }

  for (const chunk of chunks) {
    const prompt = buildPrompt(chunk)
    const validIds = new Set(chunk.map((item) => item.id))

    const done = await generateText({
      model: lang,
      messages: [{ role: "user", content: prompt }],
      maxOutputTokens: 400,
      temperature: 0.1,
    }).catch(() => undefined)

    if (done?.text) {
      const parsed = parseResult(done.text, validIds)
      parsed.forEach((item) => results.set(item.id, item))
    }
  }

  return results
}
