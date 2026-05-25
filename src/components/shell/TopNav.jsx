import { useEffect, useState } from "react";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import falconWordmark from "@/assets/branding/falcon-wordmark-dark-shell.png";
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
import { getShellWorkModeCue } from "@/lib/shell/shellWorkMode";
import { Menu, Search } from "lucide-react";

const DESKTOP_SECTION_STYLES = Object.freeze({
  operations: {
    shell: "border-slate-600 bg-slate-900 shadow-sm shadow-slate-950/25",
    label: "text-slate-300",
    item: "operational",
  },
  work: {
    shell: "border-slate-600 bg-slate-900 shadow-sm shadow-slate-950/25",
    label: "text-slate-300",
    item: "operational",
  },
  review_work: {
    shell: "border-slate-600 bg-slate-900 shadow-sm shadow-slate-950/25",
    label: "text-slate-300",
    item: "operational",
  },
  received_work: {
    shell: "border-slate-600 bg-slate-900 shadow-sm shadow-slate-950/25",
    label: "text-slate-300",
    item: "operational",
  },
  management: {
    shell: "border-slate-700 bg-slate-950/50",
    label: "text-slate-400",
    item: "secondary",
  },
  support: {
    shell: "border-slate-700 bg-slate-950/50",
    label: "text-slate-400",
    item: "secondary",
  },
  setup_support: {
    shell: "border-slate-700 bg-slate-950/50",
    label: "text-slate-400",
    item: "secondary",
  },
  account: {
    shell: "border-slate-700 bg-slate-950/50",
    label: "text-slate-400",
    item: "secondary",
  },
  other_visible_links: {
    shell: "border-slate-700 bg-slate-950/40",
    label: "text-slate-500",
    item: "quiet",
  },
});

const DEFAULT_DESKTOP_SECTION_STYLE = Object.freeze({
  shell: "border-transparent bg-transparent",
  label: "text-slate-400",
  item: "operational",
});

function BrandWordmark({ shellModeCue, className = "" }) {
  return (
    <Link
      to="/dashboard"
      className={`group block w-64 shrink-0 rounded-lg transition opacity-95 hover:opacity-100 sm:w-80 ${className}`}
      aria-label="Falcon dashboard"
      title={shellModeCue?.context}
    >
      <img
        src={falconWordmark}
        alt="Falcon"
        className="-my-3 h-14 w-full translate-y-2 object-cover object-center sm:-my-4 sm:h-16 sm:translate-y-3"
      />
    </Link>
  );
}

function OperationalModeContext({ shellModeCue, placement = "rail" }) {
  const placementClass =
    placement === "rail"
      ? "rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-3"
      : "hidden min-w-0 border-l border-slate-800/80 pl-3 md:block";

  return (
    <div
      className={placementClass}
      aria-label="Operational mode"
    >
      <div className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        Staff Appraiser Operations
      </div>
      <div
        className="mt-0.5 truncate text-sm font-semibold text-slate-100"
        data-testid="shell-work-mode"
        title={shellModeCue.context}
      >
        {shellModeCue.label}
      </div>
    </div>
  );
}

function NavItem({ to, children, onClick, tone = "operational", className = "" }) {
  const inactiveClass =
    tone === "secondary"
      ? "text-slate-300 hover:bg-white/10 hover:text-white"
      : tone === "quiet"
      ? "text-slate-400 hover:bg-white/10 hover:text-slate-100"
      : "text-slate-100 hover:bg-white/10 hover:text-white";

  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `relative whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${className} ` +
        (isActive
          ? "bg-white text-slate-950 shadow-md shadow-slate-950/20 ring-1 ring-white/30 after:absolute after:inset-x-3 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-slate-900/80"
          : inactiveClass)
      }
      end
    >
      {children}
    </NavLink>
  );
}

function DesktopNavSection({ section, emphasizedSectionId, orientation = "horizontal" }) {
  const showLabel = section.grouped && section.label;
  const styles = DESKTOP_SECTION_STYLES[section.id] ?? DEFAULT_DESKTOP_SECTION_STYLE;
  const isProfileSection = section.id === emphasizedSectionId;
  const sectionEmphasisClass = isProfileSection
    ? "ring-1 ring-white/20 shadow-md shadow-slate-950/30"
    : "";
  const shellClass =
    orientation === "vertical"
      ? `flex flex-col gap-1 rounded-2xl border p-2 ${styles.shell} ${sectionEmphasisClass}`
      : `flex shrink-0 items-center gap-1 rounded-xl border px-1.5 py-1 ${styles.shell} ${sectionEmphasisClass}`;
  const labelClass =
    orientation === "vertical"
      ? `px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${styles.label}`
      : `hidden pl-2 pr-1 text-[10px] font-semibold uppercase tracking-[0.14em] xl:inline ${styles.label}`;

  return (
    <div
      className={shellClass}
      data-shell-profile-section={isProfileSection ? "active" : undefined}
    >
      {showLabel && (
        <span className={labelClass}>
          {section.label}
        </span>
      )}
      {section.links.map((link) => (
        <NavItem
          key={link.id}
          to={link.path}
          tone={styles.item}
          className={orientation === "vertical" ? "block w-full text-left" : ""}
        >
          {link.label}
        </NavItem>
      ))}
    </div>
  );
}

function createDashboardLink() {
  return Object.freeze({
    id: "dashboard",
    label: "Operations",
    path: "/dashboard",
    sourceSurface: "operational_spine",
  });
}

function createMyWorkLink() {
  return Object.freeze({
    id: "my_work",
    label: "My Work",
    path: "/my-work",
    sourceSurface: "operational_spine",
  });
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
        className="flex items-center gap-2 rounded-lg border border-transparent bg-transparent px-1.5 py-1 transition hover:border-slate-700 hover:bg-slate-900/70"
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
        <span className="hidden max-w-32 truncate text-sm font-medium text-slate-200 sm:block">{display}</span>
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
  const canReadOrders = useCanAny([
    PERMISSIONS.ORDERS_READ_ALL,
    PERMISSIONS.ORDERS_READ_ASSIGNED,
  ]);
  const canReadRelationships = useCan(PERMISSIONS.RELATIONSHIPS_READ);
  const canReadUsers = useCan(PERMISSIONS.USERS_READ);
  const canViewSettings = useCan(PERMISSIONS.SETTINGS_VIEW);
  const clientsPath = canReadAllClients.allowed ? "/clients" : "/clients/cards";
  const showUsersNav = canReadUsers.allowed;
  const showAssignmentsNav = canReadAssignments.allowed;
  const showRelationshipsNav = canReadRelationships.allowed;
  const showSettingsNav = canViewSettings.allowed;
  const shellProfileId = shellProfilePresentation?.profileId ?? shellProfilePresentation?.id;
  const showMyWorkNav = shellProfileId === "my_work" && canReadOrders.allowed;
  const primaryNavLinks = getCurrentPrimaryNavLinks({
    canReadAllClients: canReadAllClients.allowed,
    canReadAssignedClients: canReadAssignedClients.allowed,
    canReadAssignments: showAssignmentsNav,
    canReadRelationships: showRelationshipsNav,
    canReadUsers: showUsersNav,
  });
  const myWorkNavLinks = showMyWorkNav ? [createMyWorkLink()] : [];
  const mobileNavLinks = getCurrentShellMobileNavigationLinks(
    [...myWorkNavLinks, ...primaryNavLinks],
    shellProfileId,
  );
  const railNavLinks = [createDashboardLink(), ...myWorkNavLinks, ...primaryNavLinks];
  const railNavSections = getCurrentShellNavigationSections(
    railNavLinks,
    shellProfileId,
  );
  const shellModeCue = getShellWorkModeCue(shellProfilePresentation);

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
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[17rem] flex-col border-r border-slate-800 bg-[radial-gradient(circle_at_18%_100%,rgba(51,65,85,0.32),transparent_40%),linear-gradient(180deg,#020617_0%,#07111f_36%,#111827_100%)] px-3 py-3 shadow-[18px_0_48px_rgba(2,6,23,0.36)] md:flex">
        <OperationalModeContext shellModeCue={shellModeCue} />
        <nav
          aria-label="Operational spine navigation"
          className="mt-5 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-3"
        >
          {railNavSections.map((section) => (
            <DesktopNavSection
              key={section.id}
              section={section}
              emphasizedSectionId={shellModeCue.sectionId}
              orientation="vertical"
            />
          ))}
        </nav>
      </aside>

      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 shadow-[0_10px_28px_rgba(2,6,23,0.18)] backdrop-blur-xl md:border-b-0 md:bg-transparent md:pl-[17rem] md:shadow-none">
        <div aria-hidden className="h-px bg-slate-700/50 md:hidden" />
        <div className="mx-auto flex min-h-14 max-w-[1500px] items-center justify-between gap-4 px-3 py-1.5 sm:px-4 md:min-h-12 md:py-2">
          <div className="flex min-w-0 items-center gap-3">
            <BrandWordmark shellModeCue={shellModeCue} />
          </div>

          <div className="ml-auto flex min-w-0 max-w-[calc(100vw-5rem)] items-center justify-end gap-1.5 rounded-xl border border-slate-800 bg-slate-950/82 px-1.5 py-1 shadow-sm shadow-slate-950/20 sm:gap-2 md:ml-0 md:max-w-none md:shrink-0 md:border-slate-700/70 md:bg-slate-950/64 md:shadow-none">
            <button
              className="hidden items-center gap-2 rounded-lg border border-transparent bg-transparent px-2.5 py-1.5 text-sm text-slate-400 transition hover:border-slate-700 hover:bg-slate-900/70 hover:text-slate-200 lg:flex"
              onClick={() => setPal(true)}
              title="Search (⌘K)"
            >
              <Search className="h-4 w-4 text-slate-500" aria-hidden="true" />
              <span className="truncate">Command</span>
              <span className="rounded-md border border-slate-700/70 bg-slate-900/60 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">⌘K</span>
            </button>
            <button className="hidden rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm font-medium text-slate-300 transition hover:border-slate-700 hover:bg-slate-900/70 sm:inline-flex lg:hidden" onClick={() => setPal(true)} title="Search">
              ⌘K
            </button>
            <button className="rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm font-medium text-slate-300 transition hover:border-slate-700 hover:bg-slate-900/70 md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Open menu">
              <Menu className="h-4 w-4" aria-hidden="true" />
            </button>
            <div className="hidden sm:block">
              <NotificationBell />
            </div>
            <div className="hidden sm:block">
              <AvatarMenu me={me} />
            </div>
          </div>
        </div>

        {/* mobile nav */}
        {open && (
          <div className="border-t border-slate-800 bg-slate-950/95 shadow-lg backdrop-blur-xl md:hidden">
            <nav aria-label="Mobile operational navigation" className="px-3 py-3 flex flex-col gap-1">
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
