import { Outlet } from "react-router-dom";

const placeholderNavItems = Object.freeze([
  "Available Work",
  "My Bids",
  "Assigned Orders",
  "Documents / Tasks",
  "Profile",
]);

export default function VendorWorkspaceLayout() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-lg font-semibold tracking-wide text-slate-950">Falcon</div>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Vendor Workspace
            </div>
          </div>
          <nav aria-label="Vendor workspace sections" className="flex flex-wrap gap-2">
            {placeholderNavItems.map((item) => (
              <span
                key={item}
                className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600"
              >
                {item}
              </span>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Continental Real Estate Solutions
      </footer>
    </div>
  );
}
