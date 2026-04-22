import z from "zod"
import { Tool } from "./tool"
import { Memory } from "@/memory"

function blocked(reason: string) {
  return {
    title: "Memory action blocked",
    output: reason,
    metadata: { blocked: true },
  }
}

function renderEntries(items: string[]) {
  if (!items.length) return "- (empty)"
  return items.map((item, idx) => `${idx + 1}. ${item}`).join("\n")
}

export const MemoryWriteTool = Tool.define("memory_write", {
  description: [
    "Write a short-term session memory note for later recall and reflection.",
    "All writes go to the current session memory file first; later reflection can consolidate durable items into USER or MEMORY.",
    "If the user asks to remember something long-term, write that request in natural language in the note.",
    "Do not store transient logs or secrets.",
    "The written note is silently added to active memory and remains available in this session.",
  ].join("\n"),
  parameters: z.object({
    store: Memory.Store.default("memory").describe("Intended future store for reflection; write still goes to session memory."),
    action: z.enum(["add", "replace", "remove"]),
    value: z.string().optional().describe("Natural-language memory note."),
    profile: z
      .object({
        type: z.enum(["fact", "preference", "task"]),
        source: z.enum(["explicit", "inferred"]),
        content: z.string(),
      })
      .optional()
      .describe("Optional helper for user-profile-like notes. If provided with store=user, value is built automatically."),
    index: z.number().int().positive().optional(),
    match: z.string().optional(),
    reason: Memory.WriteReason.optional(),
  }),
  async execute(input, ctx) {
    const value =
      input.store === "user" && input.profile
        ? `${input.profile.type}[${input.profile.source}]: ${input.profile.content}`
        : input.value
    const result = await Memory.write({
      session_id: ctx.sessionID,
      store: input.store,
      action: input.action,
      value,
      index: input.index,
      match: input.match,
      reason: input.reason,
    })

    if (!result.ok) return blocked(result.events[0]?.summary ?? "Write blocked")
    return {
      title: "Memory updated",
      output: [
        "Store: session",
        `File: ${result.session.file}`,
        `Used: ${result.session.used}`,
        "",
        renderEntries(result.session.entries),
      ].join("\n"),
      metadata: {
        blocked: false,
        store: "session",
        intended_store: input.store,
        used: result.session.used,
        enabled: true,
      },
    }
  },
})

export const MemoryReadTool = Tool.define("memory_read", {
  description: "Read durable USER entries or recent daily MEMORY entries.",
  parameters: z.object({
    store: Memory.Store,
    index: z.number().int().positive().optional(),
  }),
  async execute(input) {
    const store = await Memory.read(input.store)
    if (!store.enabled) return blocked(`${store.store.toUpperCase()} store is disabled by settings.`)
    if (input.index) {
      const item = store.entries[input.index - 1]
      if (!item) return blocked(`Entry ${input.index} not found in ${input.store}`)
      return {
        title: "Memory entry",
        output: `${input.index}. ${item}`,
        metadata: { blocked: false, store: input.store, index: input.index },
      }
    }
    return {
      title: "Memory store",
      output: [`Store: ${store.store}`, `Used: ${store.used}/${store.limit}`, "", renderEntries(store.entries)].join("\n"),
      metadata: { blocked: false, store: store.store, used: store.used, limit: store.limit },
    }
  },
})

export const MemoryListTool = Tool.define("memory_list", {
  description: "List USER and MEMORY stores with usage and entries.",
  parameters: z.object({}),
  async execute() {
    const stores = await Memory.list()
    const lines = [`MEMORY (${stores.memory.used}/${stores.memory.limit})`, renderEntries(stores.memory.entries)]
    if (stores.user.enabled) {
      lines.push("", `USER (${stores.user.used}/${stores.user.limit})`, renderEntries(stores.user.entries))
    }
    return {
      title: "Memory stores",
      output: lines.join("\n"),
      metadata: {
        user_enabled: stores.user.enabled,
        user_used: stores.user.used,
        user_limit: stores.user.limit,
        memory_used: stores.memory.used,
        memory_limit: stores.memory.limit,
      },
    }
  },
})

export const MemorySearchTool = Tool.define("memory_search", {
  description: [
    "Search the current session prepared memory pool by keyword.",
    "The pool is initialized from USER.md, recent daily memory, and current session short-term memory.",
    "Search accepts separated keywords; any keyword match is a candidate.",
    "Hits are silently added to active memory and will remain injected for this session.",
  ].join("\n"),
  parameters: z.object({
    query: z.string(),
    store: Memory.Store.optional(),
    limit: z.number().int().positive().optional(),
  }),
  async execute(input, ctx) {
    const hits = await Memory.search({ ...input, session_id: ctx.sessionID })
    return {
      title: "Memory search",
      output: hits.length
        ? hits.map((hit) => `[${hit.source}] ${hit.index}. ${hit.text}`).join("\n")
        : "No matches.",
      metadata: { count: hits.length },
    }
  },
})

export const MemoryReloadTool = Tool.define("memory_reload", {
  description: [
    "Reload the current session memory cache from disk.",
    "This refreshes the prepared memory pool and clears active recalled memory.",
    "Use it after the user manually edits memory files or when the current session memory cache may be stale.",
  ].join("\n"),
  parameters: z.object({}),
  async execute(_input, ctx) {
    const result = await Memory.reload({ session_id: ctx.sessionID })
    return {
      title: "Memory reloaded",
      output: [
        `Pool entries: ${result.snapshot.entries.length}`,
        "Active memory cleared.",
      ].join("\n"),
      metadata: {
        entries: result.snapshot.entries.length,
      },
    }
  },
})

export const MemoryReflectTool = Tool.define("memory_reflect", {
  description: [
    "Run LLM-based memory reflection/consolidation explicitly.",
    "Reflection reads short-term session memory, writes day-by-day long-term MEMORY files, and applies USER.md profile patches.",
    "Manual calls default to current_session; daily cron calls should use global.",
  ].join("\n"),
  parameters: z.object({
    scope: Memory.ReflectionScope.optional(),
    dry_run: z.boolean().default(false),
  }),
  async execute(input, ctx) {
    const result = await Memory.reflect({
      session_id: ctx.sessionID,
      scope: input.scope,
      dry_run: input.dry_run,
      trigger: "manual",
    })
    return {
      title: "Memory reflection",
      output: result.events.length ? Memory.format(result.events) : result.summary || "No memory changes.",
      metadata: {
        blocked: result.status === "failed",
        status: result.status,
        run_id: result.run_id,
        count: result.events.length,
      },
    }
  },
})

export const SessionSearchTool = Tool.define("session_search", {
  description: [
    "Search historical sessions using existing message text records.",
    "Use this when users reference previous discussions, decisions, or work history.",
    "Results include summary and snippets. session_read remains explicit-only.",
  ].join("\n"),
  parameters: z.object({
    query: z.string(),
    limit: z.number().int().positive().optional(),
    scope: Memory.Scope.optional(),
  }),
  async execute(input, ctx) {
    const hits = await Memory.sessionSearch({
      session_id: ctx.sessionID,
      query: input.query,
      limit: input.limit,
      scope: input.scope,
    })
    if (!hits.length) return { title: "Session search", output: "No matching sessions found.", metadata: { count: 0 } }
    return {
      title: "Session search",
      output: hits
        .map((hit, idx) =>
          [
            `${idx + 1}. ${hit.title} (${hit.session_id})`,
            `Summary: ${hit.summary}`,
            ...hit.snippets.map((snippet, i) => `Snippet ${i + 1}: ${snippet}`),
          ].join("\n"),
        )
        .join("\n\n"),
      metadata: { count: hits.length },
    }
  },
})

export const SessionReadTool = Tool.define("session_read", {
  description: [
    "Read paginated full message history for a specific session.",
    "This tool is restricted and should only be used when the user explicitly asks for full/raw history.",
  ].join("\n"),
  parameters: z.object({
    session_id: z.string(),
    page: z.number().int().positive().default(1),
    page_size: z.number().int().positive().max(100).default(20),
    scope: Memory.Scope.optional(),
  }),
  async execute(input, ctx) {
    if (
      !Memory.canSessionRead({
        actor_session_id: ctx.sessionID,
        target_session_id: input.session_id,
        page: input.page,
        messages: ctx.messages,
      })
    ) {
      return blocked(
        "session_read is restricted: explicit user request for full/raw history is required before reading pages.",
      )
    }

    const page = await Memory.sessionRead(input)
    const lines = [
      `Session: ${page.title} (${page.session_id})`,
      `Page: ${page.page}`,
      `Page size: ${page.page_size}`,
      `Has more: ${page.has_more ? "yes" : "no"}`,
      `Next page: ${page.next_page ?? "-"}`,
      `Total messages: ${page.total_messages}`,
      "",
      ...page.messages.map((message) =>
        [
          `[${message.role}] ${message.id}`,
          ...message.parts.map((part) => {
            if (part.text) return `- (${part.type}) ${part.text}`
            if (part.data) return `- (${part.type}) ${JSON.stringify(part.data)}`
            return `- (${part.type})`
          }),
        ].join("\n"),
      ),
    ]

    return {
      title: "Session page",
      output: lines.join("\n\n"),
      metadata: {
        blocked: false,
        page: page.page,
        page_size: page.page_size,
        has_more: page.has_more,
        next_page: page.next_page,
      },
    }
  },
})
