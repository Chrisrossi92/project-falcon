import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ACTIONS_COL_WIDTH = "w-[140px]";

export default function SmartActionsControl({
  actions = [],
  variant = "table",
  className = "",
  buttonClassName = "",
}) {
  const visibleActions = actions.filter((action) => action.visible);
  const primaryAction = visibleActions.find((action) => action.isPrimary && !action.disabled);
  const wrapperClassName =
    variant === "panel"
      ? `w-full flex ${className}`.trim()
      : `${ACTIONS_COL_WIDTH} flex justify-center ${className}`.trim();
  const actionButtonClassName =
    variant === "panel"
      ? `h-9 w-full px-3 text-sm ${buttonClassName}`.trim()
      : `h-8 w-[120px] px-2 text-[11px] ${buttonClassName}`.trim();

  const renderDropdown = (dropdownActions, triggerLabel = "View Actions") => {
    if (!dropdownActions.length) return null;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className={actionButtonClassName}
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
        className={actionButtonClassName}
        onClick={visibleActions[0].onClick}
        disabled={visibleActions[0].disabled}
      >
        <span className="truncate">{visibleActions[0].label}</span>
      </Button>
    ) : (
      renderDropdown(visibleActions, primaryAction?.label || "View Actions")
    );

  return (
    <div className={wrapperClassName}>
      {button}
    </div>
  );
}
