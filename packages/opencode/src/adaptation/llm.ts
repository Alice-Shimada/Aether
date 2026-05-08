import { generateText } from "ai"
import z from "zod"
import { Provider } from "@/provider/provider"
import { AdaptationModel } from "./model"
import { AdaptationTaxonomy } from "./taxonomy"
import {
  CandidateState,
  type ExtractedHabitCandidate,
  ImportedHabitComparison,
  type HabitSurface,
  type ImportedHabitComparison as ImportedComparison,
  ScratchHabitComparison,
  type ScratchHabit,
  type ScratchHabitComparison as ScratchComparison,
} from "./types"

const CHUNK_SIZE = 8
const EXTRACT_RETRIES = 2

const RawEvidence = z.object({
  quote: z.string().min(1),
  reason: z.string().default(""),
  start_offset: z.number().int().nonnegative().optional(),
  end_offset: z.number().int().nonnegative().optional(),
})

const RawCandidate = z.object({
  candidate_id: z.string().min(1),
  summary: z.string().min(1),
  canonical_text: z.string().min(1),
  state_suggestion: CandidateState.default("active"),
  kind: z.string().min(1),
  impact: z.enum(["high", "medium", "low"]).default("medium"),
  explicit: z.boolean().default(false),
  temporary: z.boolean().default(false),
  confidence: z.number().min(0).max(1).default(0.5),
  scope_hint: z.string().default("session"),
  traits: z.array(z.string()).default([]),
  evidence: z.array(RawEvidence).min(1),
})

const RawMessageExtract = z.object({
  ref: z.string().min(1),
  candidates: z.array(RawCandidate).default([]),
})

const ImportedResult = z.object({
  relations: z.array(ImportedHabitComparison).default([]),
})

const ScratchResult = z.object({
  relations: z.array(ScratchHabitComparison).default([]),
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
  const block = raw.match(/```json\s*([\s\S]*?)```/iu) ?? raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/u)
  if (!block?.[1]) return
  return (() => {
    try {
      return JSON.parse(block[1].trim())
    } catch {
      return undefined
    }
  })()
}

const quote = (text: string, max = 220) => (text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1))}…`)

const pickModel = async (kind: "signal_extract" | "proposal_generate") => {
  const model = await AdaptationModel.pick(kind)
  if (!model) return
  return Provider.getLanguage(model).catch(() => undefined)
}

const enrich = async (input: {
  session_id: string
  message_id: string
  rows: z.infer<typeof RawCandidate>[]
  created_at: string
}) => {
  const out: ExtractedHabitCandidate[] = []

  for (const [i, row] of input.rows.entries()) {
    const candidate_id = `${input.message_id}:${row.candidate_id || `candidate_${i + 1}`}`
    const traits = row.traits.length > 0 ? await AdaptationTaxonomy.normalize(row.traits) : []

    out.push({
      candidate_id,
      summary: row.summary.trim(),
      canonical_text: row.canonical_text.trim(),
      state_suggestion: row.state_suggestion,
      kind: row.kind.trim(),
      impact: row.impact,
      explicit: row.explicit,
      temporary: row.temporary,
      confidence: row.confidence,
      scope_hint: row.scope_hint.trim() || "session",
      traits,
      evidence: row.evidence.map((ev, j) => ({
        evidence_id: `${candidate_id}:ev:${j + 1}`,
        session_id: input.session_id,
        message_id: input.message_id,
        quote: ev.quote.trim(),
        reason: ev.reason.trim(),
        source: "user_message",
        source_role: "user",
        jump_scope: "session_local",
        start_offset: ev.start_offset,
        end_offset: ev.end_offset,
        created_at: input.created_at,
      })),
    })
  }

  return out
}

const buildExtractPrompt = (rows: Array<{ id: string; text: string }>) =>
  [
    "你是 session scratch habit extractor。",
    "",
    "任务：",
    "只根据用户发言，从每条用户消息中提取 0~N 条当前 session 需要记住的习惯候选。",
    "",
    "硬规则：",
    "- 只看用户发言，不要把 assistant 文本当作 evidence。",
    "- 只做语义判断，不要依赖 regex、关键词门槛或固定句式。",
    "- 一条用户消息可以产出多个 candidates。",
    "- 必须为每条输入消息都返回一项；如果没有可靠候选，也要返回该 ref 对应的 candidates: []。",
    "- 绝对不要漏掉任何 ref，不要合并多个 ref，不要新增未提供的 ref。",
    "- candidates 要尽量原子化，一条 candidate 尽量只对应一件事。",
    "- 同一条消息里的同义表达应合并成一个 candidate，但 evidence 必须逐条保留。",
    "- v1 不需要处理同一条消息内部互相冲突的 candidate。",
    "- 如果某条消息没有可靠 habit candidate，就返回空数组。",
    "- 如果你不确定某条消息是否构成习惯候选，优先返回该 ref 的 candidates: []，不要输出半截对象。",
    "",
    "字段要求：",
    '- state_suggestion: "active" 或 "pending"',
    '- impact: "high" | "medium" | "low"',
    "- kind 推荐使用 tool_preference / workflow_preference / response_preference / artifact_rule 之一，除非明显不适合。",
    "- confidence 为 0~1。",
    "- scope_hint 默认写 session。",
    "- evidence 里的 quote 必须来自该用户消息原文；reason 解释为什么这段话支持该候选。",
    "- 每个 candidate 都必须包含所有必填字段；不要省略 canonical_text、summary、kind、evidence。",
    "",
    "严格输出合同：",
    "- 顶层必须是 JSON 数组，长度必须等于输入消息条数。",
    "- 数组中的每一项必须是对象，且必须同时包含 ref 和 candidates 两个键。",
    "- candidates 必须始终是数组；没有候选时必须返回 []，不能返回 null，不能省略。",
    "- 不要输出 markdown，不要输出解释，不要输出注释，不要使用 ```json 代码块。",
    "- 不要输出任何 schema 不完整的 candidate；宁可返回空数组。",
    "",
    "错误示例（不要这样输出）：",
    '- 只返回有候选的 ref，漏掉无候选消息。',
    '- 把 candidates 写成 null。',
    '- candidate 少 summary / canonical_text / evidence。',
    '- 在 JSON 前后附加解释文字。',
    "",
    "输出 JSON 数组，每项格式：",
    `{
  "ref": "msg_xxx",
  "candidates": [
    {
      "candidate_id": "local_1",
      "summary": "...",
      "canonical_text": "...",
      "state_suggestion": "active",
      "kind": "workflow_preference",
      "impact": "high",
      "explicit": true,
      "temporary": true,
      "confidence": 0.9,
      "scope_hint": "session",
      "traits": ["..."],
      "evidence": [
        {
          "quote": "...",
          "reason": "...",
          "start_offset": 0,
          "end_offset": 12
        }
      ]
    }
  ]
}`,
    "",
    "用户消息：",
    ...rows.map((row, i) => `${i + 1}. [${row.id}] ${quote(row.text, 1200)}`),
    "",
    "只输出 JSON。",
  ].join("\n")

const buildImportedPrompt = (input: { candidate: ExtractedHabitCandidate; habits: HabitSurface[] }) =>
  [
    "你是 imported habit comparator。",
    "",
    "任务：比较一条新的 session habit candidate 与当前 session 的 imported habits。",
    "只返回 relation 为 overlap 或 conflict 的项；其余不要输出。",
    "",
    "relation 定义：",
    '- overlap: 语义上基本是同一条习惯/要求，应该命中正式习惯，而不是创建新的 scratch',
    '- conflict: 两者会让当前 session 不知道该遵守哪条要求',
    "",
    'conflict_kind 只在 relation=conflict 时填写 "full" 或 "partial"，否则写 null。',
    "",
    "candidate:",
    JSON.stringify({
      candidate_id: input.candidate.candidate_id,
      summary: input.candidate.summary,
      canonical_text: input.candidate.canonical_text,
      state_suggestion: input.candidate.state_suggestion,
      impact: input.candidate.impact,
      explicit: input.candidate.explicit,
      temporary: input.candidate.temporary,
      evidence: input.candidate.evidence.map((row) => row.quote),
    }),
    "",
    "imported habits:",
    ...input.habits.map((row, i) =>
      `${i + 1}. ${JSON.stringify({
        habit_id: row.id,
        habit_number: i + 1,
        title: row.title,
        summary: row.summary,
        scope: row.scope,
        triggers: row.triggers,
      })}`,
    ),
    "",
    '输出 JSON 对象：{ "relations": [{ "habit_id": "...", "habit_number": 1, "relation": "conflict", "conflict_kind": "partial", "comparison_summary": "..." }] }',
    "只输出 JSON。",
  ].join("\n")

const buildScratchPrompt = (input: { candidate: ExtractedHabitCandidate; habits: ScratchHabit[] }) =>
  [
    "你是 scratch habit comparator。",
    "",
    "任务：比较一条新的 session habit candidate 与当前 session 中 active / pending scratch habits。",
    "只返回 relation 为 overlap 或 conflict 的项；其余不要输出。",
    "",
    "规则：",
    '- overlap: 语义上基本是同一条 scratch；如果措辞略有差异，可返回 merged_summary 和 merged_canonical_text。',
    '- conflict: 两者在当前 session 中不能同时作为同一组局部要求生效。',
    '- conflict_kind 只在 conflict 时填写 "full" 或 "partial"，否则写 null。',
    "",
    "candidate:",
    JSON.stringify({
      candidate_id: input.candidate.candidate_id,
      summary: input.candidate.summary,
      canonical_text: input.candidate.canonical_text,
      state_suggestion: input.candidate.state_suggestion,
      impact: input.candidate.impact,
      explicit: input.candidate.explicit,
      temporary: input.candidate.temporary,
      evidence: input.candidate.evidence.map((row) => row.quote),
    }),
    "",
    "scratch habits:",
    ...input.habits.map((row, i) =>
      `${i + 1}. ${JSON.stringify({
        scratch_id: row.id,
        scratch_number: i + 1,
        state: row.state,
        summary: row.summary,
        canonical_text: row.canonical_text,
        kind: row.kind,
        impact: row.impact,
      })}`,
    ),
    "",
    `输出 JSON 对象：
{
  "relations": [
    {
      "scratch_id": "scratch_xxx",
      "scratch_number": 1,
      "relation": "overlap",
      "conflict_kind": null,
      "comparison_summary": "...",
      "merged_summary": "...",
      "merged_canonical_text": "..."
    }
  ]
}`,
    "只输出 JSON。",
  ].join("\n")

export type ExtractOutput = {
  results: Map<string, ExtractedHabitCandidate[]>
  llm_ok: boolean
}

const parseBatch = (input: { raw: unknown; refs: string[] }) => {
  if (!Array.isArray(input.raw)) return
  if (input.raw.length !== input.refs.length) return
  const rows = input.raw.map((row) => RawMessageExtract.safeParse(row))
  if (rows.some((row) => !row.success)) return
  const valid = rows.flatMap((row) => (row.success ? [row.data] : []))
  const refs = new Set(input.refs)
  const seen = new Set<string>()
  for (const row of valid) {
    if (!refs.has(row.ref)) return
    if (seen.has(row.ref)) return
    seen.add(row.ref)
  }
  if (seen.size !== refs.size) return
  return valid
}

const prompt = async (input: {
  chunk: Array<{ id: string; text: string }>
  model?: Awaited<ReturnType<typeof pickModel>>
  run?: (prompt: string) => Promise<string | undefined>
}) => {
  const body = buildExtractPrompt(input.chunk)
  if (input.run) return input.run(body).catch(() => undefined)
  if (!input.model) return
  return generateText({
    model: input.model,
    messages: [{ role: "user", content: body }],
    maxOutputTokens: 2400,
    temperature: 0.1,
  })
    .then((row) => row.text)
    .catch(() => undefined)
}

const attempt = async (input: {
  chunk: Array<{ id: string; text: string }>
  model?: Awaited<ReturnType<typeof pickModel>>
  run?: (prompt: string) => Promise<string | undefined>
}) => {
  for (let i = 0; i <= EXTRACT_RETRIES; i += 1) {
    const text = await prompt(input)
    if (!text) continue
    const valid = parseBatch({
      raw: json(text),
      refs: input.chunk.map((row) => row.id),
    })
    if (valid) return valid
  }
}

const recover = async (input: {
  chunk: Array<{ id: string; text: string }>
  model?: Awaited<ReturnType<typeof pickModel>>
  run?: (prompt: string) => Promise<string | undefined>
}) => {
  const valid = await attempt(input)
  if (valid) return valid
  if (input.chunk.length === 1) return
  const out: z.infer<typeof RawMessageExtract>[] = []
  for (const row of input.chunk) {
    const one = await attempt({
      ...input,
      chunk: [row],
    })
    if (!one?.[0]) return
    out.push(one[0])
  }
  return out
}

export const extractCandidateBatch = async (input: {
  session_id: string
  messages: Array<{ id: string; text: string }>
}, deps?: {
  run?: (prompt: string) => Promise<string | undefined>
}): Promise<ExtractOutput> => {
  const model = deps?.run ? undefined : await pickModel("signal_extract")
  if (!deps?.run && !model) return { results: new Map(), llm_ok: false }

  const out = new Map<string, ExtractedHabitCandidate[]>()
  const stamp = new Date().toISOString()
  const chunks: Array<Array<{ id: string; text: string }>> = []

  for (let i = 0; i < input.messages.length; i += CHUNK_SIZE) {
    chunks.push(input.messages.slice(i, i + CHUNK_SIZE))
  }

  for (const chunk of chunks) {
    const valid = await recover({
      chunk,
      model,
      run: deps?.run,
    })
    if (!valid) return { results: new Map(), llm_ok: false }

    for (const row of valid) {
      out.set(
        row.ref,
        await enrich({
          session_id: input.session_id,
          message_id: row.ref,
          rows: row.candidates,
          created_at: stamp,
        }),
      )
    }
  }

  return { results: out, llm_ok: true }
}

export const compareCandidateToImported = async (input: {
  candidate: ExtractedHabitCandidate
  habits: HabitSurface[]
}): Promise<ImportedComparison[] | undefined> => {
  if (input.habits.length === 0) return []
  const model = await pickModel("proposal_generate")
  if (!model) return

  const done = await generateText({
    model,
    messages: [{ role: "user", content: buildImportedPrompt(input) }],
    maxOutputTokens: 1600,
    temperature: 0.1,
  }).catch(() => undefined)

  if (!done?.text) return
  const raw = ImportedResult.safeParse(json(done.text))
  if (!raw.success) return
  const ids = new Set(input.habits.map((row) => row.id))
  const nums = new Set(input.habits.map((_, i) => i + 1))

  return raw.data.relations.filter((row) => ids.has(row.habit_id) && nums.has(row.habit_number) && row.relation !== "none")
}

export const compareCandidateToScratch = async (input: {
  candidate: ExtractedHabitCandidate
  habits: ScratchHabit[]
}): Promise<ScratchComparison[] | undefined> => {
  if (input.habits.length === 0) return []
  const model = await pickModel("proposal_generate")
  if (!model) return

  const done = await generateText({
    model,
    messages: [{ role: "user", content: buildScratchPrompt(input) }],
    maxOutputTokens: 1800,
    temperature: 0.1,
  }).catch(() => undefined)

  if (!done?.text) return
  const raw = ScratchResult.safeParse(json(done.text))
  if (!raw.success) return
  const ids = new Set(input.habits.map((row) => row.id))
  const nums = new Set(input.habits.map((_, i) => i + 1))

  return raw.data.relations.filter((row) => ids.has(row.scratch_id) && nums.has(row.scratch_number) && row.relation !== "none")
}
