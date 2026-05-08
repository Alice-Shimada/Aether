import { createContext, createEffect, createMemo, createSignal, onCleanup, type Component, type JSX, useContext } from "solid-js"
import { useParams } from "@solidjs/router"
import { showToast } from "@opencode-ai/ui/toast"
import { useGlobalSDK } from "@/context/global-sdk"
import { usePlatform } from "@/context/platform"
import { useServer } from "@/context/server"
import { decode64 } from "@/utils/base64"

type Scope = {
  level: string
  target: string
}

type ContextSection = {
  kind: string
  source: string
  id: string
  text: string
}

type ContextPacket = {
  id: string
  request_id: string
  session_id: string
  project_id: string
  initiative_id?: string
  task_scope_id?: string
  subject_ids: string[]
  artifact_ids: string[]
  habit_ids?: string[]
  scratch_ids?: string[]
  sections: ContextSection[]
  audit: {
    used_records: string[]
    omitted_reason: string[]
  }
  created_at: string
}

type AdaptationStatus = {
  session_id: string
  project_id: string
  initiative_id?: string
  task_scope_id?: string
  subject_ids: string[]
  artifact_ids: string[]
  habit_ids?: string[]
  scratch_count: number
  scratch_active_count?: number
  scratch_pending_count?: number
  scratch_review_count: number
  context_packet_id?: string
  context_packet?: ContextPacket
  pending_count: number
  used_records: string[]
  omitted_reason: string[]
  updated_at: string
}

type ResolvedEvidence = {
  signal_id: string
  session_id: string
  message_id: string
  quote: string
}

type Proposal = {
  id: string
  project_id?: string
  initiative_id?: string
  merge_key?: string
  scope: Scope
  session_review?: {
    session_id: string
    mode: "suggest_add" | "suggest_keep_attention" | "suggest_remove" | "suggest_replace" | "suggest_rescope"
    habit_id: string
    habit_scope?: Scope
    replacement_id?: string
    reason: string
  }
  promotion?: {
    source_scope: Scope
    target_scope: Scope
    kind: string
    reason: string
  }
  scope_choice?: {
    suggested?: Scope
    selected?: Scope
    decided_by: "system" | "user"
    reason: string
  }
  summary: string
  impact: "low" | "medium" | "high"
  confidence: number
  evidence_refs: string[]
  resolved_evidence: ResolvedEvidence[]
  target_patch?: {
    object: string
    id: string
    fields: string[]
  }
  future_effect: string
  status: "pending" | "confirmed" | "rejected" | "deferred"
  review_note?: string
  cooldown_until?: string
  created_at?: string
  updated_at: string
}

type Habit = {
  id: string
  scope: Scope
  kind: string
  title: string
  summary: string
  impact: "low" | "medium" | "high"
  confidence: number
  target_ref: {
    object: string
    path: string
    fields: string[]
  }
}

type Scratch = {
  id: string
  project_id: string
  session_id: string
  candidate_id?: string
  state: "pending" | "active" | "superseded" | "invalidated" | "promoted" | "discarded"
  kind: string
  summary: string
  canonical_text: string
  text: string
  text_norm: string
  impact: "low" | "medium" | "high"
  explicit: boolean
  temporary: boolean
  confidence: number
  scope_hint: string
  traits: string[]
  capture_confidence: "low" | "medium" | "high"
  capture_reason: string
  evidence: Array<{
    evidence_id: string
    session_id: string
    message_id?: string
    quote: string
    reason: string
    source: "user_message" | "review_input"
    created_at: string
  }>
  merged_from: string[]
  shadow_ids: string[]
  conflicts: string[]
  superseded_by?: string
  note?: string
  promoted_proposal_id?: string
  promoted_habit_id?: string
  similar_count?: number
  similar_session_count?: number
  similar_ids?: string[]
  created_at: string
  updated_at: string
}

type ScratchReview = {
  id: string
  project_id: string
  session_id: string
  kind: "imported_conflict" | "scratch_conflict"
  scratch_id?: string
  candidate: {
    candidate_id: string
    summary: string
    canonical_text: string
    state_suggestion: "active" | "pending"
    kind: string
    impact: "low" | "medium" | "high"
    explicit: boolean
    temporary: boolean
    confidence: number
    scope_hint: string
    traits: string[]
    evidence: Scratch["evidence"]
  }
  targets: Array<{
    target_kind: "imported" | "scratch"
    target_id: string
    target_number: number
    conflict_kind: "full" | "partial" | null
    comparison_summary: string
  }>
  status:
    | "pending"
    | "resolved_keep_existing"
    | "resolved_adopt_candidate"
    | "resolved_adopt_custom"
  resolution_note?: string
  resolution_text?: string
  resolved_scratch_id?: string
  created_at: string
  updated_at: string
}

type ScratchHit = {
  id: string
  session_id: string
  habit_id: string
  candidate_id: string
  summary: string
  canonical_text: string
  evidence: Scratch["evidence"]
  comparison_summary: string
  created_at: string
}

type ScratchOption = {
  level: string
  target: string
}

type OrganizeResult = {
  signals: Array<{ id: string }>
  candidates?: Array<{ candidate_id: string }>
  summaries: Array<{ id: string }>
  scratch?: {
    created: string[]
    pending: string[]
    merged: string[]
    superseded: string[]
    reviews: string[]
    hits: string[]
  }
  merged?: {
    created: Proposal[]
    merged: Proposal[]
    pending: Proposal[]
  }
}

export type AdaptationModelRef = {
  providerID: string
  modelID: string
}

export type AdaptationModelKind = "signal_extract" | "summary_aggregate" | "proposal_generate" | "semantic_merge" | "scope_match"

export type AdaptationModelMap = {
  signal_extract?: AdaptationModelRef
  summary_aggregate?: AdaptationModelRef
  proposal_generate?: AdaptationModelRef
  semantic_merge?: AdaptationModelRef
  scope_match?: AdaptationModelRef
}

export type AdaptationModelConfig = {
  version: "v1"
  updated_at: string
  models: AdaptationModelMap
}

type Context = {
  status: () => AdaptationStatus | undefined
  pending: () => Proposal[]
  deferred: () => Proposal[]
  habits: () => Habit[]
  scratch: () => Scratch[]
  scratchConflicts: () => ScratchReview[]
  scratchReview: () => Scratch[]
  scratchOptions: () => ScratchOption[]
  loading: () => boolean
  error: () => string | undefined
  current: () => string | undefined
  setSession: (session_id?: string) => Promise<void>
  refresh: () => Promise<void>
  organize: () => Promise<OrganizeResult | undefined>
  confirm: (id: string, review_note?: string, scope_choice?: Scope) => Promise<void>
  reject: (id: string, review_note?: string) => Promise<void>
  defer: (id: string, review_note?: string) => Promise<void>
  promoteScratch: (id: string, scope: Scope, session_id?: string, cleanup_duplicates?: boolean) => Promise<void>
  activateScratch: (id: string, session_id?: string) => Promise<void>
  dismissScratch: (id: string, session_id?: string) => Promise<void>
  resolveScratchReview: (
    id: string,
    action: "keep_existing" | "adopt_candidate" | "adopt_custom",
    text?: string,
    session_id?: string,
  ) => Promise<void>
  removeSource: (item: Pick<Habit, "id" | "scope" | "kind">) => Promise<void>
  getModels: () => Promise<AdaptationModelConfig>
  setModels: (models: Partial<AdaptationModelMap>) => Promise<AdaptationModelConfig | undefined>
}

const AdaptationContext = createContext<Context>()

const text = async (res: Response) => {
  const raw = await res.text().catch(() => "request failed")
  if (!raw) return "request failed"
  return raw
}

export const AdaptationProvider: Component<{ children: JSX.Element }> = (props) => {
  const sdk = useGlobalSDK()
  const server = useServer()
  const platform = usePlatform()
  const params = useParams()
  const dir = createMemo(() => (params.dir ? decode64(params.dir) ?? "" : ""))

  const [session, setSession] = createSignal<string>()
  const [loading, setLoading] = createSignal(false)
  const [error, setError] = createSignal<string>()
  const [status, setStatus] = createSignal<AdaptationStatus>()
  const [pending, setPending] = createSignal<Proposal[]>([])
  const [deferred, setDeferred] = createSignal<Proposal[]>([])
  const [habits, setHabits] = createSignal<Habit[]>([])
  const [scratch, setScratch] = createSignal<Scratch[]>([])
  const [scratchConflicts, setScratchConflicts] = createSignal<ScratchReview[]>([])
  const [scratchReview, setScratchReview] = createSignal<Scratch[]>([])
  const [scratchOptions, setScratchOptions] = createSignal<ScratchOption[]>([])
  const [seen, setSeen] = createSignal({ scratch: 0 })

  const fetchApi = async (urlPath: string, options: RequestInit = {}) => {
    const s = server.current?.http
    const auth: Record<string, string> = s?.password
      ? { Authorization: `Basic ${btoa(`${s.username ?? "opencode"}:${s.password}`)}` }
      : {}
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...auth,
      ...((options.headers as Record<string, string> | undefined) ?? {}),
    }
    const req = platform.fetch ?? fetch
    const separator = urlPath.includes("?") ? "&" : "?"
    const res = await req(`${sdk.url}${urlPath}${separator}directory=${encodeURIComponent(dir())}`, {
      ...options,
      headers,
    })
    if (res.ok) return res
    throw new Error(await text(res))
  }

  const pull = async (session_id?: string) => {
    if (!session_id) {
      setStatus(undefined)
      setPending([])
      setDeferred([])
      setHabits([])
      setScratch([])
      setScratchConflicts([])
      setScratchReview([])
      setScratchOptions([])
      return
    }

    const [statusRes, pendingRes, deferredRes, habitsRes, scratchRes, reviewRes] = await Promise.all([
      fetchApi(`/adaptation/status?session_id=${encodeURIComponent(session_id)}`),
      fetchApi(`/adaptation/proposals?status=pending`),
      fetchApi(`/adaptation/proposals?status=deferred`),
      fetchApi(`/adaptation/habits?session_id=${encodeURIComponent(session_id)}`),
      fetchApi(`/adaptation/scratch?session_id=${encodeURIComponent(session_id)}`),
      fetchApi(`/adaptation/scratch/review?session_id=${encodeURIComponent(session_id)}`),
    ])

    const statusRow = (await statusRes.json()) as AdaptationStatus
    const pendingRows = (await pendingRes.json()) as Proposal[]
    const deferredRows = (await deferredRes.json()) as Proposal[]
    const habitRows = (await habitsRes.json()) as Habit[]
    const scratchRows = (await scratchRes.json()) as {
      items: Scratch[]
      reviews: ScratchReview[]
      hits?: ScratchHit[]
      options?: ScratchOption[]
    }
    const reviewRows = (await reviewRes.json()) as Scratch[]
    const sessionOpen = (item: Proposal) => {
      if (item.session_review && item.session_review.session_id !== session_id) return false
      if (!item.session_review) return !item.project_id || item.project_id === statusRow.project_id
      const live = new Set(statusRow.habit_ids ?? [])
      if (item.session_review.mode === "suggest_add") return !live.has(item.session_review.habit_id)
      if (item.session_review.mode === "suggest_remove") return live.has(item.session_review.habit_id)
      return true
    }
    const uniq = (rows: Proposal[]) => {
      const map = new Map<string, Proposal>()
      rows.forEach((item) => {
        const key =
          item.merge_key ??
          `${item.scope.level}:${item.scope.target}:${item.summary}:${item.target_patch?.object ?? ""}:${item.session_review?.mode ?? ""}:${item.session_review?.habit_id ?? ""}`
        const old = map.get(key)
        if (!old || item.updated_at > old.updated_at) {
          map.set(key, item)
        }
      })
      return Array.from(map.values())
    }

    setStatus(statusRow)
    setPending(
      uniq(pendingRows.filter(sessionOpen))
        .sort((a, b) => {
          const score = (x: Proposal["impact"]) => (x === "high" ? 3 : x === "medium" ? 2 : 1)
          return score(b.impact) - score(a.impact) || b.updated_at.localeCompare(a.updated_at)
        }),
    )
    setDeferred(
      uniq(deferredRows.filter(sessionOpen))
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
    )
    setHabits(habitRows.sort((a, b) => b.impact.localeCompare(a.impact) || a.summary.localeCompare(b.summary)))
    setScratch(scratchRows.items.sort((a, b) => b.updated_at.localeCompare(a.updated_at)))
    setScratchConflicts(scratchRows.reviews.sort((a, b) => b.updated_at.localeCompare(a.updated_at)))
    setScratchReview(reviewRows.sort((a, b) => b.updated_at.localeCompare(a.updated_at)))
    setScratchOptions((scratchRows.options ?? []).slice())
    const old = seen().scratch
    if (old > 0 && statusRow.scratch_count > old) {
      showToast({
        title: "发现新的暂存习惯",
        description: `当前 session 新增了 ${statusRow.scratch_count - old} 条暂存习惯，你可以点开审查。`,
      })
    }
    setSeen({ scratch: statusRow.scratch_count })
  }

  const refresh = async () => {
    const id = session()
    if (!id) return
    setLoading(true)
    setError(undefined)
    await pull(id)
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => setLoading(false))
  }

  const update = async (id: string, action: "confirm" | "reject" | "defer", review_note?: string, scope_choice?: Scope) => {
    await fetchApi(`/adaptation/proposals/${id}/${action}`, {
      method: "POST",
      body: JSON.stringify({ review_note, apply: action === "confirm", session_id: session(), scope_choice }),
    })
    await refresh()
  }

  const mutateScratch = async (id: string, mode: "promote" | "dismiss" | "activate", scope?: Scope, session_id?: string, cleanup_duplicates?: boolean) => {
    const row = session_id ?? session()
    if (!row) return
    await fetchApi(`/adaptation/scratch/${id}/${mode}`, {
      method: "POST",
      body: JSON.stringify(mode === "promote" ? { session_id: row, scope, cleanup_duplicates } : { session_id: row }),
    })
    await refresh()
  }

  const resolveScratchReview = async (
    id: string,
    action: "keep_existing" | "adopt_candidate" | "adopt_custom",
    text?: string,
    session_id?: string,
  ) => {
    const row = session_id ?? session()
    if (!row) return
    await fetchApi(`/adaptation/scratch/reviews/${id}/resolve`, {
      method: "POST",
      body: JSON.stringify({ session_id: row, action, text }),
    })
    await refresh()
  }

  const mutateHabit = async (item: Pick<Habit, "id" | "scope" | "kind">) => {
    const id = session()
    if (!id) return
    const payload = {
      session_id: id,
      habit_id: item.id,
      scope_level: item.scope.level as "initiative" | "task_scope",
      scope_id: item.scope.target,
      kind: item.kind,
    }
    await fetchApi(`/adaptation/habits/remove-source`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
    await refresh()
  }

  const organize = async () => {
    const id = session()
    if (!id) return
    setLoading(true)
    setError(undefined)
    const row = await fetchApi(`/adaptation/signals/extract`, {
      method: "POST",
      body: JSON.stringify({
        session_id: id,
        mode: "manual_current_session",
      }),
    })
      .then((res) => res.json() as Promise<OrganizeResult>)
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err))
        return undefined
      })
      .finally(() => setLoading(false))

    if (row) {
      await refresh()
      showToast({
        variant: "success",
        title: "已整理当前对话",
        description:
          row.scratch && row.scratch.created.length + row.scratch.pending.length > 0
            ? `signals ${row.signals.length} 条，summaries ${row.summaries.length} 条，新增暂存习惯 ${row.scratch.created.length + row.scratch.pending.length} 条。`
            : `signals ${row.signals.length} 条，summaries ${row.summaries.length} 条。`,
      })
    }
    return row
  }

  const getModels = async () => {
    const res = await fetchApi("/adaptation/model")
    return (await res.json()) as AdaptationModelConfig
  }

  const setModels = async (models: Partial<AdaptationModelMap>) => {
    const res = await fetchApi("/adaptation/model", {
      method: "POST",
      body: JSON.stringify(models),
    }).catch(() => undefined)
    if (!res) return undefined
    return (await res.json()) as AdaptationModelConfig
  }

  createEffect(() => {
    const id = session()
    if (!id) return
    const timer = window.setInterval(() => {
      void pull(id).catch(() => undefined)
    }, 12000)
    onCleanup(() => window.clearInterval(timer))
  })

  const value: Context = {
    status,
    pending,
    deferred,
    habits,
    scratch,
    scratchConflicts,
    scratchReview,
    scratchOptions,
    loading,
    error,
    current: session,
    setSession: async (session_id) => {
      setSession(session_id)
      setLoading(true)
      setError(undefined)
      await pull(session_id)
        .catch((err) => {
          setError(err instanceof Error ? err.message : String(err))
        })
        .finally(() => setLoading(false))
    },
    refresh,
    organize,
    confirm: async (id, review_note, scope_choice) => update(id, "confirm", review_note, scope_choice),
    reject: async (id, review_note) => update(id, "reject", review_note),
    defer: async (id, review_note) => update(id, "defer", review_note),
    promoteScratch: async (id, scope, session_id, cleanup_duplicates) => mutateScratch(id, "promote", scope, session_id, cleanup_duplicates),
    activateScratch: async (id, session_id) => mutateScratch(id, "activate", undefined, session_id),
    dismissScratch: async (id, session_id) => mutateScratch(id, "dismiss", undefined, session_id),
    resolveScratchReview,
    removeSource: async (item) => mutateHabit(item),
    getModels,
    setModels,
  }

  return <AdaptationContext.Provider value={value}>{props.children}</AdaptationContext.Provider>
}

export const useAdaptation = () => {
  const ctx = useContext(AdaptationContext)
  if (!ctx) throw new Error("AdaptationProvider is missing")
  return ctx
}
