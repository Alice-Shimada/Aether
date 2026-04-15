import { DropdownMenu } from "@opencode-ai/ui/dropdown-menu"
import { Icon } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { Tooltip } from "@opencode-ai/ui/tooltip"
import { useDialog } from "@opencode-ai/ui/context/dialog"
import { IpkDraftListDialog } from "@/components/ipk-draft-list-dialog"
import { IpkModelSettingsDialog } from "@/components/ipk-model-settings-dialog"
import { IpkPieceListDialog } from "@/components/ipk-piece-list-dialog"

export function IpkLibraryMenu(props: { rail?: boolean; placement?: "right" | "bottom" | "top" | "left" } = {}) {
  const dialog = useDialog()

  return (
    <DropdownMenu>
      <Tooltip value="IPK库" placement={props.placement}>
        <DropdownMenu.Trigger
          as={props.rail ? IconButton : "button"}
          {...(props.rail
            ? {
                icon: "archive",
                variant: "ghost",
                size: "large",
                "aria-label": "IPK库",
              }
            : {
                type: "button",
                class:
                  "flex items-center gap-1 px-2 py-1 rounded text-12-regular text-text-weak hover:text-text-base hover:bg-surface-raised-base-hover transition-colors",
              })}
        >
          {props.rail ? null : (
            <>
              <Icon name="archive" size="small" />
              <span class="hidden @sm:block">IPK库</span>
            </>
          )}
        </DropdownMenu.Trigger>
      </Tooltip>
      <DropdownMenu.Portal>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={() => dialog.show(() => <IpkDraftListDialog />)}>
            <DropdownMenu.ItemLabel>审查暂存</DropdownMenu.ItemLabel>
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => dialog.show(() => <IpkPieceListDialog />)}>
            <DropdownMenu.ItemLabel>编辑pieces</DropdownMenu.ItemLabel>
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => dialog.show(() => <IpkModelSettingsDialog />)}>
            <DropdownMenu.ItemLabel>设置模型</DropdownMenu.ItemLabel>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu>
  )
}
