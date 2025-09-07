// src/components/shell/TopNav.jsx
import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useRole } from "@/lib/hooks/useRole";
import supabase from "@/lib/supabaseClient";

/** Local helper so we don't depend on external NavItem components */
function NavItem({ to, children, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        "px-3 py-2 rounded-md text-sm font-medium transition-colors " +
        (isActive ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100")
      }
      end
    >
      {children}
    </NavLink>
  );
}

export default function TopNav() {
  const { isAdmin } = useRole() || {};
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const navigate = useNavigate();

  const toggle = () => setOpen((v) => !v);
  const close = () => setOpen(false);

  async function onLogout() {
    try {
      setLoggingOut(true);
      await supabase.auth.signOut();
      navigate("/login", { replace: true }); // adjust if your sign-in route differs
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="w-full border-b bg-white">
      <div className="mx-auto max-w-7xl px-4 py-2">
        <div className="flex items-center justify-between gap-3">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <NavLink to="/" className="text-base font-semibold text-gray-900">
              Falcon
            </NavLink>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-2">
            <NavItem to="/orders">Orders</NavItem>
            <NavItem to="/calendar">Calendar</NavItem>
            <NavItem to="/clients">Clients</NavItem>
            <NavItem to="/users">Users</NavItem>
            {isAdmin && <NavItem to="/admin/manage-roles">Manage Roles</NavItem>}

            {/* Divider */}
            <span className="mx-2 h-6 w-px bg-gray-200 self-stretch" />

            {/* Logout button */}
            <button
              onClick={onLogout}
              disabled={loggingOut}
              className="px-3 py-2 rounded-md text-sm font-medium border text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              title="Sign out"
            >
              {loggingOut ? "Logging out…" : "Logout"}
            </button>
          </nav>

          {/* Mobile toggle */}
          <button
            className="md:hidden inline-flex items-center rounded-md border px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={toggle}
            aria-label="Open menu"
          >
            Menu
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <nav className="md:hidden mt-2 flex flex-col gap-1 pb-2">
            <NavItem to="/orders" onClick={close}>
              Orders
            </NavItem>
            <NavItem to="/calendar" onClick={close}>
              Calendar
            </NavItem>
            <NavItem to="/clients" onClick={close}>
              Clients
            </NavItem>
            <NavItem to="/users" onClick={close}>
              Users
            </NavItem>
            {isAdmin && (
              <NavItem to="/admin/manage-roles" onClick={close}>
                Manage Roles
              </NavItem>
            )}

            {/* Divider */}
            <div className="my-1 h-px bg-gray-200" />

            <button
              onClick={() => {
                close();
                onLogout();
              }}
              disabled={loggingOut}
              className="text-left px-3 py-2 rounded-md text-sm font-medium border text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              {loggingOut ? "Logging out…" : "Logout"}
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}




