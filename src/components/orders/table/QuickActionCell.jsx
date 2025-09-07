import React, { useMemo, useState } from "react";
import supabase from "@/lib/supabaseClient";
import { useRole } from "@/lib/hooks/useRole";
import { updateOrderStatus } from "@/lib/services/ordersService";
import ApptPicker from "@/components/orders/inputs/ApptPicker";

const fmt = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d) ? "—" : d.toLocaleString();
};

export default function QuickActionCell({ order, onChanged }) {
  const { isAdmin, isReviewer } = useRole() || {};
  const isAppraiser = !isAdmin && !isReviewer;

  const [popover, setPopover] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localAppt, setLocalAppt] = useState(order?.site_visit_at || null);

  const appt = useMemo(() => localAppt ?? order?.site_visit_at ?? null, [localAppt, order]);

  if (!isAppraiser) {
    // keep admin/reviewer minimal
    return <span className="text-xs text-muted-foreground">{appt ? `Appt: ${fmt(appt)}` : "—"}</span>;
  }

  async function saveAppt(iso) {
    if (!order?.id) return;
    setBusy(true);
    try {
      setLocalAppt(iso);                     // optimistic
      const { error } = await supabase.from("orders").update({ site_visit_at: iso }).eq("id", order.id);
      if (error) throw error;
      setPopover(false);
      onChanged?.();
    } catch (e) {
      alert(e?.message || "Failed to save appointment");
    } finally {
      setBusy(false);
    }
  }

  async function sendToReview() {
    if (!order?.id) return;
    if (!window.confirm("Send this order to Review?")) return;
    setBusy(true);
    try {
      await updateOrderStatus(order.id, "in_review");
      onChanged?.();
    } catch (e) {
      alert(e?.message || "Failed to update status");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative w-[180px]">
      {/* compact default state */}
      {appt ? (
        <>
          <div className="text-sm truncate" title={fmt(appt)}>Appt: {fmt(appt)}</div>
          <div className="mt-1 flex items-center gap-2">
            <button type="button" className="text-xs text-gray-600 hover:underline"
                    onClick={() => setPopover((v) => !v)}>
              Edit
            </button>
            <button className="text-xs px-2 py-1 rounded border hover:bg-slate-50 disabled:opacity-50"
                    onClick={sendToReview} disabled={busy}>
              Send
            </button>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-2">
          <button className="text-xs px-2 py-1 rounded border hover:bg-slate-50"
                  onClick={() => setPopover(true)}>
            Set appt
          </button>
          <button className="text-xs px-2 py-1 rounded border hover:bg-slate-50 disabled:opacity-50"
                  onClick={sendToReview} disabled={busy}>
            Send
          </button>
        </div>
      )}

      {/* small anchored popover with the full picker */}
      {popover && (
        <div className="absolute z-20 right-0 mt-2 w-[260px] rounded-lg border bg-white p-3 shadow-xl">
          <ApptPicker
            value={appt}
            onSave={saveAppt}
            onCancel={() => setPopover(false)}
          />
        </div>
      )}
    </div>
  );
}






