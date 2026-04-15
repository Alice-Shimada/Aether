import { Button } from "@opencode-ai/ui/button"
import { Dialog } from "@opencode-ai/ui/dialog"
import { Spinner } from "@opencode-ai/ui/spinner"
import { Show, createSignal } from "solid-js"
import type { IpkDraftView } from "@/context/ipk"

export function IpkReviewDialog(props: {
  draft: () => IpkDraftView | undefined
  busy: () => boolean
  onRevise: (instruction: string) => Promise<void>
  onCommit: () => Promise<void>
  onStash: () => Promise<void>
}) {
  const [edit, setEdit] = createSignal(false)
  const [note, setNote] = createSignal("")
  const locked = () => props.busy() || props.draft()?.draft_id === "draft-pending"

  const runRevise = async () => {
    const text = note().trim()
    if (!text) return
    await props.onRevise(text)
    setNote("")
  }

  return (
    <Dialog title="Piece审查" size="large" persistent>
      <Show when={props.draft()}>
        {(draft) => (
          <div class="flex flex-col gap-3 px-1 pb-2 max-h-[72vh] overflow-y-auto">
            <Show when={props.busy()}>
              <div class="rounded-md border border-border-weak-base bg-background-stronger px-3 py-2 flex items-center gap-2 text-12-regular text-text-weak">
                <Spinner />
                <span>正在流式生成，请稍候…</span>
              </div>
            </Show>
            <div class="flex flex-col gap-1">
              <div class="text-12-medium text-text-weak">标题</div>
              <div class="text-14-medium text-text-strong">{draft().title}</div>
            </div>
            <div class="flex flex-col gap-1">
              <div class="text-12-medium text-text-weak">摘要</div>
              <div class="text-13-regular text-text-strong whitespace-pre-wrap">{draft().body_summary}</div>
            </div>
            <div class="flex flex-col gap-1">
              <div class="text-12-medium text-text-weak">正文</div>
              <pre class="rounded-md border border-border-weak-base bg-background-stronger p-3 text-12-regular whitespace-pre-wrap">
                {draft().body}
              </pre>
            </div>
            <Show when={edit()}>
              <div class="flex flex-col gap-2">
                <textarea
                  rows={4}
                  value={note()}
                  onInput={(event) => setNote(event.currentTarget.value)}
                  placeholder="告诉我你希望如何改进这条总结"
                  class="w-full rounded-md border border-border-weak-base bg-background-base p-2 text-13-regular text-text-strong outline-none"
                />
                <div class="flex justify-end">
                  <Button variant="secondary" onClick={() => void runRevise()} disabled={locked() || !note().trim()}>
                    重新总结
                  </Button>
                </div>
              </div>
            </Show>
            <div class="mt-1 grid grid-cols-3 gap-2">
              <Button variant="primary" onClick={() => void props.onCommit()} disabled={locked()}>
                入库
              </Button>
              <Button variant="secondary" onClick={() => setEdit((v) => !v)} disabled={locked()}>
                改进
              </Button>
              <Button variant="ghost" onClick={() => void props.onStash()} disabled={locked()}>
                暂存
              </Button>
            </div>
          </div>
        )}
      </Show>
    </Dialog>
  )
}
