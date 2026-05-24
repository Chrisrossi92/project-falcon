import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/lib/hooks/useToast";
import {
  clearOrderOperationalInput,
  createOrderOperationalInput,
} from "./orderOperationalInputsApi";

const INPUT_ACTIONS = Object.freeze([
  {
    id: "inspection_scheduled",
    label: "Mark inspection scheduled",
    evidenceLabel: "Inspection scheduled",
  },
  {
    id: "report_on_track",
    label: "Mark report on track",
    evidenceLabel: "Report on track",
  },
  {
    id: "waiting_on_client",
    label: "Mark waiting on client",
    evidenceLabel: "Waiting on client",
  },
]);

const INPUT_LABELS = Object.freeze(
  INPUT_ACTIONS.reduce((labels, action) => {
    labels[action.id] = action.evidenceLabel;
    return labels;
  }, {}),
);

function normalizeActiveInput(input) {
  const label = INPUT_LABELS[input?.input_type];
  if (!input?.id || !label) return null;
  return {
    id: input.id,
    label,
  };
}

export default function OperationalInputsCreateClearControls({
  orderId,
  inputs = [],
  onChanged,
  className = "",
} = {}) {
  const { success, error: toastError } = useToast();
  const [submittingId, setSubmittingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const activeInputs = useMemo(
    () => (Array.isArray(inputs) ? inputs.map(normalizeActiveInput).filter(Boolean) : []),
    [inputs],
  );
  const disabled = !orderId || Boolean(submittingId);

  async function runAction(actionId, action) {
    if (!orderId || submittingId) return;

    setSubmittingId(actionId);
    setErrorMessage("");

    try {
      await action();
      await onChanged?.();
    } catch (err) {
      console.error("Operational context update failed", err);
      const message = "Operational context could not be updated. No lifecycle changes were made.";
      setErrorMessage(message);
      toastError(message);
      return;
    } finally {
      setSubmittingId(null);
    }

    success("Operational context updated.");
  }

  if (!orderId) return null;

  return (
    <section
      aria-label="Operational context controls"
      className={`rounded-xl border border-slate-200 bg-slate-50/70 p-3 ${className}`.trim()}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-950">Operational Context</h2>
          <p className="mt-0.5 text-xs leading-5 text-slate-500">
            Adds temporary context. This does not change lifecycle status.
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-fit border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
              disabled={disabled}
            >
              {submittingId ? "Updating..." : "Update context"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuPortal>
            <DropdownMenuContent side="bottom" align="end" sideOffset={6} className="z-50">
              {INPUT_ACTIONS.map((action) => (
                <DropdownMenuItem
                  key={action.id}
                  disabled={disabled}
                  onClick={() =>
                    runAction(action.id, () =>
                      createOrderOperationalInput(orderId, action.id),
                    )
                  }
                >
                  {action.label}
                </DropdownMenuItem>
              ))}
              {activeInputs.length > 0 && (
                <div className="my-1 border-t border-slate-100" aria-hidden="true" />
              )}
              {activeInputs.map((input) => (
                <DropdownMenuItem
                  key={`clear-${input.id}`}
                  disabled={disabled}
                  onClick={() =>
                    runAction(`clear-${input.id}`, () => clearOrderOperationalInput(input.id))
                  }
                >
                  Clear operational context: {input.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </DropdownMenu>
      </div>

      {errorMessage && (
        <div className="mt-2 rounded-md border border-rose-100 bg-white px-3 py-2 text-xs leading-5 text-rose-700">
          {errorMessage}
        </div>
      )}
    </section>
  );
}
