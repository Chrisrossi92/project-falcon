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
      : variant === "dashboard"
      ? `w-full flex justify-center ${className}`.trim()
      : `${ACTIONS_COL_WIDTH} flex justify-center ${className}`.trim();
  const actionButtonClassName =
    variant === "panel"
      ? `h-9 w-full px-3 text-sm ${buttonClassName}`.trim()
      : variant === "dashboard"
      ? `h-9 w-full max-w-[128px] rounded-full border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 shadow-sm transition duration-150 hover:-translate-y-px hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 hover:shadow-md ${buttonClassName}`.trim()
      : `h-8 w-[120px] rounded-full border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 shadow-sm transition duration-150 hover:-translate-y-px hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 hover:shadow-md ${buttonClassName}`.trim();

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
    visibleActions.length === 0 ? (
      variant === "dashboard" ? (
        <span className="inline-flex h-9 w-full max-w-[128px] items-center justify-center rounded-full border border-dashed border-slate-200 bg-slate-50/70 px-3 text-[11px] font-semibold text-slate-400">
          No action
        </span>
      ) : null
    ) : visibleActions.length === 1 ? (
      <Button
        size="sm"
        variant="outline"
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
