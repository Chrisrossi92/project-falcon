import { NavLink, Outlet, useNavigate } from "react-router-dom";

import falconWordmark from "@/assets/branding/falcon-wordmark-dark-shell.png";
import useSession from "@/lib/hooks/useSession";
import supabase from "@/lib/supabaseClient";

const navItems = Object.freeze([
  { label: "Dashboard", path: "/client-portal" },
  { label: "Current Orders", path: "/client-portal/orders" },
  { label: "Historical Orders", path: "/client-portal/historical-orders" },
  { label: "Documents", path: "/client-portal/documents" },
  { label: "Request Appraisal", path: "/client-portal/new-order" },
  { label: "Profile", path: "/client-portal/profile" },
]);

export default function ClientPortalLayout() {
  const navigate = useNavigate();
  const { user } = useSession();
  const clientEmail = user?.email || null;

  async function handleSignOut() {
    try {
      await supabase.auth.signOut();
    } finally {
      navigate("/login", { replace: true });
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-slate-950 text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[17rem] flex-col border-r border-slate-800 bg-[radial-gradient(circle_at_18%_100%,rgba(15,118,110,0.24),transparent_42%),linear-gradient(180deg,#020617_0%,#07111f_38%,#111827_100%)] px-3 py-3 shadow-[18px_0_48px_rgba(2,6,23,0.36)] md:flex">
        <NavLink to="/client-portal" end className="block w-64 rounded-lg opacity-95 transition hover:opacity-100">
          <img
            src={falconWordmark}
            alt="Falcon"
            className="-my-3 h-14 w-full translate-y-2 object-cover object-center"
          />
        </NavLink>
        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Falcon Workspace
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-100">Client Portal</div>
          <div className="mt-2 inline-flex w-fit rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-800">
            Client
          </div>
        </div>
        <nav aria-label="Client portal sections" className="mt-5 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pb-3">
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.path}
              end={item.path === "/client-portal"}
              className={({ isActive }) => [
                "rounded-lg px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                isActive
                  ? "bg-white text-slate-950 shadow-md shadow-slate-950/20 ring-1 ring-white/30"
                  : "text-slate-100 hover:bg-white/10 hover:text-white",
              ].join(" ")}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 shadow-[0_10px_28px_rgba(2,6,23,0.18)] backdrop-blur-xl md:border-b-0 md:bg-transparent md:pl-[17rem] md:shadow-none">
        <div className="mx-auto flex min-h-14 max-w-[1500px] items-center justify-between gap-4 px-3 py-1.5 sm:px-4 md:min-h-12 md:py-2">
          <NavLink to="/client-portal" end className="block w-52 rounded-lg opacity-95 transition hover:opacity-100 md:hidden">
            <img
              src={falconWordmark}
              alt="Falcon"
              className="-my-3 h-14 w-full translate-y-2 object-cover object-center"
            />
          </NavLink>
          <div className="hidden min-w-0 md:block">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Client Portal
            </div>
            <div className="text-sm font-semibold text-slate-100">Secure appraisal workspace</div>
          </div>
          <div className="ml-auto flex min-w-0 items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/82 px-2 py-1.5 shadow-sm shadow-slate-950/20">
            {clientEmail ? (
              <span className="hidden max-w-[220px] truncate text-xs font-medium text-slate-300 sm:inline">
                {clientEmail}
              </span>
            ) : null}
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-slate-500 hover:text-white"
            >
              Sign out
            </button>
          </div>
        </div>
        <nav aria-label="Client portal mobile sections" className="flex gap-2 overflow-x-auto border-t border-slate-800 px-3 py-2 md:hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.path}
              end={item.path === "/client-portal"}
              className={({ isActive }) => [
                "whitespace-nowrap rounded-md border px-3 py-1.5 text-xs font-semibold",
                isActive
                  ? "border-white bg-white text-slate-950"
                  : "border-slate-700 bg-slate-900 text-slate-300",
              ].join(" ")}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[1520px] grow px-2 py-4 sm:px-4 md:pl-[18rem] lg:py-5">
        <div className="rounded-[1.75rem] border border-slate-700/80 bg-slate-900/85 p-1.5 shadow-[0_28px_90px_rgba(2,6,23,0.38)] ring-1 ring-white/10 sm:p-2">
          <div className="min-h-[calc(100vh-9.5rem)] rounded-[1.35rem] border border-slate-300/80 bg-slate-100/95 p-2 shadow-inner shadow-slate-950/[0.06] sm:p-3">
            <Outlet />
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800 bg-slate-950/95 py-4 text-center text-sm text-slate-400 md:pl-[17rem]">
        Secure appraisal status and report delivery
      </footer>
    </div>
  );
}
