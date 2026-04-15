import { Button } from "@opencode-ai/ui/button"
import { Dialog } from "@opencode-ai/ui/dialog"
import { createResource, For, Show } from "solid-js"
import { useDialog } from "@opencode-ai/ui/context/dialog"
import { useIpk } from "@/context/ipk"

export function IpkPieceListDialog() {
  const ipk = useIpk()
  const dialog = useDialog()
  const [items] = createResource(() => ipk.listPieces())

  return (
    <Dialog title="编辑pieces" size="large" fit>
      <div class="flex flex-col gap-2 max-h-[60vh] overflow-y-auto px-1">
        <Show when={!items.loading} fallback={<div class="text-12-regular text-text-weak py-6">加载中…</div>}>
          <Show when={(items() ?? []).length > 0} fallback={<div class="text-12-regular text-text-weak py-6">暂无已入库 piece</div>}>
            <For each={items() ?? []}>
              {(item) => (
                <button
                  type="button"
                  class="w-full text-left rounded-md border border-border-weak-base bg-background-stronger p-3 hover:bg-surface-raised-base-hover transition-colors"
                  onClick={() => {
                    void ipk.editStart(item.piece_id)
                    dialog.close()
                  }}
                >
                  <div class="flex items-center gap-2">
                    <span class="text-13-medium text-text-strong truncate">{item.title}</span>
                    <span class="text-11-regular text-text-weak">[{item.type}]</span>
                  </div>
                  <div class="text-12-regular text-text-weak line-clamp-2 mt-1">{item.body_summary}</div>
                </button>
              )}
            </For>
          </Show>
        </Show>
        <div class="flex justify-end pt-2">
          <Button variant="secondary" onClick={() => dialog.close()}>
            确认
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
