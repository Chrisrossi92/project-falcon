import React from "react";
import normalizeOrder from "@/lib/orders/normalizeOrder";
import AppointmentCell from "@/components/orders/drawer/AppointmentCell"; // path you used for this component

const fmt = (d) => (!d ? "—" : isNaN(new Date(d)) ? "—" : new Date(d).toLocaleString());

export default function OrderDatesPanel({
  order,
  hideTitle = false,
  editable = false,
  onSetAppointment, // (isoString) => void
}) {
  const n = normalizeOrder(order);

  return (
    <div className="rounded border bg-white p-3">
      {!hideTitle && <div className="font-medium mb-2">Dates</div>}
      <div className="grid grid-cols-2 gap-y-2 text-sm">
        <div className="text-xs text-muted-foreground">Site Visit</div>
        <div className="min-h-[28px]">
          {editable ? (
            <AppointmentCell
              siteVisitAt={n.siteVisitAt}
              onSetAppointment={onSetAppointment}
              compact
            />
          ) : (
            fmt(n.siteVisitAt)
          )}
        </div>

        <div className="text-xs text-muted-foreground">Review Due</div>
        <div>{fmt(n.reviewDueAt)}</div>

        <div className="text-xs text-muted-foreground">Final Due</div>
        <div>{fmt(n.finalDueAt)}</div>

        <div className="text-xs text-muted-foreground">Updated</div>
        <div>{fmt(n.updatedAt)}</div>
      </div>
    </div>
  );
}


