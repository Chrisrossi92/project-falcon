import { useEffect, useState } from "react";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import supabase from "@/lib/supabaseClient";
import NotificationBell from "@/components/notifications/NotificationBell";
import CommandPalette from "@/components/nav/CommandPalette";
import { getCurrentUserProfile } from "@/lib/services/api";
import AvatarBadge from "@/components/ui/AvatarBadge";
import { useCan, useCanAny } from "@/lib/hooks/usePermissions";
import { getCurrentPrimaryNavLinks } from "@/lib/navigation/currentPrimaryNavLinks";
import { getCurrentShellMobileNavigationLinks } from "@/lib/navigation/currentShellMobileNavigationLinks";
import { getCurrentShellNavigationSections } from "@/lib/navigation/currentShellNavigationSections";
import { avatarSettingsUtilityLinks } from "@/lib/navigation/currentSettingsUtilityLinks";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { useShellProfile } from "@/lib/shell/useShellProfile";
import { Menu, Search } from "lucide-react";

function Brand() {
  return (
    <Link to="/dashboard" className="group flex items-center gap-3 rounded-xl px-1.5 py-1 transition hover:bg-slate-100">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-950 to-slate-700 text-sm font-semibold text-white shadow-sm ring-1 ring-slate-900/10">
        F
      </span>
      <span className="hidden leading-tight sm:block">
        <span className="block text-sm font-semibold tracking-tight text-slate-950">Falcon Operations</span>
        <span className="block text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">Operations Console</span>
      </span>
    </Link>
  );
}

function NavItem({ to, children, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        "px-4 py-2 rounded-lg text-base font-semibold transition " +
        (isActive ? "bg-slate-950 text-white shadow-sm" : "text-slate-600 hover:bg-white hover:text-slate-950")
      }
      end
    >
      {children}
    </NavLink>
  );
}

function DesktopNavSection({ section }) {
  const showLabel = section.grouped && section.label;

  return (
    <div className="flex items-center gap-1">
      {showLabel && (
        <span className="pl-2 pr-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          {section.label}
        </span>
      )}
      {section.links.map((link) => (
        <NavItem key={link.id} to={link.path}>{link.label}</NavItem>
      ))}
    </div>
  );
}

function AvatarMenu({ me }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const display = me?.display_name || me?.full_name || me?.name || me?.email || "User";
  const [accountSettingsLink] = avatarSettingsUtilityLinks;

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
        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
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
        <span className="hidden sm:block text-sm font-medium text-slate-800">{display}</span>
      </button>

      {open && (
        <div id="avatar-menu" className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-xl z-50">
          <div className="px-3 py-2">
            <div className="text-sm font-medium truncate">{display}</div>
            <div className="text-xs text-gray-500 truncate">{me?.email || "Account"}</div>
          </div>
          <div className="h-px bg-gray-200" />
          <Link to={accountSettingsLink.path} className="block px-3 py-2 text-sm hover:bg-gray-50" onClick={() => setOpen(false)}>
            {accountSettingsLink.label}
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
  const shellProfilePresentation = useShellProfile();
  const canReadAllClients = useCan(PERMISSIONS.CLIENTS_READ_ALL);
  const canReadAssignedClients = useCan(PERMISSIONS.CLIENTS_READ_ASSIGNED);
  const canReadAssignments = useCanAny([
    PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED,
    PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_OWNER,
  ]);
  const canReadRelationships = useCan(PERMISSIONS.RELATIONSHIPS_READ);
  const canReadUsers = useCan(PERMISSIONS.USERS_READ);
  const canViewSettings = useCan(PERMISSIONS.SETTINGS_VIEW);
  const clientsPath = canReadAllClients.allowed ? "/clients" : "/clients/cards";
  const showUsersNav = canReadUsers.allowed;
  const showAssignmentsNav = canReadAssignments.allowed;
  const showRelationshipsNav = canReadRelationships.allowed;
  const showSettingsNav = canViewSettings.allowed;
  const primaryNavLinks = getCurrentPrimaryNavLinks({
    canReadAllClients: canReadAllClients.allowed,
    canReadAssignedClients: canReadAssignedClients.allowed,
    canReadAssignments: showAssignmentsNav,
    canReadRelationships: showRelationshipsNav,
    canReadUsers: showUsersNav,
  });
  const shellProfileId = shellProfilePresentation?.profileId ?? shellProfilePresentation?.id;
  const desktopNavSections = getCurrentShellNavigationSections(
    primaryNavLinks,
    shellProfileId,
  );
  const mobileNavLinks = getCurrentShellMobileNavigationLinks(
    primaryNavLinks,
    shellProfileId,
  );

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
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 shadow-sm backdrop-blur-xl">
        <div aria-hidden className="h-1 bg-gradient-to-r from-slate-950 via-slate-700 to-slate-950" />
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-3 sm:px-4">
          <Brand />

          <nav className="hidden items-center gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1 md:flex">
            {desktopNavSections.map((section) => (
              <DesktopNavSection key={section.id} section={section} />
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 p-1 shadow-sm">
            <button
              className="hidden min-w-[260px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 xl:flex"
              onClick={() => setPal(true)}
              title="Search (⌘K)"
            >
              <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <span className="truncate">Search...</span>
              <span className="ml-auto rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">⌘K</span>
            </button>
            <button className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 md:hidden" onClick={() => setPal(true)} title="Search">
              ⌘K
            </button>
            <NotificationBell />
            <AvatarMenu me={me} />
            <button className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Open menu">
              <Menu className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* mobile nav */}
        {open && (
          <div className="md:hidden border-t border-slate-200 bg-white/95 shadow-lg backdrop-blur-xl">
            <nav className="px-3 py-3 flex flex-col gap-1">
              {mobileNavLinks.map((link) => (
                <NavItem key={link.id} to={link.path} onClick={() => setOpen(false)}>
                  {link.label}
                </NavItem>
              ))}
              <div className="h-px bg-gray-200 my-1" />
              {showSettingsNav && <NavItem to="/settings" onClick={() => setOpen(false)}>Settings</NavItem>}
            </nav>
          </div>
        )}
      </header>

      <CommandPalette
        open={pal}
        onClose={() => setPal(false)}
        clientsPath={clientsPath}
        onNavigate={(to) => { setPal(false); if (to) navigate(to); }}
      />
    </>
  );
}
