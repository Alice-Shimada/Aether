import { createHash } from "crypto"
import { Instance } from "@/project/instance"
import { Session } from "@/session"
import { SessionID } from "@/session/schema"
import { bindingFile, nowISO, readJSON, writeJSON } from "./storage"
import { ensureProject } from "./profile"

const hash = (value: string) => createHash("sha1").update(value).digest("hex").slice(0, 16)

export type ProjectMap = {
  project_id: string
  runtime: {
    kind: "aether_project" | "worktree_hash"
    id: string
    cwd_hint: string
  }
  created_at: string
  updated_at: string
}

const file = (project_id: string) => bindingFile("projects", project_id)

export const getMap = async (project_id: string) => {
  return await readJSON<ProjectMap | undefined>(file(project_id), undefined)
}

const resolveRuntime = async (session_id?: string) => {
  const session = session_id
    ? await Session.get(SessionID.make(session_id)).catch(() => undefined)
    : undefined
  const pid = session?.projectID ? String(session.projectID) : ""
  if (pid && pid !== "global") {
    return {
      project_id: pid,
      runtime: {
        kind: "aether_project" as const,
        id: pid,
        cwd_hint: Instance.directory,
      },
    }
  }

  const dir = Instance.worktree || Instance.directory
  return {
    project_id: `proj_${hash(dir)}`,
    runtime: {
      kind: "worktree_hash" as const,
      id: hash(dir),
      cwd_hint: Instance.directory,
    },
  }
}

export const ensureMap = async (input: { session_id?: string; project_id?: string } = {}) => {
  const seed = input.project_id
    ? {
        project_id: input.project_id,
        runtime: {
          kind: "aether_project" as const,
          id: input.project_id,
          cwd_hint: Instance.directory,
        },
      }
    : await resolveRuntime(input.session_id)

  const old = await getMap(seed.project_id)
  if (old) {
    const next: ProjectMap = {
      ...old,
      runtime: seed.runtime,
      updated_at: nowISO(),
    }
    await writeJSON(file(seed.project_id), next)
    await ensureProject(seed.project_id)
    return next
  }

  const stamp = nowISO()
  const next: ProjectMap = {
    project_id: seed.project_id,
    runtime: seed.runtime,
    created_at: stamp,
    updated_at: stamp,
  }
  await writeJSON(file(seed.project_id), next)
  await ensureProject(seed.project_id)
  return next
}
