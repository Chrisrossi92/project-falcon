// src/components/AppSidebar.jsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useSession } from "@/lib/hooks/useSession";

function NavItem({ to, label }) {
  const { pathname } = useLocation();
  const active = pathname === to || pathname.startsWith(to + "/");
  return (
    <Link
      to={to}
      className={`block px-3 py-2 rounded-md text-sm ${
        active ? "bg-gray-900 text-white" : "text-gray-800 hover:bg-gray-100"
      }`}
    >
      {label}
    </Link>
  );
}

/**
 * Minimal, role-aware sidebar:
 * - Admin: Dashboard, Orders, Calendar, Clients, Users
 * - Reviewer: Dashboard, Orders, Calendar
 * - Appraiser: Dashboard, Orders, Calendar
 */
export default function AppSidebar() {
  const { isAdmin, isReviewer } = useSession();

  return (
    <aside className="w-56 border-r bg-white p-3 space-y-1">
      <NavItem to="/dashboard" label="Dashboard" />
      <NavItem to="/orders" label="Orders" />
      <NavItem to="/calendar" label="Calendar" />
      {isAdmin && <NavItem to="/clients" label="Clients" />}
      {isAdmin && <NavItem to="/users" label="Users" />}
    </aside>
  );
}
