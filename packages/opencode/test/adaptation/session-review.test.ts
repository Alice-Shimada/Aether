import { describe, expect, test } from "bun:test"

const tmp = (name: string) => `/tmp/${name}-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

describe("adaptation session review gate", () => {
  test("compile creates a pending add review instead of auto-injecting matched habits", async () => {
    process.env.AETHER_MEMORY_HOME = tmp("aether-session-review-compile")

    const { Instance } = await import("@/project/instance")
    const profile = await import("@/adaptation/profile")
    const indexes = await import("@/adaptation/indexes")
    const proposal = await import("@/adaptation/proposal")
    const session = await import("@/adaptation/session")
    const compile = await import("@/context/compile")

    await Instance.provide({
      directory: "/home/bzz/Aether",
      fn: async () => {
        await profile.putGlobalPolicy({
          scope: { level: "global", target: "user" },
          response_policy: [],
          operation_policy: [
            {
              id: "pol_python_only",
              text: "默认优先用 Python，不要主动改成 C。",
              impact: "high",
              source: "test",
            },
          ],
          updated_at: new Date().toISOString(),
        })
        await indexes.rebuildIndexes()

        const session_id = "ses_review_compile"
        await session.getBinding(session_id)

        const out = await compile.compileContext({
          session_id,
          request_id: "req_review_compile",
          request: "这次请默认优先用 Python，不要主动改成 C，并继续当前实现。",
        })

        const bind = await session.getBinding(session_id)
        const rows = await proposal.listProposals(["pending"])
        const hit = rows.find((item) => item.session_review?.session_id === session_id && item.session_review?.mode === "suggest_add")

        expect(out.packet.habit_ids).toEqual([])
        expect(bind.habit_ids).toEqual([])
        expect(hit?.scope.level).toBe("session")
        expect(hit?.session_review?.habit_id).toBeTruthy()
      },
    })
  })

  test("confirming session review proposals adds and removes current session habits", async () => {
    process.env.AETHER_MEMORY_HOME = tmp("aether-session-review-confirm")

    const { Instance } = await import("@/project/instance")
    const profile = await import("@/adaptation/profile")
    const indexes = await import("@/adaptation/indexes")
    const habit = await import("@/adaptation/habit")
    const proposal = await import("@/adaptation/proposal")
    const session = await import("@/adaptation/session")

    await Instance.provide({
      directory: "/home/bzz/Aether",
      fn: async () => {
        await profile.putGlobalPolicy({
          scope: { level: "global", target: "user" },
          response_policy: [],
          operation_policy: [
            {
              id: "pol_strict_math",
              text: "解释时默认先给直觉，再给严格推导。",
              impact: "high",
              source: "test",
            },
          ],
          updated_at: new Date().toISOString(),
        })
        await indexes.rebuildIndexes()

        const rows = await habit.listProjectHabits("proj_any")
        const item = rows.find((row) => row.summary.includes("严格推导"))
        expect(item).toBeTruthy()
        if (!item) return

        const session_id = "ses_review_confirm"
        await session.getBinding(session_id)

        await proposal.mergeProposals([
          {
            project_id: "proj_any",
            scope: {
              level: "session",
              target: session_id,
            },
            kind: "session_habit_review",
            merge_key: `session:${session_id}:suggest_add:${item.id}`,
            summary: `建议加入当前 session：${item.summary}`,
            impact: "high",
            confidence: 0.91,
            evidence_refs: [],
            session_review: {
              session_id,
              mode: "suggest_add",
              habit_id: item.id,
              habit_scope: item.scope,
              reason: "测试加入当前 session。",
            },
            future_effect: "确认后，这条习惯会进入当前 session。",
          },
        ])

        const add = (await proposal.listProposals(["pending"])).find(
          (row) => row.session_review?.session_id === session_id && row.session_review?.mode === "suggest_add",
        )
        expect(add).toBeTruthy()
        if (!add) return

        await proposal.confirmProposal(add.id)

        expect((await session.getBinding(session_id)).habit_ids).toContain(item.id)

        await proposal.mergeProposals([
          {
            project_id: "proj_any",
            scope: {
              level: "session",
              target: session_id,
            },
            kind: "session_habit_review",
            merge_key: `session:${session_id}:suggest_remove:${item.id}`,
            summary: `建议移出当前 session：${item.summary}`,
            impact: "high",
            confidence: 0.96,
            evidence_refs: [],
            session_review: {
              session_id,
              mode: "suggest_remove",
              habit_id: item.id,
              habit_scope: item.scope,
              reason: "测试从当前 session 移出。",
            },
            future_effect: "确认后，这条习惯会从当前 session 移出。",
          },
        ])

        const remove = (await proposal.listProposals(["pending"])).find(
          (row) => row.session_review?.session_id === session_id && row.session_review?.mode === "suggest_remove",
        )
        expect(remove).toBeTruthy()
        if (!remove) return

        await proposal.confirmProposal(remove.id)

        expect((await session.getBinding(session_id)).habit_ids).not.toContain(item.id)
      },
    })
  })
})
