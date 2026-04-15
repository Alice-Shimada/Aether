import { Button } from "@opencode-ai/ui/button"
import { Icon } from "@opencode-ai/ui/icon"
import { Tooltip } from "@opencode-ai/ui/tooltip"
import { useDialog } from "@opencode-ai/ui/context/dialog"
import { useAdaptation } from "@/context/adaptation"
import { AdaptationScratchDialog } from "@/components/adaptation-scratch-dialog"

export function AdaptationScratchButton() {
  const adaptation = useAdaptation()
  const dialog = useDialog()

  return (
    <Tooltip placement="bottom" gutter={8} value="暂存习惯">
      <Button
        variant="ghost"
        classList={{
          "h-7 px-2 flex items-center gap-1.5 text-12-regular": true,
        }}
        onClick={() => {
          dialog.show(() => <AdaptationScratchDialog />)
        }}
      >
        <Icon name="review" class="size-3.5" />
        <span>暂存习惯</span>
        <span class="text-11-medium text-text-weak">({adaptation.status()?.scratch_count ?? 0})</span>
      </Button>
    </Tooltip>
  )
}
