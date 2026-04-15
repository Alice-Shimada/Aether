import { describe, expect, test } from "bun:test"
import { localGate } from "@/adaptation/signal"

const set = (n: number) => new Set(Array.from({ length: n }, (_, i) => `s_${i}`))

describe("adaptation local gate", () => {
  test("passes fast lane when explicit exists", () => {
    const out = localGate({
      explicit: 1,
      strong: 0,
      sessions: set(1),
    })
    expect(out.fast).toBe(true)
    expect(out.slow).toBe(false)
    expect(out.pass).toBe(true)
  })

  test("does not pass strong-only signals in one session", () => {
    const out = localGate({
      explicit: 0,
      strong: 2,
      sessions: set(1),
    })
    expect(out.fast).toBe(false)
    expect(out.slow).toBe(false)
    expect(out.pass).toBe(false)
  })

  test("passes slow lane when strong signals repeat across sessions", () => {
    const out = localGate({
      explicit: 0,
      strong: 2,
      sessions: set(2),
    })
    expect(out.fast).toBe(false)
    expect(out.slow).toBe(true)
    expect(out.pass).toBe(true)
  })
})
