import z from "zod"
import { HabitScopeLevel } from "./types"

export const ClassifierDecision = z.enum(["match", "new", "unsure"])

export const ClassifierBucketProfile = z.object({
  id: z.string().min(1),
  display_name: z.string().default(""),
  aliases: z.array(z.string()).default([]),
  summary: z.string().default(""),
  recent_evidence: z.array(z.string()).default([]),
})

export const ClassifierInput = z.object({
  layer: HabitScopeLevel,
  candidate_text: z.string().min(1),
  evidence_summaries: z.array(z.string()).default([]),
  context: z
    .object({
      session_id: z.string().optional(),
      project_id: z.string().optional(),
      subject_ids: z.array(z.string()).default([]),
    })
    .default(() => ({ subject_ids: [] as string[] })),
  buckets: z.array(ClassifierBucketProfile).default([]),
})

export const ClassifierResult = z.object({
  decision: ClassifierDecision,
  bucket_id: z.string().optional(),
  suggested_name: z.string().optional(),
  suggested_aliases: z.array(z.string()).default([]),
  candidates: z
    .array(
      z.object({
        bucket_id: z.string(),
        confidence: z.number().min(0).max(1),
      }),
    )
    .default([]),
  confidence: z.number().min(0).max(1),
  reasons: z.array(z.string()).default([]),
})

export type ClassifierInput = z.infer<typeof ClassifierInput>
export type ClassifierResult = z.infer<typeof ClassifierResult>
export type ClassifierBucketProfile = z.infer<typeof ClassifierBucketProfile>

export const AUTO_ROUTE_THRESHOLD = 0.85

const norm = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]+/giu, " ")
    .trim()

const tokens = (text: string) => new Set(norm(text).split(" ").filter((word) => word.length >= 2))

const jaccard = (a: Set<string>, b: Set<string>) => {
  if (a.size === 0 && b.size === 0) return 0
  let inter = 0
  for (const t of a) if (b.has(t)) inter += 1
  const union = a.size + b.size - inter
  return union === 0 ? 0 : inter / union
}

const score = (cand: Set<string>, bucket: ClassifierBucketProfile) => {
  const haystack = [bucket.display_name, ...bucket.aliases, bucket.summary, ...bucket.recent_evidence]
  const hay = tokens(haystack.join(" "))
  return jaccard(cand, hay)
}

export const classify = (input: ClassifierInput): ClassifierResult => {
  const parsed = ClassifierInput.parse(input)
  const cand = tokens([parsed.candidate_text, ...parsed.evidence_summaries].join(" "))

  const ranked = parsed.buckets
    .map((bucket) => ({ bucket, confidence: score(cand, bucket) }))
    .sort((a, b) => b.confidence - a.confidence)

  const top = ranked[0]
  const second = ranked[1]

  if (top && top.confidence >= AUTO_ROUTE_THRESHOLD) {
    return ClassifierResult.parse({
      decision: "match",
      bucket_id: top.bucket.id,
      confidence: top.confidence,
      reasons: [`token overlap ${top.confidence.toFixed(2)} with ${top.bucket.id}`],
    })
  }

  if (top && top.confidence >= 0.5 && (!second || top.confidence - second.confidence >= 0.1)) {
    return ClassifierResult.parse({
      decision: "unsure",
      candidates: ranked.slice(0, 3).map((row) => ({ bucket_id: row.bucket.id, confidence: row.confidence })),
      confidence: top.confidence,
      reasons: ["moderate match — needs review"],
    })
  }

  if (parsed.buckets.length === 0 || (top && top.confidence < 0.2)) {
    return ClassifierResult.parse({
      decision: "new",
      suggested_name: parsed.candidate_text.slice(0, 40),
      suggested_aliases: [],
      confidence: Math.max(0.6, 1 - (top?.confidence ?? 0)),
      reasons: ["no sufficiently-similar bucket"],
    })
  }

  return ClassifierResult.parse({
    decision: "unsure",
    candidates: ranked.slice(0, 3).map((row) => ({ bucket_id: row.bucket.id, confidence: row.confidence })),
    confidence: top?.confidence ?? 0,
    reasons: ["low overlap across buckets"],
  })
}
