// src/components/shell/TopNav.jsx
import React, { useMemo } from "react";
import { NavLink } from "react-router-dom";
import { useSession } from "@/lib/hooks/useSession";
import { useRole } from "@/lib/hooks/useRole";
import NotificationBell from "@/components/notifications/NotificationBell";
import NewOrderButton from "@/components/orders/NewOrderButton";
import supabase from "@/lib/supabaseClient";

function BrandButton() {
  return (
    <NavLink
      to="/dashboard"
      title="Go to Dashboard"
      className="relative group inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white/90 backdrop-blur transition-transform hover:-translate-y-0.5 hover:shadow-md"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      {/* watermark inside the button (subtle Falcon nod) */}
      <img
        src="/images/falcon-bg.png"
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-15 group-hover:opacity-20 object-cover rounded-xl"
        style={{ mixBlendMode: "multiply" }}
      />
      {/* company logo */}
      <img
        src="/assets/logo.png"
        alt="Continental Real Estate Solutions"
        className="h-6 w-auto relative z-10"
        draggable="false"
      />
      {/* tiny “Dashboard” label for clarity */}
      <span className="relative z-10 hidden sm:inline text-sm font-medium text-gray-900">
        Dashboard
      </span>
    </NavLink>
  );
}

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "px-3 py-1.5 rounded-full text-sm transition-colors",
          isActive ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100",
        ].join(" ")
      }
    >
      {children}
    </NavLink>
  );
}

export default function TopNav() {
  const { user } = useSession();
  const { isAdmin, isReviewer } = useRole() || {};

  const firstName = useMemo(() => {
    const metaName =
      user?.user_metadata?.name ||
      user?.user_metadata?.full_name ||
      user?.user_metadata?.given_name ||
      "";
    const base = metaName || (user?.email ? user.email.split("@")[0].replace(/\./g, " ") : "");
    const first = String(base).trim().split(/\s+/)[0] || "there";
    return first.charAt(0).toUpperCase() + first.slice(1);
  }, [user]);

  async function logout() {
    try { await supabase.auth.signOut(); } finally { window.location.href = "/login"; }
  }

  return (
    <header className="bg-white/85 backdrop-blur border-b">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
        {/* Left: logo-as-dashboard + nav */}
        <div className="flex items-center gap-4">
          <BrandButton />
          <nav className="hidden md:flex items-center gap-1">
            {/* Removed separate “Dashboard” link — the logo is the button now */}
            <NavItem to="/orders">Orders</NavItem>
            <NavItem to="/calendar">Calendar</NavItem>
            {isAdmin && <NavItem to="/clients">Clients</NavItem>}
            <NavItem to="/users">Users</NavItem>
            {isAdmin && <NavItem to="/admin/users">Manage Roles</NavItem>}
            <NavItem to="/settings">Settings</NavItem>
          </nav>
        </div>

        {/* Right: quick actions + greeting */}
        <div className="flex items-center gap-2">
          {isAdmin && <NewOrderButton />}
          <NotificationBell />
          {user ? (
            <div className="hidden sm:flex items-center gap-2 pl-2">
              <span className="text-sm text-gray-700">
                Hi, <span className="font-medium">{firstName}</span>
              </span>
              <span
                className={[
                  "text-[11px] px-2 py-0.5 rounded-full border",
                  isAdmin
                    ? "bg-gray-900 text-white border-gray-900"
                    : isReviewer
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-gray-50 text-gray-700 border-gray-200",
                ].join(" ")}
                title="Your role"
              >
                {isAdmin ? "Admin" : isReviewer ? "Reviewer" : "Appraiser"}
              </span>
              <button
                className="ml-1 px-2 py-1 border rounded text-sm hover:bg-gray-50"
                onClick={logout}
              >
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden border-t px-4 py-2 flex gap-1 overflow-x-auto">
        <NavItem to="/orders">Orders</NavItem>
        <NavItem to="/calendar">Calendar</NavItem>
        {isAdmin && <NavItem to="/clients">Clients</NavItem>}
        <NavItem to="/users">Users</NavItem>
        {isAdmin && <NavItem to="/admin/users">Manage Roles</NavItem>}
        <NavItem to="/settings">Settings</NavItem>
      </div>
    </header>
  );
}


