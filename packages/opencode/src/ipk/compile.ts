import { Identifier } from "@/id/id"
import { WorkspaceContext } from "@/control-plane/workspace-context"
import { Session } from "@/session"
import { SessionID } from "@/session/schema"
import type { IpkModelRef } from "./model"
import { IpkLLM } from "./llm"
import type { DraftMode, DraftRecord, PieceMeta, PieceSurface, PieceType } from "./types"

type Item = {
  id: string
  role: "user" | "assistant"
  text: string
}

export type CompileProgress = {
  phase: "llm" | "finalize"
  title: string
  body_summary: string
  body: string
  raw?: string
}

const clip = (text: string, max: number) => {
  if (text.length <= max) return text
  return `${text.slice(0, Math.max(0, max - 1))}…`
}

const clean = (text: string) => text.replace(/\s+/g, " ").trim()

const now = () => new Date().toISOString()

const text = (parts: Array<{ type: string; text?: string; synthetic?: boolean }>) =>
  parts
    .filter((part) => part.type === "text" && !part.synthetic)
    .map((part) => clean(part.text ?? ""))
    .filter(Boolean)
    .join("\n")

const pick = (items: Item[]) => {
  const first = items.find((item) => item.role === "user")?.text ?? items[0]?.text ?? "会话总结"
  return first.replace(/[。！？!?].*$/u, "").trim() || "会话总结"
}

const tags = (text: string) => {
  const raw = text.toLowerCase()
  const hit = (words: string[]) => words.some((word) => raw.includes(word))

  const methods = [
    ...(hit(["duality", "self-dual", "对偶"]) ? ["duality"] : []),
    ...(hit(["rg", "renormalization", "重整化"]) ? ["rg"] : []),
    ...(hit(["证明", "proof", "推导", "derive"]) ? ["derivation"] : []),
  ]

  const domains = [
    ...(hit(["ising", "statistical", "统计物理", "phase transition", "相变", "临界"]) ? ["statistical-physics"] : []),
    ...(hit(["quantum", "量子"]) ? ["quantum-physics"] : []),
  ]

  const contexts = [
    ...(hit(["研究", "research", "paper", "论文"]) ? ["research"] : []),
    ...(hit(["讨论", "discussion", "聊天", "chat"]) ? ["discussion"] : []),
  ]

  return {
    methods: methods.length > 0 ? methods : ["analysis"],
    domains: domains.length > 0 ? domains : ["general"],
    contexts: contexts.length > 0 ? contexts : ["discussion"],
  }
}

const type = (raw: string): PieceType => {
  const text = raw.toLowerCase()
  if (["计划", "todo", "下一步", "next step", "计划"].some((word) => text.includes(word))) return "plan"
  if (["复盘", "review", "回顾"].some((word) => text.includes(word))) return "review"
  if (["线程", "thread", "连续"].some((word) => text.includes(word))) return "thread"
  if (["知识", "结论", "定义", "knowledge"].some((word) => text.includes(word))) return "knowledge"
  return "idea"
}

const pull = (input: string) =>
  input
    .split(/[\n。！？!?]/u)
    .map(clean)
    .filter(Boolean)

const lead = (items: Item[], ins?: string) => {
  const focus = pick(items)
  const head = `围绕「${clip(focus, 36)}」的对话总结，覆盖了 ${items.length} 条消息中的关键判断与后续问题。`
  if (!ins) return head
  return `${head}已按要求调整：${clip(clean(ins), 32)}。`
}

const body = (items: Item[], ins?: string) => {
  const list = items
    .map((item, idx) => `- ${idx + 1}. ${item.role === "user" ? "用户" : "助手"}：${clip(item.text, 180)}`)
    .join("\n")
  const extra = ins ? `\n\n### 改进要求\n\n${clean(ins)}\n` : ""
  return `### 关键消息\n\n${list}${extra}`
}

const retrieve = (items: Item[]) => {
  const raw = items.map((item) => item.text).join("\n")
  const lines = pull(raw)
  const asks = lines.filter((line) => /[?？]/u.test(line)).slice(0, 5)
  const claims = lines.filter((line) => !/[?？]/u.test(line)).slice(0, 5)
  const keys = lines
    .flatMap((line) => line.split(/[ ,，、:/()（）]/u))
    .map((item) => item.trim())
    .filter((item) => item.length >= 2)
    .slice(0, 12)
  return {
    asks,
    claims,
    keys,
  }
}

const meta = (input: {
  mode: DraftMode
  session_id?: string
  message_ids: string[]
  piece_id?: string
  title: string
  raw: string
  stamp: string
}): PieceMeta => {
  const tag = tags(input.raw)
  const id = input.piece_id ?? Identifier.ascending("piece")
  return {
    id,
    type: type(input.raw),
    title: input.title,
    created_at: input.stamp,
    updated_at: input.stamp,
    origin: {
      kind: input.mode === "edit" ? "review" : "chat",
      workspace_ref: WorkspaceContext.workspaceID,
      session_id: input.session_id,
      message_range: input.message_ids.length > 0 ? input.message_ids : undefined,
    },
    status: "seed",
    domains: tag.domains,
    methods: tag.methods,
    contexts: tag.contexts,
    projects: [],
    sources: input.session_id ? [{ kind: "conversation", ref: input.session_id }] : [],
  }
}

const surface = (input: { meta: PieceMeta; body_summary: string; body: string; raw: string }): PieceSurface => {
  const v = retrieve([
    {
      id: input.meta.id,
      role: "assistant",
      text: input.raw,
    },
  ])
  return {
    human: {
      body_summary: input.body_summary,
    },
    catalog: {
      summary: clip(input.body_summary, 120),
    },
    retrieve: {
      summary: clip(input.body_summary, 140),
      problems: v.asks,
      questions: v.asks,
      claims: v.claims,
      open_questions: v.asks,
      keywords: v.keys,
      retrieval_hints: v.keys.slice(0, 8),
      role: input.meta.type === "knowledge" ? "evidence" : "idea",
    },
    associate: {
      summary: `这条内容可用于延展「${input.meta.title}」相关问题的思路。`,
      methods: input.meta.methods,
      problems: v.asks,
      association_hints: v.keys.slice(0, 6).map((item) => `可从「${item}」方向做横向联想`),
    },
  }
}

const rows = async (session_id: string, message_ids: string[]) => {
  const all = await Session.messages({ sessionID: SessionID.make(session_id) })
  const set = new Set(message_ids)
  const list = all
    .filter((item) => set.has(item.info.id))
    .map((item) => ({
      id: `${item.info.id}`,
      role: item.info.role,
      text: text(item.parts),
    }))
    .filter((item) => item.text)
    .filter((item): item is Item => item.role === "user" || item.role === "assistant")
  return list
}

export namespace Compile {
  export async function make(input: {
    mode: DraftMode
    session_id?: string
    message_ids: string[]
    piece_id?: string
    instruction?: string
    model?: IpkModelRef
    onProgress?: (progress: CompileProgress) => Promise<void> | void
  }) {
    const stamp = now()
    const list =
      input.session_id && input.message_ids.length > 0
        ? await rows(input.session_id, input.message_ids)
        : [
            {
              id: "manual",
              role: "user" as const,
              text: input.instruction ? clean(input.instruction) : "空白草稿",
            },
          ]
    if (list.length === 0) {
      throw new Error("no valid messages selected")
    }
    const def_title = clip(pick(list), 48)
    const def_summary = lead(list, input.instruction)
    const def_body = body(list, input.instruction)
    const llm = input.onProgress
      ? await IpkLLM.summarizeStream({
          messages: list.map((item) => ({ role: item.role, text: item.text })),
          instruction: input.instruction,
          model: input.model,
          onProgress: async (progress) => {
            await input.onProgress?.({
              phase: "llm",
              title: clip(progress.title ?? def_title, 48),
              body_summary: clean(progress.body_summary ?? def_summary),
              body: progress.body ?? progress.raw ?? def_body,
              raw: progress.raw,
            })
          },
        })
      : await IpkLLM.summarize({
          messages: list.map((item) => ({ role: item.role, text: item.text })),
          instruction: input.instruction,
          model: input.model,
        })
    const title = clip(llm?.title ?? def_title, 48)
    const body_summary = llm?.body_summary ? clean(llm.body_summary) : def_summary
    const body_text = llm?.body ? llm.body : def_body
    const raw = list.map((item) => item.text).join("\n")
    const meta_data = meta({
      mode: input.mode,
      session_id: input.session_id,
      message_ids: input.message_ids,
      piece_id: input.piece_id,
      title,
      raw,
      stamp,
    })
    const out = {
      title,
      body_summary,
      body: body_text,
      meta: meta_data,
      surface: surface({
        meta: meta_data,
        body_summary,
        body: body_text,
        raw,
      }),
      links: {
        links: [],
      },
    }
    await input.onProgress?.({
      phase: "finalize",
      title: out.title,
      body_summary: out.body_summary,
      body: out.body,
      raw: out.body,
    })
    return out
  }

  export async function revise(rec: DraftRecord, instruction: string, onProgress?: (progress: CompileProgress) => Promise<void> | void) {
    const ins = clean(instruction)
    if (rec.session_id && rec.message_ids.length > 0) {
      const next = await make({
        mode: rec.mode,
        session_id: rec.session_id,
        message_ids: rec.message_ids,
        piece_id: rec.piece_id ?? rec.meta.id,
        instruction: ins,
        onProgress,
      })
      return next
    }
    const body_summary = `已按改进要求处理：${clip(ins, 48)}。${rec.body_summary}`
    const body_text = `${rec.body}\n\n### 改进要求\n\n${ins}\n`
    const stamp = now()
    const meta_data: PieceMeta = {
      ...rec.meta,
      updated_at: stamp,
      title: rec.title,
    }
    const out = {
      title: rec.title,
      body_summary,
      body: body_text,
      meta: meta_data,
      surface: {
        ...rec.surface,
        human: {
          body_summary,
        },
        catalog: {
          ...rec.surface.catalog,
          summary: clip(body_summary, 120),
        },
        retrieve: {
          ...rec.surface.retrieve,
          summary: clip(body_summary, 140),
        },
        associate: {
          ...rec.surface.associate,
          summary: `这条内容已按改进要求更新，可继续联想相关议题。`,
        },
      },
      links: rec.links,
    }
    await onProgress?.({
      phase: "finalize",
      title: out.title,
      body_summary: out.body_summary,
      body: out.body,
      raw: out.body,
    })
    return out
  }
}
