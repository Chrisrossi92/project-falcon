import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ACTIONS_COL_WIDTH = "w-[140px]";

export default function SmartActionsControl({ actions = [] }) {
  const visibleActions = actions.filter((action) => action.visible);
  const primaryAction = visibleActions.find((action) => action.isPrimary && !action.disabled);

  const renderDropdown = (dropdownActions, triggerLabel = "View Actions") => {
    if (!dropdownActions.length) return null;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-[120px] px-2 text-[11px]"
          >
            <span className="truncate">{triggerLabel}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent
            side="bottom"
            align="end"
            sideOffset={6}
            className="z-50"
          >
            {dropdownActions.map((action) => (
              <DropdownMenuItem
                key={action.id}
                onClick={action.onClick}
                disabled={action.disabled}
              >
                {action.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>
    );
  };

  const button =
    visibleActions.length === 0 ? null : visibleActions.length === 1 ? (
      <Button
        size="sm"
        className="h-8 w-[120px] px-2 text-[11px]"
        onClick={visibleActions[0].onClick}
        disabled={visibleActions[0].disabled}
      >
        <span className="truncate">{visibleActions[0].label}</span>
      </Button>
    ) : (
      renderDropdown(visibleActions, primaryAction?.label || "View Actions")
    );

  return (
    <div className={`${ACTIONS_COL_WIDTH} flex justify-center`}>
      {button}
    </div>
  );
}
