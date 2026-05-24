import { Outlet } from "react-router-dom";
import TopNav from "@/components/shell/TopNav";

export default function Layout() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-slate-200 text-slate-950">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-center bg-cover opacity-25"
        style={{ backgroundImage: "url('/images/falcon-bg.png')" }}
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-slate-200/95" />

      <TopNav />
      <main className="mx-auto w-full max-w-[1520px] grow px-2 py-4 sm:px-4 lg:py-5">
        <div className="rounded-[1.75rem] border border-slate-400/50 bg-slate-100/75 p-1.5 shadow-[0_24px_80px_rgba(15,23,42,0.12)] ring-1 ring-white/60 backdrop-blur-sm sm:p-2">
          <div className="min-h-[calc(100vh-9.5rem)] rounded-[1.35rem] border border-white/80 bg-white/90 p-2 shadow-inner shadow-slate-950/[0.035] sm:p-3">
            <Outlet />
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-300/80 bg-slate-200/85 py-4 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} Continental Real Estate Solutions · Falcon MVP
      </footer>
    </div>
  );
}
