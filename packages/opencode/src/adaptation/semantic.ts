import { generateText } from "ai"
import z from "zod"
import { Provider } from "@/provider/provider"
import { AdaptationModel } from "./model"
import type { ScopeRef, SignalRecord } from "./types"

const row = z.object({
  label: z.string().min(1),
  signal_ids: z.array(z.string().min(1)).min(2),
  confidence: z.number().min(0).max(1).default(0.65),
  reason: z.string().default(""),
})

const out = z.object({
  clusters: z.array(row).default([]),
})

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
  const block = raw.match(/```json\s*([\s\S]*?)```/iu) ?? raw.match(/(\{[\s\S]*\})/u)
  if (!block?.[1]) return
  return (() => {
    try {
      return JSON.parse(block[1].trim())
    } catch {
      return undefined
    }
  })()
}

const quote = (text: string, max = 140) => (text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1))}…`)

const list = (signals: SignalRecord[]) =>
  signals.map((item, i) => {
    const line = item.note || item.evidence[0]?.quote || item.kind
    return [
      `${i + 1}. id=${item.id}`,
      `explicit=${item.explicit ? "yes" : "no"}`,
      `impact=${item.impact}`,
      `confidence=${item.confidence.toFixed(2)}`,
      `stability=${item.stability}`,
      `text=${quote(line)}`,
    ].join("; ")
  })

const prompt = (input: { scope: ScopeRef; signals: SignalRecord[] }) =>
  [
    "你是用户自适应系统 v1 的语义归并助手。",
    "任务：只做“相似 signal 候选归并”，不要做长期写入决策。",
    "",
    "硬约束：",
    "- 只在语义几乎同义时归并；宁可少归并，不要误并。",
    "- 不要把互相矛盾、临时表达、阶段性能力变化归并为同一簇。",
    "- 每个簇至少 2 条 signal，且必须来自输入 id。",
    "- 输出是候选，最终仍需走 proposal confirm。",
    "",
    `scope: ${input.scope.level}:${input.scope.target}`,
    "signals:",
    ...list(input.signals),
    "",
    "输出 JSON：",
    '{ "clusters": [ { "label": "string", "signal_ids": ["signal_x"], "confidence": 0.0, "reason": "string" } ] }',
    "只输出 JSON。",
  ].join("\n")

const norm = (input: z.infer<typeof out>, ids: Set<string>, fresh: Set<string>) => {
  const map = new Map<string, z.infer<typeof row>>()
  input.clusters.forEach((item) => {
    const uniq = Array.from(new Set(item.signal_ids)).filter((id) => ids.has(id))
    if (uniq.length < 2) return
    if (!uniq.some((id) => fresh.has(id))) return
    const key = uniq.slice().sort().join(",")
    const old = map.get(key)
    if (!old) {
      map.set(key, {
        ...item,
        signal_ids: uniq,
      })
      return
    }
    if (item.confidence <= old.confidence) return
    map.set(key, {
      ...item,
      signal_ids: uniq,
    })
  })
  return Array.from(map.values())
}

/** @internal Exported for testing */
export const parseSemantic = (text: string, input: { ids: Set<string>; fresh: Set<string> }) => {
  const raw = json(text)
  const parsed = out.safeParse(raw)
  if (!parsed.success) return []
  return norm(parsed.data, input.ids, input.fresh)
}

export const semanticMerge = async (input: {
  scope: ScopeRef
  signals: SignalRecord[]
  fresh: Set<string>
  mode: "manual_current_session" | "after_user_message" | "after_summary"
}) => {
  if (input.signals.length < 4) return [] as z.infer<typeof row>[]
  if (input.mode === "after_user_message" && input.fresh.size < 2) return [] as z.infer<typeof row>[]
  const cfg = await AdaptationModel.get()
  const ref = cfg.models.semantic_merge
  if (!ref) return [] as z.infer<typeof row>[]
  const model = await AdaptationModel.pick("semantic_merge", ref)
  if (!model) return [] as z.infer<typeof row>[]
  const lang = await Provider.getLanguage(model).catch(() => undefined)
  if (!lang) return [] as z.infer<typeof row>[]
  const done = await generateText({
    model: lang,
    messages: [
      {
        role: "user",
        content: prompt(input),
      },
    ],
    maxOutputTokens: 900,
    temperature: 0.1,
  }).catch(() => undefined)
  if (!done?.text) return [] as z.infer<typeof row>[]
  return parseSemantic(done.text, {
    ids: new Set(input.signals.map((item) => item.id)),
    fresh: input.fresh,
  })
}
