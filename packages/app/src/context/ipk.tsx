import { createContext, useContext, createMemo, createSignal, type Component, type JSX } from "solid-js"
import { createStore } from "solid-js/store"
import { showToast } from "@opencode-ai/ui/toast"
import { useDialog } from "@opencode-ai/ui/context/dialog"
import { useParams } from "@solidjs/router"
import { usePlatform } from "@/context/platform"
import { useGlobalSDK } from "@/context/global-sdk"
import { useServer } from "@/context/server"
import { IpkReviewDialog } from "@/components/ipk-review-dialog"
import { decode64 } from "@/utils/base64"

export type IpkDraftView = {
  draft_id: string
  mode: "new" | "edit"
  state: "review" | "stashed" | "committed" | "discarded"
  session_id?: string
  message_ids: string[]
  piece_id?: string
  title: string
  body_summary: string
  body: string
  meta: {
    id: string
    type: "idea" | "knowledge" | "thread" | "review" | "plan"
    title: string
    created_at: string
    updated_at: string
    status: string
    projects?: string[]
  }
  surface: {
    human: {
      body_summary: string
    }
  }
  links: {
    links: Array<{
      target: string
      kind: string
      reason: string
      strength?: number
    }>
  }
  updated_at: string
}

export type IpkPieceCard = {
  piece_id: string
  title: string
  body_summary: string
  type: "idea" | "knowledge" | "thread" | "review" | "plan"
  status: string
  created_at: string
  updated_at: string
  projects: string[]
}

export type IpkModelRef = {
  providerID: string
  modelID: string
}

export type IpkModelKind = "summarize" | "revise" | "search" | "associate"

export type IpkModelMap = {
  summarize?: IpkModelRef
  revise?: IpkModelRef
  search?: IpkModelRef
  associate?: IpkModelRef
}

export type IpkModelConfig = {
  version: "v1"
  updated_at: string
  models: IpkModelMap
}

type IpkDraftProgress = {
  phase: "llm" | "finalize"
  title: string
  body_summary: string
  body: string
  raw?: string
}

type IpkContext = {
  selecting: () => boolean
  selected: () => string[]
  count: () => number
  busy: () => boolean
  start: (session_id: string) => void
  cancel: () => void
  setRank: (ids: string[]) => void
  select: (ids: string[]) => void
  toggle: (ids: string[]) => void
  selectedAll: (ids: string[]) => boolean
  begin: () => Promise<void>
  reviewDraft: (item: IpkDraftView) => void
  openDraft: (draft_id: string) => Promise<void>
  listDrafts: () => Promise<IpkDraftView[]>
  listPieces: () => Promise<IpkPieceCard[]>
  editStart: (piece_id: string) => Promise<void>
  getModels: () => Promise<IpkModelConfig>
  setModels: (models: Partial<IpkModelMap>) => Promise<IpkModelConfig | undefined>
}

const Context = createContext<IpkContext>()

const message = (error: unknown) => (error instanceof Error ? error.message : "请求失败")

const sort = (ids: string[], rank: string[]) => {
  const index = new Map(rank.map((id, i) => [id, i] as const))
  return ids
    .slice()
    .sort((a, b) => (index.get(a) ?? Number.MAX_SAFE_INTEGER) - (index.get(b) ?? Number.MAX_SAFE_INTEGER))
}

const parse = (raw: string) => {
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

export const IpkProvider: Component<{ children: JSX.Element }> = (props) => {
  const sdk = useGlobalSDK()
  const params = useParams()
  const server = useServer()
  const platform = usePlatform()
  const dialog = useDialog()
  const dir = createMemo(() => (params.dir ? decode64(params.dir) ?? "" : ""))

  const [busy, setBusy] = createSignal(false)
  const [keep, setKeep] = createSignal(false)
  const [draft, setDraft] = createSignal<IpkDraftView>()

  const [pick, setPick] = createStore({
    session_id: "",
    active: false,
    ids: [] as string[],
    rank: [] as string[],
  })

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
    throw new Error(await res.text().catch(() => "request failed"))
  }

  const streamApi = async <T,>(input: {
    urlPath: string
    body: unknown
    onProgress?: (progress: IpkDraftProgress) => void
  }) => {
    const res = await fetchApi(input.urlPath, {
      method: "POST",
      headers: {
        Accept: "text/event-stream",
      },
      body: JSON.stringify(input.body),
    })
    if (!res.body) throw new Error("empty stream response")
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buf = ""
    let done: T | undefined
    const scan = (block: string) => {
      let event = "message"
      const data: string[] = []
      for (const line of block.split("\n")) {
        if (line.startsWith("event: ")) event = line.slice(7).trim()
        if (line.startsWith("data: ")) data.push(line.slice(6))
      }
      const raw = data.join("\n").trim()
      if (!raw) return
      if (event === "progress") {
        const item = parse(raw) as IpkDraftProgress | undefined
        if (item) input.onProgress?.(item)
        return
      }
      if (event === "complete") {
        const item = parse(raw) as T | undefined
        if (item) done = item
        return
      }
      if (event === "error") {
        const item = parse(raw) as { message?: string } | undefined
        throw new Error(item?.message ?? raw)
      }
    }
    try {
      while (true) {
        const next = await reader.read()
        if (next.done) break
        buf += decoder.decode(next.value, { stream: true })
        const list = buf.split("\n\n")
        buf = list.pop() ?? ""
        for (const block of list) scan(block)
      }
      if (buf.trim()) scan(buf)
    } finally {
      reader.releaseLock()
    }
    if (done) return done
    throw new Error("stream ended without complete event")
  }

  const pending = (input: { session_id: string; message_ids: string[] }) => {
    const stamp = new Date().toISOString()
    return {
      draft_id: "draft-pending",
      mode: "new" as const,
      state: "review" as const,
      session_id: input.session_id,
      message_ids: input.message_ids,
      piece_id: "piece-pending",
      title: "正在生成总结…",
      body_summary: "正在流式生成摘要，请稍候。",
      body: "",
      meta: {
        id: "piece-pending",
        type: "idea" as const,
        title: "正在生成总结…",
        created_at: stamp,
        updated_at: stamp,
        status: "seed",
        projects: [],
      },
      surface: {
        human: {
          body_summary: "正在流式生成摘要，请稍候。",
        },
      },
      links: {
        links: [],
      },
      updated_at: stamp,
    } satisfies IpkDraftView
  }

  const merge = (base: IpkDraftView, progress: IpkDraftProgress) => {
    const stamp = new Date().toISOString()
    const title = progress.title?.trim() ? progress.title : base.title
    const body_summary = progress.body_summary?.trim() ? progress.body_summary : base.body_summary
    const body = progress.body?.trim() ? progress.body : progress.raw?.trim() ? progress.raw : base.body
    return {
      ...base,
      title,
      body_summary,
      body,
      meta: {
        ...base.meta,
        title,
        updated_at: stamp,
      },
      surface: {
        ...base.surface,
        human: {
          body_summary,
        },
      },
      updated_at: stamp,
    } satisfies IpkDraftView
  }

  const closeReview = () => {
    setKeep(true)
    setDraft(undefined)
    dialog.close()
  }

  const showReview = () => {
    if (!draft()) return
    dialog.show(
      () => (
        <IpkReviewDialog
          draft={draft}
          busy={busy}
          onRevise={async (instruction) => {
            const item = draft()
            if (!item) return
            setBusy(true)
            const base = item
            await streamApi<IpkDraftView>({
              urlPath: "/ipk/piece/revise/stream",
              body: {
                draft_id: item.draft_id,
                instruction,
              },
              onProgress: (progress) => {
                setDraft((prev) => (prev ? merge(prev, progress) : prev))
              },
            })
              .then((next) => {
                setDraft(next)
              })
              .catch((error) => {
                setDraft(base)
                showToast({ variant: "error", title: "改进失败", description: message(error) })
              })
              .finally(() => setBusy(false))
          }}
          onStash={async () => {
            const item = draft()
            if (!item) return
            setBusy(true)
            await fetchApi("/ipk/piece/stash", {
              method: "POST",
              body: JSON.stringify({
                draft_id: item.draft_id,
              }),
            })
              .then(() => {
                showToast({ variant: "success", title: "已暂存" })
                closeReview()
              })
              .catch((error) => showToast({ variant: "error", title: "暂存失败", description: message(error) }))
              .finally(() => setBusy(false))
          }}
          onCommit={async () => {
            const item = draft()
            if (!item) return
            setBusy(true)
            await fetchApi("/ipk/piece/commit", {
              method: "POST",
              body: JSON.stringify({
                draft_id: item.draft_id,
              }),
            })
              .then(() => {
                showToast({ variant: "success", title: "已入库" })
                closeReview()
              })
              .catch((error) => showToast({ variant: "error", title: "入库失败", description: message(error) }))
              .finally(() => setBusy(false))
          }}
        />
      ),
      () => {
        if (keep()) {
          setKeep(false)
          return
        }
        setDraft(undefined)
      },
    )
  }

  const selected = createMemo(() => pick.ids)

  const count = createMemo(() => selected().length)

  const selectedAll = (ids: string[]) => ids.every((id) => pick.ids.includes(id))

  const start = (session_id: string) => {
    setPick({
      session_id,
      active: true,
      ids: [],
      rank: pick.rank,
    })
  }

  const cancel = () => {
    setPick({
      session_id: "",
      active: false,
      ids: [],
      rank: pick.rank,
    })
  }

  const toggle = (ids: string[]) => {
    if (!pick.active || ids.length === 0) return
    const all = ids.every((id) => pick.ids.includes(id))
    const next = all
      ? pick.ids.filter((id) => !ids.includes(id))
      : Array.from(new Set([...pick.ids, ...ids]))
    setPick("ids", sort(next, pick.rank))
  }

  const setRank = (ids: string[]) => {
    setPick("rank", ids)
    setPick("ids", sort(pick.ids, ids))
  }

  const select = (ids: string[]) => {
    if (!pick.active) return
    setPick("ids", sort(Array.from(new Set(ids)), pick.rank))
  }

  const begin = async () => {
    if (!pick.active || !pick.session_id || pick.ids.length === 0) return
    const session_id = pick.session_id
    const message_ids = pick.ids.slice()
    const seed = pending({ session_id, message_ids })
    let shown = false
    const open = () => {
      if (shown) return
      shown = true
      setDraft(seed)
      showReview()
    }
    cancel()
    setBusy(true)
    await streamApi<IpkDraftView>({
      urlPath: "/ipk/piece/draft/stream",
      body: {
        session_id,
        message_ids,
        mode: "new",
      },
      onProgress: (progress) => {
        open()
        setDraft((prev) => merge(prev ?? seed, progress))
      },
    })
      .then((item) => {
        setDraft(item)
        if (!shown) showReview()
      })
      .catch((error) => showToast({ variant: "error", title: "总结失败", description: message(error) }))
      .finally(() => setBusy(false))
  }

  const reviewDraft = (item: IpkDraftView) => {
    setDraft(item)
    showReview()
  }

  const openDraft = async (draft_id: string) => {
    await fetchApi(`/ipk/draft/${draft_id}`)
      .then((res) => res.json() as Promise<IpkDraftView>)
      .then(reviewDraft)
      .catch((error) => showToast({ variant: "error", title: "打开草稿失败", description: message(error) }))
  }

  const listDrafts = async () => {
    return fetchApi("/ipk/drafts")
      .then((res) => res.json() as Promise<IpkDraftView[]>)
      .catch((error) => {
        showToast({ variant: "error", title: "读取暂存失败", description: message(error) })
        return [] as IpkDraftView[]
      })
  }

  const listPieces = async () => {
    return fetchApi("/ipk/pieces")
      .then((res) => res.json() as Promise<IpkPieceCard[]>)
      .catch((error) => {
        showToast({ variant: "error", title: "读取 pieces 失败", description: message(error) })
        return [] as IpkPieceCard[]
      })
  }

  const editStart = async (piece_id: string) => {
    await fetchApi(`/ipk/piece/${piece_id}/edit-start`, {
      method: "POST",
      body: JSON.stringify({ piece_id }),
    })
      .then((res) => res.json() as Promise<IpkDraftView>)
      .then(reviewDraft)
      .catch((error) => showToast({ variant: "error", title: "打开编辑失败", description: message(error) }))
  }

  const getModels = async () => {
    return fetchApi("/ipk/model")
      .then((res) => res.json() as Promise<IpkModelConfig>)
      .catch((error) => {
        showToast({ variant: "error", title: "读取 IPK 模型设置失败", description: message(error) })
        return {
          version: "v1",
          updated_at: new Date().toISOString(),
          models: {},
        } as IpkModelConfig
      })
  }

  const setModels = async (models: Partial<IpkModelMap>) => {
    return fetchApi("/ipk/model", {
      method: "POST",
      body: JSON.stringify(models),
    })
      .then((res) => res.json() as Promise<IpkModelConfig>)
      .catch((error) => {
        showToast({ variant: "error", title: "保存 IPK 模型设置失败", description: message(error) })
        return undefined
      })
  }

  return (
    <Context.Provider
      value={{
        selecting: () => pick.active,
        selected,
        count,
        busy,
        start,
        cancel,
        setRank,
        select,
        toggle,
        selectedAll,
        begin,
        reviewDraft,
        openDraft,
        listDrafts,
        listPieces,
        editStart,
        getModels,
        setModels,
      }}
    >
      {props.children}
    </Context.Provider>
  )
}

export function useIpk() {
  const ctx = useContext(Context)
  if (!ctx) throw new Error("useIpk must be used within IpkProvider")
  return ctx
}
