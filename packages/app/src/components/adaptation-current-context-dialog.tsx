import { Dialog } from "@opencode-ai/ui/dialog"
import { Button } from "@opencode-ai/ui/button"
import { For, Show, createMemo, createSignal } from "solid-js"
import { useDialog } from "@opencode-ai/ui/context/dialog"
import { useAdaptation } from "@/context/adaptation"

const scopeLabel = (value: string) => {
  if (value === "task_scope") return "当前任务"
  if (value === "initiative") return "当前长期事项"
  if (value === "subject") return "该主题"
  if (value === "global") return "全局"
  if (value === "artifact") return "当前文件规则"
  if (value === "session") return "仅本次对话"
  return value
}

const captureLabel = (value: "low" | "medium" | "high") => {
  if (value === "high") return "高"
  if (value === "medium") return "中"
  return "低"
}

const trustLabel = (value: number) => {
  const score = Math.round(value * 100)
  if (value >= 0.85) return `高（${score}%）`
  if (value >= 0.6) return `中（${score}%）`
  return `低（${score}%）`
}

type ManagedHabit = {
  id: string
  scope: { level: "initiative" | "task_scope"; target: string }
  kind: "initiative_policy" | "task_scope" | "task_scope_policy"
}

const managed = (item: { id: string; scope: { level: string; target: string }; kind: string }): item is ManagedHabit => {
  if (item.scope.level !== "initiative" && item.scope.level !== "task_scope") return false
  return item.kind === "initiative_policy" || item.kind === "task_scope" || item.kind === "task_scope_policy"
}

export function AdaptationCurrentContextDialog() {
  const adaptation = useAdaptation()
  const dialog = useDialog()
  const [busy, setBusy] = createSignal("")

  const packet = createMemo(() => adaptation.status()?.context_packet)
  const habits = createMemo(() => new Set(packet()?.habit_ids ?? []))
  const scratch = createMemo(() => new Set(packet()?.scratch_ids ?? []))

  const imported = createMemo(() => {
    if (packet()) {
      return adaptation.habits().filter((item) => habits().has(item.id) && !item.suppressed)
    }
    return adaptation.habits().filter((item) => !item.suppressed)
  })

  const activeScratch = createMemo(() => {
    if (packet()) {
      return adaptation.scratch().filter((item) => scratch().has(item.id) && item.state === "active")
    }
    return adaptation.scratch().filter((item) => item.state === "active")
  })

  const hit = (id: string, mode: "habit" | "scratch") => {
    if (mode === "habit") {
      if (habits().has(id)) return "本轮已注入当前上下文"
      return "当前 session 已引用"
    }
    if (scratch().has(id)) return "本轮已注入当前上下文"
    return "当前 session 已生效"
  }

  const sourceRemove = async (input: ManagedHabit) => {
    setBusy(`remove:${input.id}:${input.scope.target}`)
    await adaptation.removeSource(input).finally(() => setBusy(""))
  }

  const projectSuppress = async (input: ManagedHabit) => {
    setBusy(`suppress:${input.id}:${input.scope.target}`)
    await adaptation.suppressProject(input).finally(() => setBusy(""))
  }

  return (
    <Dialog title="当前 Session 习惯" size="large" fit>
      <div class="flex flex-col gap-3 max-h-[70vh] overflow-y-auto px-1">
        <Show when={adaptation.status()} fallback={<div class="text-12-regular text-text-weak py-6">暂无当前会话的习惯上下文。</div>}>
          <>
            <div class="text-11-regular text-text-weak">这里只显示当前已生效的习惯。待确认 proposal 和未生效的暂存项不会出现在这里。</div>

            <div class="flex flex-col gap-2">
              <div class="text-12-medium text-text-strong">已引用正式习惯（{imported().length}）</div>
              <Show when={imported().length > 0} fallback={<div class="text-12-regular text-text-weak">当前没有已注入的正式习惯。</div>}>
                <For each={imported()}>
                  {(item) => (
                    <div class="rounded-md border border-border-weak-base bg-background-stronger p-3 flex flex-col gap-2">
                      <div class="text-13-medium text-text-strong">{item.title || item.summary}</div>
                      <Show when={item.title && item.summary !== item.title}>
                        <div class="text-12-regular text-text-base whitespace-pre-wrap">{item.summary}</div>
                      </Show>
                      <div class="text-11-regular text-text-weak">层级：{scopeLabel(item.scope.level)}</div>
                      <div class="text-11-regular text-text-weak">置信度：{trustLabel(item.confidence)}</div>
                      <div class="text-11-regular text-text-weak">命中情况：{hit(item.id, "habit")}</div>
                      <Show when={managed(item) ? item : undefined}>
                        {(row) => (
                          <div class="flex items-center gap-2 pt-1">
                            <Button size="small" variant="ghost" disabled={busy() !== ""} onClick={() => void sourceRemove(row())}>
                              从真源移除
                            </Button>
                            <Button
                              size="small"
                              variant="ghost"
                              disabled={busy() !== ""}
                              onClick={() => void projectSuppress(row())}
                            >
                              仅本项目禁用
                            </Button>
                          </div>
                        )}
                      </Show>
                    </div>
                  )}
                </For>
              </Show>
            </div>

            <div class="flex flex-col gap-2">
              <div class="text-12-medium text-text-strong">当前 session 暂存习惯（{activeScratch().length}）</div>
              <Show when={activeScratch().length > 0} fallback={<div class="text-12-regular text-text-weak">当前没有已生效的暂存习惯。</div>}>
                <For each={activeScratch()}>
                  {(item) => (
                    <div class="rounded-md border border-border-weak-base bg-background-stronger p-3 flex flex-col gap-2">
                      <div class="text-13-medium text-text-strong">{item.summary}</div>
                      <Show when={item.text !== item.summary}>
                        <div class="text-12-regular text-text-base whitespace-pre-wrap">{item.text}</div>
                      </Show>
                      <div class="text-11-regular text-text-weak">层级：仅本次对话</div>
                      <div class="text-11-regular text-text-weak">置信度：{captureLabel(item.capture_confidence)}</div>
                      <div class="text-11-regular text-text-weak">命中情况：{hit(item.id, "scratch")}</div>
                      <Show when={item.note}>
                        <div class="text-11-regular text-text-weak">补充说明：{item.note}</div>
                      </Show>
                    </div>
                  )}
                </For>
              </Show>
            </div>
          </>
        </Show>

        <div class="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => void adaptation.refresh()}>
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
