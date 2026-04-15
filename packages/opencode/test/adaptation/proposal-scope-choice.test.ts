import { describe, expect, test } from "bun:test"
import fs from "fs/promises"
import { ScopeRef } from "@/adaptation/types"

describe("adaptation proposal scope choice", () => {
  test("rejects legacy project habit scope under the decoupling decision", () => {
    const result = ScopeRef.safeParse({
      level: "project",
      target: "proj_legacy",
    })
    expect(result.success).toBe(false)
  })

  test("writes a confirmed habit to the user selected scope", async () => {
    process.env.AETHER_MEMORY_HOME = `/tmp/aether-proposal-scope-${process.pid}-${Date.now()}`

    const { Instance } = await import("@/project/instance")
    const proposal = await import("@/adaptation/proposal")
    const profile = await import("@/adaptation/profile")
    const indexes = await import("@/adaptation/indexes")
    const habit = await import("@/adaptation/habit")
    const project = await import("@/adaptation/project")
    const text = "以后默认优先用 Python，不要主动改成 C。"

    await Instance.provide({
      directory: "/home/bzz/Aether",
      fn: async () => {
        await project.ensureMap({ project_id: "proj_fast" })
        await profile.ensureInitiative("ini_fast_test")
        const initiative_id = "ini_fast_test"

        await proposal.mergeProposals([
          {
            project_id: "proj_fast",
            initiative_id,
            scope: {
              level: "initiative",
              target: initiative_id,
            },
            kind: "workflow_principle",
            merge_key: `initiative:${initiative_id}:habit:python_over_c`,
            summary: `建议在当前长期事项默认采用：${text}`,
            impact: "high",
            confidence: 0.92,
            evidence_refs: [],
            promotion: {
              source_scope: {
                level: "initiative",
                target: initiative_id,
              },
              target_scope: {
                level: "initiative",
                target: initiative_id,
              },
              kind: "scope_promotion",
              reason: "用户明确表达了默认工作偏好。",
            },
            target_patch: {
              object: "initiative_policy",
              id: initiative_id,
              fields: ["operation_policy"],
              payload: {
                operation_policy: [
                  {
                    id: "pol_python_over_c",
                    text,
                    impact: "high",
                    source: "proposal_confirmed",
                  },
                ],
              },
            },
            future_effect: "确认后系统会在同作用域后续请求中优先应用该规则。",
          },
        ])

        const rows = await proposal.listProposals(["pending"])
        const done = await proposal.confirmProposal(rows[0]!.id, undefined, {
          project_id: "proj_fast",
          scope_choice: {
            level: "global",
            target: "user",
          },
        })
        const policy = await profile.getGlobalPolicy()
        await indexes.rebuildIndexes()
        const habits = await habit.listProjectHabits("proj_fast", { initiative_id })
        const global = habits.find((item) => item.scope.level === "global" && item.summary.includes("Python"))
        const current = await habit.listProjectHabits("proj_fast", { initiative_id, current: true })
        const pinned = await habit.listProjectHabits("proj_fast", {
          initiative_id,
          current: true,
          habit_ids: global ? [global.id] : [],
        })

        expect(done?.scope.level).toBe("global")
        expect(done?.scope_choice?.selected?.level).toBe("global")
        expect(done?.relations[0]?.kind).toBe("derived_from")
        expect(policy.operation_policy.some((item) => item.text.includes("Python"))).toBe(true)
        expect(global).toBeTruthy()
        expect(current.some((item) => item.summary.includes("Python"))).toBe(false)
        expect(pinned.some((item) => item.summary.includes("Python"))).toBe(true)
      },
    })
  })

  test("does not auto-create an initiative for a new workspace project", async () => {
    process.env.AETHER_MEMORY_HOME = `/tmp/aether-map-${process.pid}-${Date.now()}`

    const { Instance } = await import("@/project/instance")
    const project = await import("@/adaptation/project")
    await Instance.provide({
      directory: "/home/bzz/Aether",
      fn: async () => {
        const map = await project.ensureMap({ project_id: "proj_keep_separate" })

        expect(map.project_id).toBe("proj_keep_separate")
        expect("initiative_id" in map).toBe(false)
      },
    })
  })

  test("stores task scope and artifact truth sources outside the workspace project partition", async () => {
    process.env.AETHER_MEMORY_HOME = `/tmp/aether-storage-split-${process.pid}-${Date.now()}`

    const { Instance } = await import("@/project/instance")
    const { MemoryPath } = await import("@/memory/path")
    const task = await import("@/task-scope")
    const art = await import("@/artifact")

    await Instance.provide({
      directory: "/home/bzz/Aether",
      fn: async () => {
        const scope = await task.TaskScope.create({
          project_id: "proj_store_split",
          title: "独立真源检查",
          kind: "test",
          goal: "确认 task_scope 与 artifact 不再写进 workspace project 分区。",
        })
        const item = await art.Artifact.create({
          project_id: "proj_store_split",
          task_scope_id: scope.id,
          role: "design_doc",
          path: "docs/IPK/02-user-adaptation-system/user-adaptation-system-implementation-decisions.zh-CN.md",
          preview_confirmed: true,
        })

        const root = MemoryPath.adaptationRoot()
        const scopeFile = `${root}/task-scopes/${scope.id}/scope.json`
        const artFile = `${root}/artifacts/${item.id}/contract.json`
        const oldScope = `${root}/projects/proj_store_split/task-scopes/${scope.id}/scope.json`
        const oldArt = `${root}/projects/proj_store_split/artifacts/${item.id}.json`

        expect(await fs.access(scopeFile).then(() => true).catch(() => false)).toBe(true)
        expect(await fs.access(artFile).then(() => true).catch(() => false)).toBe(true)
        expect(await fs.access(oldScope).then(() => true).catch(() => false)).toBe(false)
        expect(await fs.access(oldArt).then(() => true).catch(() => false)).toBe(false)
      },
    })
  })
})
