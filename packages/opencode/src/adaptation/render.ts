const stamp = (value: unknown) => {
  if (!value || typeof value !== "object") return ""
  const row = value as Record<string, unknown>
  const keys = ["updated_at", "created_at"]
  for (const key of keys) {
    const item = row[key]
    if (typeof item === "string" && item) return item
  }
  return ""
}

const line = (title: string, value: string) => `- **${title}**: ${value || "-"}`

const rows = (title: string, list: string[]) => {
  if (list.length === 0) return `## ${title}\n\n- 无\n`
  return `## ${title}\n\n${list.map((item) => `- ${item}`).join("\n")}\n`
}

const list = (value: unknown) => {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item)).filter(Boolean)
}

const section = (title: string, value: unknown) => {
  if (!value) return `## ${title}\n\n- 无\n`
  if (Array.isArray(value)) return rows(title, value.map((item) => String(item)))
  if (typeof value !== "object") return `## ${title}\n\n- ${String(value)}\n`
  const row = value as Record<string, unknown>
  const text = Object.entries(row)
    .map(([k, v]) => `- **${k}**: ${typeof v === "string" ? v : JSON.stringify(v)}`)
    .join("\n")
  return `## ${title}\n\n${text || "- 无"}\n`
}

const header = (title: string, scope: string, value: unknown, pending?: boolean) => {
  const out = [
    `# ${title}`,
    "",
    line("updated_at", stamp(value) || "-"),
    line("scope", scope),
    line("status", pending ? "pending" : "confirmed"),
    "",
    "> JSON 为真源，Markdown 为镜像。请通过系统接口修改 JSON。",
    "",
  ]
  return out.join("\n")
}

export const renderMirror = (kind: string, value: unknown) => {
  const row = (value && typeof value === "object" ? (value as Record<string, unknown>) : {}) as Record<string, unknown>
  if (kind === "global-guidance") {
    return [
      header("Global Guidance", "workspace-global", value, false),
      section("Summary", row.summary),
      section("Stable Context", row.stable_context),
      section("Subject Refs", row.subject_ids),
      section("Task Scope Refs", row.task_scope_refs),
      section("Artifact Refs", row.artifact_refs),
      section("IPK Piece Refs", row.ipk_piece_refs),
    ].join("\n")
  }
  if (kind === "global-policy") {
    return [
      header("Global Policy", "global", value, false),
      section("Response Policy", row.response_policy),
      section("Operation Policy", row.operation_policy),
    ].join("\n")
  }
  if (kind === "subject-profile") {
    return [
      header("Subject Profile", `subject:${String(row.subject_id ?? "")}`, value, false),
      section("Summary", row.summary),
      section("Aliases", row.aliases),
      section("Known Anchors", row.known_anchors),
      section("Preferred Formalisms", row.preferred_formalisms),
      section("Evidence Refs", row.derived_from),
    ].join("\n")
  }
  if (kind === "subject-policy") {
    const scope = row.scope && typeof row.scope === "object" ? row.scope : {}
    return [
      header("Subject Policy", `subject:${String((scope as Record<string, unknown>).target ?? "")}`, value, false),
      section("Response Policy", row.response_policy),
      section("Operation Policy", row.operation_policy),
    ].join("\n")
  }
  if (kind === "project-guidance") {
    return [
      header("Project Guidance", `project:${String(row.project_id ?? "")}`, value, false),
      section("Summary", row.summary),
      section("Stable Context", row.stable_context),
      section("Subject Refs", row.subject_ids),
      section("Task Scope Refs", row.task_scope_refs),
      section("Artifact Refs", row.artifact_refs),
      section("IPK Piece Refs", row.ipk_piece_refs),
    ].join("\n")
  }
  if (kind === "initiative-profile") {
    return [
      header("Initiative Profile", `initiative:${String(row.initiative_id ?? "")}`, value, false),
      section("Summary", row.summary),
      section("Stable Context", row.stable_context),
      section("Subject Refs", row.subject_ids),
      section("Task Scope Refs", row.task_scope_refs),
      section("Artifact Refs", row.artifact_refs),
      section("IPK Piece Refs", row.ipk_piece_refs),
    ].join("\n")
  }
  if (kind === "initiative-policy") {
    return [
      header("Initiative Policy", `initiative:${String(row.initiative_id ?? "")}`, value, false),
      section("Response Policy", row.response_policy),
      section("Operation Policy", row.operation_policy),
    ].join("\n")
  }
  if (kind === "scope") {
    return [
      header("Task Scope", `scope:${String(row.id ?? "")}`, value, false),
      section("Goal", row.goal),
      section("Status", row.status_summary),
      section("Principles", row.principles),
      section("Artifacts", row.artifacts),
      section("Open Questions", row.open_questions),
      section("Decision Refs", row.decision_refs),
    ].join("\n")
  }
  if (kind === "policy") {
    const scope = row.scope && typeof row.scope === "object" ? row.scope : {}
    const level = String((scope as Record<string, unknown>).level ?? "")
    const target = String((scope as Record<string, unknown>).target ?? "")
    return [
      header("Scope Policy", `${level}:${target}`, value, false),
      section("Response Policy", row.response_policy),
      section("Operation Policy", row.operation_policy),
    ].join("\n")
  }
  if (kind === "artifact") {
    return [
      header("Artifact Contract", `artifact:${String(row.id ?? "")}`, value, !Boolean(row.confirmed)),
      section("Role", row.role),
      section("Path", row.path),
      section("Format", row.format),
      section("Write Mode", row.write_mode),
      section("Update Triggers", row.update_triggers),
      section("Partner Artifacts", row.partner_artifacts),
    ].join("\n")
  }
  if (kind === "proposal") {
    const scope = row.scope && typeof row.scope === "object" ? row.scope : {}
    const level = String((scope as Record<string, unknown>).level ?? "")
    const target = String((scope as Record<string, unknown>).target ?? "")
    return [
      header("Proposal", `${level}:${target}`, value, String(row.status ?? "") === "pending"),
      section("Summary", row.summary),
      section("Impact", row.impact),
      section("Future Effect", row.future_effect),
      section("Evidence Refs", row.evidence_refs),
      section("Target Patch", row.target_patch),
    ].join("\n")
  }
  if (kind === "scratch-habits") {
    return [
      header("Session Scratch Habits", `session:${String(row.session_id ?? "")}`, value, false),
      section("Items", row.items),
    ].join("\n")
  }
  if (kind === "scratch-conflicts") {
    return [
      header("Session Scratch Conflicts", `session:${String(row.session_id ?? "")}`, value, false),
      section("Items", row.items),
    ].join("\n")
  }
  return [header("Adaptation Record", "unknown", value, false), section("Content", row)].join("\n")
}

export const short = (value: unknown) => {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {}
  if (typeof row.summary === "string" && row.summary) return row.summary
  if (typeof row.title === "string" && row.title) return row.title
  const items = list(row.highlights)
  if (items.length > 0) return items[0]
  return ""
}
