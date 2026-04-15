import { describe, expect, test } from "bun:test"
import { parseSemantic } from "@/adaptation/semantic"

describe("adaptation semantic merge parser", () => {
  test("keeps valid clusters with fresh signals", () => {
    const out = parseSemantic(
      JSON.stringify({
        clusters: [
          {
            label: "以后默认先更新 decisions 再更新 open-questions",
            signal_ids: ["sig_1", "sig_2"],
            confidence: 0.83,
            reason: "同义表述",
          },
        ],
      }),
      {
        ids: new Set(["sig_1", "sig_2", "sig_3"]),
        fresh: new Set(["sig_2"]),
      },
    )
    expect(out.length).toBe(1)
    expect(out[0].signal_ids).toEqual(["sig_1", "sig_2"])
    expect(out[0].confidence).toBe(0.83)
  })

  test("drops clusters without fresh ids or with unknown ids", () => {
    const out = parseSemantic(
      JSON.stringify({
        clusters: [
          {
            label: "unknown ids",
            signal_ids: ["sig_x", "sig_y"],
            confidence: 0.7,
            reason: "",
          },
          {
            label: "no fresh",
            signal_ids: ["sig_1", "sig_2"],
            confidence: 0.7,
            reason: "",
          },
        ],
      }),
      {
        ids: new Set(["sig_1", "sig_2"]),
        fresh: new Set(["sig_3"]),
      },
    )
    expect(out.length).toBe(0)
  })
})
