import { generateText, streamText } from "ai"
import { Provider } from "@/provider/provider"
import type { IpkModelKind, IpkModelRef } from "./model"
import { IpkModel } from "./model"

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
  const match = raw.match(/```json\s*([\s\S]*?)```/iu) ?? raw.match(/(\{[\s\S]*\})/u)
  if (!match?.[1]) return
  return (() => {
    try {
      return JSON.parse(match[1].trim())
    } catch {
      return undefined
    }
  })()
}

const run = async (input: {
  kind: IpkModelKind
  prompt: string
  model?: IpkModelRef
  max?: number
  temperature?: number
}) => {
  const item = await IpkModel.pick(input.kind, input.model)
  if (!item) return
  const lang = await Provider.getLanguage(item).catch(() => undefined)
  if (!lang) return
  return generateText({
    model: lang,
    messages: [{ role: "user", content: input.prompt }],
    maxOutputTokens: input.max ?? 900,
    temperature: input.temperature ?? 0.2,
  })
    .then((res) => ({
      text: res.text.trim(),
      model: {
        providerID: item.providerID,
        modelID: item.id,
      },
    }))
    .catch(() => undefined)
}

const runStream = async (input: {
  kind: IpkModelKind
  prompt: string
  model?: IpkModelRef
  max?: number
  temperature?: number
  onText?: (text: string) => Promise<void> | void
}) => {
  const item = await IpkModel.pick(input.kind, input.model)
  if (!item) return
  const lang = await Provider.getLanguage(item).catch(() => undefined)
  if (!lang) return
  const out = streamText({
    model: lang,
    messages: [{ role: "user", content: input.prompt }],
    maxOutputTokens: input.max ?? 900,
    temperature: input.temperature ?? 0.2,
  })
  let text = ""
  for await (const chunk of out.textStream) {
    text += chunk
    await input.onText?.(text)
  }
  return {
    text: text.trim(),
    model: {
      providerID: item.providerID,
      modelID: item.id,
    },
  }
}

export namespace IpkLLM {
  export type SummarizeProgress = {
    raw: string
    title?: string
    body_summary?: string
    body?: string
  }

  export async function summarize(input: { messages: Array<{ role: string; text: string }>; instruction?: string; model?: IpkModelRef }) {
    const prompt = [
      "你是 IPK v1 的总结器。",
      "把输入消息总结为 JSON，格式：",
      '{ "title": "string", "body_summary": "string", "body": "markdown string" }',
      "要求：",
      "- title 简洁，不超过 48 字",
      "- body_summary 1~2 句，避免把猜想写成结论",
      "- body 使用 markdown，保留推理路径",
      "",
      input.instruction ? `改进要求：${input.instruction}` : "",
      "消息：",
      ...input.messages.map((item, i) => `${i + 1}. [${item.role}] ${item.text}`),
      "",
      "只输出 JSON。",
    ]
      .filter(Boolean)
      .join("\n")
    const out = await run({
      kind: input.instruction ? "revise" : "summarize",
      prompt,
      model: input.model,
      max: 1400,
    })
    if (!out) return
    const parsed = json(out.text) as { title?: string; body_summary?: string; body?: string } | undefined
    if (!parsed?.title || !parsed?.body_summary || !parsed?.body) return
    return {
      ...parsed,
      model: out.model,
    }
  }

  export async function summarizeStream(input: {
    messages: Array<{ role: string; text: string }>
    instruction?: string
    model?: IpkModelRef
    onProgress?: (progress: SummarizeProgress) => Promise<void> | void
  }) {
    const prompt = [
      "你是 IPK v1 的总结器。",
      "把输入消息总结为 JSON，格式：",
      '{ "title": "string", "body_summary": "string", "body": "markdown string" }',
      "要求：",
      "- title 简洁，不超过 48 字",
      "- body_summary 1~2 句，避免把猜想写成结论",
      "- body 使用 markdown，保留推理路径",
      "",
      input.instruction ? `改进要求：${input.instruction}` : "",
      "消息：",
      ...input.messages.map((item, i) => `${i + 1}. [${item.role}] ${item.text}`),
      "",
      "只输出 JSON。",
    ]
      .filter(Boolean)
      .join("\n")
    let last = 0
    const out = await runStream({
      kind: input.instruction ? "revise" : "summarize",
      prompt,
      model: input.model,
      max: 1400,
      onText: async (raw) => {
        const now = Date.now()
        if (now - last < 80) return
        last = now
        const parsed = json(raw) as { title?: string; body_summary?: string; body?: string } | undefined
        await input.onProgress?.({
          raw: raw.trim(),
          title: parsed?.title,
          body_summary: parsed?.body_summary,
          body: parsed?.body,
        })
      },
    })
    if (!out) return
    const parsed = json(out.text) as { title?: string; body_summary?: string; body?: string } | undefined
    await input.onProgress?.({
      raw: out.text,
      title: parsed?.title,
      body_summary: parsed?.body_summary,
      body: parsed?.body,
    })
    if (!parsed?.title || !parsed?.body_summary || !parsed?.body) return
    return {
      ...parsed,
      model: out.model,
    }
  }

  export async function rerankSearch(input: {
    query: string
    candidates: Array<{ piece_id: string; title: string; summary: string; hints: string[] }>
    model?: IpkModelRef
  }) {
    const prompt = [
      "你是 IPK 搜索重排器。",
      "根据 query 对候选做‘先准后全’重排。",
      "输出 JSON 数组，每项格式：",
      '{ "piece_id": "id", "why": "string", "confidence": 0~1, "role": "string" }',
      "",
      `query: ${input.query}`,
      "candidates:",
      ...input.candidates.map(
        (item, i) => `${i + 1}. id=${item.piece_id}; title=${item.title}; summary=${item.summary}; hints=${item.hints.join(" | ")}`,
      ),
      "",
      "只输出 JSON。",
    ].join("\n")
    const out = await run({
      kind: "search",
      prompt,
      model: input.model,
      max: 1200,
      temperature: 0.1,
    })
    if (!out) return
    const parsed = json(out.text) as
      | Array<{ piece_id?: string; why?: string; confidence?: number; role?: string }>
      | undefined
    if (!Array.isArray(parsed)) return
    return parsed
      .filter((item) => !!item.piece_id)
      .map((item) => ({
        piece_id: item.piece_id!,
        why: item.why ?? "",
        confidence: typeof item.confidence === "number" ? item.confidence : 0.5,
        role: item.role ?? "idea",
      }))
  }

  export async function rerankAssociate(input: {
    query: string
    seed?: string
    candidates: Array<{ piece_id: string; title: string; summary: string; hints: string[] }>
    model?: IpkModelRef
  }) {
    const prompt = [
      "你是 IPK 联想重排器。",
      "目标是‘广但可控’，优先桥接价值，不要无限发散。",
      "输出 JSON 数组，每项格式：",
      '{ "piece_id": "id", "bridge_reason": "string", "risk": "low|medium|high", "confidence": 0~1 }',
      "",
      `query: ${input.query}`,
      input.seed ? `seed_piece_id: ${input.seed}` : "",
      "candidates:",
      ...input.candidates.map(
        (item, i) => `${i + 1}. id=${item.piece_id}; title=${item.title}; summary=${item.summary}; hints=${item.hints.join(" | ")}`,
      ),
      "",
      "只输出 JSON。",
    ]
      .filter(Boolean)
      .join("\n")
    const out = await run({
      kind: "associate",
      prompt,
      model: input.model,
      max: 1200,
      temperature: 0.2,
    })
    if (!out) return
    const parsed = json(out.text) as
      | Array<{ piece_id?: string; bridge_reason?: string; risk?: string; confidence?: number }>
      | undefined
    if (!Array.isArray(parsed)) return
    return parsed
      .filter((item) => !!item.piece_id)
      .map((item) => ({
        piece_id: item.piece_id!,
        bridge_reason: item.bridge_reason ?? "",
        risk: item.risk ?? "medium",
        confidence: typeof item.confidence === "number" ? item.confidence : 0.5,
      }))
  }
}
