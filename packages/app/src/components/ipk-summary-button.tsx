import { Button } from "@opencode-ai/ui/button"
import { Icon } from "@opencode-ai/ui/icon"
import { Tooltip } from "@opencode-ai/ui/tooltip"
import { useIpk } from "@/context/ipk"

export function IpkSummaryButton(props: { sessionID?: string }) {
  const ipk = useIpk()

  return (
    <Tooltip placement="bottom" gutter={8} value={ipk.selecting() ? "退出总结选择模式" : "总结"}>
      <Button
        variant="ghost"
        onClick={() => {
          if (ipk.selecting()) {
            ipk.cancel()
            return
          }
          if (!props.sessionID) return
          ipk.start(props.sessionID)
        }}
        classList={{
          "h-7 px-2 flex items-center gap-1.5 text-12-regular": true,
          "bg-surface-base-active text-text-strong": ipk.selecting(),
        }}
        disabled={!props.sessionID}
      >
        <Icon name="pencil-line" class="size-3.5" />
        <span>总结</span>
        {ipk.selecting() && ipk.count() > 0 ? <span class="text-11-medium">({ipk.count()})</span> : null}
      </Button>
    </Tooltip>
  )
}
