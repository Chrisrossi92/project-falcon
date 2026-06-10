import { NavLink, Outlet, useNavigate } from "react-router-dom";

import useSession from "@/lib/hooks/useSession";
import supabase from "@/lib/supabaseClient";

const navItems = Object.freeze([
  { label: "Dashboard", path: "/vendor-workspace/dashboard", enabled: true },
  { label: "Available Work", path: "/vendor-workspace/available-work", enabled: true },
  { label: "My Bids", path: "/vendor-workspace/my-bids", enabled: true },
  { label: "Assigned Orders", path: "/vendor-workspace/assigned-orders", enabled: true },
  { label: "Documents / Tasks", enabled: false },
  { label: "Payments", path: "/vendor-workspace/payments", enabled: true },
  { label: "Profile", path: "/vendor-workspace/profile", enabled: true },
]);

export default function VendorWorkspaceLayout() {
  const navigate = useNavigate();
  const { user } = useSession();
  const vendorEmail = user?.email || null;

  async function handleSignOut() {
    try {
      await supabase.auth.signOut();
    } finally {
      navigate("/login", { replace: true });
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-800 bg-slate-950 text-white shadow-sm">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-lg font-semibold tracking-wide text-white">Falcon</div>
            <div className="mt-0.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Vendor Workspace
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <nav aria-label="Vendor workspace sections" className="flex flex-wrap gap-2">
              {navItems.map((item) => {
                if (!item.enabled) {
                  return (
                    <span
                      key={item.label}
                      className="rounded-md border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs font-semibold text-slate-500"
                    >
                      {item.label}
                    </span>
                  );
                }

                return (
                  <NavLink
                    key={item.label}
                    to={item.path}
                    className={({ isActive }) => [
                      "rounded-md border px-3 py-1.5 text-xs font-semibold",
                      isActive
                        ? "border-white bg-white text-slate-950"
                        : "border-slate-700 bg-slate-900/70 text-slate-300 hover:border-slate-500 hover:text-white",
                    ].join(" ")}
                  >
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>
            <div className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900/70 px-2 py-1.5">
              {vendorEmail ? (
                <span className="max-w-[220px] truncate text-xs font-medium text-slate-300">
                  {vendorEmail}
                </span>
              ) : null}
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-slate-500 hover:text-white"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:py-7">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Continental Real Estate Solutions
      </footer>
    </div>
  );
}
