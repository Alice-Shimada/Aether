import { ContextPacket } from "@/adaptation/types"

export type Budget = {
  max_sections?: number
  max_chars?: number
}

const size = (text: string) => text.length

export const clipSections = (sections: ContextPacket["sections"], budget: Budget) => {
  const limit = budget.max_sections ?? 8
  const chars = budget.max_chars ?? 4000
  const out: ContextPacket["sections"] = []
  let total = 0

  for (const item of sections) {
    if (out.length >= limit) break
    const len = size(item.text)
    if (total + len > chars) {
      const left = Math.max(0, chars - total - 1)
      if (left < 64) continue
      out.push({
        ...item,
        text: `${item.text.slice(0, left)}…`,
      })
      total = chars
      continue
    }
    out.push(item)
    total += len
  }

  return out
}
