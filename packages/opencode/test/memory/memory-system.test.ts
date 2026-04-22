import { describe, expect, test } from "bun:test"
import { tmpdir } from "../fixture/fixture"
import { Instance } from "../../src/project/instance"
import { Memory } from "../../src/memory"
import { Session } from "../../src/session"
import { MessageID, PartID, SessionID } from "../../src/session/schema"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { Filesystem } from "../../src/util/filesystem"
import type { Config } from "../../src/config/config"

function todayKey() {
  const date = new Date()
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 10)
}

describe("memory + user profile backend", () => {
  test("keeps current_project isolation for non-git directories", async () => {
    await using left = await tmpdir()
    await using right = await tmpdir()

    let leftSessionID = ""
    await Instance.provide({
      directory: left.path,
      fn: async () => {
        await Memory.write({
          session_id: "left_scope",
          store: "memory",
          action: "add",
          value: "Left workspace specific memory",
          reason: "manual",
        })

        const target = await Session.create({})
        leftSessionID = target.id
        const userID = MessageID.ascending()
        await Session.updateMessage({
          id: userID,
          sessionID: target.id,
          role: "user",
          time: { created: Date.now() - 2_000 },
          agent: "build",
          model: { providerID: ProviderID.opencode, modelID: ModelID.make("gpt-5") },
        })
        await Session.updatePart({
          id: PartID.ascending(),
          sessionID: target.id,
          messageID: userID,
          type: "text",
          text: "Scope isolation marker alpha123",
        })
      },
    })

    await Instance.provide({
      directory: right.path,
      fn: async () => {
        const rightMemory = await Memory.read("memory")
        expect(rightMemory.entries).not.toContain("Left workspace specific memory")

        const current = await Session.create({})
        const currentScope = await Memory.sessionSearch({
          session_id: current.id,
          query: "alpha123",
          scope: "current_project",
        })
        expect(currentScope.some((hit) => hit.session_id === leftSessionID)).toBe(false)

        const globalScope = await Memory.sessionSearch({
          session_id: current.id,
          query: "alpha123",
          scope: "global",
        })
        expect(globalScope.some((hit) => hit.session_id === leftSessionID)).toBe(true)
      },
    })
  })

  test("session_search supports multi-keyword matching with session-level merge and recency-first ordering", async () => {
    await using tmp = await tmpdir({ git: true })
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const appendText = async (sessionID: SessionID, text: string) => {
          const messageID = MessageID.ascending()
          await Session.updateMessage({
            id: messageID,
            sessionID,
            role: "user",
            time: { created: Date.now() },
            agent: "build",
            model: { providerID: ProviderID.opencode, modelID: ModelID.make("gpt-5") },
          })
          await Session.updatePart({
            id: PartID.ascending(),
            sessionID,
            messageID,
            type: "text",
            text,
          })
        }

        const older = await Session.create({ title: "Older worklog" })
        await appendText(older.id, "alpha implementation details")
        await appendText(older.id, "beta test follow-ups")

        await new Promise((resolve) => setTimeout(resolve, 5))

        const recent = await Session.create({ title: "Recent checkpoint" })
        await appendText(recent.id, "alpha regression note")

        const current = await Session.create({ title: "Current conversation" })
        const hits = await Memory.sessionSearch({
          session_id: current.id,
          query: "alpha，beta;alpha/、beta|",
          scope: "current_project",
          limit: 10,
        })

        expect(hits.filter((item) => item.session_id === older.id).length).toBe(1)
        expect(hits.filter((item) => item.session_id === recent.id).length).toBe(1)
        expect(hits[0]?.session_id).toBe(recent.id)

        const olderHit = hits.find((item) => item.session_id === older.id)
        expect(olderHit).toBeDefined()
        expect(olderHit?.hits).toBe(2)
        expect(olderHit?.summary).toContain("Matched 2 messages across 2 keywords. Ordered by recency.")
        expect((olderHit?.snippets.length ?? 0) <= 3).toBe(true)
        expect(new Set(olderHit?.snippets ?? []).size).toBe(olderHit?.snippets.length ?? 0)
      },
    })
  })

  test("session_search supports title-only matches", async () => {
    await using tmp = await tmpdir({ git: true })
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const target = await Session.create({ title: "Phoenix roadmap planning" })

        const current = await Session.create({ title: "Current conversation" })
        const hits = await Memory.sessionSearch({
          session_id: current.id,
          query: "phoenix",
          scope: "current_project",
        })

        const match = hits.find((item) => item.session_id === target.id)
        expect(match).toBeDefined()
        expect(match?.title).toContain("Phoenix roadmap planning")
        expect(match?.snippets).toEqual([])
        expect(match?.hits).toBe(0)
        expect(match?.summary).toBe("Matched title across 1 keywords. Ordered by recency.")
      },
    })
  })

  test("session_search title-only matches do not inflate hits from unrelated body text", async () => {
    await using tmp = await tmpdir({ git: true })
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const appendText = async (sessionID: SessionID, text: string) => {
          const messageID = MessageID.ascending()
          await Session.updateMessage({
            id: messageID,
            sessionID,
            role: "user",
            time: { created: Date.now() },
            agent: "build",
            model: { providerID: ProviderID.opencode, modelID: ModelID.make("gpt-5") },
          })
          await Session.updatePart({
            id: PartID.ascending(),
            sessionID,
            messageID,
            type: "text",
            text,
          })
        }

        const target = await Session.create({ title: "Phoenix roadmap planning" })
        await appendText(target.id, "Roadmap notes with no keyword hit in body text.")
        await appendText(target.id, "Additional context that should not appear as matched snippet.")

        const current = await Session.create({ title: "Current conversation" })
        const hits = await Memory.sessionSearch({
          session_id: current.id,
          query: "phoenix",
          scope: "current_project",
        })

        const match = hits.find((item) => item.session_id === target.id)
        expect(match).toBeDefined()
        expect(match?.hits).toBe(0)
        expect(match?.snippets).toEqual([])
        expect(match?.summary).toBe("Matched title across 1 keywords. Ordered by recency.")
      },
    })
  })

  test("session_search title-only fallback includes sessions with receipt-only text parts", async () => {
    await using tmp = await tmpdir({ git: true })
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const target = await Session.create({ title: "Hydra planning receipt-only" })
        const messageID = MessageID.ascending()
        await Session.updateMessage({
          id: messageID,
          sessionID: target.id,
          role: "user",
          time: { created: Date.now() },
          agent: "build",
          model: { providerID: ProviderID.opencode, modelID: ModelID.make("gpt-5") },
        })
        await Session.updatePart({
          id: PartID.ascending(),
          sessionID: target.id,
          messageID,
          type: "text",
          text: "Memory updates: - [MEMORY][add/manual] some receipt text",
          metadata: { memory_receipt: true },
        })

        const current = await Session.create({ title: "Current conversation" })
        const hits = await Memory.sessionSearch({
          session_id: current.id,
          query: "hydra",
          scope: "current_project",
        })

        const match = hits.find((item) => item.session_id === target.id)
        expect(match).toBeDefined()
        expect(match?.title).toContain("Hydra planning receipt-only")
        expect(match?.hits).toBe(0)
        expect(match?.snippets).toEqual([])
        expect(match?.summary).toBe("Matched title across 1 keywords. Ordered by recency.")
      },
    })
  })

  test("memory_write records natural-language notes in short-term session memory", async () => {
    await using tmp = await tmpdir({
      git: true,
      config: {
        memory: {
          enabled: true,
        },
      } as Partial<Config.Info>,
    })

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const sessionID = "short_term_profile_note"
        const ok = await Memory.write({
          session_id: sessionID,
          store: "user",
          action: "add",
          value: "用户希望长期记住：默认用中文回答，先结论后展开。",
          reason: "manual",
        })
        expect(ok.ok).toBe(true)
        if (!ok.ok) throw new Error("expected memory write to succeed")
        expect(ok.session.entries).toContain("用户希望长期记住：默认用中文回答，先结论后展开。")

        const prompt = await Memory.activePrompt({ session_id: sessionID })
        expect(prompt.prompt).toContain("用户希望长期记住：默认用中文回答，先结论后展开。")
      },
    })
  })

  test("disables memory stores and writes when memory.enabled=false", async () => {
    await using tmp = await tmpdir({
      git: true,
      config: {
        memory: {
          enabled: false,
        },
      } as Partial<Config.Info>,
    })

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const userStore = await Memory.read("user")
        expect(userStore.enabled).toBe(false)
        expect(userStore.entries).toEqual([])

        await Memory.start({ session_id: "disabled_old_active" })
        const activeBefore = await Memory.activePrompt({ session_id: "disabled_old_active" })
        expect(activeBefore.prompt).toBe("")

        const blocked = await Memory.write({
          session_id: "user_disabled",
          store: "user",
          action: "add",
          value: "preference[explicit]: 中文",
          reason: "manual",
        })
        expect(blocked.ok).toBe(false)
        expect(blocked.events[0]?.reason).toBe("memory_disabled")

        const memoryWrite = await Memory.write({
          session_id: "memory_still_on",
          store: "memory",
          action: "add",
          value: "Run tests from packages/opencode.",
          reason: "manual",
        })
        expect(memoryWrite.ok).toBe(false)

        await Memory.start({ session_id: "snapshot_user_off" })
        const prompt = await Memory.activePrompt({ session_id: "snapshot_user_off" })
        expect(prompt.prompt).toBe("")
      },
    })
  })

  test("direct USER writes accept natural-language paragraphs as short-term notes", async () => {
    await using tmp = await tmpdir({
      git: true,
      config: {
        memory: {
          enabled: true,
        },
      } as Partial<Config.Info>,
    })

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const result = await Memory.write({
          session_id: "direct_user_no_synthesis",
          store: "user",
          action: "add",
          value: "默认用中文回答，先给结论再展开。开始改动前先和我逐项确认设计细节。对于统计物理相关内容，我更需要物理直觉和图像化解释。",
          reason: "manual",
        })

        expect(result.ok).toBe(true)
        if (!result.ok) throw new Error("expected memory write to succeed")
        expect(result.session.entries[0]).toContain("默认用中文回答")
      },
    })
  })

  test("applies short-term item limits without writing durable stores directly", async () => {
    await using tmp = await tmpdir({
      git: true,
    })

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const longUser = await Memory.write({
          session_id: "long_user",
          store: "user",
          action: "add",
          value: `preference[explicit]: ${"a".repeat(500)}`,
          reason: "manual",
        })
        expect(longUser.ok).toBe(true)
        if (!longUser.ok) throw new Error("expected user write to succeed")
        expect(longUser.session.entries[0]!.length).toBeLessThanOrEqual(2000)
        const userStore = await Memory.read("user")
        expect(userStore.entries).toEqual([])

        const longMemory = await Memory.write({
          session_id: "long_memory",
          store: "memory",
          action: "add",
          value: `memory line ${"b".repeat(500)}`,
          reason: "manual",
        })
        expect(longMemory.ok).toBe(true)
        if (!longMemory.ok) throw new Error("expected memory write to succeed")
        expect(longMemory.session.entries[0]!.length).toBeLessThanOrEqual(2000)
        const memoryStoreAfterLong = await Memory.read("memory")
        expect(memoryStoreAfterLong.entries).toEqual([])
      },
    })
  })

  test("startup only prepares the session memory pool and does not mutate USER.md", async () => {
    await using tmp = await tmpdir({ git: true })

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const userFile = (await Memory.read("user")).file
        await Filesystem.write(
          userFile,
          ["# USER", "- 用户偏好中文回答", "- fact[explicit]: 先结论后展开"].join(
            "\n",
          ),
        )

        await Memory.start({ session_id: "startup_reflect" })
        const events = Memory.flush("startup_reflect")
        expect(events.length).toBe(0)

        const userStore = await Memory.read("user")
        expect(userStore.entries).toEqual(["fact[explicit]: 先结论后展开"])
        expect(userStore.invalid_entries ?? 0).toBe(1)
      },
    })
  })

  test("explicit reflection skips without short-term session memory", async () => {
    await using tmp = await tmpdir({
      git: true,
      config: {
        memory: {
          enabled: true,
        },
      } as Partial<Config.Info>,
    })

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const userFile = (await Memory.read("user")).file
        await Filesystem.write(userFile, ["# USER", "- 用户偏好中文回答"].join("\n"))

        const result = await Memory.reflect({
          session_id: "explicit_reflect_when_disabled",
          scope: "current_session",
        })

        expect(result.status).toBe("skipped")
        expect(result.events.length).toBe(0)

        const userStore = await Memory.read("user")
        expect(userStore.entries).toEqual([])
        expect(userStore.invalid_entries ?? 0).toBe(1)
      },
    })
  })

  test("keeps inferred USER entries in the prepared pool", async () => {
    await using tmp = await tmpdir({
      git: true,
      config: {
        memory: {
          enabled: true,
        },
      } as Partial<Config.Info>,
    })

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const userFile = (await Memory.read("user")).file
        await Filesystem.write(
          userFile,
          ["# USER", "- preference[explicit]: 中文，先结论后展开", "- fact[inferred]: 从近期互动看，用户熟悉量子场论"].join(
            "\n",
          ),
        )

        const userStore = await Memory.read("user")
        expect(userStore.entries.some((entry) => entry.startsWith("fact[inferred]:"))).toBe(true)

        await Memory.start({ session_id: "snapshot_no_inferred" })
        await Memory.search({ session_id: "snapshot_no_inferred", query: "中文" })
        await Memory.search({ session_id: "snapshot_no_inferred", query: "量子场论" })
        const prompt = await Memory.activePrompt({ session_id: "snapshot_no_inferred" })
        expect(prompt.prompt.includes("Priority order: current user instruction")).toBe(true)
        expect(prompt.prompt.includes("preference[explicit]: 中文，先结论后展开")).toBe(true)
        expect(prompt.prompt.includes("fact[inferred]: 从近期互动看，用户熟悉量子场论")).toBe(true)
      },
    })
  })

  test("memory_search pins prepared pool hits into active memory", async () => {
    await using tmp = await tmpdir({ git: true })
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const memoryFile = `${(await Memory.read("memory")).file}/${todayKey()}/MEMORY.md`
        await Filesystem.write(
          memoryFile,
          ["# MEMORY", "- fact[explicit]: Phoenix scheduler design uses JSON cron files"].join("\n"),
        )

        const sessionID = "search_pins_active"
        await Memory.start({ session_id: sessionID })
        let prompt = await Memory.activePrompt({ session_id: sessionID })
        expect(prompt.prompt).not.toContain("Phoenix scheduler")

        const hits = await Memory.search({ session_id: sessionID, query: "Phoenix" })
        expect(hits.length).toBe(1)

        prompt = await Memory.activePrompt({ session_id: sessionID })
        expect(prompt.prompt).toContain("Phoenix scheduler design uses JSON cron files")
      },
    })
  })

  test("memory_reload rebuilds pool and clears active memory", async () => {
    await using tmp = await tmpdir({ git: true })
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const memoryStore = await Memory.read("memory")
        const memoryFile = `${memoryStore.file}/${todayKey()}/MEMORY.md`
        await Filesystem.write(memoryFile, ["# MEMORY", "- fact[explicit]: Old alpha memory"].join("\n"))

        const sessionID = "reload_refreshes_pool"
        await Memory.start({ session_id: sessionID })
        await Memory.search({ session_id: sessionID, query: "alpha" })
        let prompt = await Memory.activePrompt({ session_id: sessionID })
        expect(prompt.prompt).toContain("Old alpha memory")

        await Filesystem.write(memoryFile, ["# MEMORY", "- fact[explicit]: New beta memory"].join("\n"))
        const reloaded = await Memory.reload({ session_id: sessionID })
        expect(reloaded.snapshot.entries.some((entry) => entry.text.includes("New beta memory"))).toBe(true)

        prompt = await Memory.activePrompt({ session_id: sessionID })
        expect(prompt.prompt).not.toContain("Old alpha memory")
        expect(prompt.prompt).not.toContain("New beta memory")

        await Memory.search({ session_id: sessionID, query: "beta" })
        prompt = await Memory.activePrompt({ session_id: sessionID })
        expect(prompt.prompt).toContain("New beta memory")
      },
    })
  })

  test("active memory policy guides direct memory tools", async () => {
    await using tmp = await tmpdir({ git: true })
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        await Memory.write({
          session_id: "snapshot_policy_direct_tools",
          store: "memory",
          action: "add",
          value: "Policy marker",
          reason: "manual",
        })
        const prompt = await Memory.activePrompt({ session_id: "snapshot_policy_direct_tools" })
        expect(prompt.prompt.includes("memory_route")).toBe(false)
        expect(prompt.prompt.includes("Use memory_write")).toBe(true)
        expect(prompt.prompt.includes("Use memory_search")).toBe(true)
        expect(prompt.prompt.includes("Use memory_reflect")).toBe(true)
        expect(prompt.prompt.includes("Priority order: current user instruction")).toBe(true)
      },
    })
  })

  test("formats receipts with success/failure sections and per-section caps", () => {
    const events: Memory.Event[] = []
    for (let i = 0; i < 7; i++) {
      events.push({
        store: "memory",
        action: "add",
        reason: "manual",
        summary: `success-${i}`,
      })
    }
    for (let i = 0; i < 6; i++) {
      events.push({
        store: "user",
        action: "block",
        reason: "capacity_limit",
        summary: `failure-${i}`,
        blocked: true,
      })
    }

    const text = Memory.format(events)
    expect(text.includes("Memory updates:")).toBe(true)
    expect(text.includes("Memory failures:")).toBe(true)
    expect(text.includes("... and 2 more memory updates")).toBe(true)
    expect(text.includes("... and 1 more memory failures")).toBe(true)
  })

  test("session_read requires explicit request then allows continuation", async () => {
    await using tmp = await tmpdir({ git: true })
    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        const actorSessionID = "actor"
        const explicit = [
          {
            info: { id: "usr_1", role: "user" },
            parts: [{ type: "text", text: "Please show the full session history." }],
          },
        ]
        const nextPage = [
          {
            info: { id: "usr_2", role: "user" },
            parts: [{ type: "text", text: "continue, next page please" }],
          },
        ]
        const unrelated = [
          {
            info: { id: "usr_3", role: "user" },
            parts: [{ type: "text", text: "what next?" }],
          },
        ]

        expect(
          Memory.canSessionRead({
            actor_session_id: actorSessionID,
            target_session_id: "target_a",
            page: 1,
            messages: explicit,
          }),
        ).toBe(true)
        expect(
          Memory.canSessionRead({
            actor_session_id: actorSessionID,
            target_session_id: "target_a",
            page: 2,
            messages: nextPage,
          }),
        ).toBe(true)
        expect(
          Memory.canSessionRead({
            actor_session_id: actorSessionID,
            target_session_id: "target_b",
            page: 2,
            messages: nextPage,
          }),
        ).toBe(false)
        expect(
          Memory.canSessionRead({
            actor_session_id: actorSessionID,
            target_session_id: "target_a",
            page: 1,
            messages: unrelated,
          }),
        ).toBe(false)
      },
    })
  })
})
