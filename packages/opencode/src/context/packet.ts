import { ContextPacket } from "@/adaptation/types"

export const renderPacket = (packet: ContextPacket) => {
  if (packet.sections.length === 0) return ""
  const out = ["User adaptation context:"]

  packet.sections.forEach((item) => {
    out.push(`- ${item.kind}: ${item.text}`)
  })

  if (packet.audit.omitted_reason.length > 0) {
    out.push("- notes:")
    packet.audit.omitted_reason.slice(0, 3).forEach((item) => out.push(`  - ${item}`))
  }

  out.push("- rule: current user message and repo/system instructions always override imported habits, scratch habits, and adaptation policy.")
  return out.join("\n")
}

export const packetView = (packet: ContextPacket) => ({
  ...packet,
  text: renderPacket(packet),
})
