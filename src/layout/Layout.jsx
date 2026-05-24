// src/layout/Layout.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import TopNav from "@/components/shell/TopNav";

export default function Layout() {
  return (
    <div className="relative min-h-screen flex flex-col bg-slate-100">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-center bg-cover opacity-40"
        style={{ backgroundImage: "url('/images/falcon-bg.png')" }}
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-slate-100/90" />

      <TopNav />
      <main className="mx-auto w-full max-w-[1500px] grow px-3 py-4 sm:px-4 lg:py-5">
        <div className="min-h-[calc(100vh-9rem)] rounded-[1.5rem] border border-slate-300/80 bg-white/78 p-2 shadow-xl shadow-slate-900/5 ring-1 ring-white/70 backdrop-blur-sm sm:p-3">
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-slate-300/80 bg-slate-100/80 py-4 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} Continental Real Estate Solutions · Falcon MVP
      </footer>
    </div>
  );
}













