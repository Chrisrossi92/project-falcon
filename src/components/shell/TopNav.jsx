import React, { useEffect, useState } from "react";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import supabase from "@/lib/supabaseClient";
import NotificationBell from "@/components/notifications/NotificationBell";
import CommandPalette from "@/components/nav/CommandPalette";
import { getCurrentUserProfile } from "@/lib/services/api";
import AvatarBadge from "@/components/ui/AvatarBadge";

function Brand() {
  return (
    <Link to="/dashboard" className="flex items-center gap-2 font-semibold">
      <span className="inline-flex h-5 w-5 rounded-full bg-black text-white items-center justify-center text-[11px]">F</span>
      <span>Falcon</span>
    </Link>
  );
}

function NavItem({ to, children, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        "px-2.5 py-1.5 rounded-full text-sm transition " +
        (isActive ? "bg-gray-900 text-white shadow-sm" : "text-gray-700 hover:bg-gray-100")
      }
      end
    >
      {children}
    </NavLink>
  );
}

function AvatarMenu({ me }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const display = me?.display_name || me?.full_name || me?.name || me?.email || "User";
  const role    = me?.role || "—";

  async function logout() {
    await supabase.auth.signOut();
    navigate("/");
  }

  useEffect(() => {
    function onDocClick(e) {
      if (!open) return;
      const menu = document.getElementById("avatar-menu");
      if (menu && !menu.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div className="relative">
      <button
        className="flex items-center gap-2 rounded-full border px-2 py-1 hover:bg-white"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open ? "true" : "false"}
      >
        <AvatarBadge
          name={display}
          email={me?.email}
          id={me?.id}
          color={me?.display_color}
          src={me?.avatar_url}
          size={28}
          ring
        />
        <span className="hidden sm:block text-sm font-medium">{display}</span>
      </button>

      {open && (
        <div id="avatar-menu" className="absolute right-0 mt-2 w-56 rounded-xl border bg-white shadow-xl z-50">
          <div className="px-3 py-2">
            <div className="text-sm font-medium truncate">{display}</div>
            <div className="text-xs text-gray-500">Role: {role}</div>
          </div>
          <div className="h-px bg-gray-200" />
          <Link to={`/users/view/${me?.id ?? ""}`} className="block px-3 py-2 text-sm hover:bg-gray-50" onClick={() => setOpen(false)}>
            Profile
          </Link>
          <Link to="/settings" className="block px-3 py-2 text-sm hover:bg-gray-50" onClick={() => setOpen(false)}>
            Settings
          </Link>
          <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50" onClick={logout}>
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

export default function TopNav() {
  const navigate         = useNavigate();
  const { pathname }     = useLocation();
  const [me, setMe]      = useState(null);
  const [open, setOpen]  = useState(false); // mobile sheet
  const [pal, setPal]    = useState(false); // command palette

  useEffect(() => {
    (async () => {
      try { setMe(await getCurrentUserProfile()); } catch { setMe(null); }
    })();
  }, []);

  // ⌘K / Ctrl+K
  useEffect(() => {
    function onKey(e) {
      const isMac = /Mac|iPhone|iPod|iPad/.test(navigator.platform);
      const mod   = isMac ? e.metaKey : e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); setPal(true); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-7xl h-14 px-3 sm:px-4 flex items-center gap-3">
          <Brand />

          <nav className="hidden md:flex items-center gap-1 ml-2">
            <NavItem to="/orders">Orders</NavItem>
            <NavItem to="/calendar">Calendar</NavItem>
            <NavItem to="/clients">Clients</NavItem>
            <NavItem to="/users">Users</NavItem>
          </nav>

          {/* global search launcher */}
          <button
            className="hidden lg:flex mx-auto min-w-[260px] items-center gap-2 rounded-full border px-3 py-1.5 text-sm text-gray-500 hover:bg-white"
            onClick={() => setPal(true)}
            title="Search (⌘K)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" className="text-gray-400">
              <path fill="currentColor" d="M21 20l-4.35-4.35a7.5 7.5 0 10-1.41 1.41L20 21zM4 10.5a6.5 6.5 0 1113 0a6.5 6.5 0 01-13 0z"/>
            </svg>
            <span className="truncate">Search…</span>
            <span className="ml-auto text-[10px] rounded border px-1 py-0.5 text-gray-400">⌘K</span>
          </button>

          <div className="ml-auto flex items-center gap-2">
            <button className="md:hidden rounded-md border px-2 py-1 text-sm" onClick={() => setPal(true)} title="Search">
              ⌘K
            </button>
            <NotificationBell />
            <AvatarMenu me={me} />
            <button className="md:hidden rounded-md border px-2 py-1 text-sm" onClick={() => setOpen((v) => !v)} aria-label="Open menu">
              Menu
            </button>
          </div>
        </div>

        {/* mobile nav */}
        {open && (
          <div className="md:hidden border-t bg-white">
            <nav className="px-3 py-3 flex flex-col gap-1">
              <NavItem to="/orders"   onClick={() => setOpen(false)}>Orders</NavItem>
              <NavItem to="/calendar" onClick={() => setOpen(false)}>Calendar</NavItem>
              <NavItem to="/clients"  onClick={() => setOpen(false)}>Clients</NavItem>
              <NavItem to="/users"    onClick={() => setOpen(false)}>Users</NavItem>
              <div className="h-px bg-gray-200 my-1" />
              <NavItem to="/settings" onClick={() => setOpen(false)}>Settings</NavItem>
            </nav>
          </div>
        )}
      </header>

      <CommandPalette
        open={pal}
        onClose={() => setPal(false)}
        onNavigate={(to) => { setPal(false); if (to) navigate(to); }}
      />
    </>
  );
}









