import { Button } from "@opencode-ai/ui/button"
import { Icon } from "@opencode-ai/ui/icon"
import { Tooltip } from "@opencode-ai/ui/tooltip"
import { useAdaptation } from "@/context/adaptation"
import { useSessionKey } from "@/pages/session/session-layout"

export function AdaptationOrganizeSessionButton() {
  const adaptation = useAdaptation()
  const { params } = useSessionKey()

  return (
    <Tooltip placement="bottom" gutter={8} value="提取用户习惯">
      <Button
        variant="ghost"
        classList={{
          "h-7 px-2 flex items-center gap-1.5 text-12-regular": true,
          "opacity-60": adaptation.loading(),
        }}
        disabled={!params.id || adaptation.loading()}
        onClick={() => {
          if (!params.id) return
          void adaptation.setSession(params.id).then(() => adaptation.organize())
        }}
      >
        <Icon name="magnifying-glass" class="size-3.5" />
        <span>提取用户习惯</span>
      </Button>
    </Tooltip>
  )
}
