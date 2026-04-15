import { ScopeMatchInput } from "./types"
import { bindScopeSession, createScope, getScope, listScopes, patchScope } from "./storage"
import { matchScope } from "./matcher"

export * from "./types"
export * as ScopeStorage from "./storage"

export namespace TaskScope {
  export async function list(project_id: string) {
    return listScopes(project_id)
  }

  export async function create(input: { project_id: string; title: string; kind: string; goal: string; active_subjects?: string[] }) {
    return createScope(input)
  }

  export async function get(project_id: string, scope_id: string) {
    return getScope(project_id, scope_id)
  }

  export async function patch(
    project_id: string,
    scope_id: string,
    patch: Partial<{
      status_summary: string
      done: string[]
      open_question_refs: Array<{ artifact_id: string; path: string; note?: string }>
      decision_refs: Array<{ artifact_id: string; path: string; note?: string }>
      linked_pieces: string[]
      artifacts: string[]
      open_questions: string[]
      decisions: string[]
      principles: string[]
    }>,
  ) {
    return patchScope(project_id, scope_id, patch)
  }

  export async function bindSession(input: { project_id: string; scope_id: string; session_id: string }) {
    return bindScopeSession(input.project_id, input.scope_id, input.session_id)
  }

  export async function match(input: ScopeMatchInput) {
    return matchScope(ScopeMatchInput.parse(input))
  }
}
