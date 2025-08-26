// src/pages/Calendar.jsx
import React from "react";
import AdminCalendar from "@/components/admin/AdminCalendar";

export default function CalendarPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Calendar</h1>
      </header>
      {/* Uses the same no-embed fetcher as the dashboard */}
      <AdminCalendar />
    </div>
  );
}






