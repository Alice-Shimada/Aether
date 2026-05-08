import fs from "fs/promises"
import path from "path"
import { createHash } from "crypto"
import { Identifier } from "@/id/id"
import {
  GlobalGuidance,
  InitiativePolicy,
  InitiativeProfile,
  PolicyRecord,
  ProjectGuidance,
  ProposalRecord,
  ProposalStatus,
  HabitScopeLevel,
  ScopeRef,
  SubjectProfile,
} from "./types"
import type { ProposalCandidate } from "./signal"
import { listSignals } from "./signal"
import {
  artifactsRoot,
  artifactRoot,
  bindingsRoot,
  ensureDir,
  initiativeFile,
  initiativesRoot,
  indexesRoot,
  nowISO,
  projectsRoot,
  proposalsRoot,
  readJSON,
  safeJoin,
  sessionFile,
  taskScopesRoot,
  writeJSON,
  remove,
} from "./storage"
import {
  getGlobalPolicy,
  getGlobalGuidance,
  getInitiativePolicy,
  getInitiativeProfile,
  getProjectGuidance,
  getSubjectPolicy,
  getSubjectProfile,
  putGlobalPolicy,
  putGlobalGuidance,
  putInitiativePolicy,
  putInitiativeProfile,
  putProjectGuidance,
  putSubjectPolicy,
  putSubjectProfile,
} from "./profile"
import { scopePolicyFile, scopeProposalRoot, scopeRecordFile } from "@/task-scope/storage"
import { artifactRecordFile } from "@/artifact/storage"
import { getBinding, patchBinding, replaceHabitIDs } from "./session"

const statusList: ProposalStatus[] = ["pending", "confirmed", "rejected", "deferred"]

type InboxEntry = {
  id: string
  scope: ScopeRef
  status: ProposalStatus
  impact: "low" | "medium" | "high"
  updated_at: string
  path: string
}

type Inbox = {
  version: "v1"
  updated_at: string
  entries: InboxEntry[]
}

type Cooldown = {
  version: "v1"
  updated_at: string
  keys: Record<string, string>
}

type ConfirmInput = {
  scope_choice?: ScopeRef
  project_id?: string
}

const inboxFile = () => safeJoin(indexesRoot(), "proposal-inbox.json")
const cooldownFile = () => safeJoin(indexesRoot(), "proposal-cooldown.json")
const scopeProposalDir = (scope_id: string, status: ProposalStatus) => safeJoin(scopeProposalRoot(scope_id), status)
const artifactProposalDir = (artifact_id: string, status: ProposalStatus) => safeJoin(artifactRoot(artifact_id), "proposals", status)
const sessionProposalDir = (session_id: string, status: ProposalStatus) => sessionFile(session_id, "proposals", status)

const loadInbox = async () =>
  readJSON<Inbox>(inboxFile(), {
    version: "v1",
    updated_at: nowISO(),
    entries: [],
  })

const saveInbox = async (input: Inbox) => {
  await writeJSON(inboxFile(), {
    ...input,
    updated_at: nowISO(),
  })
}

const loadCooldown = async () =>
  readJSON<Cooldown>(cooldownFile(), {
    version: "v1",
    updated_at: nowISO(),
    keys: {},
  })

const saveCooldown = async (input: Cooldown) => {
  await writeJSON(cooldownFile(), {
    ...input,
    updated_at: nowISO(),
  })
}

const scopeDir = async (scope: ScopeRef, status: ProposalStatus, project_id?: string) => {
  if (scope.level === "global" || scope.level === "subject") {
    const dir = safeJoin(proposalsRoot(), status)
    await ensureDir(dir)
    return dir
  }

  if (scope.level === "initiative") {
    const dir = initiativeFile(scope.target, "proposals", status)
    await ensureDir(dir)
    return dir
  }

  if (!project_id) throw new Error("project_id is required for task/artifact/session proposals")

  if (scope.level === "session") {
    const dir = sessionProposalDir(scope.target, status)
    await ensureDir(dir)
    return dir
  }

  if (scope.level === "task_scope") {
    const dir = scopeProposalDir(scope.target, status)
    await ensureDir(dir)
    return dir
  }

  const dir = artifactProposalDir(scope.target, status)
  await ensureDir(dir)
  return dir
}

const scopeFile = async (item: ProposalRecord, status: ProposalStatus) => {
  const dir = await scopeDir(item.scope, status, item.project_id)
  return safeJoin(dir, `${item.id}.json`)
}

const walk = async (dir: string) => {
  const rows = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
  const out: string[] = []
  for (const row of rows) {
    const file = safeJoin(dir, row.name)
    if (row.isDirectory()) {
      const kids = await walk(file)
      out.push(...kids)
      continue
    }
    if (row.isFile() && file.endsWith(".json")) out.push(file)
  }
  return out
}

const listFiles = async () => {
  const roots = [proposalsRoot(), initiativesRoot(), bindingsRoot(), projectsRoot(), taskScopesRoot(), artifactsRoot()]
  const rows = await Promise.all(roots.map((item) => walk(item)))
  return rows
    .flat()
    .filter((item) => item.includes(`${path.sep}proposals${path.sep}`) && !item.endsWith(".md") && !item.endsWith("inbox.json"))
}

const key = (item: {
  merge_key: string
  scope: ScopeRef
  target_patch?: { object?: string; id?: string }
  session_review?: { session_id: string; mode: string; habit_id: string }
}) =>
  [
    item.scope.level,
    item.scope.target,
    item.merge_key,
    item.target_patch?.object ?? "",
    item.target_patch?.id ?? "",
    item.session_review?.session_id ?? "",
    item.session_review?.mode ?? "",
    item.session_review?.habit_id ?? "",
  ].join(":")

const norm = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]+/giu, " ")
    .trim()
    .replace(/\s+/g, " ")

const hash = (text: string) => createHash("sha1").update(text).digest("hex").slice(0, 14)

const quote = (text: string, max = 180) => (text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1))}…`)

const fromCandidate = (item: ProposalCandidate): ProposalRecord =>
  ProposalRecord.parse({
    id: Identifier.ascending("proposal"),
    project_id: item.project_id,
    initiative_id: item.initiative_id,
    created_at: nowISO(),
    updated_at: nowISO(),
    scope: item.scope,
    kind: item.kind,
    merge_key: item.merge_key,
    summary: item.summary,
    impact: item.impact,
    confidence: item.confidence,
    evidence_refs: item.evidence_refs,
    merged_from: [],
    promotion: item.promotion,
    scope_choice: item.session_review
      ? undefined
      : {
          suggested: item.promotion?.target_scope ?? item.scope,
          decided_by: "system",
          reason: item.promotion?.reason ?? "系统根据提取到的习惯性质建议作用域。",
        },
    session_review: item.session_review,
    target_patch: item.target_patch,
    future_effect: item.future_effect,
    status: "pending",
  })

const mergeRows = (old: ProposalRecord, item: ProposalCandidate) =>
  ProposalRecord.parse({
    ...old,
    initiative_id: old.initiative_id ?? item.initiative_id,
    updated_at: nowISO(),
    summary: old.summary.length >= item.summary.length ? old.summary : item.summary,
    confidence: Math.max(old.confidence, item.confidence),
    impact: old.impact === "high" || item.impact === "high" ? "high" : old.impact,
    evidence_refs: Array.from(new Set([...old.evidence_refs, ...item.evidence_refs])),
    merged_from: Array.from(new Set([...old.merged_from, item.merge_key])),
    session_review: old.session_review ?? item.session_review,
    scope_choice:
      old.scope_choice ??
      (item.session_review
        ? undefined
        : ({
            suggested: item.promotion?.target_scope ?? item.scope,
            decided_by: "system",
            reason: item.promotion?.reason ?? "系统根据提取到的习惯性质建议作用域。",
          } as const)),
  })

const setStatus = async (item: ProposalRecord, status: ProposalStatus, old?: string) => {
  const next = ProposalRecord.parse({
    ...item,
    status,
    updated_at: nowISO(),
  })
  const file = await scopeFile(next, status)
  await writeJSON(file, next, "proposal")
  if (old && old !== file) {
    await remove(old).catch(() => undefined)
    await remove(`${old.slice(0, -5)}.md`).catch(() => undefined)
  }
  return {
    item: next,
    file,
  }
}

const loadByPath = async (file: string) => {
  const row = await readJSON<ProposalRecord | undefined>(file, undefined)
  if (!row) return
  const parsed = ProposalRecord.safeParse(row)
  if (!parsed.success) return

  const match = file.match(new RegExp(`${path.sep}proposals${path.sep}(pending|confirmed|rejected|deferred)${path.sep}`))
  if (!match) return
  const status = ProposalStatus.parse(match[1])
  return {
    file,
    item: ProposalRecord.parse({
      ...parsed.data,
      status,
    }),
  }
}

export const rebuildInbox = async () => {
  const rows = await listFiles()
  const list = await Promise.all(rows.map((item) => loadByPath(item)))
  const entries = list
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .map((item) => ({
      id: item.item.id,
      scope: item.item.scope,
      status: item.item.status,
      impact: item.item.impact,
      updated_at: item.item.updated_at,
      path: item.file,
    }))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))

  await saveInbox({
    version: "v1",
    updated_at: nowISO(),
    entries,
  })

  return entries
}

const ensureInbox = async () => {
  const box = await loadInbox()
  if (box.entries.length > 0) return box.entries
  return rebuildInbox()
}

const mergeValue = (old: Record<string, unknown>, patch: Record<string, unknown>) => {
  const next: Record<string, unknown> = {
    ...old,
  }

  for (const [k, v] of Object.entries(patch)) {
    if (Array.isArray(v) && Array.isArray(next[k])) {
      const set = new Map<string, unknown>()
      ;[...((next[k] as unknown[]) ?? []), ...v].forEach((item) => {
        if (item && typeof item === "object" && "text" in item && typeof (item as Record<string, unknown>).text === "string") {
          set.set(`text:${norm((item as Record<string, string>).text)}`, item)
          return
        }
        if (item && typeof item === "object" && "id" in item) {
          set.set(`id:${String((item as Record<string, unknown>).id)}`, item)
          return
        }
        set.set(JSON.stringify(item), item)
      })
      next[k] = Array.from(set.values())
      continue
    }
    if (v && typeof v === "object" && !Array.isArray(v) && next[k] && typeof next[k] === "object" && !Array.isArray(next[k])) {
      next[k] = {
        ...(next[k] as Record<string, unknown>),
        ...(v as Record<string, unknown>),
      }
      continue
    }
    next[k] = v
  }

  return next
}

const policyText = (item: ProposalRecord) => {
  const rows = item.target_patch?.payload.operation_policy
  const first = Array.isArray(rows) ? rows[0] : undefined
  if (first && typeof first === "object" && "text" in first && typeof first.text === "string") return first.text
  return item.summary
}

const policyLine = (item: ProposalRecord, scope: ScopeRef) => ({
  id: `pol_${scope.level}_${hash(`${scope.level}:${scope.target}:${policyText(item)}`)}`,
  text: quote(policyText(item), 180),
  impact: item.impact,
  source: `proposal:${item.id}`,
  confirmed: true,
  updated_at: nowISO(),
})

const scopedPatch = (item: ProposalRecord, scope: ScopeRef, project_id?: string) => {
  if (scope.level === "global") {
    return {
      object: "global_policy" as const,
      id: "user",
      fields: ["operation_policy"],
      payload: {
        operation_policy: [policyLine(item, scope)],
      },
    }
  }

  if (scope.level === "subject") {
    return {
      object: "subject_policy" as const,
      id: scope.target,
      fields: ["operation_policy"],
      payload: {
        operation_policy: [policyLine(item, scope)],
      },
    }
  }

  if (scope.level === "initiative") {
    return {
      object: "initiative_policy" as const,
      id: scope.target,
      fields: ["operation_policy"],
      payload: {
        operation_policy: [policyLine(item, scope)],
      },
    }
  }

  if (scope.level === "task_scope") {
    if (!project_id) throw new Error("task scope choice requires project_id")
    return {
      object: "task_scope_policy" as const,
      id: scope.target,
      fields: ["operation_policy"],
      payload: {
        operation_policy: [policyLine(item, scope)],
      },
    }
  }

  return item.target_patch
}

const chooseScope = (item: ProposalRecord, input: ConfirmInput = {}) => {
  const pick = input.scope_choice
  if (!pick) return item

  const selected = ScopeRef.parse(pick)
  const same = selected.level === item.scope.level && selected.target === item.scope.target
  const project_id = selected.level === "global" || selected.level === "subject" ? undefined : input.project_id ?? item.project_id
  const initiative_id = selected.level === "initiative" ? selected.target : item.initiative_id
  const suggested = item.scope_choice?.suggested ?? item.promotion?.target_scope ?? item.scope

  if (same) {
    return ProposalRecord.parse({
      ...item,
      initiative_id: selected.level === "initiative" ? selected.target : item.initiative_id,
      scope_choice: {
        suggested,
        selected,
        decided_by: "user",
        reason: "用户在习惯审查中确认了建议作用域。",
      },
    })
  }

  const level = HabitScopeLevel.parse(selected.level)
  if (!["global", "subject", "initiative", "task_scope"].includes(level)) {
    throw new Error(`unsupported proposal scope choice: ${level}`)
  }

  return ProposalRecord.parse({
    ...item,
    initiative_id,
    project_id: selected.level === "global" || selected.level === "subject" ? undefined : project_id,
    scope: selected,
    promotion: {
      source_scope: item.promotion?.source_scope ?? item.scope,
      target_scope: selected,
      kind: "user_scope_choice",
      reason: "用户在习惯审查中直接指定了作用域。",
    },
    scope_choice: {
      suggested,
      selected,
      decided_by: "user",
      reason: "用户在习惯审查中直接指定了作用域。",
    },
    relations: [
      ...item.relations,
      {
        kind: "derived_from",
        from: item.scope,
        to: selected,
        ref: item.id,
        note: "用户确认时改变作用域；保留来源关系而不把旧记录当作孤立删除。",
        created_at: nowISO(),
      },
    ],
    target_patch: scopedPatch(item, selected, project_id),
    future_effect:
      selected.level === "global"
          ? "确认后该习惯会作为全局规则参与后续会话的上下文检索。"
          : selected.level === "subject"
            ? "确认后该习惯会在相同主题下参与后续上下文检索。"
          : selected.level === "initiative"
            ? "确认后该习惯会在当前长期事项内跨任务复用。"
            : "确认后该习惯会在当前任务范围内优先应用。",
  })
}

const patchTarget = async (item: ProposalRecord) => {
  const patch = item.target_patch
  if (!patch) return

  if (patch.object === "global_guidance") {
    const row = await getGlobalGuidance()
    await putGlobalGuidance(GlobalGuidance.parse(mergeValue(row as unknown as Record<string, unknown>, patch.payload)))
    return
  }

  if (patch.object === "global_policy") {
    const row = await getGlobalPolicy()
    await putGlobalPolicy(PolicyRecord.parse(mergeValue(row as unknown as Record<string, unknown>, patch.payload)))
    return
  }

  if (patch.object === "subject_profile") {
    const row = await getSubjectProfile(patch.id)
    await putSubjectProfile(
      patch.id,
      SubjectProfile.parse(mergeValue(row as unknown as Record<string, unknown>, patch.payload)),
    )
    return
  }

  if (patch.object === "subject_policy") {
    const row = await getSubjectPolicy(patch.id)
    await putSubjectPolicy(
      patch.id,
      PolicyRecord.parse(mergeValue(row as unknown as Record<string, unknown>, patch.payload)),
    )
    return
  }

  if (patch.object === "project_guidance") {
    const row = await getProjectGuidance(patch.id)
    await putProjectGuidance(
      patch.id,
      ProjectGuidance.parse(mergeValue(row as unknown as Record<string, unknown>, patch.payload)),
    )
    return
  }

  if (patch.object === "initiative_profile") {
    const row = await getInitiativeProfile(patch.id)
    await putInitiativeProfile(
      patch.id,
      InitiativeProfile.parse(mergeValue(row as unknown as Record<string, unknown>, patch.payload)),
    )
    return
  }

  if (patch.object === "initiative_policy") {
    const row = await getInitiativePolicy(patch.id)
    await putInitiativePolicy(
      patch.id,
      InitiativePolicy.parse(mergeValue(row as unknown as Record<string, unknown>, patch.payload)),
    )
    return
  }

  if (patch.object === "task_scope" || patch.object === "task_scope_policy") {
    if (!item.project_id) throw new Error("task scope proposal requires project_id")
    const file = patch.object === "task_scope" ? scopeRecordFile(patch.id) : scopePolicyFile(patch.id)
    const row = await readJSON<Record<string, unknown>>(file, {})
    const next = mergeValue(row, patch.payload)
    await writeJSON(file, next, patch.object === "task_scope" ? "scope" : "policy")
    return
  }

  if (patch.object === "artifact_contract") {
    if (!item.project_id) throw new Error("artifact proposal requires project_id")
    const file = artifactRecordFile(patch.id)
    const row = await readJSON<Record<string, unknown>>(file, {})
    const next = mergeValue(row, patch.payload)
    await writeJSON(file, next, "artifact")
    return
  }
}

const applySessionReview = async (item: ProposalRecord) => {
  if (!item.session_review) return
  const bind = await getBinding(item.session_review.session_id)

  if (item.session_review.mode === "suggest_add") {
    await patchBinding(item.session_review.session_id, {
      habit_ids: [item.session_review.habit_id],
    })
    return
  }

  if (item.session_review.mode === "suggest_remove") {
    await replaceHabitIDs(
      item.session_review.session_id,
      bind.habit_ids.filter((id) => id !== item.session_review?.habit_id),
    )
    return
  }

  if (item.session_review.mode === "suggest_replace" && item.session_review.replacement_id) {
    await replaceHabitIDs(
      item.session_review.session_id,
      Array.from(
        new Set(
          bind.habit_ids
            .filter((id) => id !== item.session_review?.habit_id)
            .concat(item.session_review.replacement_id),
        ),
      ),
    )
    return
  }
}

export const mergeProposals = async (candidates: ProposalCandidate[]) => {
  const list = await listProposals(["pending", "deferred"])
  const cool = await loadCooldown()
  const now = Date.now()
  const created: ProposalRecord[] = []
  const merged: ProposalRecord[] = []
  const skipped: { reason: string; merge_key: string }[] = []

  const text = (item: ProposalCandidate) => {
    const payload = item.target_patch?.payload
    if (payload && typeof payload === "object" && "operation_policy" in payload) {
      const rows = (payload as { operation_policy?: unknown[] }).operation_policy
      const first = Array.isArray(rows) ? rows[0] : undefined
      if (first && typeof first === "object" && "text" in first && typeof first.text === "string") {
        return first.text
      }
    }
    return item.summary
  }

  for (const cand of candidates) {
    const until = cool.keys[cand.merge_key]
    if (until && new Date(until).getTime() > now) {
      skipped.push({ reason: "cooldown", merge_key: cand.merge_key })
      continue
    }

    const same = list.find((item) => key(item) === key(cand))
    if (same) {
      const next = mergeRows(same, cand)
      const old = await findPath(same.id)
      const moved = await setStatus(next, same.status, old)
      merged.push(moved.item)
      continue
    }

    const next = fromCandidate(cand)
    const moved = await setStatus(next, "pending")
    created.push(moved.item)
    list.push(moved.item)
  }

  await rebuildInbox()

  return {
    created,
    merged,
    skipped,
    pending: await listProposals(["pending"]),
  }
}

const findPath = async (id: string) => {
  const list = await ensureInbox()
  return list.find((item) => item.id === id)?.path
}

export const listProposals = async (status?: ProposalStatus[]) => {
  const list = await ensureInbox()
  const keep = status && status.length > 0 ? new Set(status) : undefined
  const rows = await Promise.all(
    list
      .filter((item) => (keep ? keep.has(item.status) : true))
      .map(async (item) => {
        const row = await readJSON<ProposalRecord | undefined>(item.path, undefined)
        if (!row) return
        const parsed = ProposalRecord.safeParse({
          ...row,
          status: item.status,
        })
        if (!parsed.success) return
        return parsed.data
      }),
  )
  return rows.filter((item): item is ProposalRecord => Boolean(item)).sort((a, b) => b.updated_at.localeCompare(a.updated_at))
}

export const getProposal = async (id: string) => {
  const file = await findPath(id)
  if (!file) return
  const row = await readJSON<ProposalRecord | undefined>(file, undefined)
  if (!row) return
  const match = file.match(new RegExp(`${path.sep}proposals${path.sep}(pending|confirmed|rejected|deferred)${path.sep}`))
  const status = ProposalStatus.parse(match?.[1] ?? row.status)
  return ProposalRecord.parse({
    ...row,
    status,
  })
}

const settle = async (
  id: string,
  status: ProposalStatus,
  review_note?: string,
  update?: (item: ProposalRecord) => Promise<ProposalRecord | void> | ProposalRecord | void,
) => {
  const file = await findPath(id)
  if (!file) return
  const item = await getProposal(id)
  if (!item) return
  const patched = (await update?.(item)) ?? item

  const next = ProposalRecord.parse({
    ...patched,
    review_note,
    cooldown_until:
      status === "rejected"
        ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString()
        : status === "deferred"
          ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString()
          : patched.cooldown_until,
  })

  const done = await setStatus(next, status, file)

  if (status === "rejected") {
    const cool = await loadCooldown()
    cool.keys[next.merge_key] = done.item.cooldown_until ?? new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString()
    await saveCooldown(cool)
  }

  if (status === "confirmed") {
    const src = done.item.promotion?.source_scope
    if (src?.level === "session") {
      await patchBinding(src.target, {
        proposal_ids: [done.item.id],
      })
    }
  }

  await rebuildInbox()
  return done.item
}

export const confirmProposal = async (id: string, review_note?: string, input: ConfirmInput = {}) => {
  return settle(id, "confirmed", review_note, async (item) => {
    if (!["pending", "deferred"].includes(item.status)) throw new Error("proposal is not confirmable")
    const next = chooseScope(item, input)
    await patchTarget(next)
    await applySessionReview(next)
    return next
  })
}

export const rejectProposal = async (id: string, review_note?: string) => {
  return settle(id, "rejected", review_note)
}

export const deferProposal = async (id: string, review_note?: string) => {
  return settle(id, "deferred", review_note)
}

export const listPromotions = async (status?: ProposalStatus[]) => {
  const rows = await listProposals(status)
  return rows.filter((item) => Boolean(item.promotion))
}

export type ResolvedEvidence = {
  signal_id: string
  session_id: string
  message_id: string
  quote: string
}

export type ProposalWithEvidence = ProposalRecord & {
  resolved_evidence: ResolvedEvidence[]
}

const clean = (text: string) => text.replace(/\s+/g, " ").trim()

/** @internal Exported for testing */
export const uniqEvidence = (rows: ResolvedEvidence[]) => {
  const msg = new Set<string>()
  const quote = new Set<string>()
  const out: ResolvedEvidence[] = []
  const list = [...rows].sort((a, b) => b.quote.length - a.quote.length)
  for (const row of list) {
    const m = `${row.session_id}:${row.message_id}`
    if (msg.has(m)) continue
    const q = clean(row.quote)
    if (q && quote.has(q)) continue
    msg.add(m)
    if (q) quote.add(q)
    out.push({
      ...row,
      quote: q || row.quote.trim(),
    })
  }
  return out
}

export const resolveEvidence = async (proposals: ProposalRecord[]): Promise<ProposalWithEvidence[]> => {
  const allRefs = new Set<string>()
  proposals.forEach((p) => p.evidence_refs.forEach((r) => allRefs.add(r)))
  if (allRefs.size === 0) return proposals.map((p) => ({ ...p, resolved_evidence: [] }))

  const signals = await listSignals()
  const signalMap = new Map(signals.map((s) => [s.id, s]))

  return proposals.map((p) => {
    const evidence: ResolvedEvidence[] = []
    for (const ref of p.evidence_refs) {
      const signal = signalMap.get(ref)
      if (!signal) continue
      for (const ev of signal.evidence) {
        evidence.push({
          signal_id: signal.id,
          session_id: signal.session_id,
          message_id: ev.ref,
          quote: ev.quote,
        })
      }
    }
    const rows = uniqEvidence(evidence)
    return {
      ...p,
      resolved_evidence: rows.slice(0, 3),
    }
  })
}
