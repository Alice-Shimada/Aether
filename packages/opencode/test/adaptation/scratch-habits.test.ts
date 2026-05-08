import { describe, expect, test } from "bun:test"

const tmp = (name: string) => `/tmp/${name}-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const evidence = (session_id: string, message_id: string, quote: string, reason = "用户明确提出当前 session 要求。") => ({
  evidence_id: `${message_id}:ev:1`,
  session_id,
  message_id,
  quote,
  reason,
  source: "user_message" as const,
  source_role: "user" as const,
  jump_scope: "session_local" as const,
  created_at: new Date().toISOString(),
})
const candidate = (session_id: string, message_id: string, text: string) => ({
  candidate_id: `${message_id}:local_1`,
  summary: text,
  canonical_text: text,
  state_suggestion: "active" as const,
  kind: "response_preference",
  impact: "high" as const,
  explicit: true,
  temporary: false,
  confidence: 0.92,
  scope_hint: "session",
  traits: [],
  evidence: [evidence(session_id, message_id, text)],
})
const cls = (
  note: string,
  impact: "high" | "medium" | "low" = "high",
  kind: "artifact_rule" | "tool_preference" | "workflow_preference" | "response_preference" = "workflow_preference",
) => ({
  impact,
  kind,
  explicit: impact !== "low",
  temporary: false,
  traits: [],
  note,
})

describe("adaptation session scratch habits", () => {
  test("extract candidate batch fails closed when any row is malformed", async () => {
    const llm = await import("@/adaptation/llm")

    const out = await llm.extractCandidateBatch(
      {
        session_id: "ses_extract_partial_parse",
        messages: [
          {
            id: "msg_extract_partial_one",
            text: "以后回答先给结论。",
          },
          {
            id: "msg_extract_partial_two",
            text: "以后代码默认用 Python。",
          },
        ],
      },
      {
        run: async () =>
          JSON.stringify([
            {
              ref: "msg_extract_partial_one",
              candidates: [
                {
                  candidate_id: "local_1",
                  summary: "以后回答先给结论。",
                  canonical_text: "以后回答先给结论。",
                  state_suggestion: "active",
                  kind: "response_preference",
                  impact: "high",
                  explicit: true,
                  temporary: false,
                  confidence: 0.92,
                  scope_hint: "session",
                  traits: [],
                  evidence: [
                    {
                      quote: "以后回答先给结论。",
                      reason: "用户明确表达了回答顺序要求。",
                    },
                  ],
                },
              ],
            },
            {
              ref: "msg_extract_partial_two",
              candidates: [
                {
                  candidate_id: "local_2",
                  summary: "以后代码默认用 Python。",
                },
              ],
            },
          ]),
      },
    )

    expect(out.llm_ok).toBe(false)
    expect(out.results.size).toBe(0)
  })

  test("extract candidate batch retries a malformed response and can recover before giving up", async () => {
    const llm = await import("@/adaptation/llm")
    let tries = 0

    const out = await llm.extractCandidateBatch(
      {
        session_id: "ses_extract_retry",
        messages: [
          {
            id: "msg_extract_retry_one",
            text: "以后回答先给结论。",
          },
        ],
      },
      {
        run: async () => {
          tries += 1
          if (tries === 1) {
            return JSON.stringify([
              {
                ref: "msg_extract_retry_one",
                candidates: [
                  {
                    candidate_id: "local_1",
                    summary: "以后回答先给结论。",
                  },
                ],
              },
            ])
          }
          return JSON.stringify([
            {
              ref: "msg_extract_retry_one",
              candidates: [
                {
                  candidate_id: "local_1",
                  summary: "以后回答先给结论。",
                  canonical_text: "以后回答先给结论。",
                  state_suggestion: "active",
                  kind: "response_preference",
                  impact: "high",
                  explicit: true,
                  temporary: false,
                  confidence: 0.92,
                  scope_hint: "session",
                  traits: [],
                  evidence: [
                    {
                      quote: "以后回答先给结论。",
                      reason: "用户明确表达了回答顺序要求。",
                    },
                  ],
                },
              ],
            },
          ])
        },
      },
    )

    expect(tries).toBe(2)
    expect(out.llm_ok).toBe(true)
    expect(out.results.get("msg_extract_retry_one")?.[0]?.summary).toBe("以后回答先给结论。")
  })

  test("extract candidate batch can fall back to per-message retries when a multi-message batch stays malformed", async () => {
    const llm = await import("@/adaptation/llm")
    let batch = 0
    const seen = new Map<string, number>()

    const out = await llm.extractCandidateBatch(
      {
        session_id: "ses_extract_split_retry",
        messages: [
          {
            id: "msg_extract_split_one",
            text: "以后回答先给结论。",
          },
          {
            id: "msg_extract_split_two",
            text: "以后代码默认用 Python。",
          },
        ],
      },
      {
        run: async (prompt) => {
          if (prompt.includes("[msg_extract_split_one]") && prompt.includes("[msg_extract_split_two]")) {
            batch += 1
            return JSON.stringify([
              {
                ref: "msg_extract_split_one",
                candidates: [
                  {
                    candidate_id: "local_1",
                    summary: "以后回答先给结论。",
                    canonical_text: "以后回答先给结论。",
                    state_suggestion: "active",
                    kind: "response_preference",
                    impact: "high",
                    explicit: true,
                    temporary: false,
                    confidence: 0.92,
                    scope_hint: "session",
                    traits: [],
                    evidence: [
                      {
                        quote: "以后回答先给结论。",
                        reason: "用户明确表达了回答顺序要求。",
                      },
                    ],
                  },
                ],
              },
            ])
          }
          const id = prompt.includes("[msg_extract_split_one]") ? "msg_extract_split_one" : "msg_extract_split_two"
          seen.set(id, (seen.get(id) ?? 0) + 1)
          if (id === "msg_extract_split_two" && seen.get(id) === 1) {
            return JSON.stringify([
              {
                ref: "msg_extract_split_two",
                candidates: [
                  {
                    candidate_id: "local_1",
                    summary: "以后代码默认用 Python。",
                  },
                ],
              },
            ])
          }
          const text = id === "msg_extract_split_one" ? "以后回答先给结论。" : "以后代码默认用 Python。"
          const kind = id === "msg_extract_split_one" ? "response_preference" : "tool_preference"
          return JSON.stringify([
            {
              ref: id,
              candidates: [
                {
                  candidate_id: "local_1",
                  summary: text,
                  canonical_text: text,
                  state_suggestion: "active",
                  kind,
                  impact: "high",
                  explicit: true,
                  temporary: false,
                  confidence: 0.92,
                  scope_hint: "session",
                  traits: [],
                  evidence: [
                    {
                      quote: text,
                      reason: "用户明确表达了当前要求。",
                    },
                  ],
                },
              ],
            },
          ])
        },
      },
    )

    expect(batch).toBe(3)
    expect(seen.get("msg_extract_split_one")).toBe(1)
    expect(seen.get("msg_extract_split_two")).toBe(2)
    expect(out.llm_ok).toBe(true)
    expect(out.results.size).toBe(2)
  })

  test("failed extraction does not mark a message processed, and a later retry can still capture it", async () => {
    process.env.AETHER_MEMORY_HOME = tmp("aether-scratch-retry-after-parse-failure")

    const { Instance } = await import("@/project/instance")
    const { Session } = await import("@/session")
    const { MessageID, PartID } = await import("@/session/schema")
    const signal = await import("@/adaptation/signal")
    const scratch = await import("@/adaptation/scratch")

    await Instance.provide({
      directory: "/home/bzz/Aether",
      fn: async () => {
        const session = await Session.create({})
        const message_id = MessageID.ascending()
        await Session.updateMessage({
          id: message_id,
          sessionID: session.id,
          role: "user",
          time: { created: Date.now() },
          agent: "test",
          model: { providerID: "test", modelID: "test" },
          tools: {},
          mode: "",
        } as unknown as Parameters<typeof Session.updateMessage>[0])
        await Session.updatePart({
          id: PartID.ascending(),
          sessionID: session.id,
          messageID: message_id,
          type: "text",
          text: "以后回答先给结论。",
        })

        const first = await signal.extractSignals(
          {
            session_id: session.id,
            mode: "after_user_message",
            message_ids: [message_id],
          },
          {
            extract: async () => ({
              results: new Map(),
              llm_ok: false,
            }),
          },
        )

        expect(first.skipped).toContain("llm_unavailable")
        expect((await scratch.listScratch(session.id)).length).toBe(0)

        const second = await signal.extractSignals(
          {
            session_id: session.id,
            mode: "after_user_message",
            message_ids: [message_id],
          },
          {
            extract: async () => ({
              results: new Map([[message_id, [candidate(session.id, message_id, "以后回答先给结论。")]]]),
              llm_ok: true,
            }),
          },
        )

        expect(second.candidates.length).toBe(1)
        expect(second.scratch.created.length).toBe(1)
        expect((await scratch.listScratch(session.id)).some((item) => item.candidate_id === `${message_id}:local_1`)).toBe(true)

        const third = await signal.extractSignals(
          {
            session_id: session.id,
            mode: "after_user_message",
            message_ids: [message_id],
          },
          {
            extract: async () => ({
              results: new Map([[message_id, [candidate(session.id, message_id, "以后回答先给结论。")]]]),
              llm_ok: true,
            }),
          },
        )

        expect(third.skipped).toContain("no_new_evidence")
      },
    })
  })

  test("scratch capture trusts LLM classification without keyword triggers", async () => {
    process.env.AETHER_MEMORY_HOME = tmp("aether-scratch-llm-only")

    const { Instance } = await import("@/project/instance")
    const scratch = await import("@/adaptation/scratch")
    const session = await import("@/adaptation/session")

    await Instance.provide({
      directory: "/home/bzz/Aether",
      fn: async () => {
        const session_id = "ses_scratch_llm_only"
        const bind = await session.getBinding(session_id)

        const out = await scratch.captureScratch({
          project_id: bind.project_id,
          session_id,
          message_id: "msg_scratch_llm_only",
          text: "我所有的代码都想用 Python 编写。",
          classification: cls("用户希望所有代码都使用 Python。", "high", "tool_preference"),
        })

        expect(out.created[0]?.state).toBe("active")
        expect(out.created[0]?.kind).toBe("tool_preference")
      },
    })
  })

  test("imported conflict waits for review and does not immediately pause imported habits", async () => {
    process.env.AETHER_MEMORY_HOME = tmp("aether-scratch-imported-review")

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
          classification: cls("当前 session 不使用 Python。", "high", "tool_preference"),
        })

        expect(out.created.length).toBe(0)
        expect(out.pending.length).toBe(0)
        expect(out.reviews.length).toBe(1)
        expect((await session.getBinding(session_id)).habit_ids).toContain(hit.id)
        expect((await scratch.listScratch(session_id)).length).toBe(0)
        expect(
          (await scratch.listScratchConflicts(session_id)).some(
            (item) => item.kind === "imported_conflict" && item.targets.some((target) => target.target_id === hit.id),
          ),
        ).toBe(true)
      },
    })
  })

  test("imported overlap only records a hit and does not create scratch", async () => {
    process.env.AETHER_MEMORY_HOME = tmp("aether-scratch-imported-hit")

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
              id: "pol_plan_sync",
              text: "项目规划讨论后，已确认写 decisions，未决写 open-questions。",
              impact: "high",
              source: "test",
            },
          ],
          updated_at: new Date().toISOString(),
        })
        await indexes.rebuildIndexes()

        const session_id = "ses_scratch_imported_hit"
        const bind = await session.getBinding(session_id)
        const rows = await habit.listProjectHabits(bind.project_id)
        const hit = rows.find((item) => item.summary.includes("open-questions"))
        expect(hit).toBeTruthy()
        if (!hit) return

        await session.patchBinding(session_id, {
          habit_ids: [hit.id],
        })

        const out = await scratch.captureScratch({
          project_id: bind.project_id,
          session_id,
          message_id: "msg_scratch_imported_hit",
          text: "以后项目规划讨论后，已确认写 decisions，未决写 open-questions。",
          classification: cls("项目规划讨论后同步维护 decisions 与 open-questions。"),
        })

        expect(out.created.length).toBe(0)
        expect(out.pending.length).toBe(0)
        expect(out.hits.length).toBe(1)
        expect((await scratch.listScratch(session_id)).length).toBe(0)
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
          classification: cls("项目规划讨论后同步维护 decisions 与 open-questions。"),
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
          classification: cls("回答时先给一点物理直觉。", "low", "response_preference"),
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

  test("new active overlap can merge into an older pending scratch and promote it", async () => {
    process.env.AETHER_MEMORY_HOME = tmp("aether-scratch-overlap-promote")

    const { Instance } = await import("@/project/instance")
    const scratch = await import("@/adaptation/scratch")
    const session = await import("@/adaptation/session")

    await Instance.provide({
      directory: "/home/bzz/Aether",
      fn: async () => {
        const session_id = "ses_scratch_overlap_promote"
        const bind = await session.getBinding(session_id)

        const old = await scratch.captureScratch({
          project_id: bind.project_id,
          session_id,
          message_id: "msg_scratch_overlap_pending",
          text: "回答里先给一点物理直觉。",
          classification: cls("回答里先给一点物理直觉。", "low", "response_preference"),
        })
        const hit = old.pending[0]
        expect(hit?.state).toBe("pending")
        if (!hit) return

        const next = await scratch.captureScratch({
          project_id: bind.project_id,
          session_id,
          message_id: "msg_scratch_overlap_active",
          text: "回答里先给一点物理直觉。",
          classification: cls("解释物理问题时先给直觉。", "high", "response_preference"),
        })

        expect(next.merged[0]?.id).toBe(hit.id)
        expect((await scratch.listScratch(session_id)).find((row) => row.id === hit.id)?.state).toBe("active")
      },
    })
  })

  test("pending vs active scratch conflict waits for review, and custom input can replace the conflict group", async () => {
    process.env.AETHER_MEMORY_HOME = tmp("aether-scratch-pending-review")

    const { Instance } = await import("@/project/instance")
    const scratch = await import("@/adaptation/scratch")
    const session = await import("@/adaptation/session")

    await Instance.provide({
      directory: "/home/bzz/Aether",
      fn: async () => {
        const session_id = "ses_scratch_pending_review"
        const bind = await session.getBinding(session_id)

        const active = await scratch.captureScratch({
          project_id: bind.project_id,
          session_id,
          message_id: "msg_scratch_active",
          text: "默认优先用 Python。",
          classification: cls("默认优先用 Python。", "high", "tool_preference"),
        })
        const old = active.created[0]
        expect(old?.state).toBe("active")
        if (!old) return

        const pending = await scratch.captureScratch({
          project_id: bind.project_id,
          session_id,
          message_id: "msg_scratch_pending_conflict",
          text: "我可能更想先别用 Python。",
          classification: cls("这次先别用 Python。", "low", "tool_preference"),
        })
        const cand = pending.pending[0]
        expect(cand?.state).toBe("pending")
        expect(pending.reviews.length).toBe(1)
        if (!cand) return

        const review = pending.reviews[0]
        await scratch.resolveScratchReview({
          session_id,
          id: review.id,
          action: "adopt_custom",
          text: "这次先用 TypeScript，不要用 Python。",
        })

        const rows = await scratch.listScratch(session_id)
        expect(rows.find((row) => row.id === old.id)?.state).toBe("superseded")
        expect(rows.some((row) => row.state === "active" && row.canonical_text.includes("TypeScript"))).toBe(true)
        expect(rows.find((row) => row.id === cand.id)?.state).toBe("invalidated")
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
          classification: cls("项目规划讨论后同步维护 decisions 与 open-questions。"),
        })
        const dupe = await scratch.captureScratch({
          project_id: other.project_id,
          session_id: two,
          message_id: "msg_scratch_cleanup_two",
          text: "以后项目规划讨论后，已确认写 decisions，未决写 open-questions。",
          classification: cls("项目规划讨论后同步维护 decisions 与 open-questions。"),
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
