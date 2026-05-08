import fs from "fs/promises"
import { Identifier } from "@/id/id"
import { listProjectHabits } from "./habit"
import { compareCandidateToImported, compareCandidateToScratch } from "./llm"
import { getGlobalGuidance, getProjectGuidance } from "./profile"
import { getBinding } from "./session"
import { nowISO, projectFile, projectsRoot, readJSON, sessionFile, sessionsRoot, writeJSON } from "./storage"
import {
  type ExtractedHabitCandidate,
  ImportedHabitHit,
  type ImportedHabitComparison,
  ScratchHabit,
  type ScratchHabitComparison,
  ScratchReviewBatch,
  type ScopeRef,
} from "./types"

type Store = {
  items: ScratchHabit[]
  reviews: ScratchReviewBatch[]
  hits: Array<ReturnType<typeof ImportedHabitHit.parse>>
}

type ApplyResult = {
  created: ScratchHabit[]
  pending: ScratchHabit[]
  merged: ScratchHabit[]
  superseded: ScratchHabit[]
  hits: Array<ReturnType<typeof ImportedHabitHit.parse>>
  reviews: ScratchReviewBatch[]
}

export class ScratchComparatorError extends Error {
  constructor() {
    super("scratch comparator unavailable")
  }
}

const norm = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]+/giu, " ")
    .trim()
    .replace(/\s+/g, " ")

const tokens = (text: string) =>
  norm(text)
    .split(" ")
    .filter(Boolean)
    .filter((item) => item.length > 1)

const score = (a: string, b: string) => {
  if (!a || !b) return 0
  const x = new Set(tokens(a))
  const y = new Set(tokens(b))
  if (x.size === 0 || y.size === 0) return 0
  let hit = 0
  x.forEach((item) => {
    if (y.has(item)) hit += 1
  })
  return hit / Math.max(1, Math.min(x.size, y.size))
}

const neg = (text: string) => /不要|不用|别用|禁止|避免|do not|don't|avoid|no longer/iu.test(text)

const file = (session_id: string) => sessionFile(session_id, "scratch-habits.json")
const reviewFile = (session_id: string) => sessionFile(session_id, "scratch-conflicts.json")
const hitFile = (session_id: string) => sessionFile(session_id, "scratch-hits.json")
const oldFile = (project_id: string, session_id: string) => projectFile(project_id, "sessions", session_id, "scratch-habits.json")
const oldReviewFile = (project_id: string, session_id: string) =>
  projectFile(project_id, "sessions", session_id, "scratch-conflicts.json")

const loadItems = async (session_id: string, project_id?: string) => {
  const next = await readJSON<{ version: "v1"; updated_at: string; items: unknown[] } | undefined>(file(session_id), undefined)
  if (next) return next.items.map((item) => ScratchHabit.safeParse(item)).flatMap((row) => (row.success ? [row.data] : []))
  if (project_id) {
    const old = await readJSON<{ version: "v1"; updated_at: string; items: unknown[] } | undefined>(oldFile(project_id, session_id), undefined)
    if (old) return old.items.map((item) => ScratchHabit.safeParse(item)).flatMap((row) => (row.success ? [row.data] : []))
  }
  return [] as ScratchHabit[]
}

const loadReviews = async (session_id: string, project_id?: string) => {
  const next = await readJSON<{ version: "v1"; updated_at: string; items: unknown[] } | undefined>(reviewFile(session_id), undefined)
  if (next) return next.items.map((item) => ScratchReviewBatch.safeParse(item)).flatMap((row) => (row.success ? [row.data] : []))
  if (project_id) {
    const old = await readJSON<{ version: "v1"; updated_at: string; items: unknown[] } | undefined>(
      oldReviewFile(project_id, session_id),
      undefined,
    )
    if (old) return old.items.map((item) => ScratchReviewBatch.safeParse(item)).flatMap((row) => (row.success ? [row.data] : []))
  }
  return [] as Array<ReturnType<typeof ScratchReviewBatch.parse>>
}

const loadHits = async (session_id: string) => {
  const next = await readJSON<{ version: "v1"; updated_at: string; items: unknown[] } | undefined>(hitFile(session_id), undefined)
  if (!next) return [] as Array<ReturnType<typeof ImportedHabitHit.parse>>
  return next.items.map((item) => ImportedHabitHit.safeParse(item)).flatMap((row) => (row.success ? [row.data] : []))
}

const saveItems = async (session_id: string, items: ScratchHabit[]) => {
  await writeJSON(
    file(session_id),
    {
      version: "v1",
      updated_at: nowISO(),
      items,
    },
    "scratch-habits",
  )
}

const saveReviews = async (session_id: string, items: Array<ReturnType<typeof ScratchReviewBatch.parse>>) => {
  await writeJSON(
    reviewFile(session_id),
    {
      version: "v1",
      updated_at: nowISO(),
      items,
    },
    "scratch-conflicts",
  )
}

const saveHits = async (session_id: string, items: Array<ReturnType<typeof ImportedHabitHit.parse>>) => {
  await writeJSON(
    hitFile(session_id),
    {
      version: "v1",
      updated_at: nowISO(),
      items,
    },
    "scratch-hits",
  )
}

const itemId = () => `scratch_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
const reviewId = () => `scratch_review_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
const hitId = () => `scratch_hit_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`

const capture = (value: number) => {
  if (value >= 0.86) return "high" as const
  if (value >= 0.62) return "medium" as const
  return "low" as const
}

const summary = (text: string, max = 120) => (text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1))}…`)
const active = (item: ScratchHabit) => item.state === "active"
const open = (item: ScratchHabit) => item.state === "active" || item.state === "pending"

const uniq = <T,>(rows: T[]) => Array.from(new Set(rows))

const mergeEvidence = (a: ScratchHabit["evidence"], b: ExtractedHabitCandidate["evidence"]) => {
  const all = [...a, ...b]
  const seen = new Set<string>()
  return all.filter((row) => {
    const key = row.evidence_id || `${row.session_id}:${row.message_id ?? "review"}:${row.quote}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const stronger = (a: ScratchHabit["impact"], b: ExtractedHabitCandidate["impact"]) => {
  const rank = { low: 1, medium: 2, high: 3 }
  return rank[a] >= rank[b] ? a : b
}

const fromCandidate = (input: {
  project_id: string
  session_id: string
  candidate: ExtractedHabitCandidate
  state?: "active" | "pending"
  note?: string
  shadow_ids?: string[]
}) =>
  ScratchHabit.parse({
    id: itemId(),
    project_id: input.project_id,
    session_id: input.session_id,
    candidate_id: input.candidate.candidate_id,
    state: input.state ?? input.candidate.state_suggestion,
    kind: input.candidate.kind,
    summary: input.candidate.summary,
    canonical_text: input.candidate.canonical_text,
    text: input.candidate.canonical_text,
    text_norm: norm(input.candidate.canonical_text),
    impact: input.candidate.impact,
    explicit: input.candidate.explicit,
    temporary: input.candidate.temporary,
    confidence: input.candidate.confidence,
    scope_hint: input.candidate.scope_hint,
    traits: input.candidate.traits,
    capture_confidence: capture(input.candidate.confidence),
    capture_reason: input.candidate.explicit
      ? "用户明确提出了当前 session 需要遵守的局部要求。"
      : "LLM 从用户发言中识别出当前 session 习惯候选。",
    evidence: input.candidate.evidence,
    merged_from: [],
    shadow_ids: input.shadow_ids ?? [],
    conflicts: [],
    note: input.note,
    created_at: nowISO(),
    updated_at: nowISO(),
  })

const fromReview = (input: { project_id: string; session_id: string; text: string; note: string; shadow_ids?: string[] }) =>
  fromCandidate({
    project_id: input.project_id,
    session_id: input.session_id,
    state: "active",
    note: input.note,
    shadow_ids: input.shadow_ids,
    candidate: {
      candidate_id: `review:${Date.now().toString(36)}`,
      summary: summary(input.text),
      canonical_text: input.text.trim(),
      state_suggestion: "active",
      kind: "workflow_preference",
      impact: "high",
      explicit: true,
      temporary: true,
      confidence: 1,
      scope_hint: "session",
      traits: [],
      evidence: [
        {
          evidence_id: `review_ev_${Date.now().toString(36)}`,
          session_id: input.session_id,
          quote: input.text.trim(),
          reason: "用户在冲突审阅中输入了新的局部要求。",
          source: "review_input",
          source_role: "user",
          jump_scope: "session_local",
          created_at: nowISO(),
        },
      ],
    },
  })

const mark = (item: ScratchHabit, state: "superseded" | "invalidated" | "promoted" | "discarded", note: string, extra: Partial<ScratchHabit> = {}) =>
  ScratchHabit.parse({
    ...item,
    ...extra,
    state,
    note,
    updated_at: nowISO(),
  })

const mergeItem = (input: {
  item: ScratchHabit
  candidate: ExtractedHabitCandidate
  relation?: { merged_summary?: string; merged_canonical_text?: string }
}) =>
  ScratchHabit.parse({
    ...input.item,
    state: input.item.state === "pending" && input.candidate.state_suggestion === "active" ? "active" : input.item.state,
    summary: input.relation?.merged_summary?.trim() || input.candidate.summary,
    canonical_text: input.relation?.merged_canonical_text?.trim() || input.candidate.canonical_text,
    text: input.relation?.merged_canonical_text?.trim() || input.candidate.canonical_text,
    text_norm: norm(input.relation?.merged_canonical_text?.trim() || input.candidate.canonical_text),
    impact: stronger(input.item.impact, input.candidate.impact),
    explicit: input.item.explicit || input.candidate.explicit,
    temporary: input.item.temporary || input.candidate.temporary,
    confidence: Math.max(input.item.confidence, input.candidate.confidence),
    scope_hint: input.item.scope_hint || input.candidate.scope_hint,
    traits: uniq([...input.item.traits, ...input.candidate.traits]),
    capture_confidence:
      input.item.capture_confidence === "high" || capture(input.candidate.confidence) === "low"
        ? input.item.capture_confidence
        : capture(input.candidate.confidence),
    evidence: mergeEvidence(input.item.evidence, input.candidate.evidence),
    merged_from: uniq([...input.item.merged_from, input.candidate.candidate_id]),
    updated_at: nowISO(),
  })

const replace = (rows: ScratchHabit[], item: ScratchHabit) => rows.map((row) => (row.id === item.id ? item : row))

const chooseOverlap = (rows: ScratchHabit[], ids: string[]) =>
  rows
    .filter((row) => ids.includes(row.id))
    .sort((a, b) => {
      if (a.state !== b.state) return a.state === "active" ? -1 : 1
      return b.updated_at.localeCompare(a.updated_at)
    })[0]

const locate = async (session_id: string, project_id?: string) => project_id ?? (await getBinding(session_id)).project_id

const loadStore = async (session_id: string, project_id?: string): Promise<Store> => {
  const root = await locate(session_id, project_id)
  return {
    items: await loadItems(session_id, root),
    reviews: await loadReviews(session_id, root),
    hits: await loadHits(session_id),
  }
}

const saveStore = async (session_id: string, store: Store) => {
  await Promise.all([saveItems(session_id, store.items), saveReviews(session_id, store.reviews), saveHits(session_id, store.hits)])
}

const shadowed = (rows: ScratchHabit[]) => new Set(rows.filter(active).flatMap((row) => row.shadow_ids))

const imported = async (session_id: string, project_id: string, rows: ScratchHabit[]) => {
  const bind = await getBinding(session_id)
  const blocked = shadowed(rows)
  return (
    await listProjectHabits(project_id, {
      initiative_id: bind.initiative_id,
      task_scope_id: bind.task_scope_id,
      subject_ids: bind.subject_ids,
      current: true,
      habit_ids: bind.habit_ids,
    })
  ).filter((row) => !blocked.has(row.id))
}

export const listScratch = async (session_id: string, project_id?: string) => {
  const row = await loadStore(session_id, project_id)
  return row.items.sort((a, b) => b.updated_at.localeCompare(a.updated_at))
}

export const listScratchConflicts = async (session_id: string, project_id?: string) => {
  const row = await loadStore(session_id, project_id)
  return row.reviews.sort((a, b) => b.updated_at.localeCompare(a.updated_at))
}

export const listScratchHits = async (session_id: string, project_id?: string) => {
  const row = await loadStore(session_id, project_id)
  return row.hits.sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export const listProjectScratch = async (project_id: string) => {
  const next = await Promise.all(
    (
      await fs.readdir(sessionsRoot(), { withFileTypes: true }).catch(() => [])
    )
      .filter((item) => item.isDirectory())
      .map((item) => listScratch(item.name, project_id)),
  )
  const old = await Promise.all(
    (
      await fs.readdir(projectFile(project_id, "sessions"), { withFileTypes: true }).catch(() => [])
    )
      .filter((item) => item.isDirectory())
      .map((item) => listScratch(item.name, project_id)),
  )
  return [...next.flat(), ...old.flat()]
    .filter(active)
    .filter((item, idx, rows) => rows.findIndex((row) => row.id === item.id) === idx)
}

const listAllScratch = async () => {
  const next = await Promise.all(
    (
      await fs.readdir(sessionsRoot(), { withFileTypes: true }).catch(() => [])
    )
      .filter((item) => item.isDirectory())
      .map((item) => listScratch(item.name)),
  )
  const old = await Promise.all(
    (
      await fs.readdir(projectsRoot(), { withFileTypes: true }).catch(() => [])
    )
      .filter((item) => item.isDirectory())
      .map(async (proj) => {
        const dirs = await fs.readdir(projectFile(proj.name, "sessions"), { withFileTypes: true }).catch(() => [])
        const found = await Promise.all(dirs.filter((item) => item.isDirectory()).map((item) => listScratch(item.name, proj.name)))
        return found.flat()
      }),
  )
  return [...next.flat(), ...old.flat()].filter((item, idx, rows) => rows.findIndex((row) => row.id === item.id) === idx)
}

const similar = (item: ScratchHabit, rows: ScratchHabit[]) =>
  rows
    .filter((row) => row.id !== item.id)
    .filter(open)
    .filter((row) => score(item.canonical_text, row.canonical_text) >= 0.82)

export const reviewScratch = async (project_id: string) => {
  const rows = await listProjectScratch(project_id)
  const all = await listAllScratch()
  return rows.map((item) => {
    const dup = similar(item, all)
    return {
      ...item,
      similar_count: dup.length + 1,
      similar_session_count: new Set([item.session_id, ...dup.map((row) => row.session_id)]).size,
      similar_ids: dup.map((row) => row.id),
    }
  })
}

export const applyCandidate = async (input: {
  store: Store
  project_id: string
  session_id: string
  candidate: ExtractedHabitCandidate
  skip_ids?: Set<string>
  imported_relations?: Awaited<ReturnType<typeof compareCandidateToImported>>
  scratch_relations?: Awaited<ReturnType<typeof compareCandidateToScratch>>
}) => {
  const out: ApplyResult = {
    created: [],
    pending: [],
    merged: [],
    superseded: [],
    hits: [],
    reviews: [],
  }

  const currentImported = await imported(input.session_id, input.project_id, input.store.items)
  const importedRelations =
    input.imported_relations ??
    (await compareCandidateToImported({
      candidate: input.candidate,
      habits: currentImported,
    }))
  if (!importedRelations) throw new ScratchComparatorError()

  const importedOverlap = importedRelations.filter((row) => row.relation === "overlap")
  const importedConflict = importedRelations.filter((row) => row.relation === "conflict")

  for (const row of importedOverlap) {
    const hit = ImportedHabitHit.parse({
      id: hitId(),
      session_id: input.session_id,
      habit_id: row.habit_id,
      candidate_id: input.candidate.candidate_id,
      summary: input.candidate.summary,
      canonical_text: input.candidate.canonical_text,
      evidence: input.candidate.evidence,
      comparison_summary: row.comparison_summary,
      created_at: nowISO(),
    })
    input.store.hits.push(hit)
    out.hits.push(hit)
  }

  if (importedConflict.length > 0) {
    const review = ScratchReviewBatch.parse({
      id: reviewId(),
      project_id: input.project_id,
      session_id: input.session_id,
      kind: "imported_conflict",
      candidate: input.candidate,
      targets: importedConflict.map((row) => ({
        target_kind: "imported",
        target_id: row.habit_id,
        target_number: row.habit_number,
        conflict_kind: row.conflict_kind,
        comparison_summary: row.comparison_summary,
      })),
      status: "pending",
      created_at: nowISO(),
      updated_at: nowISO(),
    })
    input.store.reviews.push(review)
    out.reviews.push(review)
    return out
  }

  if (importedOverlap.length > 0) return out

  const rows = input.store.items.filter(open).filter((row) => !input.skip_ids?.has(row.id))
  const scratchRelations =
    input.scratch_relations ??
    (await compareCandidateToScratch({
      candidate: input.candidate,
      habits: rows,
    }))
  if (!scratchRelations) throw new ScratchComparatorError()

  const overlaps = scratchRelations.filter((row) => row.relation === "overlap")
  const conflicts = scratchRelations.filter((row) => row.relation === "conflict")

  if (overlaps.length > 0 && conflicts.length === 0) {
    const base = chooseOverlap(rows, overlaps.map((row) => row.scratch_id))
    if (base) {
      const rel = overlaps.find((row) => row.scratch_id === base.id)
      const merged = mergeItem({ item: base, candidate: input.candidate, relation: rel })
      input.store.items = replace(input.store.items, merged)
      out.merged.push(merged)
      return out
    }
  }

  if (conflicts.length > 0 && input.candidate.state_suggestion === "active") {
    const fresh = fromCandidate({
      project_id: input.project_id,
      session_id: input.session_id,
      candidate: input.candidate,
      state: "active",
    })
    const ids = conflicts.map((row) => row.scratch_id)
    input.store.items = input.store.items.map((row) =>
      ids.includes(row.id) ? mark(row, "superseded", "被当前 session 中更新的明确要求覆盖。", { superseded_by: fresh.id }) : row,
    )
    const stale = input.store.items.filter((row) => row.superseded_by === fresh.id)
    const next = ScratchHabit.parse({
      ...fresh,
      conflicts: ids,
    })
    input.store.items.push(next)
    out.created.push(next)
    out.superseded.push(...stale)
    return out
  }

  if (conflicts.length > 0) {
    const fresh = fromCandidate({
      project_id: input.project_id,
      session_id: input.session_id,
      candidate: input.candidate,
      state: "pending",
    })
    const activeConflicts = conflicts
      .map((row) => ({ row, item: rows.find((item) => item.id === row.scratch_id) }))
      .filter((row): row is { row: typeof conflicts[number]; item: ScratchHabit } => Boolean(row.item))
      .filter((row) => row.item.state === "active")
    const pendingConflicts = conflicts
      .map((row) => ({ row, item: rows.find((item) => item.id === row.scratch_id) }))
      .filter((row): row is { row: typeof conflicts[number]; item: ScratchHabit } => Boolean(row.item))
      .filter((row) => row.item.state === "pending")

    let review: ReturnType<typeof ScratchReviewBatch.parse> | undefined
    if (activeConflicts.length > 0) {
      review = ScratchReviewBatch.parse({
        id: reviewId(),
        project_id: input.project_id,
        session_id: input.session_id,
        kind: "scratch_conflict",
        candidate: input.candidate,
        scratch_id: fresh.id,
        targets: activeConflicts.map(({ row }) => ({
          target_kind: "scratch",
          target_id: row.scratch_id,
          target_number: row.scratch_number,
          conflict_kind: row.conflict_kind,
          comparison_summary: row.comparison_summary,
        })),
        status: "pending",
        created_at: nowISO(),
        updated_at: nowISO(),
      })
      input.store.reviews.push(review)
      out.reviews.push(review)
    }

    const next = ScratchHabit.parse({
      ...fresh,
      conflicts: uniq([
        ...(review ? [review.id] : []),
        ...pendingConflicts.map(({ item }) => item.id),
      ]),
    })

    input.store.items = input.store.items.map((row) =>
      pendingConflicts.some((item) => item.item.id === row.id)
        ? ScratchHabit.parse({
            ...row,
            conflicts: uniq([...row.conflicts, next.id]),
            updated_at: nowISO(),
          })
        : row,
    )
    input.store.items.push(next)
    out.pending.push(next)
    return out
  }

  const fresh = fromCandidate({
    project_id: input.project_id,
    session_id: input.session_id,
    candidate: input.candidate,
  })
  input.store.items.push(fresh)
  if (fresh.state === "active") out.created.push(fresh)
  else out.pending.push(fresh)
  return out
}

export const dismissScratch = async (input: { session_id: string; id: string }) => {
  const project_id = await locate(input.session_id)
  const store = await loadStore(input.session_id, project_id)
  store.items = store.items.map((item) => (item.id === input.id ? mark(item, "discarded", "用户在审查暂存习惯中丢弃。") : item))
  await saveStore(input.session_id, store)
  return store.items.find((item) => item.id === input.id)
}

export const activateScratch = async (input: { session_id: string; id: string }) => {
  const project_id = await locate(input.session_id)
  const store = await loadStore(input.session_id, project_id)
  const item = store.items.find((row) => row.id === input.id)
  if (!item) return
  if (item.state !== "pending") return item
  const next = ScratchHabit.parse({
    ...item,
    state: "active",
    note: "用户已确认这条暂存习惯在当前 session 生效。",
    updated_at: nowISO(),
  })
  store.items = replace(store.items, next)
  await saveStore(input.session_id, store)
  return next
}

export const resolveScratchReview = async (input: {
  session_id: string
  id: string
  action: "keep_existing" | "adopt_candidate" | "adopt_custom"
  text?: string
}) => {
  const project_id = await locate(input.session_id)
  const store = await loadStore(input.session_id, project_id)
  const review = store.reviews.find((row) => row.id === input.id)
  if (!review) return
  if (review.status !== "pending") return review

  if (input.action === "keep_existing") {
    const done = ScratchReviewBatch.parse({
      ...review,
      status: "resolved_keep_existing",
      resolution_note: "用户保留现有要求。",
      updated_at: nowISO(),
    })
    store.reviews = store.reviews.map((row) => (row.id === done.id ? done : row))
    await saveStore(input.session_id, store)
    return done
  }

  const shadow_ids = review.kind === "imported_conflict" ? review.targets.map((row) => row.target_id) : []
  const note =
    input.action === "adopt_candidate"
      ? "用户在冲突审阅中采用了新的 session 要求。"
      : "用户在冲突审阅中输入了新的局部要求。"
  const fresh =
    input.action === "adopt_candidate" && review.scratch_id
      ? (() => {
          const item = store.items.find((row) => row.id === review.scratch_id)
          if (!item) return undefined
          return ScratchHabit.parse({
            ...item,
            state: "active",
            note,
            shadow_ids: uniq([...item.shadow_ids, ...shadow_ids]),
            conflicts: uniq([...item.conflicts, ...review.targets.map((row) => row.target_id)]),
            updated_at: nowISO(),
          })
        })()
      : input.action === "adopt_candidate"
        ? fromCandidate({
            project_id,
            session_id: input.session_id,
            candidate: review.candidate,
            state: "active",
            note,
            shadow_ids,
          })
        : fromReview({
            project_id,
            session_id: input.session_id,
            text: input.text?.trim() || review.candidate.canonical_text,
            note,
            shadow_ids,
          })

  if (!fresh) return

  const target_ids = review.targets.filter((row) => row.target_kind === "scratch").map((row) => row.target_id)
  store.items = store.items.flatMap((row) => {
    if (row.id === review.scratch_id && input.action === "adopt_custom") {
      return [mark(row, "invalidated", "用户在冲突审阅中改写为新的局部要求。")]
    }
    if (target_ids.includes(row.id)) {
      return [mark(row, "superseded", "被当前冲突组中新的 session 要求覆盖。", { superseded_by: fresh.id })]
    }
    if (row.id === fresh.id) return [fresh]
    return [row]
  })

  if (!store.items.some((row) => row.id === fresh.id)) {
    store.items.push(fresh)
  }

  const done = ScratchReviewBatch.parse({
    ...review,
    status: input.action === "adopt_candidate" ? "resolved_adopt_candidate" : "resolved_adopt_custom",
    resolution_note: note,
    resolution_text: input.action === "adopt_custom" ? input.text?.trim() : undefined,
    resolved_scratch_id: fresh.id,
    updated_at: nowISO(),
  })
  store.reviews = store.reviews.map((row) => (row.id === done.id ? done : row))
  await saveStore(input.session_id, store)
  return done
}

export const setScratchState = async (input: {
  session_id: string
  id: string
  state: "promoted" | "invalidated"
  note: string
  promoted_proposal_id?: string
  promoted_habit_id?: string
}) => {
  const project_id = await locate(input.session_id)
  const store = await loadStore(input.session_id, project_id)
  store.items = store.items.map((item) =>
    item.id === input.id
      ? ScratchHabit.parse({
          ...item,
          state: input.state,
          note: input.note,
          promoted_proposal_id: input.promoted_proposal_id,
          promoted_habit_id: input.promoted_habit_id,
          updated_at: nowISO(),
        })
      : item,
  )
  await saveStore(input.session_id, store)
  return store.items.find((item) => item.id === input.id)
}

export const resolveSimilarScratch = async (input: {
  id: string
  promoted_proposal_id?: string
  promoted_habit_id?: string
}) => {
  const all = await listAllScratch()
  const base = all.find((item) => item.id === input.id)
  if (!base) return []
  const rows = similar(base, all)
  await Promise.all(
    rows.map(async (item) => {
      const store = await loadStore(item.session_id, item.project_id)
      store.items = store.items.map((old) =>
        old.id === item.id
          ? ScratchHabit.parse({
              ...old,
              state: "promoted",
              note: "相似暂存习惯已随同一条正式习惯入库处理。",
              promoted_proposal_id: input.promoted_proposal_id,
              promoted_habit_id: input.promoted_habit_id,
              updated_at: nowISO(),
            })
          : old,
      )
      await saveStore(item.session_id, store)
    }),
  )
  return rows
}

export const activeScratch = async (session_id: string) => {
  const rows = await listScratch(session_id)
  return rows.filter(active)
}

export const scratchSections = (rows: Awaited<ReturnType<typeof activeScratch>>) =>
  rows.map((item) => ({
    id: item.id,
    text: item.summary,
    source: "current_session_scratch",
  }))

export const scratchOptions = async (session_id: string) => {
  const bind = await getBinding(session_id)
  const [proj, global] = await Promise.all([getProjectGuidance(bind.project_id), getGlobalGuidance()])
  const out: ScopeRef[] = []

  if (bind.task_scope_id) {
    out.push({ level: "task_scope", target: bind.task_scope_id })
  }

  out.push(
    ...Array.from(new Set([...proj.task_scope_refs, ...global.task_scope_refs])).map((target) => ({
      level: "task_scope" as const,
      target,
    })),
  )

  if (bind.initiative_id) out.push({ level: "initiative", target: bind.initiative_id })

  out.push(
    ...Array.from(new Set([...bind.artifact_ids, ...proj.artifact_refs, ...global.artifact_refs])).map((target) => ({
      level: "artifact" as const,
      target,
    })),
    ...Array.from(new Set([...bind.subject_ids, ...proj.subject_ids, ...global.subject_ids])).map((target) => ({
      level: "subject" as const,
      target,
    })),
    { level: "global", target: "user" },
  )

  return Array.from(new Map(out.map((item) => [`${item.level}:${item.target}`, item])).values())
}

export const beginScratchSession = async (session_id: string, project_id?: string) => {
  return loadStore(session_id, project_id)
}

export const commitScratchSession = async (session_id: string, store: Store) => {
  await saveStore(session_id, store)
}

export const captureScratch = async (input: {
  project_id: string
  session_id: string
  message_id: string
  text: string
  classification: {
    impact: "high" | "medium" | "low"
    kind: string
    explicit: boolean
    temporary: boolean
    traits: string[]
    note: string
  }
}) => {
  const store = await beginScratchSession(input.session_id, input.project_id)
  const candidate = {
    candidate_id: `${input.message_id}:legacy`,
    summary: summary(input.classification.note || input.text),
    canonical_text: input.text.trim(),
    state_suggestion: input.classification.impact === "low" && !input.classification.explicit && !input.classification.temporary ? "pending" : "active",
    kind: input.classification.kind,
    impact: input.classification.impact,
    explicit: input.classification.explicit,
    temporary: input.classification.temporary,
    confidence: input.classification.impact === "high" ? 0.92 : input.classification.impact === "medium" ? 0.76 : 0.54,
    scope_hint: "session",
    traits: input.classification.traits,
    evidence: [
      {
        evidence_id: `${input.message_id}:legacy:1`,
        session_id: input.session_id,
        message_id: Identifier.schema("message").parse(input.message_id),
        quote: input.text.trim(),
        reason: input.classification.note || "legacy test capture",
        source: "user_message" as const,
        source_role: "user" as const,
        jump_scope: "session_local" as const,
        created_at: nowISO(),
      },
    ],
  } satisfies ExtractedHabitCandidate
  const currentImported = await imported(input.session_id, input.project_id, store.items)
  const rows = store.items.filter(open)
  const imported_relations: ImportedHabitComparison[] = currentImported.flatMap((item, i): ImportedHabitComparison[] => {
    const text = `${item.title} ${item.summary} ${item.triggers.join(" ")}`
    const hit = score(candidate.canonical_text, text)
    if (neg(candidate.canonical_text) !== neg(text) && hit >= 0.35) {
      return [
        {
          habit_id: item.id,
          habit_number: i + 1,
          relation: "conflict" as const,
          conflict_kind: "partial" as const,
          comparison_summary: "legacy heuristic conflict",
        },
      ]
    }
    if (hit >= 0.7) {
      return [
        {
          habit_id: item.id,
          habit_number: i + 1,
          relation: "overlap" as const,
          conflict_kind: null,
          comparison_summary: "legacy heuristic overlap",
        },
      ]
    }
    return []
  })
  const scratch_relations: ScratchHabitComparison[] = rows.flatMap((item, i): ScratchHabitComparison[] => {
    const hit = score(candidate.canonical_text, item.canonical_text)
    if (neg(candidate.canonical_text) !== neg(item.canonical_text) && hit >= 0.35) {
      return [
        {
          scratch_id: item.id,
          scratch_number: i + 1,
          relation: "conflict" as const,
          conflict_kind: "partial" as const,
          comparison_summary: "legacy heuristic conflict",
        },
      ]
    }
    if (hit >= 0.65) {
      return [
        {
          scratch_id: item.id,
          scratch_number: i + 1,
          relation: "overlap" as const,
          conflict_kind: null,
          comparison_summary: "legacy heuristic overlap",
          merged_summary: candidate.summary,
          merged_canonical_text: candidate.canonical_text,
        },
      ]
    }
    return []
  })
  const out = await applyCandidate({
    store,
    project_id: input.project_id,
    session_id: input.session_id,
    candidate,
    imported_relations,
    scratch_relations,
  })
  await commitScratchSession(input.session_id, store)
  return out
}
