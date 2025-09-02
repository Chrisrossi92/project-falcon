// src/layout/Layout.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import TopNav from "@/components/shell/TopNav";

export default function Layout() {
  return (
    <div className="relative min-h-screen">
      {/* Background image + soft veil (kept behind everything) */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-center bg-cover"
        style={{ backgroundImage: "url('/images/falcon-bg.png')" }}
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-white/65" />

      <TopNav />
      <main className="max-w-7xl mx-auto px-4 py-4">
        <Outlet />
      </main>
    </div>
  );
}













