// src/components/orders/NewOrderButton.jsx
import React from "react";
import { Link } from "react-router-dom";
import { useSession } from "@/lib/hooks/useSession";

/** Renders nothing unless the current user is an admin. */
export default function NewOrderButton({ className = "" }) {
  const { isAdmin } = useSession();
  if (!isAdmin) return null;

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
