import { describe, expect, test } from "bun:test"
import { uniqEvidence } from "@/adaptation/proposal"

describe("adaptation proposal evidence dedup", () => {
  test("keeps one row per message and prefers longer quote", () => {
    const out = uniqEvidence([
      {
        signal_id: "sig_1",
        session_id: "s_1",
        message_id: "m_1",
        quote: "短句",
      },
      {
        signal_id: "sig_2",
        session_id: "s_1",
        message_id: "m_1",
        quote: "这是同一条消息更长的证据句子",
      },
      {
        signal_id: "sig_3",
        session_id: "s_1",
        message_id: "m_2",
        quote: "另一条消息证据",
      },
    ])

    expect(out.length).toBe(2)
    expect(out.find((item) => item.message_id === "m_1")?.quote).toBe("这是同一条消息更长的证据句子")
  })

  test("dedups normalized quote across different messages", () => {
    const out = uniqEvidence([
      {
        signal_id: "sig_1",
        session_id: "s_1",
        message_id: "m_1",
        quote: "以后 默认 先 写设计文档",
      },
      {
        signal_id: "sig_2",
        session_id: "s_2",
        message_id: "m_2",
        quote: " 以后   默认 先 写设计文档 ",
      },
    ])

    expect(out.length).toBe(1)
    expect(out[0]?.quote).toBe("以后 默认 先 写设计文档")
  })
})
