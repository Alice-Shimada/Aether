import { Button } from "@opencode-ai/ui/button"
import { Dialog } from "@opencode-ai/ui/dialog"
import { For, Show, createMemo, createSignal } from "solid-js"
import { useNavigate, useParams } from "@solidjs/router"
import { useAdaptation } from "@/context/adaptation"

type Scope = {
  level: string
  target: string
}

type Row = Scope & {
  id: string
  disabled: boolean
  note?: string
}

const impact = (value: "low" | "medium" | "high") => {
  if (value === "high") return "高影响"
  if (value === "medium") return "中影响"
  return "低影响"
}

const state = (value: string) => {
  if (value === "pending") return "待确认生效"
  if (value === "active") return "生效中"
  if (value === "superseded") return "已被覆盖"
  if (value === "invalidated") return "已失效"
  if (value === "promoted") return "已入库"
  if (value === "discarded") return "已丢弃"
  return value
}

const scope = (value: string) => {
  if (value === "task_scope") return "当前任务"
  if (value === "artifact") return "当前文件规则"
  if (value === "initiative") return "当前长期事项"
  if (value === "subject") return "该主题"
  if (value === "global") return "全局"
  return value
}

const order = ["task_scope", "artifact", "initiative", "subject", "global"]
const key = (row: Scope) => `${row.level}\t${row.target}`

const parse = (value: string) => {
  const [level, target] = value.split("\t")
  return {
    level: level ?? "global",
    target: target ?? "user",
  }
}

const note = (level: string, has: boolean) => {
  if (level === "artifact") return has ? "当前版本暂不支持直接从暂存习惯写入 artifact" : "当前无 artifact 候选"
  if (level === "task_scope") return "当前无 task_scope 候选"
  if (level === "initiative") return "当前无 initiative 候选"
  if (level === "subject") return "当前无 subject 候选"
  return "当前可用"
}

const rows = (items: Scope[]): Row[] =>
  order.reduce<Row[]>((out, level) => {
    const same = items.filter((item) => item.level === level)
    const one = same[0]
    if (same.length === 0) {
      out.push({
        id: `${level}\t`,
        level,
        target: "",
        disabled: true,
        note: note(level, false),
      })
      return out
    }
    if (level === "artifact") {
      out.push({
        id: key(one!),
        ...one!,
        disabled: true,
        note: note(level, true),
      })
      return out
    }
    out.push({
      id: key(one!),
      ...one!,
      disabled: false,
    })
    return out
  }, [])

const label = (row: Row) => {
  const name = scope(row.level)
  if (row.disabled) return `${name}（${row.note ?? "当前不可用"}）`
  return `${name}（系统将在该层级内自动决定目标）`
}

const fallback = () =>
  ({
    id: "global\tuser",
    level: "global",
    target: "user",
    disabled: false,
  }) satisfies Row

const reviewTitle = (kind: "imported_conflict" | "scratch_conflict") =>
  kind === "imported_conflict" ? "新候选习惯与当前正式习惯冲突" : "新候选习惯与当前暂存习惯冲突"

const reviewAction = (action: "keep_existing" | "adopt_candidate" | "adopt_custom") => {
  if (action === "keep_existing") return "保留现有要求"
  if (action === "adopt_candidate") return "采用新候选"
  return "采用输入的新要求"
}

export function AdaptationScratchDialog() {
  const adaptation = useAdaptation()
  const navigate = useNavigate()
  const params = useParams()
  const [busy, setBusy] = createSignal("")
  const [show, setShow] = createSignal(false)
  const [pick, setPick] = createSignal<Record<string, string>>({})
  const [custom, setCustom] = createSignal<Record<string, string>>({})

  const options = createMemo<Row[]>(() => rows(adaptation.scratchOptions()))
  const ready = createMemo(() => options().filter((item) => !item.disabled))
  const first = createMemo(() => ready()[0]?.id ?? "global\tuser")
  const reviews = createMemo(() => adaptation.scratchConflicts().filter((item) => item.status === "pending"))
  const locked = createMemo(() => new Set(reviews().map((item) => item.scratch_id).filter(Boolean)))

  const chosen = (id: string) => {
    const raw = pick()[id]
    if (!raw) return first()
    if (ready().some((item) => item.id === raw)) return raw
    return first()
  }

  const parsed = (id: string) => parse(chosen(id))
  const recommend = (id: string) => options().find((row) => row.id === chosen(id)) ?? fallback()

  const goToMessage = (session_id: string, message_id?: string) => {
    if (!message_id) return
    const dir = params.dir ?? ""
    navigate(`/${dir}/session/${session_id}#message-${message_id}`)
  }

  const promote = async (id: string) => {
    setBusy(id)
    await adaptation.promoteScratch(id, parsed(id)).finally(() => setBusy(""))
  }

  const activate = async (id: string) => {
    setBusy(id)
    await adaptation.activateScratch(id).finally(() => setBusy(""))
  }

  const dismiss = async (id: string) => {
    setBusy(id)
    await adaptation.dismissScratch(id).finally(() => setBusy(""))
  }

  const settle = async (id: string, action: "keep_existing" | "adopt_candidate" | "adopt_custom") => {
    setBusy(id)
    await adaptation.resolveScratchReview(id, action, custom()[id]).finally(() => setBusy(""))
  }

  const items = createMemo(() =>
    show() ? adaptation.scratch() : adaptation.scratch().filter((item) => item.state === "active" || item.state === "pending"),
  )

  return (
    <Dialog title="暂存习惯" size="large" fit>
      <div class="flex flex-col gap-3 max-h-[70vh] overflow-y-auto px-1">
        <div class="flex items-center justify-between gap-2">
          <div class="text-11-regular text-text-weak">
            当前轮回答不会等待这里的提取和冲突处理；这里只管理下一轮会生效的 session 暂存习惯。
          </div>
          <button
            type="button"
            class="text-12-regular text-text-link hover:underline"
            onClick={() => setShow((value) => !value)}
          >
            {show() ? "只看生效中" : "显示已覆盖/已失效"}
          </button>
        </div>

        <Show when={reviews().length > 0}>
          <div class="flex flex-col gap-2">
            <div class="text-12-medium text-text-strong">待处理冲突审阅</div>
            <For each={reviews()}>
              {(item) => (
                <div class="rounded-md border border-border-weak-base bg-background-stronger p-3 flex flex-col gap-2">
                  <div class="flex items-center justify-between gap-2">
                    <div class="text-13-medium text-text-strong">{reviewTitle(item.kind)}</div>
                    <div class="text-11-regular text-text-weak whitespace-nowrap">
                      {impact(item.candidate.impact)} / {item.candidate.state_suggestion === "active" ? "建议直接生效" : "建议待确认"}
                    </div>
                  </div>
                  <div class="text-13-medium text-text-strong">{item.candidate.summary}</div>
                  <div class="text-12-regular text-text-base whitespace-pre-wrap">{item.candidate.canonical_text}</div>
                  <Show when={item.candidate.evidence.length > 0}>
                    <div class="flex flex-col gap-1">
                      <div class="text-11-regular text-text-weak">证据</div>
                      <For each={item.candidate.evidence}>
                        {(ev) => (
                          <div class="flex items-start justify-between gap-2 text-12-regular text-text-base">
                            <div class="min-w-0 flex-1">
                              <div>"{ev.quote}"</div>
                              <Show when={ev.reason}>
                                <div class="text-11-regular text-text-weak">{ev.reason}</div>
                              </Show>
                            </div>
                            <Show when={ev.message_id}>
                              <button
                                type="button"
                                class="shrink-0 text-11-regular text-text-link hover:underline"
                                onClick={() => goToMessage(ev.session_id, ev.message_id)}
                              >
                                跳转消息
                              </button>
                            </Show>
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>
                  <div class="flex flex-col gap-1">
                    <div class="text-11-regular text-text-weak">冲突对象</div>
                    <For each={item.targets}>
                      {(target) => (
                        <div class="text-12-regular text-text-base">
                          {target.target_kind === "imported" ? "正式习惯" : "暂存习惯"} #{target.target_number}
                          <Show when={target.conflict_kind}>
                            <span class="text-text-weak"> / {target.conflict_kind === "full" ? "完全冲突" : "部分冲突"}</span>
                          </Show>
                          <Show when={target.comparison_summary}>
                            <div class="text-11-regular text-text-weak">{target.comparison_summary}</div>
                          </Show>
                        </div>
                      )}
                    </For>
                  </div>
                  <label class="flex flex-col gap-1 text-12-regular text-text-base">
                    输入新的局部解决要求
                    <textarea
                      class="min-h-[84px] rounded-md border border-border-weak-base bg-background-base px-2 py-2 text-12-regular text-text-strong"
                      value={custom()[item.id] ?? ""}
                      disabled={busy() === item.id}
                      onInput={(ev) => setCustom({ ...custom(), [item.id]: ev.currentTarget.value })}
                    />
                  </label>
                  <div class="flex flex-wrap items-center gap-2 pt-1">
                    <Button size="small" variant="ghost" disabled={busy() === item.id} onClick={() => void settle(item.id, "keep_existing")}>
                      {reviewAction("keep_existing")}
                    </Button>
                    <Button size="small" variant="primary" disabled={busy() === item.id} onClick={() => void settle(item.id, "adopt_candidate")}>
                      {reviewAction("adopt_candidate")}
                    </Button>
                    <Button
                      size="small"
                      variant="secondary"
                      disabled={busy() === item.id || !(custom()[item.id] ?? "").trim()}
                      onClick={() => void settle(item.id, "adopt_custom")}
                    >
                      {reviewAction("adopt_custom")}
                    </Button>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>

        <Show when={items().length > 0} fallback={<div class="text-12-regular text-text-weak py-6">当前 session 还没有暂存习惯。</div>}>
          <For each={items()}>
            {(item) => (
              <div class="rounded-md border border-border-weak-base bg-background-stronger p-3 flex flex-col gap-2">
                <div class="flex items-center justify-between gap-2">
                  <div class="text-13-medium text-text-strong">{item.summary}</div>
                  <div class="text-11-regular text-text-weak whitespace-nowrap">
                    {impact(item.impact)} / {item.capture_confidence === "high" ? "高置信" : item.capture_confidence === "medium" ? "中置信" : "低置信"} / {state(item.state)}
                  </div>
                </div>
                <div class="text-12-regular text-text-base whitespace-pre-wrap">{item.canonical_text}</div>
                <div class="text-11-regular text-text-weak">捕获原因: {item.capture_reason}</div>
                <Show when={item.shadow_ids.length > 0}>
                  <div class="text-11-regular text-text-weak">当前会覆盖 {item.shadow_ids.length} 条正式习惯引用。</div>
                </Show>
                <Show when={item.superseded_by}>
                  <div class="text-11-regular text-text-weak">被覆盖者已指向新的暂存习惯: {item.superseded_by}</div>
                </Show>
                <Show when={item.note}>
                  <div class="text-11-regular text-text-weak">{item.note}</div>
                </Show>
                <Show when={item.evidence.length > 0}>
                  <div class="flex flex-col gap-1">
                    <div class="text-11-regular text-text-weak">证据</div>
                    <For each={item.evidence}>
                      {(ev) => (
                        <div class="flex items-start justify-between gap-2 text-12-regular text-text-base">
                          <div class="min-w-0 flex-1">
                            <div>"{ev.quote}"</div>
                            <Show when={ev.reason}>
                              <div class="text-11-regular text-text-weak">{ev.reason}</div>
                            </Show>
                          </div>
                          <Show when={ev.message_id}>
                            <button
                              type="button"
                              class="shrink-0 text-11-regular text-text-link hover:underline"
                              onClick={() => goToMessage(ev.session_id, ev.message_id)}
                            >
                              跳转消息
                            </button>
                          </Show>
                        </div>
                      )}
                    </For>
                  </div>
                </Show>
                <Show when={item.conflicts.length > 0}>
                  <div class="text-11-regular text-text-weak">关联冲突标记数: {item.conflicts.length}</div>
                </Show>
                <Show when={item.state === "active"}>
                  <div class="text-11-regular text-text-weak">推荐作用域：{label(recommend(item.id))}</div>
                  <label class="flex flex-col gap-1 text-12-regular text-text-base">
                    入库作用域
                    <div class="text-11-regular text-text-weak">你只需要选择习惯库五层；系统会在所选层级内自动决定具体目标。</div>
                    <select
                      class="rounded-md border border-border-weak-base bg-background-base px-2 py-1 text-12-regular text-text-strong"
                      value={chosen(item.id)}
                      disabled={busy() === item.id}
                      onChange={(ev) => setPick({ ...pick(), [item.id]: ev.currentTarget.value })}
                    >
                      <For each={options()}>
                        {(row) => (
                          <option value={row.id} disabled={row.disabled}>
                            {label(row)}
                          </option>
                        )}
                      </For>
                    </select>
                  </label>
                </Show>
                <div class="flex items-center gap-2 pt-1">
                  <Show when={item.state === "pending" && !locked().has(item.id)}>
                    <>
                      <Button size="small" variant="primary" disabled={busy() === item.id} onClick={() => void activate(item.id)}>
                        确认生效
                      </Button>
                      <Button size="small" variant="ghost" disabled={busy() === item.id} onClick={() => void dismiss(item.id)}>
                        丢弃
                      </Button>
                    </>
                  </Show>
                  <Show when={item.state === "pending" && locked().has(item.id)}>
                    <>
                      <div class="text-11-regular text-text-weak">这条 pending 需要先在上方冲突审阅里处理。</div>
                      <Button size="small" variant="ghost" disabled={busy() === item.id} onClick={() => void dismiss(item.id)}>
                        丢弃
                      </Button>
                    </>
                  </Show>
                  <Show when={item.state === "active"}>
                    <>
                      <Button size="small" variant="primary" disabled={busy() === item.id} onClick={() => void promote(item.id)}>
                        确认入库
                      </Button>
                      <Button size="small" variant="ghost" disabled={busy() === item.id} onClick={() => void dismiss(item.id)}>
                        丢弃
                      </Button>
                    </>
                  </Show>
                </div>
              </div>
            )}
          </For>
        </Show>
      </div>
    </Dialog>
  )
}
