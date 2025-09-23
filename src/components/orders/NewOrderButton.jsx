// src/components/orders/NewOrderButton.jsx
import React from "react";
import { Link } from "react-router-dom";
import { useRole } from "@/lib/hooks/useRole";

/** Renders nothing unless admin (or `show` prop = true). */
export default function NewOrderButton({ className = "", show }) {
  const { isAdmin } = useRole() || {};
  const visible = show ?? isAdmin;
  if (!visible) return null;

  return (
    <Link
      to="/orders/new"
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

