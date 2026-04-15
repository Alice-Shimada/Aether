import { describe, expect, test } from "bun:test"
import { suppressionHit } from "@/adaptation/habit"

describe("adaptation Aether project suppression", () => {
  test("hits for exact normalized text", () => {
    const out = suppressionHit({
      rules: [
        {
          id: "sup_1",
          created_at: new Date().toISOString(),
          habit_id: "habit_a",
          scope: {
            level: "initiative",
            target: "proj_1",
          },
          kind: "initiative_policy",
          text: "修改 ipk 相关代码后 必须 同步 审计 docs ipk",
          text_norm: "修改 ipk 相关代码后 必须 同步 审计 docs ipk",
          threshold: 0.82,
        },
      ],
      text: "修改 ipk 相关代码后 必须 同步 审计 docs ipk",
    })
    expect(out.hit).toBe(true)
  })

  test("does not hit for unrelated text", () => {
    const out = suppressionHit({
      rules: [
        {
          id: "sup_1",
          created_at: new Date().toISOString(),
          habit_id: "habit_a",
          scope: {
            level: "initiative",
            target: "proj_1",
          },
          kind: "initiative_policy",
          text: "修改 IPK 相关代码后，必须同步审计 /docs/IPK。",
          text_norm: "修改 ipk 相关代码后 必须 同步 审计 docs ipk",
          threshold: 0.82,
        },
      ],
      text: "回答里优先先给概念直觉，再给公式推导。",
    })
    expect(out.hit).toBe(false)
  })
})
