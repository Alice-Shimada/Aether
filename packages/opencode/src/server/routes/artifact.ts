import { Hono } from "hono"
import { describeRoute, resolver, validator } from "hono-openapi"
import z from "zod"
import { Artifact } from "@/artifact"
import { Identifier } from "@/id/id"
import { Adaptation } from "@/adaptation"
import { lazy } from "@/util/lazy"
import { errors } from "../error"

export const ArtifactRoutes = lazy(() =>
  new Hono()
    .get(
      "/",
      describeRoute({
        summary: "List artifact contracts",
        operationId: "artifact.list",
        responses: {
          200: {
            description: "Artifact list",
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
      async (c) => c.json(await Artifact.list(c.req.valid("query").project_id)),
    )
    .post(
      "/",
      validator(
        "json",
        z.object({
          project_id: z.string().min(1),
          task_scope_id: Identifier.schema("scope").optional(),
          role: z.string().min(1),
          path: z.string().min(1),
          format: z.string().optional(),
          write_mode: z.enum(["revise_in_place", "append", "replace"]).optional(),
          update_triggers: z.array(z.string()).optional(),
          partner_artifacts: z.array(Identifier.schema("artifact")).optional(),
          style_focus: z.array(z.string()).optional(),
          protected_regions: z.array(z.string()).optional(),
          preview_confirmed: z.boolean().optional(),
        }),
      ),
      async (c) => c.json(await Artifact.create(c.req.valid("json"))),
    )
    .get(
      "/:id",
      validator("param", z.object({ id: Identifier.schema("artifact") })),
      validator("query", z.object({ project_id: z.string().min(1) })),
      async (c) => {
        const param = c.req.valid("param")
        const query = c.req.valid("query")
        const row = await Artifact.get(query.project_id, param.id)
        if (!row) return c.json({ error: "artifact not found" }, 404)
        return c.json(row)
      },
    )
    .patch(
      "/:id",
      validator("param", z.object({ id: Identifier.schema("artifact") })),
      validator("query", z.object({ project_id: z.string().min(1) })),
      validator(
        "json",
        z.object({
          role: z.string().optional(),
          format: z.string().optional(),
          write_mode: z.enum(["revise_in_place", "append", "replace"]).optional(),
          update_triggers: z.array(z.string()).optional(),
          partner_artifacts: z.array(Identifier.schema("artifact")).optional(),
          style_focus: z.array(z.string()).optional(),
          protected_regions: z.array(z.string()).optional(),
          confirmed: z.boolean().optional(),
        }),
      ),
      async (c) => {
        const param = c.req.valid("param")
        const query = c.req.valid("query")
        const body = c.req.valid("json")
        const row = await Artifact.patch(query.project_id, param.id, body)
        if (!row) return c.json({ error: "artifact not found" }, 404)
        return c.json(row)
      },
    )
    .post(
      "/match",
      validator(
        "json",
        z.object({
          project_id: z.string().min(1),
          task_scope_id: Identifier.schema("scope").optional(),
          paths: z.array(z.string()).optional(),
          request: z.string().optional(),
        }),
      ),
      async (c) => {
        const body = c.req.valid("json")
        return c.json(
          await Adaptation.artifactMatch({
            ...body,
            paths: body.paths ?? [],
            request: body.request ?? "",
          }),
        )
      },
    ),
)
