import z from "zod"
import { BusEvent } from "@/bus/bus-event"
import { Bus } from "@/bus"
import { Identifier } from "@/id/id"

export namespace IpkEvent {
  export const DraftUpdated = BusEvent.define(
    "ipk.draft.updated",
    z.object({
      draft_id: Identifier.schema("draft"),
      state: z.string(),
    }),
  )

  export const PieceCommitted = BusEvent.define(
    "ipk.piece.committed",
    z.object({
      piece_id: Identifier.schema("piece"),
      draft_id: Identifier.schema("draft"),
    }),
  )

  export const Reindexed = BusEvent.define(
    "ipk.reindexed",
    z.object({
      at: z.string(),
    }),
  )

  export const draft = (input: z.output<typeof DraftUpdated.properties>) =>
    Bus.publish(DraftUpdated, input).catch(() => undefined)

  export const committed = (input: z.output<typeof PieceCommitted.properties>) =>
    Bus.publish(PieceCommitted, input).catch(() => undefined)

  export const reindexed = (input: z.output<typeof Reindexed.properties>) =>
    Bus.publish(Reindexed, input).catch(() => undefined)
}
