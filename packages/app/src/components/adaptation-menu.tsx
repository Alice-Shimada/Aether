import { DropdownMenu } from "@opencode-ai/ui/dropdown-menu"
import { Icon } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { Tooltip } from "@opencode-ai/ui/tooltip"
import { useDialog } from "@opencode-ai/ui/context/dialog"
import { useParams } from "@solidjs/router"
import { useAdaptation } from "@/context/adaptation"
import { AdaptationCurrentContextDialog } from "@/components/adaptation-current-context-dialog"
import { AdaptationProposalInboxDialog } from "@/components/adaptation-proposal-inbox-dialog"
import { AdaptationModelSettingsDialog } from "@/components/adaptation-model-settings-dialog"

export function AdaptationMenu(props: { rail?: boolean; placement?: "right" | "bottom" | "top" | "left" } = {}) {
  const dialog = useDialog()
  const adaptation = useAdaptation()
  const params = useParams()

  const ready = async () => {
    if (!params.id) return false
    await adaptation.setSession(params.id)
    return true
  }

  return (
    <DropdownMenu>
      <Tooltip value="用户自适应" placement={props.placement}>
        <DropdownMenu.Trigger
          as={props.rail ? IconButton : "button"}
          {...(props.rail
            ? {
                icon: "shirt",
                variant: "ghost",
                size: "large",
                "aria-label": "用户自适应",
              }
            : {
                type: "button",
                class:
                  "flex items-center gap-1 px-2 py-1 rounded text-12-regular text-text-weak hover:text-text-base hover:bg-surface-raised-base-hover transition-colors",
              })}
        >
          {props.rail ? null : (
            <>
              <Icon name="shirt" size="small" />
              <span class="hidden @sm:block">用户自适应</span>
            </>
          )}
        </DropdownMenu.Trigger>
      </Tooltip>
      <DropdownMenu.Portal>
        <DropdownMenu.Content>
          <DropdownMenu.Item
            onSelect={() => {
              void ready().then((ok) => {
                if (!ok) return
                dialog.show(() => <AdaptationCurrentContextDialog />)
              })
            }}
          >
            <DropdownMenu.ItemLabel>当前 Session 习惯</DropdownMenu.ItemLabel>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={() => {
              void ready().then((ok) => {
                if (!ok) return
                dialog.show(() => <AdaptationProposalInboxDialog />)
              })
            }}
          >
            <DropdownMenu.ItemLabel>审查暂存习惯</DropdownMenu.ItemLabel>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={() => {
              void ready().then((ok) => {
                if (!ok) return
                void adaptation.organize()
              })
            }}
          >
            <DropdownMenu.ItemLabel>整理当前对话</DropdownMenu.ItemLabel>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={() => {
              dialog.show(() => <AdaptationModelSettingsDialog />)
            }}
          >
            <DropdownMenu.ItemLabel>模型设置</DropdownMenu.ItemLabel>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu>
  )
}
