import { Dialog } from "@opencode-ai/ui/dialog"
import { Button } from "@opencode-ai/ui/button"
import { For, Show, createMemo, createSignal } from "solid-js"
import { useDialog } from "@opencode-ai/ui/context/dialog"
import { useAdaptation } from "@/context/adaptation"
import { useNavigate, useParams } from "@solidjs/router"

const label = (value: "low" | "medium" | "high") => {
  if (value === "high") return "高影响"
  if (value === "medium") return "中影响"
  return "低影响"
}

const scope = (value: string) => {
  if (value === "task_scope") return "当前任务"
  if (value === "initiative") return "当前长期事项"
  if (value === "subject") return "该主题"
  if (value === "global") return "全局"
  if (value === "artifact") return "当前文件规则"
  if (value === "session") return "仅本次对话"
  return value
}

const time = (value?: string) => {
  if (!value) return "-"
  const at = new Date(value)
  if (Number.isNaN(at.getTime())) return value
  return at.toLocaleString("zh-CN", { hour12: false })
}

const clean = (text: string) => text.replace(/\s+/g, " ").trim()

type Scope = {
  level: string
  target: string
}

type Row = Scope & {
  id: string
  disabled: boolean
  note?: string
}

type Proposal = ReturnType<ReturnType<typeof useAdaptation>["pending"]>[number]
type Scratch = ReturnType<ReturnType<typeof useAdaptation>["scratchReview"]>[number]

const key = (value: Scope) => `${value.level}\t${value.target}`
const order = ["task_scope", "artifact", "initiative", "subject", "global"]

const parse = (value: string) => {
  const [level, target] = value.split("\t")
  return { level: level ?? "", target: target ?? "" }
}

const suggested = (item: Proposal) => item.scope_choice?.suggested ?? item.promotion?.target_scope ?? item.scope
const reviewMode = (item: Proposal) => item.session_review?.mode
const reviewAction = (item: Proposal) => {
  if (reviewMode(item) === "suggest_add") return "建议加入当前 session"
  if (reviewMode(item) === "suggest_remove") return "建议移出当前 session"
  if (reviewMode(item) === "suggest_replace") return "建议替换当前 session 习惯"
  if (reviewMode(item) === "suggest_rescope") return "建议调整当前 session 习惯"
  return "正式习惯待审"
}
const confirmLabel = (item: Proposal) => {
  if (reviewMode(item) === "suggest_add") return "确认加入"
  if (reviewMode(item) === "suggest_remove") return "确认移出"
  if (reviewMode(item) === "suggest_replace") return "确认替换"
  if (reviewMode(item) === "suggest_rescope") return "确认调整"
  return "确认并应用"
}

const labelScope = (value: Scope, hint?: string) => {
  const name = scope(value.level)
  if (value.level === "global") return hint ? `${name}（${hint}）` : name
  if (hint) return `${name}（${hint}）`
  return `${name}（${value.target}）`
}

const note = (level: string, has: boolean) => {
  if (level === "artifact") {
    if (has) return "当前版本暂不支持直接写入 artifact"
    return "当前无 artifact 候选"
  }
  if (level === "task_scope") return "当前无 task_scope 候选"
  if (level === "initiative") return "当前无 initiative 候选"
  if (level === "subject") return "当前无 subject 候选"
  return "当前可用"
}

const rows = (items: Scope[]) =>
  order.flatMap((level) => {
    const same = items.filter((item) => item.level === level)
    if (same.length === 0) {
      return [
        {
          id: `${level}\t`,
          level,
          target: "",
          disabled: true,
          note: note(level, false),
        } satisfies Row,
      ]
    }
    if (level === "artifact") {
      return same.map((item) => ({
        id: key(item),
        ...item,
        disabled: true,
        note: note(level, true),
      }))
    }
    return same.map((item) => ({
      id: key(item),
      ...item,
      disabled: false,
    }))
  })

const chosen = (items: Row[], value?: string) => {
  const first = items.find((item) => !item.disabled)?.id ?? "global\tuser"
  if (!value) return first
  return items.some((item) => item.id === value && !item.disabled) ? value : first
}

const labelRow = (row: Row, hint?: string) => {
  if (row.disabled) return `${scope(row.level)}（${row.note ?? "当前不可用"}）`
  return labelScope(row, hint)
}

const uniqEvidence = (rows: Array<{ session_id: string; message_id: string; quote: string }>) => {
  const msg = new Set<string>()
  const quote = new Set<string>()
  const out: typeof rows = []
  for (const row of rows) {
    const m = `${row.session_id}:${row.message_id}`
    if (msg.has(m)) continue
    const q = clean(row.quote)
    if (q && quote.has(q)) continue
    msg.add(m)
    if (q) quote.add(q)
    out.push({
      ...row,
      quote: q || row.quote.trim(),
    })
  }
  return out
}

export function AdaptationProposalInboxDialog() {
  const adaptation = useAdaptation()
  const dialog = useDialog()
  const navigate = useNavigate()
  const params = useParams()
  const [busy, setBusy] = createSignal("")
  const [pick, setPick] = createSignal<Record<string, string>>({})
  const [clean, setClean] = createSignal<Record<string, boolean>>({})
  const [tab, setTab] = createSignal<"scratch" | "formal" | "session">("scratch")

  const options = (item: Proposal) => {
    const status = adaptation.status()
    const list = [
      suggested(item),
      status?.task_scope_id ? { level: "task_scope", target: status.task_scope_id } : undefined,
      ...adaptation.scratchOptions().filter((row) => row.level === "task_scope" || row.level === "artifact" || row.level === "subject"),
      status?.initiative_id ? { level: "initiative", target: status.initiative_id } : undefined,
      { level: "global", target: "user" },
    ].filter((row): row is Scope => Boolean(row?.target))
    const seen = new Map<string, Scope>()
    list.forEach((row) => seen.set(key(row), row))
    return rows(Array.from(seen.values()))
  }

  const choice = (item: Proposal) => chosen(options(item), pick()[item.id] ?? key(suggested(item)))
  const scratchScope = (item: Scratch) =>
    chosen(options({ scope: { level: "initiative", target: adaptation.status()?.initiative_id ?? "" }, summary: item.summary } as Proposal), pick()[item.id])

  const formalPending = createMemo(() => adaptation.pending().filter((item) => !item.session_review))
  const formalDeferred = createMemo(() => adaptation.deferred().filter((item) => !item.session_review))
  const sessionPending = createMemo(() => adaptation.pending().filter((item) => item.session_review))
  const sessionDeferred = createMemo(() => adaptation.deferred().filter((item) => item.session_review))

  const action = async (item: Proposal, type: "confirm" | "reject" | "defer") => {
    const value = type === "confirm" ? parse(choice(item)) : undefined
    setBusy(item.id)
    const run =
      type === "confirm"
        ? adaptation.confirm(item.id, undefined, value)
        : type === "reject"
          ? adaptation.reject(item.id)
          : adaptation.defer(item.id)
    await run.finally(() => setBusy(""))
  }

  const scratchAction = async (item: Scratch, type: "promote" | "dismiss") => {
    setBusy(item.id)
    const value = parse(scratchScope(item))
    const run =
      type === "promote"
        ? adaptation.promoteScratch(item.id, value, item.session_id, clean()[item.id] ?? false)
        : adaptation.dismissScratch(item.id, item.session_id)
    await run.finally(() => setBusy(""))
  }

  const goToMessage = (session_id: string, message_id: string) => {
    dialog.close()
    const dir = params.dir ?? ""
    navigate(`/${dir}/session/${session_id}#message-${message_id}`)
  }

  return (
    <Dialog title="习惯审查" size="large" fit>
      <div class="flex flex-col gap-3 max-h-[70vh] overflow-y-auto px-1">
        <div class="flex items-center gap-2">
          <Button size="small" variant={tab() === "scratch" ? "primary" : "ghost"} onClick={() => setTab("scratch")}>
            审查暂存习惯
          </Button>
          <Button size="small" variant={tab() === "formal" ? "primary" : "ghost"} onClick={() => setTab("formal")}>
            正式习惯审查
          </Button>
          <Button size="small" variant={tab() === "session" ? "primary" : "ghost"} onClick={() => setTab("session")}>
            当前 session 建议
          </Button>
        </div>

        <Show when={tab() === "scratch"}>
          <Show when={adaptation.scratchReview().length > 0} fallback={<div class="text-12-regular text-text-weak py-6">当前没有待审查的暂存习惯。</div>}>
            <For each={adaptation.scratchReview()}>
              {(item) => (
                <div class="rounded-md border border-border-weak-base bg-background-stronger p-3 flex flex-col gap-2">
                  <div class="flex items-center justify-between gap-2">
                    <div class="text-13-medium text-text-strong">{item.summary}</div>
                    <div class="text-11-regular text-text-weak whitespace-nowrap">{label(item.impact)}</div>
                  </div>
                  <div class="text-12-regular text-text-base whitespace-pre-wrap">{item.text}</div>
                  <div class="text-11-regular text-text-weak">来源：一个 session 暂存区</div>
                  <div class="text-11-regular text-text-weak">
                    捕获判断: {item.capture_confidence === "high" ? "高置信" : item.capture_confidence === "medium" ? "中置信" : "低置信"}；{item.capture_reason}
                  </div>
                  <div class="text-11-regular text-text-weak">
                    相似暂存习惯在所有记录里共出现 {item.similar_count ?? 1} 次，涉及 {item.similar_session_count ?? 1} 个 session。
                  </div>
                  <Show when={item.note}>
                    <div class="text-11-regular text-text-weak">{item.note}</div>
                  </Show>
                  <Show when={(item.similar_count ?? 1) > 1}>
                    <label class="flex items-center gap-2 text-12-regular text-text-base">
                      <input
                        type="checkbox"
                        checked={clean()[item.id] ?? false}
                        disabled={busy() === item.id}
                        onChange={(ev) => setClean({ ...clean(), [item.id]: ev.currentTarget.checked })}
                      />
                      入库后把其他 session 中相似的暂存习惯标记为已处理
                    </label>
                  </Show>
                  <label class="flex flex-col gap-1 text-12-regular text-text-base">
                    入库作用域
                    <select
                      class="rounded-md border border-border-weak-base bg-background-base px-2 py-1 text-12-regular text-text-strong"
                      value={scratchScope(item)}
                      disabled={busy() === item.id}
                      onChange={(ev) => {
                        setPick({ ...pick(), [item.id]: ev.currentTarget.value })
                      }}
                    >
                      <For each={options({ scope: { level: "initiative", target: adaptation.status()?.initiative_id ?? "" }, summary: item.summary } as Proposal)}>
                        {(row) => (
                          <option value={row.id} disabled={row.disabled}>
                            {labelRow(row, row.id === scratchScope(item) ? "建议" : undefined)}
                          </option>
                        )}
                      </For>
                    </select>
                  </label>
                  <div class="flex items-center gap-2 pt-1">
                    <Button size="small" variant="primary" disabled={busy() === item.id} onClick={() => void scratchAction(item, "promote")}>
                      确认入库
                    </Button>
                    <Button size="small" variant="ghost" disabled={busy() === item.id} onClick={() => void scratchAction(item, "dismiss")}>
                      丢弃
                    </Button>
                  </div>
                </div>
              )}
            </For>
          </Show>
        </Show>

        <Show when={tab() !== "scratch" && formalPending().length + formalDeferred().length + sessionPending().length + sessionDeferred().length > 0} fallback={<Show when={tab() !== "scratch"}><div class="text-12-regular text-text-weak py-6">当前没有待处理习惯。</div></Show>}>
          <Show when={tab() === "formal" && formalPending().length > 0}>
            <div class="text-12-medium text-text-strong">待处理（Pending）</div>
            <For each={formalPending()}>
              {(item) => (
                <div class="rounded-md border border-border-weak-base bg-background-stronger p-3 flex flex-col gap-2">
                  <div class="flex items-center justify-between gap-2">
                    <div class="text-13-medium text-text-strong">{item.summary}</div>
                    <div class="text-11-regular text-text-weak whitespace-nowrap">{label(item.impact)}</div>
                  </div>
                  <Show
                    when={item.session_review}
                    fallback={
                      <>
                        <div class="text-12-regular text-text-base">建议应用到: {item.target_patch?.object ?? "-"}</div>
                        <div class="text-12-regular text-text-base">系统建议作用域: {labelScope(suggested(item), "建议")}</div>
                      </>
                    }
                  >
                    {(row) => (
                      <>
                        <div class="text-12-regular text-text-base">{reviewAction(item)}</div>
                        <Show when={row().habit_scope}>
                          {(habit) => <div class="text-12-regular text-text-base">原始习惯范围: {labelScope(habit())}</div>}
                        </Show>
                        <Show when={row().reason}>
                          <div class="text-12-regular text-text-base">提醒原因: {row().reason}</div>
                        </Show>
                      </>
                    )}
                  </Show>
                  <div class="text-11-regular text-text-weak">更新时间: {time(item.updated_at)}</div>
                  <Show when={item.promotion}>
                    <div class="text-12-regular text-text-base">
                      作用域传递: {scope(item.promotion!.source_scope.level)} {"->"} {scope(item.promotion!.target_scope.level)}
                    </div>
                  </Show>
                  <Show when={!item.session_review}>
                    <label class="flex flex-col gap-1 text-12-regular text-text-base">
                      确认作用域
                      <select
                        class="rounded-md border border-border-weak-base bg-background-base px-2 py-1 text-12-regular text-text-strong"
                        value={choice(item)}
                        disabled={busy() === item.id}
                        onChange={(ev) => {
                          setPick({ ...pick(), [item.id]: ev.currentTarget.value })
                        }}
                      >
                        <For each={options(item)}>
                          {(row) => (
                            <option value={row.id} disabled={row.disabled}>
                              {labelRow(row, row.id === key(suggested(item)) ? "建议" : undefined)}
                            </option>
                          )}
                        </For>
                      </select>
                    </label>
                  </Show>
                  <div class="text-12-regular text-text-base">确认后影响: {item.future_effect || "-"}</div>
                  <Show when={item.resolved_evidence && item.resolved_evidence.length > 0}>
                    <div class="flex flex-col gap-1">
                      <div class="text-11-regular text-text-weak">证据来源:</div>
                      <For each={uniqEvidence(item.resolved_evidence)}>
                        {(ev) => (
                          <button
                            type="button"
                            class="text-left text-12-regular text-text-link hover:underline cursor-pointer px-2 py-1 rounded hover:bg-surface-raised-base-hover transition-colors"
                            onClick={() => goToMessage(ev.session_id, ev.message_id)}
                          >
                            "{ev.quote.length > 80 ? `${ev.quote.slice(0, 77)}…` : ev.quote}"
                          </button>
                        )}
                      </For>
                    </div>
                  </Show>
                  <div class="flex items-center gap-2 pt-1">
                    <Button
                      size="small"
                      variant="primary"
                      disabled={busy() === item.id}
                      onClick={() => {
                        void action(item, "confirm")
                      }}
                    >
                      {confirmLabel(item)}
                    </Button>
                    <Button
                      size="small"
                      variant="ghost"
                      disabled={busy() === item.id}
                      onClick={() => {
                        void action(item, "reject")
                      }}
                    >
                      拒绝
                    </Button>
                    <Button
                      size="small"
                      variant="ghost"
                      disabled={busy() === item.id}
                      onClick={() => {
                        void action(item, "defer")
                      }}
                    >
                      暂缓
                    </Button>
                  </div>
                </div>
              )}
            </For>
          </Show>

          <Show when={tab() === "formal" && formalDeferred().length > 0}>
            <div class="text-12-medium text-text-strong mt-2">暂缓项（Deferred）</div>
            <div class="text-11-regular text-text-weak">
              这些是你之前点了“暂缓”的习惯。它们不会自动生效，也不会注入模型规则；你可以在这里继续确认或拒绝。
            </div>
            <For each={formalDeferred()}>
              {(item) => (
                <div class="rounded-md border border-border-weak-base bg-background-stronger p-3 flex flex-col gap-2">
                  <div class="text-13-medium text-text-strong">{item.summary}</div>
                  <div class="text-12-regular text-text-weak mt-1">确认后影响: {item.future_effect || "-"}</div>
                  <Show
                    when={item.session_review}
                    fallback={<div class="text-12-regular text-text-weak mt-1">系统建议作用域: {labelScope(suggested(item), "建议")}</div>}
                  >
                    {(row) => (
                      <>
                        <div class="text-12-regular text-text-weak mt-1">{reviewAction(item)}</div>
                        <Show when={row().habit_scope}>
                          {(habit) => <div class="text-12-regular text-text-weak mt-1">原始习惯范围: {labelScope(habit())}</div>}
                        </Show>
                      </>
                    )}
                  </Show>
                  <Show when={!item.session_review}>
                    <label class="flex flex-col gap-1 text-12-regular text-text-base">
                      确认作用域
                      <select
                        class="rounded-md border border-border-weak-base bg-background-base px-2 py-1 text-12-regular text-text-strong"
                        value={choice(item)}
                        disabled={busy() === item.id}
                        onChange={(ev) => {
                          setPick({ ...pick(), [item.id]: ev.currentTarget.value })
                        }}
                      >
                        <For each={options(item)}>
                          {(row) => (
                            <option value={row.id} disabled={row.disabled}>
                              {labelRow(row, row.id === key(suggested(item)) ? "建议" : undefined)}
                            </option>
                          )}
                        </For>
                      </select>
                    </label>
                  </Show>
                  <div class="text-11-regular text-text-weak">暂缓到期: {time(item.cooldown_until)}</div>
                  <div class="text-11-regular text-text-weak">最后更新: {time(item.updated_at)}</div>
                  <Show when={item.review_note}>
                    <div class="text-11-regular text-text-weak">暂缓备注: {item.review_note}</div>
                  </Show>
                  <Show when={item.resolved_evidence && item.resolved_evidence.length > 0}>
                    <div class="flex flex-col gap-1 mt-1">
                      <div class="text-11-regular text-text-weak">证据来源:</div>
                      <For each={uniqEvidence(item.resolved_evidence)}>
                        {(ev) => (
                          <button
                            type="button"
                            class="text-left text-12-regular text-text-link hover:underline cursor-pointer px-2 py-1 rounded hover:bg-surface-raised-base-hover transition-colors"
                            onClick={() => goToMessage(ev.session_id, ev.message_id)}
                          >
                            "{ev.quote.length > 80 ? `${ev.quote.slice(0, 77)}…` : ev.quote}"
                          </button>
                        )}
                      </For>
                    </div>
                  </Show>
                  <div class="flex items-center gap-2 pt-1">
                    <Button
                      size="small"
                      variant="primary"
                      disabled={busy() === item.id}
                      onClick={() => {
                        void action(item, "confirm")
                      }}
                    >
                      {confirmLabel(item)}
                    </Button>
                    <Button
                      size="small"
                      variant="ghost"
                      disabled={busy() === item.id}
                      onClick={() => {
                        void action(item, "reject")
                      }}
                    >
                      拒绝
                    </Button>
                    <Button
                      size="small"
                      variant="ghost"
                      disabled={busy() === item.id}
                      onClick={() => {
                        void action(item, "defer")
                      }}
                    >
                      继续暂缓
                    </Button>
                  </div>
                </div>
              )}
            </For>
          </Show>

          <Show when={tab() === "session" && sessionPending().length > 0}>
            <div class="text-12-medium text-text-strong">待处理（Pending）</div>
            <For each={sessionPending()}>
              {(item) => (
                <div class="rounded-md border border-border-weak-base bg-background-stronger p-3 flex flex-col gap-2">
                  <div class="flex items-center justify-between gap-2">
                    <div class="text-13-medium text-text-strong">{item.summary}</div>
                    <div class="text-11-regular text-text-weak whitespace-nowrap">{label(item.impact)}</div>
                  </div>
                  <div class="text-12-regular text-text-base">{reviewAction(item)}</div>
                  <Show when={item.session_review?.reason}>
                    <div class="text-12-regular text-text-base">提醒原因: {item.session_review?.reason}</div>
                  </Show>
                  <div class="text-12-regular text-text-base">确认后影响: {item.future_effect || "-"}</div>
                  <div class="flex items-center gap-2 pt-1">
                    <Button size="small" variant="primary" disabled={busy() === item.id} onClick={() => void action(item, "confirm")}>
                      {confirmLabel(item)}
                    </Button>
                    <Button size="small" variant="ghost" disabled={busy() === item.id} onClick={() => void action(item, "reject")}>
                      拒绝
                    </Button>
                    <Button size="small" variant="ghost" disabled={busy() === item.id} onClick={() => void action(item, "defer")}>
                      暂缓
                    </Button>
                  </div>
                </div>
              )}
            </For>
          </Show>

          <Show when={tab() === "session" && sessionDeferred().length > 0}>
            <div class="text-12-medium text-text-strong mt-2">暂缓项（Deferred）</div>
            <For each={sessionDeferred()}>
              {(item) => (
                <div class="rounded-md border border-border-weak-base bg-background-stronger p-3 flex flex-col gap-2">
                  <div class="text-13-medium text-text-strong">{item.summary}</div>
                  <div class="text-12-regular text-text-weak mt-1">确认后影响: {item.future_effect || "-"}</div>
                  <div class="flex items-center gap-2 pt-1">
                    <Button size="small" variant="primary" disabled={busy() === item.id} onClick={() => void action(item, "confirm")}>
                      {confirmLabel(item)}
                    </Button>
                    <Button size="small" variant="ghost" disabled={busy() === item.id} onClick={() => void action(item, "reject")}>
                      拒绝
                    </Button>
                  </div>
                </div>
              )}
            </For>
          </Show>
        </Show>

        <div class="flex justify-end gap-2 pt-2">
          <Button
            variant="ghost"
            onClick={() => {
              void adaptation.refresh()
            }}
          >
            刷新
          </Button>
          <Button variant="secondary" onClick={() => dialog.close()}>
            确认
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
