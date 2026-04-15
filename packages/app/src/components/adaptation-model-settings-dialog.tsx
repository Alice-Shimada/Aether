import { Button } from "@opencode-ai/ui/button"
import { Dialog } from "@opencode-ai/ui/dialog"
import { ModelSelectorPopover } from "@/components/dialog-select-model"
import { useModels } from "@/context/models"
import { useAdaptation, type AdaptationModelKind, type AdaptationModelMap, type AdaptationModelRef } from "@/context/adaptation"
import { createResource, createSignal, For, Show } from "solid-js"
import { useDialog } from "@opencode-ai/ui/context/dialog"

const rows: Array<{ kind: AdaptationModelKind; title: string; desc: string }> = [
  { kind: "signal_extract", title: "信号提取", desc: "从对话中识别用户偏好和工作习惯信号" },
  { kind: "summary_aggregate", title: "摘要聚合", desc: "将多条信号合并为摘要并发现模式" },
  { kind: "proposal_generate", title: "建议生成", desc: "基于信号和摘要生成待确认的适应建议" },
  { kind: "semantic_merge", title: "语义归并候选", desc: "仅做相似 signal 语义归并候选，不绕过确认流程" },
  { kind: "scope_match", title: "范围匹配", desc: "将用户请求匹配到最合适的任务范围" },
]

export function AdaptationModelSettingsDialog() {
  const adaptation = useAdaptation()
  const models = useModels()
  const dialog = useDialog()
  const [cfg, setCfg] = createSignal<AdaptationModelMap>({})
  const [busy, setBusy] = createSignal(false)
  const [loaded] = createResource(async () => {
    const item = await adaptation.getModels()
    setCfg(item.models)
    return item
  })

  const item = (kind: AdaptationModelKind) => {
    const model = cfg()[kind]
    if (!model) return undefined
    return models.find(model)
  }

  const patch = async (kind: AdaptationModelKind, value?: AdaptationModelRef) => {
    setBusy(true)
    const next = {
      ...cfg(),
      [kind]: value,
    }
    setCfg(next)
    const saved = await adaptation.setModels({ [kind]: value })
    if (saved) setCfg(saved.models)
    setBusy(false)
  }

  return (
    <Dialog title="用户自适应 模型设置" size="large" fit>
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
            当前设置会持久化到本机长期记忆目录中的自适应配置，刷新或重启后保持不变。
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
