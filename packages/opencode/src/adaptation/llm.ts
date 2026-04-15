import { generateText } from "ai"
import z from "zod"
import { Provider } from "@/provider/provider"
import { AdaptationModel } from "./model"
import { AdaptationTaxonomy } from "./taxonomy"

const CHUNK_SIZE = 25

const ClassifiedSignal = z.object({
  ref: z.string().min(1),
  impact: z.enum(["high", "medium", "low"]),
  kind: z.enum(["artifact_rule", "tool_preference", "workflow_preference", "response_preference"]),
  explicit: z.boolean(),
  temporary: z.boolean(),
  traits: z.array(z.string()).default([]),
  note: z.string().default(""),
})

export type ClassifiedSignal = z.infer<typeof ClassifiedSignal>

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

const quote = (text: string, max = 200) => (text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1))}…`)

const buildPrompt = (messages: Array<{ id: string; text: string }>, existingTraits: string[]) => {
  const traitLine =
    existingTraits.length > 0
      ? `已有特征标签（优先复用，完全不匹配时可新建）：\n${existingTraits.join(", ")}\n`
      : ""

  return [
    "你是用户习惯信号分类器。判断每条用户消息是否包含偏好或习惯信号。",
    "",
    "判断字段：",
    '- impact: "high"=用户主动设定长期规则（如"以后都这样做"） / "medium"=表达了倾向但非强制 / "low"=弱偏好或普通陈述中隐含的习惯',
    '- kind: "artifact_rule"=文件写入或路径规则 / "tool_preference"=工具或命令偏好 / "workflow_preference"=流程或规划偏好 / "response_preference"=回复风格或语言偏好',
    "- explicit: 用户是否在主动设定规则或偏好（true/false）",
    "- temporary: 是否仅本次有效（true/false）",
    "- traits: 偏好标签数组，用简短的 kebab-case 英文标签。优先从已有标签中选择。无明显特征则为空数组。",
    "- note: 一句话概括偏好（不超过60字），无偏好则为空字符串",
    "",
    traitLine,
    "消息：",
    ...messages.map((item, i) => `${i + 1}. [${item.id}] ${quote(item.text)}`),
    "",
    "只输出包含偏好或习惯信号的消息，无偏好的跳过。只输出 JSON 数组。",
  ]
    .filter((line) => line !== undefined)
    .join("\n")
}

const parseResult = (text: string, validRefs: Set<string>): ClassifiedSignal[] => {
  const raw = json(text)
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => ClassifiedSignal.safeParse(item))
    .filter((item) => item.success)
    .map((item) => item.data)
    .filter((item) => validRefs.has(item.ref))
}

export type ClassifyInput = {
  messages: Array<{ id: string; text: string }>
}

export type ClassifyOutput = {
  results: Map<string, ClassifiedSignal>
  llm_ok: boolean
}

/**
 * Classify user messages in chunks using LLM.
 * Returns a map from message id to classification result.
 * Messages without preference signals are not included.
 */
export const classifyBatch = async (input: ClassifyInput): Promise<ClassifyOutput> => {
  const model = await AdaptationModel.pick("signal_extract")
  if (!model) return { results: new Map(), llm_ok: false }
  const lang = await Provider.getLanguage(model).catch(() => undefined)
  if (!lang) return { results: new Map(), llm_ok: false }

  const results = new Map<string, ClassifiedSignal>()
  const chunks: Array<Array<{ id: string; text: string }>> = []

  for (let i = 0; i < input.messages.length; i += CHUNK_SIZE) {
    chunks.push(input.messages.slice(i, i + CHUNK_SIZE))
  }

  for (const chunk of chunks) {
    const existingTraits = await AdaptationTaxonomy.labels()
    const prompt = buildPrompt(chunk, existingTraits)
    const validRefs = new Set(chunk.map((item) => item.id))

    const done = await generateText({
      model: lang,
      messages: [{ role: "user", content: prompt }],
      maxOutputTokens: 400,
      temperature: 0.1,
    }).catch(() => undefined)

    if (!done?.text) continue

    const parsed = parseResult(done.text, validRefs)
    for (const item of parsed) {
      if (item.traits.length > 0) {
        item.traits = await AdaptationTaxonomy.normalize(item.traits)
      }
      results.set(item.ref, item)
    }
  }

  return { results, llm_ok: results.size > 0 || input.messages.length === 0 }
}
