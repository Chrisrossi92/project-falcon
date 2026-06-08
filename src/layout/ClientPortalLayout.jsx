import { NavLink, Outlet, useNavigate } from "react-router-dom";

import supabase from "@/lib/supabaseClient";

const navItems = Object.freeze([
  { label: "Dashboard", path: "/client-portal" },
  { label: "Orders", path: "/client-portal/orders" },
  { label: "New Order", path: "/client-portal/new-order" },
]);

export default function ClientPortalLayout() {
  const navigate = useNavigate();

  async function handleSignOut() {
    try {
      await supabase.auth.signOut();
    } finally {
      navigate("/login", { replace: true });
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 text-slate-950">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-lg font-semibold tracking-wide text-slate-950">Falcon</div>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Client Portal
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <nav aria-label="Client portal sections" className="flex flex-wrap gap-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.label}
                  to={item.path}
                  end={item.path === "/client-portal"}
                  className={({ isActive }) => [
                    "rounded-md border px-3 py-1.5 text-xs font-semibold",
                    isActive
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-stone-200 bg-stone-50 text-slate-600",
                  ].join(" ")}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-stone-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
        <Outlet />
      </main>

      <footer className="border-t border-stone-200 bg-white py-4 text-center text-xs text-slate-500">
        Secure appraisal status and report delivery
      </footer>
    </div>
  );
}
