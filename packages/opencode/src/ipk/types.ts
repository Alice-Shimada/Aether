import z from "zod"
import { Identifier } from "@/id/id"

export const PieceType = z.enum(["idea", "knowledge", "thread", "review", "plan"])

export const DraftMode = z.enum(["new", "edit"])

export const DraftState = z.enum(["review", "stashed", "committed", "discarded"])

export const PieceMeta = z.object({
  id: Identifier.schema("piece"),
  type: PieceType,
  title: z.string(),
  emoji: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  origin: z.object({
    kind: z.enum(["chat", "wechat", "manual", "import", "book", "review"]),
    workspace_ref: z.string().optional(),
    session_id: Identifier.schema("session").optional(),
    message_range: z.array(Identifier.schema("message")).optional(),
  }),
  status: z.enum(["seed", "developing", "stable", "archived", "superseded"]),
  domains: z.array(z.string()).optional(),
  methods: z.array(z.string()).optional(),
  contexts: z.array(z.string()).optional(),
  projects: z.array(z.string()).optional(),
  sources: z
    .array(
      z.object({
        kind: z.string(),
        ref: z.string(),
      }),
    )
    .optional(),
})

export const PieceSurface = z.object({
  human: z.object({
    body_summary: z.string(),
  }),
  catalog: z.object({
    summary: z.string(),
    salience: z.number().min(0).max(1).optional(),
  }),
  retrieve: z.object({
    summary: z.string(),
    concepts: z.array(z.string()).optional(),
    problems: z.array(z.string()).optional(),
    questions: z.array(z.string()).optional(),
    claims: z.array(z.string()).optional(),
    assumptions: z.array(z.string()).optional(),
    open_questions: z.array(z.string()).optional(),
    keywords: z.array(z.string()).optional(),
    retrieval_hints: z.array(z.string()).optional(),
    role: z.enum(["idea", "evidence", "background", "method", "reflection"]).optional(),
  }),
  associate: z.object({
    summary: z.string(),
    concepts: z.array(z.string()).optional(),
    methods: z.array(z.string()).optional(),
    problems: z.array(z.string()).optional(),
    association_hints: z.array(z.string()).optional(),
    bridge_targets: z.array(z.string()).optional(),
    link_glimpse: z
      .array(
        z.object({
          target: z.string(),
          kind: z.string(),
          reason: z.string(),
        }),
      )
      .optional(),
    association_risk: z.enum(["low", "medium", "high"]).optional(),
  }),
})

export const PieceLinks = z.object({
  links: z.array(
    z.object({
      target: Identifier.schema("piece"),
      kind: z.enum([
        "related_to",
        "supports",
        "contradicts",
        "extends",
        "derived_from",
        "part_of",
        "inspired_by",
        "revisits",
        "uses_method",
        "answers",
      ]),
      strength: z.number().min(0).max(1).optional(),
      reason: z.string(),
    }),
  ),
})

export const DraftRecord = z.object({
  draft_id: Identifier.schema("draft"),
  mode: DraftMode,
  state: DraftState,
  session_id: Identifier.schema("session").optional(),
  message_ids: z.array(Identifier.schema("message")),
  piece_id: Identifier.schema("piece").optional(),
  title: z.string(),
  body_summary: z.string(),
  body: z.string(),
  meta: PieceMeta,
  surface: PieceSurface,
  links: PieceLinks,
  updated_at: z.string(),
  created_at: z.string(),
})

export const DraftView = z.object({
  draft_id: Identifier.schema("draft"),
  mode: DraftMode,
  state: DraftState,
  session_id: Identifier.schema("session").optional(),
  message_ids: z.array(Identifier.schema("message")),
  piece_id: Identifier.schema("piece").optional(),
  title: z.string(),
  body_summary: z.string(),
  body: z.string(),
  meta: PieceMeta,
  surface: PieceSurface,
  links: PieceLinks,
  updated_at: z.string(),
})

export const PieceCard = z.object({
  piece_id: Identifier.schema("piece"),
  title: z.string(),
  body_summary: z.string(),
  type: PieceType,
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  projects: z.array(z.string()),
})

export const SearchHit = z.object({
  piece_id: Identifier.schema("piece"),
  title: z.string(),
  summary: z.string(),
  role: z.string(),
  confidence: z.number().min(0).max(1),
  why: z.string(),
})

export const AssociateHit = z.object({
  piece_id: Identifier.schema("piece"),
  title: z.string(),
  summary: z.string(),
  bridge_reason: z.string(),
  risk: z.string(),
  confidence: z.number().min(0).max(1),
})

export type PieceType = z.infer<typeof PieceType>
export type DraftMode = z.infer<typeof DraftMode>
export type DraftState = z.infer<typeof DraftState>
export type DraftRecord = z.infer<typeof DraftRecord>
export type DraftView = z.infer<typeof DraftView>
export type PieceMeta = z.infer<typeof PieceMeta>
export type PieceSurface = z.infer<typeof PieceSurface>
export type PieceLinks = z.infer<typeof PieceLinks>
export type PieceCard = z.infer<typeof PieceCard>
export type SearchHit = z.infer<typeof SearchHit>
export type AssociateHit = z.infer<typeof AssociateHit>
