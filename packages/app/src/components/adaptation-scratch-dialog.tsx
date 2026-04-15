import { Button } from "@opencode-ai/ui/button"
import { Dialog } from "@opencode-ai/ui/dialog"
import { For, Show, createMemo, createSignal } from "solid-js"
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
  if (level === "artifact") {
    if (has) return "当前版本暂不支持直接从暂存习惯写入 artifact"
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

const label = (row: Row) => {
  const name = scope(row.level)
  if (row.disabled) return `${name}（${row.note ?? "当前不可用"}）`
  if (row.level === "global") return name
  return `${name}（${row.target}）`
}

const fallback = () =>
  ({
    id: "global\tuser",
    level: "global",
    target: "user",
    disabled: false,
  }) satisfies Row

export function AdaptationScratchDialog() {
  const adaptation = useAdaptation()
  const [busy, setBusy] = createSignal("")
  const [show, setShow] = createSignal(false)
  const [pick, setPick] = createSignal<Record<string, string>>({})

  const options = createMemo(() => {
    return rows(adaptation.scratchOptions())
  })

  const ready = createMemo(() => options().filter((item) => !item.disabled))

  const first = createMemo(() => ready()[0]?.id ?? "global\tuser")

  const chosen = (id: string) => {
    const raw = pick()[id]
    if (!raw) return first()
    if (ready().some((item) => item.id === raw)) return raw
    return first()
  }

  const parsed = (id: string) => {
    return parse(chosen(id))
  }

  const recommend = (id: string) => {
    return options().find((row) => row.id === chosen(id)) ?? fallback()
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

  const items = createMemo(() =>
    show() ? adaptation.scratch() : adaptation.scratch().filter((item) => item.state === "active" || item.state === "pending"),
  )

  return (
    <Dialog title="暂存习惯" size="large" fit>
      <div class="flex flex-col gap-3 max-h-[70vh] overflow-y-auto px-1">
        <div class="flex items-center justify-between gap-2">
          <div class="text-11-regular text-text-weak">这些习惯只属于当前 session；高置信会直接生效，低置信需要你确认后才会进入本 session 上下文。</div>
          <button
            type="button"
            class="text-12-regular text-text-link hover:underline"
            onClick={() => setShow((value) => !value)}
          >
            {show() ? "只看生效中" : "显示已覆盖/已失效"}
          </button>
        </div>
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
                <div class="text-12-regular text-text-base whitespace-pre-wrap">{item.text}</div>
                <div class="text-11-regular text-text-weak">捕获原因: {item.capture_reason}</div>
                <Show when={item.note}>
                  <div class="text-11-regular text-text-weak">{item.note}</div>
                </Show>
                <Show when={item.evidence.length > 0}>
                  <div class="flex flex-col gap-1">
                    <div class="text-11-regular text-text-weak">证据</div>
                    <For each={item.evidence}>
                      {(ev) => <div class="text-12-regular text-text-base">"{ev.quote}"</div>}
                    </For>
                  </div>
                </Show>
                <Show when={item.conflicts.length > 0}>
                  <div class="text-11-regular text-text-weak">关联冲突数: {item.conflicts.length}</div>
                </Show>
                <Show when={item.state === "active"}>
                  <div class="text-11-regular text-text-weak">推荐作用域：{label(recommend(item.id))}</div>
                  <label class="flex flex-col gap-1 text-12-regular text-text-base">
                    入库作用域
                    <div class="text-11-regular text-text-weak">会显示习惯库五层；当前没有具体目标的层级会置灰。</div>
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
                  <Show when={item.state === "pending"}>
                    <>
                      <Button size="small" variant="primary" disabled={busy() === item.id} onClick={() => void activate(item.id)}>
                        确认生效
                      </Button>
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
