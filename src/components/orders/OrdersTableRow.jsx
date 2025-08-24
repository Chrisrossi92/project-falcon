import React, { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import supabase from "@/lib/supabaseClient";
import { updateOrderStatus } from "@/lib/services/ordersService";
import logOrderEvent from "@/lib/utils/logOrderEvent";

const STATUSES = [
  "new",
  "assigned",
  "in_progress",
  "site_visit_done",
  "in_review",
  "ready_to_send",
  "sent_to_client",
  "revisions",
  "complete",
];

function dtToLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export default function OrdersTableRow({ order, onRefresh }) {
  const [savingVisit, setSavingVisit] = useState(false);
  const [savingDue, setSavingDue] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  async function onStatusChange(e) {
    const next = e.target.value;
    if (!next || next === order.status) return;
    try {
      setSavingStatus(true);
      await updateOrderStatus(order.id, next); // RPC logs prev/new
      toast.success(`Status → ${next.replaceAll("_", " ")}`);
      onRefresh?.();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
    } finally {
      setSavingStatus(false);
    }
  }

  async function onSetSiteVisit(value) {
    try {
      setSavingVisit(true);
      const iso = value ? new Date(value).toISOString() : null;
      const { error } = await supabase
        .from("orders")
        .update({ site_visit_at: iso })
        .eq("id", order.id);
      if (error) throw error;

      await logOrderEvent({
        order_id: order.id,
        action: "site_visit_set",
        message: "Site visit scheduled",
        context: { site_visit_at: iso },
      });

      toast.success("Site visit saved");
      onRefresh?.();
    } catch (err) {
      console.error(err);
      toast.error("Could not save site visit");
    } finally {
      setSavingVisit(false);
    }
  }

  async function onSetFinalDue(value) {
    try {
      setSavingDue(true);
      const iso = value ? new Date(value).toISOString() : null;
      const { error } = await supabase
        .from("orders")
        .update({ final_due_at: iso })
        .eq("id", order.id);
      if (error) throw error;

      await logOrderEvent({
        order_id: order.id,
        action: "client_due_updated",
        message: "Final due updated",
        context: { final_due_at: iso },
      });

      toast.success("Final due saved");
      onRefresh?.();
    } catch (err) {
      console.error(err);
      toast.error("Could not save final due");
    } finally {
      setSavingDue(false);
    }
  }

  return (
    <tr className="align-middle">
      <td className="px-3 py-2">{order.order_number ?? order.id.slice(0, 8)}</td>
      <td className="px-3 py-2">{order.client_name ?? order.client?.name ?? order.manual_client ?? "—"}</td>
      <td className="px-3 py-2">
        {order.property_address || order.address || "—"}
        {order.city ? `, ${order.city}` : ""} {order.state || ""} {order.postal_code || ""}
      </td>
      <td className="px-3 py-2">{order.appraiser_name || order.appraiser?.display_name || order.appraiser?.name || "—"}</td>

      <td className="px-3 py-2">
        <select
          className="border rounded-md px-2 py-1 text-sm"
          defaultValue={order.status ?? "new"}
          onChange={onStatusChange}
          disabled={savingStatus}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </td>

      <td className="px-3 py-2">
        <input
          type="datetime-local"
          className="border rounded-md px-2 py-1 text-sm"
          defaultValue={dtToLocalInput(order.site_visit_at)}
          onBlur={(e) => onSetSiteVisit(e.target.value)}
          disabled={savingVisit}
        />
      </td>

      <td className="px-3 py-2">
        <input
          type="datetime-local"
          className="border rounded-md px-2 py-1 text-sm"
          defaultValue={dtToLocalInput(order.final_due_at)}
          onBlur={(e) => onSetFinalDue(e.target.value)}
          disabled={savingDue}
        />
      </td>

      <td className="px-3 py-2">
        <Link className="text-blue-600 hover:underline text-sm" to={`/orders/${order.id}`}>
          Details
        </Link>
      </td>
    </tr>
  );
}








