import z from "zod"
import { Storage } from "@/storage/storage"
import { Identifier } from "@/id/id"
import { Session } from "@/session"
import { SessionID } from "@/session/schema"
import { Instance } from "@/project/instance"
import { bindingFile, nowISO, readJSON, writeJSON } from "./storage"

const SessionBinding = z.object({
  session_id: Identifier.schema("session"),
  project_id: z.string(),
  initiative_id: z.string().optional(),
  task_scope_id: Identifier.schema("scope").optional(),
  subject_ids: z.array(z.string()).default([]),
  artifact_ids: z.array(Identifier.schema("artifact")).default([]),
  habit_ids: z.array(z.string()).default([]),
  signal_ids: z.array(Identifier.schema("signal")).default([]),
  proposal_ids: z.array(Identifier.schema("proposal")).default([]),
  context_packet_id: Identifier.schema("packet").optional(),
  context_packet_snapshot: z.record(z.string(), z.unknown()).optional(),
  match_snapshot: z.record(z.string(), z.unknown()).optional(),
  created_at: z.string(),
  updated_at: z.string(),
})

type SessionBinding = z.infer<typeof SessionBinding>

const uniq = <T,>(items: T[]) => Array.from(new Set(items))

const key = (session_id: string) => ["adaptation", "sessions", session_id]

const fresh = (session_id: string, project_id: string): SessionBinding => {
  const stamp = nowISO()
  return {
    session_id: Identifier.schema("session").parse(session_id),
    project_id,
    subject_ids: [],
    artifact_ids: [],
    habit_ids: [],
    signal_ids: [],
    proposal_ids: [],
    created_at: stamp,
    updated_at: stamp,
  }
}

const mirror = async (item: SessionBinding) => {
  await writeJSON(bindingFile("sessions", item.session_id), item)
}

export const resolveProject = async (session_id: string) => {
  const item = await Session.get(SessionID.make(session_id)).catch(() => undefined)
  if (item?.projectID) return String(item.projectID)
  return String(Instance.project.id)
}

export const getBinding = async (session_id: string) => {
  const valid = Identifier.schema("session").parse(session_id)
  const item = await Storage.read<SessionBinding>(key(valid)).catch(() => undefined)
  if (item) return SessionBinding.parse(item)

  const file = bindingFile("sessions", valid)
  const disk = await readJSON<SessionBinding | undefined>(file, undefined)
  if (disk) {
    const parsed = SessionBinding.parse(disk)
    await Storage.write(key(valid), parsed)
    return parsed
  }

  const project_id = await resolveProject(valid)
  const next = fresh(valid, project_id)
  await Storage.write(key(valid), next)
  await mirror(next)
  return next
}

export const putBinding = async (item: SessionBinding) => {
  const next = SessionBinding.parse(item)
  await Storage.write(key(next.session_id), next)
  await mirror(next)
  return next
}

export const patchBinding = async (
  session_id: string,
  patch: Partial<
    Omit<
      SessionBinding,
      "session_id" | "project_id" | "created_at" | "updated_at" | "subject_ids" | "artifact_ids" | "habit_ids" | "signal_ids" | "proposal_ids"
    >
  > & {
    project_id?: string
    initiative_id?: string
    task_scope_id?: string
    subject_ids?: string[]
    artifact_ids?: string[]
    habit_ids?: string[]
    signal_ids?: string[]
    proposal_ids?: string[]
  },
) => {
  const old = await getBinding(session_id)
  const next = SessionBinding.parse({
    ...old,
    ...patch,
    project_id: patch.project_id ?? old.project_id,
    initiative_id: patch.initiative_id ?? old.initiative_id,
    task_scope_id: patch.task_scope_id ?? old.task_scope_id,
    subject_ids: patch.subject_ids ? uniq([...old.subject_ids, ...patch.subject_ids]) : old.subject_ids,
    artifact_ids: patch.artifact_ids ? uniq([...old.artifact_ids, ...patch.artifact_ids]) : old.artifact_ids,
    habit_ids: patch.habit_ids ? uniq([...old.habit_ids, ...patch.habit_ids]) : old.habit_ids,
    signal_ids: patch.signal_ids ? uniq([...old.signal_ids, ...patch.signal_ids]) : old.signal_ids,
    proposal_ids: patch.proposal_ids ? uniq([...old.proposal_ids, ...patch.proposal_ids]) : old.proposal_ids,
    updated_at: nowISO(),
  })
  await putBinding(next)
  return next
}

export const syncBinding = async (
  session_id: string,
  patch: Partial<
    Omit<SessionBinding, "session_id" | "created_at" | "updated_at" | "signal_ids" | "proposal_ids" | "habit_ids">
  > & {
    project_id?: string
    initiative_id?: string
    task_scope_id?: string
    subject_ids?: string[]
    artifact_ids?: string[]
    context_packet_id?: string
    context_packet_snapshot?: Record<string, unknown>
    match_snapshot?: Record<string, unknown>
  },
) => {
  const old = await getBinding(session_id)
  const next = SessionBinding.parse({
    ...old,
    ...("project_id" in patch ? { project_id: patch.project_id ?? old.project_id } : {}),
    ...("initiative_id" in patch ? { initiative_id: patch.initiative_id } : {}),
    ...("task_scope_id" in patch ? { task_scope_id: patch.task_scope_id } : {}),
    ...("subject_ids" in patch ? { subject_ids: uniq(patch.subject_ids ?? []) } : {}),
    ...("artifact_ids" in patch ? { artifact_ids: uniq(patch.artifact_ids ?? []) } : {}),
    ...("context_packet_id" in patch ? { context_packet_id: patch.context_packet_id } : {}),
    ...("context_packet_snapshot" in patch ? { context_packet_snapshot: patch.context_packet_snapshot } : {}),
    ...("match_snapshot" in patch ? { match_snapshot: patch.match_snapshot } : {}),
    updated_at: nowISO(),
  })
  await putBinding(next)
  return next
}

export const replaceHabitIDs = async (session_id: string, habit_ids: string[]) => {
  const old = await getBinding(session_id)
  const next = SessionBinding.parse({
    ...old,
    habit_ids: uniq(habit_ids),
    updated_at: nowISO(),
  })
  await putBinding(next)
  return next
}

export const clearPacket = async (session_id: string) => {
  const old = await getBinding(session_id)
  const next = {
    ...old,
    context_packet_id: undefined,
    context_packet_snapshot: undefined,
    updated_at: nowISO(),
  }
  await putBinding(next)
  return next
}

export const SessionBindingSchema = SessionBinding
