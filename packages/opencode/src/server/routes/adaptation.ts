import { Hono } from "hono"
import { describeRoute, resolver, validator } from "hono-openapi"
import z from "zod"
import { Identifier } from "@/id/id"
import { Adaptation } from "@/adaptation"
import { ScopeRef } from "@/adaptation/types"
import { AdaptationModelConfig, AdaptationModelMap } from "@/adaptation/model"
import { errors } from "../error"
import { lazy } from "@/util/lazy"

const Status = z.enum(["pending", "confirmed", "rejected", "deferred"])
const HabitKind = z.enum(["initiative_policy", "task_scope", "task_scope_policy"])
const HabitScope = z.enum(["initiative", "task_scope"])
const ScratchScope = z.enum(["global", "subject", "initiative", "task_scope"])

const StatusList = z
  .string()
  .optional()
  .transform((value) => {
    if (!value) return undefined
    const rows = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
    const list = rows.map((item) => Status.parse(item))
    return list.length > 0 ? list : undefined
  })

export const AdaptationRoutes = lazy(() =>
  new Hono()
    .get(
      "/health",
      describeRoute({
        summary: "Adaptation health",
        operationId: "adaptation.health",
        responses: {
          200: {
            description: "Health",
            content: {
              "application/json": {
                schema: resolver(z.object({ ok: z.boolean() })),
              },
            },
          },
        },
      }),
      async (c) => {
        await Adaptation.ready()
        return c.json({ ok: true })
      },
    )
    .get(
      "/status",
      describeRoute({
        summary: "Get adaptation status",
        operationId: "adaptation.status",
        responses: {
          200: {
            description: "Status",
            content: {
              "application/json": {
                schema: resolver(z.unknown()),
              },
            },
          },
          ...errors(400),
        },
      }),
      validator(
        "query",
        z.object({
          session_id: Identifier.schema("session"),
        }),
      ),
      async (c) => {
        const query = c.req.valid("query")
        return c.json(await Adaptation.status(query.session_id))
      },
    )
    .post(
      "/context/compile",
      describeRoute({
        summary: "Compile adaptation context",
        operationId: "adaptation.context.compile",
        responses: {
          200: {
            description: "Context packet",
            content: {
              "application/json": {
                schema: resolver(z.unknown()),
              },
            },
          },
          ...errors(400),
        },
      }),
      validator(
        "json",
        z.object({
          session_id: Identifier.schema("session"),
          request_id: z.string().min(1),
          request: z.string().min(1),
          budget: z
            .object({
              max_sections: z.number().int().positive().optional(),
              max_chars: z.number().int().positive().optional(),
            })
            .optional(),
        }),
      ),
      async (c) => {
        const body = c.req.valid("json")
        return c.json(await Adaptation.compile(body))
      },
    )
    .get(
      "/context/:id",
      describeRoute({
        summary: "Get context packet",
        operationId: "adaptation.context.get",
        responses: {
          200: {
            description: "Context packet",
            content: {
              "application/json": {
                schema: resolver(z.unknown()),
              },
            },
          },
          ...errors(404),
        },
      }),
      validator(
        "param",
        z.object({
          id: Identifier.schema("packet"),
        }),
      ),
      async (c) => {
        const param = c.req.valid("param")
        const row = await Adaptation.packet(param.id)
        if (!row) return c.json({ error: "context packet not found" }, 404)
        return c.json(row)
      },
    )
    .get("/global/guidance", async (c) => c.json(await Adaptation.globalGuidance()))
    .get("/global/policy", async (c) => c.json(await Adaptation.globalPolicy()))
    .get("/subjects", async (c) => c.json(await Adaptation.subjects()))
    .get(
      "/subjects/:id/profile",
      validator("param", z.object({ id: z.string().min(1) })),
      async (c) => c.json(await Adaptation.subjectProfile(c.req.valid("param").id)),
    )
    .get(
      "/subjects/:id/policy",
      validator("param", z.object({ id: z.string().min(1) })),
      async (c) => c.json(await Adaptation.subjectPolicy(c.req.valid("param").id)),
    )
    .get(
      "/initiatives/:id/profile",
      validator("param", z.object({ id: z.string().min(1) })),
      async (c) => c.json(await Adaptation.initiativeProfile(c.req.valid("param").id)),
    )
    .get(
      "/initiatives/:id/policy",
      validator("param", z.object({ id: z.string().min(1) })),
      async (c) => c.json(await Adaptation.initiativePolicy(c.req.valid("param").id)),
    )
    .get(
      "/projects/:id/guidance",
      validator("param", z.object({ id: z.string().min(1) })),
      async (c) => c.json(await Adaptation.projectGuidance(c.req.valid("param").id)),
    )
    .post(
      "/signals/extract",
      validator(
        "json",
        z.object({
          session_id: Identifier.schema("session"),
          mode: z.enum(["manual_current_session", "after_user_message", "after_summary"]),
          message_ids: z.array(Identifier.schema("message")).optional(),
        }),
      ),
      async (c) => c.json(await Adaptation.extract(c.req.valid("json"))),
    )
    .get(
      "/signals",
      validator(
        "query",
        z.object({
          session_id: Identifier.schema("session").optional(),
        }),
      ),
      async (c) => c.json(await Adaptation.signals(c.req.valid("query"))),
    )
    .post(
      "/summaries/run",
      validator(
        "json",
        z.object({
          scope_level: z.enum(["global", "subject", "initiative", "task_scope", "artifact"]),
          scope_id: z.string().min(1),
          project_id: z.string().optional(),
          signal_ids: z.array(Identifier.schema("signal")).optional(),
          session_ids: z.array(Identifier.schema("session")).optional(),
        }),
      ),
      async (c) => c.json(await Adaptation.runSummary(c.req.valid("json"))),
    )
    .get(
      "/summaries",
      validator(
        "query",
        z.object({
          scope_level: z.string().optional(),
          scope_id: z.string().optional(),
          project_id: z.string().optional(),
        }),
      ),
      async (c) => c.json(await Adaptation.summaries(c.req.valid("query"))),
    )
    .get(
      "/proposals",
      validator(
        "query",
        z.object({
          status: StatusList,
        }),
      ),
      async (c) => {
        const query = c.req.valid("query")
        return c.json(await Adaptation.proposals(query.status))
      },
    )
    .get(
      "/proposals/:id",
      validator("param", z.object({ id: Identifier.schema("proposal") })),
      async (c) => {
        const row = await Adaptation.proposal(c.req.valid("param").id)
        if (!row) return c.json({ error: "proposal not found" }, 404)
        return c.json(row)
      },
    )
    .get(
      "/habits",
      validator(
        "query",
        z.object({
          session_id: Identifier.schema("session"),
        }),
      ),
      async (c) => {
        const query = c.req.valid("query")
        return c.json(await Adaptation.habits(query.session_id))
      },
    )
    .get(
      "/scratch",
      validator(
        "query",
        z.object({
          session_id: Identifier.schema("session"),
        }),
      ),
      async (c) => c.json(await Adaptation.scratch(c.req.valid("query").session_id)),
    )
    .post(
      "/scratch/reviews/:id/resolve",
      validator(
        "param",
        z.object({
          id: z.string().min(1),
        }),
      ),
      validator(
        "json",
        z.object({
          session_id: Identifier.schema("session"),
          action: z.enum(["keep_existing", "adopt_candidate", "adopt_custom"]),
          text: z.string().optional(),
        }),
      ),
      async (c) => {
        const param = c.req.valid("param")
        const body = c.req.valid("json")
        return c.json(
          await Adaptation.resolveScratchReview({
            session_id: body.session_id,
            id: param.id,
            action: body.action,
            text: body.text,
          }),
        )
      },
    )
    .get(
      "/scratch/review",
      validator(
        "query",
        z.object({
          session_id: Identifier.schema("session"),
        }),
      ),
      async (c) => c.json(await Adaptation.scratchReview(c.req.valid("query").session_id)),
    )
    .post(
      "/scratch/:id/promote",
      validator(
        "param",
        z.object({
          id: z.string().min(1),
        }),
      ),
      validator(
        "json",
        z.object({
          session_id: Identifier.schema("session"),
          scope: z.object({
            level: ScratchScope,
            target: z.string().min(1),
          }),
          cleanup_duplicates: z.boolean().optional(),
        }),
      ),
      async (c) => {
        const param = c.req.valid("param")
        const body = c.req.valid("json")
        return c.json(
          await Adaptation.promoteScratch({
            session_id: body.session_id,
            id: param.id,
            scope: body.scope,
            cleanup_duplicates: body.cleanup_duplicates,
          }),
        )
      },
    )
    .post(
      "/scratch/:id/activate",
      validator(
        "param",
        z.object({
          id: z.string().min(1),
        }),
      ),
      validator(
        "json",
        z.object({
          session_id: Identifier.schema("session"),
        }),
      ),
      async (c) => {
        const param = c.req.valid("param")
        const body = c.req.valid("json")
        return c.json(
          await Adaptation.activateScratch({
            session_id: body.session_id,
            id: param.id,
          }),
        )
      },
    )
    .post(
      "/scratch/:id/dismiss",
      validator(
        "param",
        z.object({
          id: z.string().min(1),
        }),
      ),
      validator(
        "json",
        z.object({
          session_id: Identifier.schema("session"),
        }),
      ),
      async (c) => {
        const param = c.req.valid("param")
        const body = c.req.valid("json")
        return c.json(
          await Adaptation.dismissScratch({
            session_id: body.session_id,
            id: param.id,
          }),
        )
      },
    )
    .post(
      "/habits/remove-source",
      validator(
        "json",
        z.object({
          session_id: Identifier.schema("session"),
          habit_id: z.string().min(1),
          scope_level: HabitScope,
          scope_id: z.string().min(1),
          kind: HabitKind,
        }),
      ),
      async (c) => {
        const body = c.req.valid("json")
        return c.json(await Adaptation.removeHabit(body))
      },
    )
    .post(
      "/proposals/merge",
      validator(
        "json",
        z.object({
          proposals: z.array(z.unknown()),
        }),
      ),
      async (c) => {
        const body = c.req.valid("json")
        return c.json(await Adaptation.merge({ proposals: body.proposals as never[] }))
      },
    )
    .post(
      "/proposals/:id/confirm",
      validator("param", z.object({ id: Identifier.schema("proposal") })),
      validator(
        "json",
        z.object({
          review_note: z.string().optional(),
          apply: z.boolean().optional(),
          session_id: Identifier.schema("session").optional(),
          scope_choice: ScopeRef.optional(),
        }),
      ),
      async (c) => {
        const param = c.req.valid("param")
        const body = c.req.valid("json")
        const item = await Adaptation.confirm(param.id, body.review_note, {
          session_id: body.session_id,
          scope_choice: body.scope_choice,
        })
        if (!item) return c.json({ error: "proposal not found" }, 404)
        return c.json(item)
      },
    )
    .post(
      "/proposals/:id/reject",
      validator("param", z.object({ id: Identifier.schema("proposal") })),
      validator(
        "json",
        z.object({
          review_note: z.string().optional(),
        }),
      ),
      async (c) => {
        const param = c.req.valid("param")
        const body = c.req.valid("json")
        const item = await Adaptation.reject(param.id, body.review_note)
        if (!item) return c.json({ error: "proposal not found" }, 404)
        return c.json(item)
      },
    )
    .post(
      "/proposals/:id/defer",
      validator("param", z.object({ id: Identifier.schema("proposal") })),
      validator(
        "json",
        z.object({
          review_note: z.string().optional(),
        }),
      ),
      async (c) => {
        const param = c.req.valid("param")
        const body = c.req.valid("json")
        const item = await Adaptation.defer(param.id, body.review_note)
        if (!item) return c.json({ error: "proposal not found" }, 404)
        return c.json(item)
      },
    )
    .get(
      "/promotions",
      validator(
        "query",
        z.object({
          status: StatusList,
        }),
      ),
      async (c) => {
        const query = c.req.valid("query")
        return c.json(await Adaptation.promotions(query.status))
      },
    )
    .get(
      "/model",
      describeRoute({
        summary: "Get adaptation model config",
        operationId: "adaptation.model.get",
        responses: {
          200: {
            description: "Model config",
            content: {
              "application/json": {
                schema: resolver(AdaptationModelConfig),
              },
            },
          },
        },
      }),
      async (c) => c.json(await Adaptation.getModel()),
    )
    .post(
      "/model",
      describeRoute({
        summary: "Set adaptation model config",
        operationId: "adaptation.model.set",
        responses: {
          200: {
            description: "Model config",
            content: {
              "application/json": {
                schema: resolver(AdaptationModelConfig),
              },
            },
          },
          ...errors(400),
        },
      }),
      validator("json", AdaptationModelMap.partial()),
      async (c) => {
        const body = c.req.valid("json")
        const next = await Adaptation.setModel(body).catch(() => undefined)
        if (!next) return c.json({ error: "invalid model config" }, 400)
        return c.json(next)
      },
    )
    .post("/reindex", async (c) => c.json(await Adaptation.reindex())),
)
