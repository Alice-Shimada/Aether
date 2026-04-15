import { Button } from "@opencode-ai/ui/button"
import { Dialog } from "@opencode-ai/ui/dialog"
import { createResource, For, Show } from "solid-js"
import { useDialog } from "@opencode-ai/ui/context/dialog"
import { useNavigate } from "@solidjs/router"
import { useIpk } from "@/context/ipk"
import { useSessionKey } from "@/pages/session/session-layout"

export function IpkDraftListDialog() {
  const ipk = useIpk()
  const dialog = useDialog()
  const navigate = useNavigate()
  const { params } = useSessionKey()
  const [items] = createResource(() => ipk.listDrafts())

  return (
    <Dialog title="审查暂存" size="large" fit>
      <div class="flex flex-col gap-2 max-h-[60vh] overflow-y-auto px-1">
        <Show when={!items.loading} fallback={<div class="text-12-regular text-text-weak py-6">加载中…</div>}>
          <Show when={(items() ?? []).length > 0} fallback={<div class="text-12-regular text-text-weak py-6">暂无暂存草稿</div>}>
            <For each={items() ?? []}>
              {(item) => (
                <button
                  type="button"
                  class="w-full text-left rounded-md border border-border-weak-base bg-background-stronger p-3 hover:bg-surface-raised-base-hover transition-colors"
                  onClick={() => {
                    if (item.session_id && params.id !== item.session_id) {
                      navigate(`/${params.dir}/session/${item.session_id}`)
                      setTimeout(() => {
                        void ipk.openDraft(item.draft_id)
                      }, 0)
                      dialog.close()
                      return
                    }
                    void ipk.openDraft(item.draft_id)
                    dialog.close()
                  }}
                >
                  <div class="text-13-medium text-text-strong truncate">{item.title}</div>
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
