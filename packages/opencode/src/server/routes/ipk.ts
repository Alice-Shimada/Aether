import { Hono } from "hono"
import { describeRoute, resolver, validator } from "hono-openapi"
import { streamSSE } from "hono/streaming"
import z from "zod"
import { Ipk, DraftView, PieceCard, SearchHit, AssociateHit, IpkModelConfig, IpkModelMap } from "@/ipk"
import { Identifier } from "@/id/id"
import { lazy } from "@/util/lazy"
import { errors } from "../error"

export const IpkRoutes = lazy(() =>
  new Hono()
    .get(
      "/model",
      describeRoute({
        summary: "Get IPK model config",
        operationId: "ipk.model.get",
        responses: {
          200: {
            description: "Model config",
            content: {
              "application/json": {
                schema: resolver(IpkModelConfig),
              },
            },
          },
        },
      }),
      async (c) => c.json(await Ipk.getModel()),
    )
    .post(
      "/model",
      describeRoute({
        summary: "Set IPK model config",
        operationId: "ipk.model.set",
        responses: {
          200: {
            description: "Model config",
            content: {
              "application/json": {
                schema: resolver(IpkModelConfig),
              },
            },
          },
          ...errors(400),
        },
      }),
      validator("json", IpkModelMap.partial()),
      async (c) => {
        const body = c.req.valid("json")
        const next = await Ipk.setModel(body).catch(() => undefined)
        if (!next) return c.json({ error: "invalid model config" }, 400)
        return c.json(next)
      },
    )
    .post(
      "/piece/draft",
      describeRoute({
        summary: "Create IPK draft",
        operationId: "ipk.piece.draft",
        responses: {
          200: {
            description: "Draft",
            content: {
              "application/json": {
                schema: resolver(DraftView),
              },
            },
          },
          ...errors(400),
        },
      }),
      validator(
        "json",
        z.object({
          session_id: Identifier.schema("session").optional(),
          message_ids: z.array(Identifier.schema("message")),
          mode: z.enum(["new", "edit"]).default("new"),
          piece_id: Identifier.schema("piece").optional(),
        }),
      ),
      async (c) => {
        const body = c.req.valid("json")
        const item = await Ipk.draft(body)
        return c.json(item)
      },
    )
    .post(
      "/piece/draft/stream",
      describeRoute({
        summary: "Create IPK draft by stream",
        operationId: "ipk.piece.draft.stream",
        responses: {
          200: {
            description: "Draft stream",
            content: {
              "text/event-stream": {
                schema: resolver(z.object({ event: z.string(), data: z.string() })),
              },
            },
          },
          ...errors(400),
        },
      }),
      validator(
        "json",
        z.object({
          session_id: Identifier.schema("session").optional(),
          message_ids: z.array(Identifier.schema("message")),
          mode: z.enum(["new", "edit"]).default("new"),
          piece_id: Identifier.schema("piece").optional(),
        }),
      ),
      async (c) => {
        const body = c.req.valid("json")
        return streamSSE(c, async (stream) => {
          const signal = c.req.raw.signal
          try {
            const item = await Ipk.draftStream(body, async (progress) => {
              if (signal.aborted) return
              await stream.writeSSE({
                event: "progress",
                data: JSON.stringify(progress),
              })
            })
            if (signal.aborted) return
            await stream.writeSSE({
              event: "complete",
              data: JSON.stringify(item),
            })
          } catch (err) {
            if (signal.aborted) return
            const message = err instanceof Error ? err.message : String(err)
            await stream.writeSSE({
              event: "error",
              data: JSON.stringify({ message }),
            })
          }
        })
      },
    )
    .post(
      "/piece/revise",
      describeRoute({
        summary: "Revise IPK draft",
        operationId: "ipk.piece.revise",
        responses: {
          200: {
            description: "Draft",
            content: {
              "application/json": {
                schema: resolver(DraftView),
              },
            },
          },
          ...errors(400, 404),
        },
      }),
      validator(
        "json",
        z.object({
          draft_id: Identifier.schema("draft"),
          instruction: z.string().min(1),
        }),
      ),
      async (c) => {
        const body = c.req.valid("json")
        const item = await Ipk.revise(body)
        if (!item) return c.json({ error: "draft not found" }, 404)
        return c.json(item)
      },
    )
    .post(
      "/piece/revise/stream",
      describeRoute({
        summary: "Revise IPK draft by stream",
        operationId: "ipk.piece.revise.stream",
        responses: {
          200: {
            description: "Draft stream",
            content: {
              "text/event-stream": {
                schema: resolver(z.object({ event: z.string(), data: z.string() })),
              },
            },
          },
          ...errors(400, 404),
        },
      }),
      validator(
        "json",
        z.object({
          draft_id: Identifier.schema("draft"),
          instruction: z.string().min(1),
        }),
      ),
      async (c) => {
        const body = c.req.valid("json")
        return streamSSE(c, async (stream) => {
          const signal = c.req.raw.signal
          try {
            const item = await Ipk.reviseStream(body, async (progress) => {
              if (signal.aborted) return
              await stream.writeSSE({
                event: "progress",
                data: JSON.stringify(progress),
              })
            })
            if (signal.aborted) return
            if (!item) {
              await stream.writeSSE({
                event: "error",
                data: JSON.stringify({ message: "draft not found" }),
              })
              return
            }
            await stream.writeSSE({
              event: "complete",
              data: JSON.stringify(item),
            })
          } catch (err) {
            if (signal.aborted) return
            const message = err instanceof Error ? err.message : String(err)
            await stream.writeSSE({
              event: "error",
              data: JSON.stringify({ message }),
            })
          }
        })
      },
    )
    .post(
      "/piece/stash",
      describeRoute({
        summary: "Stash IPK draft",
        operationId: "ipk.piece.stash",
        responses: {
          200: {
            description: "Draft",
            content: {
              "application/json": {
                schema: resolver(DraftView),
              },
            },
          },
          ...errors(404),
        },
      }),
      validator(
        "json",
        z.object({
          draft_id: Identifier.schema("draft"),
        }),
      ),
      async (c) => {
        const body = c.req.valid("json")
        const item = await Ipk.stash(body)
        if (!item) return c.json({ error: "draft not found" }, 404)
        return c.json(item)
      },
    )
    .post(
      "/piece/commit",
      describeRoute({
        summary: "Commit IPK draft",
        operationId: "ipk.piece.commit",
        responses: {
          200: {
            description: "Commit result",
            content: {
              "application/json": {
                schema: resolver(
                  z.object({
                    piece_id: Identifier.schema("piece"),
                    card: PieceCard,
                  }),
                ),
              },
            },
          },
          ...errors(404),
        },
      }),
      validator(
        "json",
        z.object({
          draft_id: Identifier.schema("draft"),
        }),
      ),
      async (c) => {
        const body = c.req.valid("json")
        const item = await Ipk.commit(body)
        if (!item) return c.json({ error: "draft not found" }, 404)
        return c.json(item)
      },
    )
    .post(
      "/reindex",
      describeRoute({
        summary: "Rebuild IPK indexes",
        operationId: "ipk.reindex",
        responses: {
          200: {
            description: "Reindex result",
            content: {
              "application/json": {
                schema: resolver(
                  z.object({
                    updated_at: z.string(),
                    count: z.number(),
                  }),
                ),
              },
            },
          },
        },
      }),
      async (c) => c.json(await Ipk.reindex()),
    )
    .post(
      "/search",
      describeRoute({
        summary: "Search IPK pieces",
        operationId: "ipk.search",
        responses: {
          200: {
            description: "Search results",
            content: {
              "application/json": {
                schema: resolver(z.array(SearchHit)),
              },
            },
          },
          ...errors(400),
        },
      }),
      validator(
        "json",
        z.object({
          query: z.string().min(1),
          limit: z.number().int().positive().optional(),
        }),
      ),
      async (c) => {
        const body = c.req.valid("json")
        return c.json(await Ipk.search(body))
      },
    )
    .post(
      "/associate",
      describeRoute({
        summary: "Associate IPK pieces",
        operationId: "ipk.associate",
        responses: {
          200: {
            description: "Associate results",
            content: {
              "application/json": {
                schema: resolver(z.array(AssociateHit)),
              },
            },
          },
          ...errors(400),
        },
      }),
      validator(
        "json",
        z.object({
          query: z.string().min(1),
          limit: z.number().int().positive().optional(),
          seed_piece_id: Identifier.schema("piece").optional(),
        }),
      ),
      async (c) => {
        const body = c.req.valid("json")
        return c.json(await Ipk.associate(body))
      },
    )
    .get(
      "/drafts",
      describeRoute({
        summary: "List IPK drafts",
        operationId: "ipk.drafts.list",
        responses: {
          200: {
            description: "Drafts",
            content: {
              "application/json": {
                schema: resolver(z.array(DraftView)),
              },
            },
          },
        },
      }),
      async (c) => c.json(await Ipk.listDrafts()),
    )
    .get(
      "/pieces",
      describeRoute({
        summary: "List IPK pieces",
        operationId: "ipk.pieces.list",
        responses: {
          200: {
            description: "Pieces",
            content: {
              "application/json": {
                schema: resolver(z.array(PieceCard)),
              },
            },
          },
        },
      }),
      async (c) => c.json(await Ipk.listPieces()),
    )
    .post(
      "/piece/:id/edit-start",
      describeRoute({
        summary: "Start IPK edit draft from piece",
        operationId: "ipk.piece.editStart",
        responses: {
          200: {
            description: "Draft",
            content: {
              "application/json": {
                schema: resolver(DraftView),
              },
            },
          },
          ...errors(404),
        },
      }),
      validator(
        "param",
        z.object({
          id: Identifier.schema("piece"),
        }),
      ),
      async (c) => {
        const id = c.req.valid("param").id
        const item = await Ipk.editStart({ piece_id: id })
        if (!item) return c.json({ error: "piece not found" }, 404)
        return c.json(item)
      },
    )
    .get(
      "/draft/:id",
      describeRoute({
        summary: "Get IPK draft",
        operationId: "ipk.draft.get",
        responses: {
          200: {
            description: "Draft",
            content: {
              "application/json": {
                schema: resolver(DraftView),
              },
            },
          },
          ...errors(404),
        },
      }),
      validator(
        "param",
        z.object({
          id: Identifier.schema("draft"),
        }),
      ),
      async (c) => {
        const id = c.req.valid("param").id
        const item = await Ipk.getDraft(id)
        if (!item) return c.json({ error: "draft not found" }, 404)
        return c.json(item)
      },
    ),
)
