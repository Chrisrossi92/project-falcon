// src/layout/Layout.jsx
import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useSession } from "@/lib/hooks/useSession";
import supabase from "@/lib/supabaseClient";
import NotificationBell from "@/components/notifications/NotificationBell";
import NewOrderButton from "@/components/orders/NewOrderButton";

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-2 py-1 rounded text-sm ${
          isActive ? "bg-gray-200 text-gray-900" : "text-gray-700 hover:bg-gray-100"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export default function Layout() {
  const { user, isAdmin, isReviewer } = useSession();
  const navigate = useNavigate();

  async function logout() {
    try {
      await supabase.auth.signOut();
    } finally {
      navigate("/login", { replace: true });
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          {/* Left: logo + primary nav */}
          <div className="flex items-center gap-4">
            <NavLink to="/dashboard" className="font-semibold text-gray-900">
              Falcon
            </NavLink>

            <nav className="hidden sm:flex items-center gap-1">
              <NavItem to="/dashboard">Dashboard</NavItem>
              <NavItem to="/orders">Orders</NavItem>
              <NavItem to="/calendar">Calendar</NavItem>
              {isAdmin && <NavItem to="/clients">Clients</NavItem>}
              <NavItem to="/users">Users</NavItem>
              {isAdmin && <NavItem to="/admin/users">Manage Roles</NavItem>}
              <NavItem to="/settings">Settings</NavItem>
            </nav>
          </div>

          {/* Right: New Order (admin), notifications, user */}
          <div className="flex items-center gap-2">
            <NewOrderButton />
            <NotificationBell />
            {user ? (
              <>
                <span className="hidden sm:inline text-sm text-gray-700">
                  {user.email || "Signed in"}
                  {isAdmin ? " • Admin" : isReviewer ? " • Reviewer" : " • Appraiser"}
                </span>
                <button
                  className="px-2 py-1 border rounded text-sm hover:bg-gray-50"
                  onClick={logout}
                >
                  Logout
                </button>
              </>
            ) : null}
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-7xl mx-auto px-4 py-4">
        <Outlet />
      </main>
    </div>
  );
}









