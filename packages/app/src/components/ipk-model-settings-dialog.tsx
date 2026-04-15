import { Button } from "@opencode-ai/ui/button"
import { Dialog } from "@opencode-ai/ui/dialog"
import { ModelSelectorPopover } from "@/components/dialog-select-model"
import { useModels } from "@/context/models"
import { useIpk, type IpkModelKind, type IpkModelMap, type IpkModelRef } from "@/context/ipk"
import { createResource, createSignal, For, Show } from "solid-js"
import { useDialog } from "@opencode-ai/ui/context/dialog"

const rows: Array<{ kind: IpkModelKind; title: string; desc: string }> = [
  { kind: "summarize", title: "总结生成", desc: "用于“开始总结”初稿生成（draft）" },
  { kind: "revise", title: "改进重写", desc: "用于 review 里“改进/重新总结”" },
  { kind: "search", title: "搜索判定", desc: "用于 /ipk/search 候选重排与命中判断" },
  { kind: "associate", title: "联想判定", desc: "用于 /ipk/associate 桥接重排" },
]

export function IpkModelSettingsDialog() {
  const ipk = useIpk()
  const models = useModels()
  const dialog = useDialog()
  const [cfg, setCfg] = createSignal<IpkModelMap>({})
  const [busy, setBusy] = createSignal(false)
  const [loaded] = createResource(async () => {
    const item = await ipk.getModels()
    setCfg(item.models)
    return item
  })

  const item = (kind: IpkModelKind) => {
    const model = cfg()[kind]
    if (!model) return undefined
    return models.find(model)
  }

  const patch = async (kind: IpkModelKind, value?: IpkModelRef) => {
    setBusy(true)
    const next = {
      ...cfg(),
      [kind]: value,
    }
    setCfg(next)
    const saved = await ipk.setModels({ [kind]: value })
    if (saved) setCfg(saved.models)
    setBusy(false)
  }

  return (
    <Dialog title="IPK 设置模型" size="large" fit>
      <div class="flex flex-col gap-3 max-h-[65vh] overflow-y-auto px-1">
        <Show when={!loaded.loading} fallback={<div class="text-12-regular text-text-weak py-4">加载中…</div>}>
          <For each={rows}>
            {(row) => (
              <div class="rounded-md border border-border-weak-base bg-background-stronger p-3 flex flex-col gap-2">
                <div class="text-13-medium text-text-strong">{row.title}</div>
                <div class="text-12-regular text-text-weak">{row.desc}</div>
                <ModelSelectorPopover
                  model={{
                    ready: models.ready,
                    current: () => item(row.kind),
                    recent: () => models.recent.list().map(models.find).filter(Boolean),
                    list: models.list,
                    cycle: () => {},
                    set: (entry: { providerID: string; modelID: string } | undefined) => {
                      void patch(
                        row.kind,
                        entry
                          ? {
                              providerID: entry.providerID,
                              modelID: entry.modelID,
                            }
                          : undefined,
                      )
                    },
                    visible: models.visible,
                    setVisibility: models.setVisibility,
                    variant: {
                      configured: () => undefined,
                      selected: () => undefined,
                      current: () => undefined,
                      list: () => [] as string[],
                      set: () => {},
                      cycle: () => {},
                    },
                  }}
                >
                  <Button variant="secondary" class="w-full justify-start text-left" disabled={busy()}>
                    {item(row.kind)
                      ? `${item(row.kind)!.provider.name} / ${item(row.kind)!.name}`
                      : "未单独指定（自动使用默认模型）"}
                  </Button>
                </ModelSelectorPopover>
              </div>
            )}
          </For>
          <div class="text-11-regular text-text-weak px-1">
            当前设置会持久化到本机长期记忆目录中的 IPK 配置，刷新或重启后保持不变。
          </div>
        </Show>
        <div class="flex justify-end pt-1">
          <Button variant="secondary" onClick={() => dialog.close()}>
            确认
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
