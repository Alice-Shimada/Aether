import fs from "fs/promises"
import { initiativeFile, projectFile, readJSON, safeJoin, writeJSON, globalRoot, subjectsRoot, workspaceRoot, nowISO, ensureDir, initiativeRoot } from "./storage"
import {
  GlobalGuidance,
  InitiativePolicy,
  InitiativeProfile,
  ProjectGuidance,
  SubjectProfile,
  PolicyRecord,
} from "./types"

const emptyGuidance = () => ({
  version: "v1",
  updated_at: nowISO(),
  summary: "",
  stable_context: [],
  subject_ids: [],
  task_scope_refs: [],
  artifact_refs: [],
  ipk_piece_refs: [],
})

const emptyPolicy = (scope: { level: string; target: string }) => ({
  scope,
  response_policy: [],
  operation_policy: [],
  updated_at: nowISO(),
})

export const ensureProject = async (project_id: string) => {
  const root = projectFile(project_id)
  await ensureDir(root)

  const guidance = projectFile(project_id, "project-guidance.json")
  const proposal = projectFile(project_id, "proposals")
  await ensureDir(proposal)

  const p = await readJSON<ProjectGuidance | undefined>(guidance, undefined)
  if (!p) {
    await writeJSON(
      guidance,
      {
        ...emptyGuidance(),
        project_id,
      },
      "project-guidance",
    )
  }
}

export const ensureInitiative = async (initiative_id: string) => {
  const root = initiativeRoot(initiative_id)
  const proposal = initiativeFile(initiative_id, "proposals")
  await Promise.all([ensureDir(root), ensureDir(proposal)])

  const profile = initiativeFile(initiative_id, "initiative-profile.json")
  const policy = initiativeFile(initiative_id, "initiative-policy.json")

  const p = await readJSON<InitiativeProfile | undefined>(profile, undefined)
  if (!p) {
    await writeJSON(
      profile,
      {
        ...emptyGuidance(),
        initiative_id,
      },
      "initiative-profile",
    )
  }

  const x = await readJSON<InitiativePolicy | undefined>(policy, undefined)
  if (!x) {
    await writeJSON(
      policy,
      {
        version: "v1",
        initiative_id,
        updated_at: nowISO(),
        response_policy: [],
        operation_policy: [],
      },
      "initiative-policy",
    )
  }
}

export const globalGuidanceFile = () => safeJoin(workspaceRoot(), "global-guidance.json")
export const globalPolicyFile = () => safeJoin(globalRoot(), "global-policy.json")

export const subjectProfileFile = (subject_id: string) => safeJoin(subjectsRoot(), subject_id, "profile.json")
export const subjectPolicyFile = (subject_id: string) => safeJoin(subjectsRoot(), subject_id, "policy.json")

export const projectGuidanceFile = (project_id: string) => projectFile(project_id, "project-guidance.json")
export const initiativeProfileFile = (initiative_id: string) => initiativeFile(initiative_id, "initiative-profile.json")
export const initiativePolicyFile = (initiative_id: string) => initiativeFile(initiative_id, "initiative-policy.json")

export const getGlobalGuidance = async () => {
  const item = await readJSON(globalGuidanceFile(), {
    version: "v1",
    updated_at: nowISO(),
    summary: "",
    stable_context: [],
    subject_ids: [],
    task_scope_refs: [],
    artifact_refs: [],
    ipk_piece_refs: [],
  })
  return GlobalGuidance.parse(item)
}

export const getGlobalPolicy = async () => {
  const item = await readJSON(globalPolicyFile(), emptyPolicy({ level: "global", target: "user" }))
  return PolicyRecord.parse(item)
}

export const getSubjectProfile = async (subject_id: string) => {
  const file = subjectProfileFile(subject_id)
  const item = await readJSON(file, {
    version: "v1",
    subject_id,
    updated_at: nowISO(),
    summary: "",
    aliases: [],
    known_anchors: [],
    preferred_formalisms: [],
    response_preferences: {},
    confidence: 0,
    derived_from: [],
  })
  return SubjectProfile.parse(item)
}

export const getSubjectPolicy = async (subject_id: string) => {
  const file = subjectPolicyFile(subject_id)
  const item = await readJSON(file, emptyPolicy({ level: "subject", target: subject_id }))
  return PolicyRecord.parse(item)
}

export const listSubjects = async () => {
  const rows = await fs.readdir(subjectsRoot(), { withFileTypes: true }).catch(() => [])
  return rows
    .filter((item) => item.isDirectory())
    .map((item) => item.name)
    .sort((a, b) => a.localeCompare(b))
}

export const getProjectGuidance = async (project_id: string) => {
  await ensureProject(project_id)
  const item = await readJSON(projectGuidanceFile(project_id), {
    ...emptyGuidance(),
    project_id,
  })
  return ProjectGuidance.parse(item)
}

export const getInitiativeProfile = async (initiative_id: string) => {
  await ensureInitiative(initiative_id)
  const item = await readJSON(initiativeProfileFile(initiative_id), {
    ...emptyGuidance(),
    initiative_id,
  })
  return InitiativeProfile.parse(item)
}

export const getInitiativePolicy = async (initiative_id: string) => {
  await ensureInitiative(initiative_id)
  const item = await readJSON(initiativePolicyFile(initiative_id), {
    version: "v1",
    initiative_id,
    updated_at: nowISO(),
    response_policy: [],
    operation_policy: [],
  })
  return InitiativePolicy.parse(item)
}

export const putGlobalGuidance = async (value: GlobalGuidance) => {
  const next = {
    ...value,
    updated_at: nowISO(),
  }
  await writeJSON(globalGuidanceFile(), next, "global-guidance")
  return GlobalGuidance.parse(next)
}

export const putGlobalPolicy = async (value: PolicyRecord) => {
  const next = {
    ...value,
    updated_at: nowISO(),
  }
  await writeJSON(globalPolicyFile(), next, "global-policy")
  return PolicyRecord.parse(next)
}

export const putSubjectProfile = async (subject_id: string, value: SubjectProfile) => {
  const dir = safeJoin(subjectsRoot(), subject_id)
  await ensureDir(dir)
  const next = {
    ...value,
    subject_id,
    updated_at: nowISO(),
  }
  await writeJSON(subjectProfileFile(subject_id), next, "subject-profile")
  return SubjectProfile.parse(next)
}

export const putSubjectPolicy = async (subject_id: string, value: PolicyRecord) => {
  const dir = safeJoin(subjectsRoot(), subject_id)
  await ensureDir(dir)
  const next = {
    ...value,
    scope: { level: "subject", target: subject_id },
    updated_at: nowISO(),
  }
  await writeJSON(subjectPolicyFile(subject_id), next, "subject-policy")
  return PolicyRecord.parse(next)
}

export const putProjectGuidance = async (project_id: string, value: ProjectGuidance) => {
  await ensureProject(project_id)
  const next = {
    ...value,
    project_id,
    updated_at: nowISO(),
  }
  await writeJSON(projectGuidanceFile(project_id), next, "project-guidance")
  return ProjectGuidance.parse(next)
}

export const putInitiativeProfile = async (initiative_id: string, value: InitiativeProfile) => {
  await ensureInitiative(initiative_id)
  const next = {
    ...value,
    initiative_id,
    updated_at: nowISO(),
  }
  await writeJSON(initiativeProfileFile(initiative_id), next, "initiative-profile")
  return InitiativeProfile.parse(next)
}

export const putInitiativePolicy = async (initiative_id: string, value: InitiativePolicy) => {
  await ensureInitiative(initiative_id)
  const next = {
    ...value,
    initiative_id,
    updated_at: nowISO(),
  }
  await writeJSON(initiativePolicyFile(initiative_id), next, "initiative-policy")
  return InitiativePolicy.parse(next)
}
