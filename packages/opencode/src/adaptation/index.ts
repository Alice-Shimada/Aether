import { createHash } from "crypto"
import { listSubjects } from "./profile"
import { compileContext, getPacket } from "@/context/compile"
import { Artifact } from "@/artifact"
import { TaskScope } from "@/task-scope"
import { ensureMap } from "./project"
import { getBinding, patchBinding, syncBinding } from "./session"
import {
  getGlobalPolicy,
  getGlobalProfile,
  getInitiativePolicy,
  getInitiativeProfile,
  getProjectProfile,
  getSubjectPolicy,
  getSubjectProfile,
} from "./profile"
import { extractSignals, listSignals } from "./signal"
import { listSummaries, runSummary as runScopeSummary } from "./summary"
import {
  confirmProposal,
  deferProposal,
  getProposal,
  listPromotions,
  listProposals,
  mergeProposals,
  rebuildInbox,
  rejectProposal,
  resolveEvidence,
} from "./proposal"
import { ensure, nowISO, readJSON, contextPacketFile } from "./storage"
import { rebuildIndexes, ensureIndexes } from "./indexes"
import { AdaptationModel, type AdaptationModelMap } from "./model"
import { baselineFixtures } from "./fixtures"
import { AdaptationStatusView, ContextPacket, ProposalStatus, ScopeLevel, ScopeRef } from "./types"
import type { ProposalRecord } from "./types"
import { listProjectHabits, removeHabitSource, suppressHabitInProject } from "./habit"
import {
  activateScratch as enableScratch,
  dismissScratch as dropScratch,
  listProjectScratch,
  listScratch,
  listScratchConflicts,
  resolveSimilarScratch,
  reviewScratch,
  scratchOptions,
  setScratchState,
} from "./scratch"

export * from "./types"
export * as AdaptationStorage from "./storage"

const norm = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]+/giu, " ")
    .trim()
    .replace(/\s+/g, " ")
const sha = (parts: string[]) => createHash("sha1").update(parts.join("\0")).digest("hex").slice(0, 16)
const habitId = (scope: ScopeRef, text: string) => {
  const object =
    scope.level === "global"
      ? "global_policy"
      : scope.level === "subject"
        ? "subject_policy"
        : scope.level === "initiative"
          ? "initiative_policy"
          : "task_scope_policy"
  return `habit_${object}_${sha([object, scope.level, scope.target, norm(text)])}`
}

export namespace Adaptation {
  async function refresh(item: ProposalRecord, session_id?: string) {
    if (!session_id) return
    const map = await ensureMap({ session_id })
    const local = !item.project_id || item.project_id === map.project_id

    await patchBinding(session_id, {
      proposal_ids: [item.id],
    })
    await syncBinding(session_id, {
      ...(item.scope.level === "initiative" ? { initiative_id: item.scope.target } : {}),
      ...(item.scope.level === "task_scope" && local ? { task_scope_id: item.scope.target } : {}),
      ...(item.scope.level === "subject" ? { subject_ids: [item.scope.target] } : {}),
      ...(item.scope.level === "artifact" && local ? { artifact_ids: [item.scope.target] } : {}),
    })

    await compileContext({
      session_id,
      request_id: `confirm:${item.id}`,
      request: item.session_review?.reason || item.summary,
      budget: {
        max_sections: 8,
        max_chars: 4000,
      },
    }).catch(() => undefined)
  }

  export async function ready() {
    await ensure()
    await ensureIndexes()
    await rebuildInbox()
  }

  export async function status(session_id: string) {
    await ready()
    const map = await ensureMap({ session_id })
    const bind = await syncBinding(session_id, {
      project_id: map.project_id,
    })
    const raw = bind.context_packet_id
      ? await readJSON(contextPacketFile(bind.context_packet_id), bind.context_packet_snapshot).catch(() => bind.context_packet_snapshot)
      : bind.context_packet_snapshot
    const parsed = ContextPacket.safeParse(raw)
    const packet = parsed.success ? parsed.data : undefined
    const pending = await listProposals(["pending"])
    const scratch = await listScratch(session_id)

    return AdaptationStatusView.parse({
      session_id,
      project_id: map.project_id,
      initiative_id: bind.initiative_id,
      task_scope_id: bind.task_scope_id,
      subject_ids: bind.subject_ids,
      artifact_ids: bind.artifact_ids,
      habit_ids: bind.habit_ids,
      scratch_count: scratch.filter((item) => item.state === "active" || item.state === "pending").length,
      scratch_active_count: scratch.filter((item) => item.state === "active").length,
      scratch_pending_count: scratch.filter((item) => item.state === "pending").length,
      scratch_review_count: (await listProjectScratch(map.project_id)).length,
      context_packet_id: bind.context_packet_id,
      context_packet: packet,
      pending_count: pending.filter((item) => {
        if (item.session_review && item.session_review.session_id !== session_id) return false
        if (!item.project_id) return true
        return item.project_id === map.project_id
      }).length,
      used_records: packet?.audit?.used_records ?? [],
      omitted_reason: packet?.audit?.omitted_reason ?? [],
      updated_at: nowISO(),
    })
  }

  export async function compile(input: {
    session_id: string
    request_id: string
    request: string
    budget?: { max_sections?: number; max_chars?: number }
  }) {
    await ready()
    return compileContext(input)
  }

  export async function packet(id: string) {
    await ready()
    return getPacket(id)
  }

  export async function globalProfile() {
    await ready()
    return getGlobalProfile()
  }

  export async function globalPolicy() {
    await ready()
    return getGlobalPolicy()
  }

  export async function subjects() {
    await ready()
    return listSubjects()
  }

  export async function subjectProfile(id: string) {
    await ready()
    return getSubjectProfile(id)
  }

  export async function subjectPolicy(id: string) {
    await ready()
    return getSubjectPolicy(id)
  }

  export async function projectProfile(id: string) {
    await ready()
    return getProjectProfile(id)
  }

  export async function initiativeProfile(id: string) {
    await ready()
    return getInitiativeProfile(id)
  }

  export async function initiativePolicy(id: string) {
    await ready()
    return getInitiativePolicy(id)
  }

  export async function signals(input: { session_id?: string }) {
    await ready()
    return listSignals(input.session_id)
  }

  export async function extract(input: {
    session_id: string
    mode: "manual_current_session" | "after_response" | "after_summary"
    message_ids?: string[]
  }) {
    await ready()
    const picked = await extractSignals(input)
    const bind = await getBinding(input.session_id)
    const by_scope = new Map<string, string[]>()

    picked.signals.forEach((item) => {
      const key = `${item.scope.level}:${item.scope.target}`
      const row = by_scope.get(key)
      if (row) row.push(item.id)
      else by_scope.set(key, [item.id])
    })

    const summaries = await Promise.all(
      Array.from(by_scope.entries()).map(async ([key, ids]) => {
        const [level, target] = key.split(":")
        const parsed = ScopeLevel.safeParse(level)
        if (!parsed.success || parsed.data === "session") return undefined
        return runScopeSummary({
          scope: {
            level: parsed.data,
            target,
          },
          project_id: bind.project_id,
          initiative_id: bind.initiative_id,
          signal_ids: ids,
          mode: input.mode === "manual_current_session" ? "manual" : input.mode,
        })
      }),
    )

    const packs = summaries.filter((item): item is NonNullable<typeof item> => Boolean(item))
    const candidates = [...picked.proposal_candidates, ...packs.flatMap((item) => item.proposal_candidates)]
    const merged = candidates.length > 0 ? await mergeProposals(candidates) : undefined

    return {
      ...picked,
      summaries: packs.map((item) => item.summary).filter(Boolean),
      merged,
    }
  }

  export async function runSummary(input: {
    scope_level: "global" | "subject" | "initiative" | "task_scope" | "artifact"
    scope_id: string
    project_id?: string
    signal_ids?: string[]
    session_ids?: string[]
  }) {
    await ready()
    return runScopeSummary({
      scope: {
        level: input.scope_level,
        target: input.scope_id,
      },
      project_id: input.project_id,
      signal_ids: input.signal_ids,
      session_ids: input.session_ids,
      mode: "manual",
    })
  }

  export async function summaries(input: { scope_level?: string; scope_id?: string; project_id?: string }) {
    await ready()
    return listSummaries(input)
  }

  export async function proposals(status?: ProposalStatus[]) {
    await ready()
    const rows = await listProposals(status)
    return resolveEvidence(rows)
  }

  export async function proposal(id: string) {
    await ready()
    return getProposal(id)
  }

  export async function merge(input: { proposals: Parameters<typeof mergeProposals>[0] }) {
    await ready()
    return mergeProposals(input.proposals)
  }

  export async function confirm(id: string, review_note?: string, input: { session_id?: string; scope_choice?: ScopeRef } = {}) {
    await ready()
    const bind = input.session_id ? await getBinding(input.session_id) : undefined
    const item = await confirmProposal(id, review_note, {
      scope_choice: input.scope_choice,
      project_id: bind?.project_id,
    })
    await rebuildIndexes()
    if (item) await refresh(item, input.session_id)
    return item
  }

  export async function reject(id: string, review_note?: string) {
    await ready()
    return rejectProposal(id, review_note)
  }

  export async function defer(id: string, review_note?: string) {
    await ready()
    return deferProposal(id, review_note)
  }

  export async function promotions(status?: ProposalStatus[]) {
    await ready()
    return listPromotions(status)
  }

  export async function habits(session_id: string) {
    await ready()
    const map = await ensureMap({ session_id })
    const bind = await getBinding(session_id)
    return listProjectHabits(map.project_id, {
      initiative_id: bind.initiative_id,
      task_scope_id: bind.task_scope_id,
      subject_ids: bind.subject_ids,
      current: true,
      habit_ids: bind.habit_ids,
    })
  }

  export async function scratch(session_id: string) {
    await ready()
    return {
      items: await listScratch(session_id),
      conflicts: await listScratchConflicts(session_id),
      options: await scratchOptions(session_id),
    }
  }

  export async function scratchReview(session_id: string) {
    await ready()
    const map = await ensureMap({ session_id })
    return reviewScratch(map.project_id)
  }

  export async function activateScratch(input: { session_id: string; id: string }) {
    await ready()
    const item = await enableScratch(input)
    await compileContext({
      session_id: input.session_id,
      request_id: `scratch:activate:${input.id}`,
      request: item?.summary ?? "scratch activated",
      budget: {
        max_sections: 8,
        max_chars: 4000,
      },
    }).catch(() => undefined)
    return item
  }

  export async function dismissScratch(input: { session_id: string; id: string }) {
    await ready()
    const item = await dropScratch(input)
    await compileContext({
      session_id: input.session_id,
      request_id: `scratch:dismiss:${input.id}`,
      request: item?.summary ?? "scratch dismissed",
      budget: {
        max_sections: 8,
        max_chars: 4000,
      },
    }).catch(() => undefined)
    return item
  }

  export async function promoteScratch(input: { session_id: string; id: string; scope: ScopeRef; cleanup_duplicates?: boolean }) {
    await ready()
    const bind = await getBinding(input.session_id)
    const item = (await listScratch(input.session_id)).find((row) => row.id === input.id)
    if (!item) throw new Error("scratch habit not found")
    const scope = ScopeRef.parse(input.scope)
    const target =
      scope.level === "global" || scope.level === "subject"
        ? undefined
        : scope.level === "initiative"
          ? bind.project_id
          : bind.project_id
    const merged = await mergeProposals([
      {
        project_id: target,
        initiative_id: scope.level === "initiative" ? scope.target : bind.initiative_id,
        scope,
        kind: "workflow_principle",
        merge_key: `scratch:${item.id}:${scope.level}:${scope.target}`,
        summary: item.summary,
        impact: item.impact,
        confidence: 0.9,
        evidence_refs: item.evidence.map((row) => row.message_id),
        promotion: {
          source_scope: {
            level: "session",
            target: input.session_id,
          },
          target_scope: scope,
          kind: "scope_promotion",
          reason: "用户在审查暂存习惯中确认入库。",
        },
        future_effect: "确认后这条习惯会作为正式习惯进入习惯库，并继续参与后续 session 的匹配与引用。",
      },
    ])
    const proposal = [...merged.created, ...merged.merged].sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0]
    if (!proposal) throw new Error("failed to create proposal from scratch")
    const done = await confirmProposal(proposal.id, "用户在审查暂存习惯中确认入库。", {
      scope_choice: scope,
      project_id: bind.project_id,
    })
    await syncBinding(input.session_id, {
      ...(scope.level === "initiative" ? { initiative_id: scope.target } : {}),
      ...(scope.level === "task_scope" ? { task_scope_id: scope.target } : {}),
      ...(scope.level === "subject" ? { subject_ids: [scope.target] } : {}),
    })
    await rebuildIndexes()
    const next = await getBinding(input.session_id)
    const all = await listProjectHabits(bind.project_id, {
      initiative_id: next.initiative_id,
      task_scope_id: next.task_scope_id,
      subject_ids: next.subject_ids,
    })
    const imported = all.find(
      (row) => row.scope.level === scope.level && row.scope.target === scope.target && norm(row.summary) === norm(item.summary),
    )
    if (imported) {
      await patchBinding(input.session_id, {
        habit_ids: [imported.id],
      })
    }
    if (!imported) {
      await patchBinding(input.session_id, {
        habit_ids: [habitId(scope, item.summary)],
      })
    }
    await setScratchState({
      session_id: input.session_id,
      id: input.id,
      state: "promoted",
      note: "用户已确认把这条暂存习惯写入正式习惯库。",
      promoted_proposal_id: done?.id,
      promoted_habit_id: imported?.id,
    })
    const duplicates = input.cleanup_duplicates
      ? await resolveSimilarScratch({
          id: input.id,
          promoted_proposal_id: done?.id,
          promoted_habit_id: imported?.id,
        })
      : []
    await compileContext({
      session_id: input.session_id,
      request_id: `scratch:promote:${input.id}`,
      request: item.summary,
      budget: {
        max_sections: 8,
        max_chars: 4000,
      },
    }).catch(() => undefined)
    return {
      proposal: done,
      imported,
      duplicates,
    }
  }

  export async function removeHabit(input: {
    session_id: string
    habit_id: string
    scope_level: "initiative" | "task_scope"
    scope_id: string
    kind: "initiative_policy" | "task_scope" | "task_scope_policy"
  }) {
    await ready()
    return removeHabitSource(input)
  }

  export async function suppressHabit(input: {
    session_id: string
    habit_id: string
    scope_level: "initiative" | "task_scope"
    scope_id: string
    kind: "initiative_policy" | "task_scope" | "task_scope_policy"
    note?: string
  }) {
    await ready()
    return suppressHabitInProject(input)
  }

  export async function reindex() {
    await ready()
    return rebuildIndexes()
  }

  export function fixtures() {
    return baselineFixtures()
  }

  export async function taskScopeMatch(input: Parameters<typeof TaskScope.match>[0]) {
    await ready()
    return TaskScope.match(input)
  }

  export async function artifactMatch(input: Parameters<typeof Artifact.match>[0]) {
    await ready()
    return Artifact.match(input)
  }

  export async function getModel() {
    await ready()
    return AdaptationModel.get()
  }

  export async function setModel(input: Partial<AdaptationModelMap>) {
    await ready()
    return AdaptationModel.set(input)
  }
}
