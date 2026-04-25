// src/components/orders/NewOrderButton.jsx
import React from "react";
import { Link } from "react-router-dom";
import { useRole } from "@/lib/hooks/useRole";
import { useCan } from "@/lib/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/permissions/constants";

/** Renders when the user can create orders. `show={false}` can still hide it. */
export default function NewOrderButton({ className = "", show }) {
  const { isAdmin } = useRole() || {};
  const canCreateOrder = useCan(PERMISSIONS.ORDERS_CREATE);
  const useLegacyVisibility = canCreateOrder.loading || canCreateOrder.error;
  const visible = show === false
    ? false
    : useLegacyVisibility
    ? isAdmin
    : canCreateOrder.allowed;

  if (!visible) return null;

  return (
    <Link
      to="new"                 // <-- relative to current (/orders => /orders/new)
      relative="path"          // <-- ensure v6+ relative behavior
      className={
        "inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 " +
        className
      }
      title="Create a new order"
    >
      <span aria-hidden>＋</span>
      <span>New Order</span>
    </Link>
  );
}

