import { describe, expect, test } from "bun:test"

const tmp = (name: string) => `/tmp/${name}-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

describe("adaptation session scratch habits", () => {
  test("new scratch can shadow conflicting imported habits in the current session", async () => {
    process.env.AETHER_MEMORY_HOME = tmp("aether-scratch-shadow")

    const { Instance } = await import("@/project/instance")
    const profile = await import("@/adaptation/profile")
    const indexes = await import("@/adaptation/indexes")
    const habit = await import("@/adaptation/habit")
    const scratch = await import("@/adaptation/scratch")
    const session = await import("@/adaptation/session")

    await Instance.provide({
      directory: "/home/bzz/Aether",
      fn: async () => {
        await profile.putGlobalPolicy({
          scope: { level: "global", target: "user" },
          response_policy: [],
          operation_policy: [
            {
              id: "pol_python",
              text: "默认优先用 Python。",
              impact: "high",
              source: "test",
            },
          ],
          updated_at: new Date().toISOString(),
        })
        await indexes.rebuildIndexes()

        const session_id = "ses_scratch_shadow"
        const bind = await session.getBinding(session_id)
        const rows = await habit.listProjectHabits(bind.project_id)
        const hit = rows.find((item) => item.summary.includes("Python"))
        expect(hit).toBeTruthy()
        if (!hit) return

        await session.patchBinding(session_id, {
          habit_ids: [hit.id],
        })

        const out = await scratch.captureScratch({
          project_id: bind.project_id,
          session_id,
          message_id: "msg_scratch_shadow",
          text: "这次不要用 Python，先不要把方案写成 Python 版本。",
        })

        expect(out.created.length).toBe(1)
        expect((await session.getBinding(session_id)).habit_ids).not.toContain(hit.id)
        expect((await scratch.listScratchConflicts(session_id)).some((item) => item.target_kind === "imported" && item.target_id === hit.id)).toBe(true)
      },
    })
  })

  test("promoting scratch writes a formal habit and marks the scratch item as promoted", async () => {
    process.env.AETHER_MEMORY_HOME = tmp("aether-scratch-promote")

    const { Instance } = await import("@/project/instance")
    const adaptation = await import("@/adaptation")
    const project = await import("@/adaptation/project")
    const scratch = await import("@/adaptation/scratch")
    const session = await import("@/adaptation/session")

    await Instance.provide({
      directory: "/home/bzz/Aether",
      fn: async () => {
        const session_id = "ses_scratch_promote"
        const bind = await session.getBinding(session_id)
        await project.ensureMap({ project_id: bind.project_id })
        await session.syncBinding(session_id, {
          initiative_id: "ini_scratch_promote",
        })

        const made = await scratch.captureScratch({
          project_id: bind.project_id,
          session_id,
          message_id: "msg_scratch_promote",
          text: "以后项目规划讨论后，已确认写 decisions，未决写 open-questions。",
        })
        const item = made.created[0]
        expect(item).toBeTruthy()
        if (!item) return

        const out = await adaptation.Adaptation.promoteScratch({
          session_id,
          id: item.id,
          scope: {
            level: "initiative",
            target: "ini_scratch_promote",
          },
        })

        expect(out.proposal?.status).toBe("confirmed")
        expect((await scratch.listScratch(session_id)).find((row) => row.id === item.id)?.state).toBe("promoted")
        expect((await session.getBinding(session_id)).habit_ids.length).toBeGreaterThan(0)
      },
    })
  })

  test("low confidence scratch waits for activation before it affects context", async () => {
    process.env.AETHER_MEMORY_HOME = tmp("aether-scratch-pending")

    const { Instance } = await import("@/project/instance")
    const compile = await import("@/context/compile")
    const scratch = await import("@/adaptation/scratch")
    const session = await import("@/adaptation/session")

    await Instance.provide({
      directory: "/home/bzz/Aether",
      fn: async () => {
        const session_id = "ses_scratch_pending"
        const bind = await session.getBinding(session_id)

        const made = await scratch.captureScratch({
          project_id: bind.project_id,
          session_id,
          message_id: "msg_scratch_pending",
          text: "我比较喜欢回答里先给一点物理直觉。",
        })
        const item = made.pending[0]
        expect(item?.state).toBe("pending")

        const before = await compile.compileContext({
          session_id,
          request_id: "pending_before",
          request: "解释一下路径积分",
        })
        expect(before.packet.scratch_ids).not.toContain(item?.id)

        await scratch.activateScratch({
          session_id,
          id: item!.id,
        })
        const after = await compile.compileContext({
          session_id,
          request_id: "pending_after",
          request: "解释一下路径积分",
        })
        expect(after.packet.scratch_ids).toContain(item?.id)
      },
    })
  })

  test("promoting scratch can mark similar scratch in other sessions as handled", async () => {
    process.env.AETHER_MEMORY_HOME = tmp("aether-scratch-cleanup")

    const { Instance } = await import("@/project/instance")
    const adaptation = await import("@/adaptation")
    const project = await import("@/adaptation/project")
    const scratch = await import("@/adaptation/scratch")
    const session = await import("@/adaptation/session")

    await Instance.provide({
      directory: "/home/bzz/Aether",
      fn: async () => {
        const one = "ses_scratch_cleanup_one"
        const two = "ses_scratch_cleanup_two"
        const bind = await session.getBinding(one)
        const other = await session.getBinding(two)
        await project.ensureMap({ project_id: bind.project_id })
        await session.syncBinding(one, {
          initiative_id: "ini_scratch_cleanup",
        })

        const made = await scratch.captureScratch({
          project_id: bind.project_id,
          session_id: one,
          message_id: "msg_scratch_cleanup_one",
          text: "以后项目规划讨论后，已确认写 decisions，未决写 open-questions。",
        })
        const dupe = await scratch.captureScratch({
          project_id: other.project_id,
          session_id: two,
          message_id: "msg_scratch_cleanup_two",
          text: "以后项目规划讨论后，已确认写 decisions，未决写 open-questions。",
        })
        const item = made.created[0]
        expect(item).toBeTruthy()
        expect((await scratch.reviewScratch(bind.project_id)).find((row) => row.id === item?.id)?.similar_count).toBe(2)

        await adaptation.Adaptation.promoteScratch({
          session_id: one,
          id: item!.id,
          scope: {
            level: "initiative",
            target: "ini_scratch_cleanup",
          },
          cleanup_duplicates: true,
        })

        expect((await scratch.listScratch(two)).find((row) => row.id === dupe.created[0]?.id)?.state).toBe("promoted")
      },
    })
  })
})
