import { Hono } from "hono"
import { describeRoute, resolver, validator } from "hono-openapi"
import z from "zod"
import { TaskScope } from "@/task-scope"
import { Identifier } from "@/id/id"
import { Adaptation } from "@/adaptation"
import { lazy } from "@/util/lazy"
import { errors } from "../error"

export const TaskScopeRoutes = lazy(() =>
  new Hono()
    .get(
      "/",
      describeRoute({
        summary: "List task scopes",
        operationId: "taskScope.list",
        responses: {
          200: {
            description: "Task scopes",
            content: {
              "application/json": {
                schema: resolver(z.array(z.unknown())),
              },
            },
          },
          ...errors(400),
        },
      }),
      validator(
        "query",
        z.object({
          project_id: z.string().min(1),
        }),
      ),
      async (c) => c.json(await TaskScope.list(c.req.valid("query").project_id)),
    )
    .post(
      "/",
      validator(
        "json",
        z.object({
          project_id: z.string().min(1),
          title: z.string().min(1),
          kind: z.string().min(1),
          goal: z.string().min(1),
          active_subjects: z.array(z.string()).optional(),
        }),
      ),
      async (c) => c.json(await TaskScope.create(c.req.valid("json"))),
    )
    .get(
      "/:id",
      validator("param", z.object({ id: Identifier.schema("scope") })),
      validator("query", z.object({ project_id: z.string().min(1) })),
      async (c) => {
        const param = c.req.valid("param")
        const query = c.req.valid("query")
        const row = await TaskScope.get(query.project_id, param.id)
        if (!row) return c.json({ error: "task scope not found" }, 404)
        return c.json(row)
      },
    )
    .patch(
      "/:id",
      validator("param", z.object({ id: Identifier.schema("scope") })),
      validator("query", z.object({ project_id: z.string().min(1) })),
      validator(
        "json",
        z.object({
          status_summary: z.string().optional(),
          done: z.array(z.string()).optional(),
          open_question_refs: z.array(z.object({ artifact_id: z.string(), path: z.string(), note: z.string().optional() })).optional(),
          decision_refs: z.array(z.object({ artifact_id: z.string(), path: z.string(), note: z.string().optional() })).optional(),
          linked_pieces: z.array(z.string()).optional(),
          artifacts: z.array(z.string()).optional(),
          open_questions: z.array(z.string()).optional(),
          decisions: z.array(z.string()).optional(),
          principles: z.array(z.string()).optional(),
        }),
      ),
      async (c) => {
        const param = c.req.valid("param")
        const query = c.req.valid("query")
        const body = c.req.valid("json")
        const row = await TaskScope.patch(query.project_id, param.id, body)
        if (!row) return c.json({ error: "task scope not found" }, 404)
        return c.json(row)
      },
    )
    .post(
      "/:id/bind-session",
      validator("param", z.object({ id: Identifier.schema("scope") })),
      validator(
        "json",
        z.object({
          session_id: Identifier.schema("session"),
          project_id: z.string().min(1),
        }),
      ),
      async (c) => {
        const param = c.req.valid("param")
        const body = c.req.valid("json")
        return c.json(await TaskScope.bindSession({ project_id: body.project_id, scope_id: param.id, session_id: body.session_id }))
      },
    )
    .post(
      "/match",
      validator(
        "json",
        z.object({
          session_id: Identifier.schema("session"),
          request: z.string().min(1),
          cwd: z.string().optional(),
          open_paths: z.array(z.string()).optional(),
          selected_message_ids: z.array(Identifier.schema("message")).optional(),
          user_scope_id: Identifier.schema("scope").optional(),
        }),
      ),
      async (c) => {
        const body = c.req.valid("json")
        return c.json(
          await Adaptation.taskScopeMatch({
            ...body,
            open_paths: body.open_paths ?? [],
            selected_message_ids: body.selected_message_ids ?? [],
          }),
        )
      },
    ),
)
