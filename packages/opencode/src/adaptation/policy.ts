import { InitiativePolicy, PolicyLine, PolicyRecord } from "./types"

const score = (value: string) => {
  if (value === "session") return 6
  if (value === "artifact") return 5
  if (value === "task_scope") return 4
  if (value === "initiative") return 3
  if (value === "subject") return 2
  if (value === "global") return 1
  return 0
}

const line = (items: PolicyLine[]) =>
  items
    .slice()
    .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? "") || a.id.localeCompare(b.id))

export const mergePolicy = (input: {
  session?: { response_policy?: PolicyLine[]; operation_policy?: PolicyLine[] }
  artifact?: PolicyRecord
  task_scope?: PolicyRecord
  initiative?: InitiativePolicy
  subject?: PolicyRecord
  global?: PolicyRecord
}) => {
  const response: PolicyLine[] = []
  const operation: PolicyLine[] = []
  const used: string[] = []
  const omit: string[] = []

  const seen = new Set<string>()
  const push = (items: PolicyLine[], out: PolicyLine[], source: string) => {
    for (const item of line(items)) {
      const key = `${item.id}:${item.text}`
      if (seen.has(key)) {
        omit.push(`${source} omitted duplicate ${item.id}`)
        continue
      }
      seen.add(key)
      used.push(`${source}:${item.id}`)
      if (source === "session") continue
      out.push(item)
    }
  }

  const rows = [
    ["session", input.session?.response_policy ?? [], input.session?.operation_policy ?? []],
    ["artifact", input.artifact?.response_policy ?? [], input.artifact?.operation_policy ?? []],
    ["task_scope", input.task_scope?.response_policy ?? [], input.task_scope?.operation_policy ?? []],
    ["initiative", input.initiative?.response_policy ?? [], input.initiative?.operation_policy ?? []],
    ["subject", input.subject?.response_policy ?? [], input.subject?.operation_policy ?? []],
    ["global", input.global?.response_policy ?? [], input.global?.operation_policy ?? []],
  ] as const

  rows
    .slice()
    .sort((a, b) => score(b[0]) - score(a[0]))
    .forEach((row) => {
      push(row[1], response, row[0])
      push(row[2], operation, row[0])
    })

  return {
    response,
    operation,
    used,
    omit,
  }
}

export const renderPolicy = (input: { response: PolicyLine[]; operation: PolicyLine[]; max?: number }) => {
  const max = input.max ?? 4
  const out: string[] = []

  if (input.response.length > 0) {
    out.push("Response policy:")
    input.response
      .slice(0, max)
      .forEach((item) => out.push(`- ${item.text}`))
  }

  if (input.operation.length > 0) {
    out.push("Operation policy:")
    input.operation
      .slice(0, max)
      .forEach((item) => out.push(`- ${item.text}`))
  }

  return out.join("\n")
}
