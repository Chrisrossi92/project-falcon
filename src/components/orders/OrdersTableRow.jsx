// src/components/orders/OrdersTableRow.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import { updateOrderStatus, updateOrderDates } from "@/lib/services/ordersService";
import { fromLocalInputValue, toLocalInputValue } from "@/lib/utils/formatDate";
import { useSession } from "@/lib/hooks/useSession";
import {
  ORDER_STATUSES,
  isReviewStatus,
  labelForStatus,
  isValidStatus,
  normalizeStatus,
} from "@/lib/constants/orderStatus";

import { updateOrderStatus, updateOrderDates } from "@/lib/services/ordersService.js";

function dtToLocalInput(iso) {
  return toLocalInputValue(iso);
}

export default function OrdersTableRow({ order, onRefresh }) {
  const { user } = useSession();
  const uid = user?.id || null;

  const [savingVisit, setSavingVisit] = useState(false);
  const [savingDue, setSavingDue] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  const statusNorm = normalizeStatus(order.status || "");
  const reviewState = isReviewStatus(statusNorm);
  const isMyReviewTask = uid && order.current_reviewer_id === uid;

  async function onStatusChange(e) {
    const nextRaw = e.target.value;
    const next = normalizeStatus(nextRaw);
    if (!next || next === statusNorm) return;

    if (!isValidStatus(next)) {
      toast.error("Invalid status");
      return;
    }
    try {
      setSavingStatus(true);
      await updateOrderStatus(order.id, next);
      toast.success(`Status → ${labelForStatus(next)}`);
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
      await updateOrderDates(order.id, { siteVisit: fromLocalInputValue(value) });
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
      await updateOrderDates(order.id, { finalDue: fromLocalInputValue(value) });
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
    <tr
      className={`align-middle ${
        isMyReviewTask ? "bg-blue-50" : reviewState ? "bg-yellow-50" : ""
      }`}
      title={
        isMyReviewTask
          ? "Review task assigned to you"
          : reviewState
          ? "In review workflow"
          : undefined
      }
    >
      <td className="px-3 py-2">
        {order.order_number ?? order.id.slice(0, 8)}
        {isMyReviewTask && (
          <span className="ml-2 inline-flex items-center rounded-full bg-blue-600 text-white px-2 py-0.5 text-[10px]">
            REVIEW TASK
          </span>
        )}
      </td>

      <td className="px-3 py-2">
        {order.client_name ?? order.client?.name ?? order.manual_client ?? "—"}
      </td>

      <td className="px-3 py-2">
        {order.property_address || order.address || "—"}
        {order.city ? `, ${order.city}` : ""} {order.state || ""}{" "}
        {order.postal_code || ""}
      </td>

      <td className="px-3 py-2">
        {order.appraiser_name ||
          order.appraiser?.display_name ||
          order.appraiser?.name ||
          "—"}
      </td>

      <td className="px-3 py-2">
        <select
          className="border rounded-md px-2 py-1 text-sm"
          defaultValue={statusNorm || "new"}
          onChange={onStatusChange}
          disabled={savingStatus}
        >
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {labelForStatus(s)}
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











