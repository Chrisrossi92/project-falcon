// src/pages/Settings.jsx
import React from "react";
import NotificationPrefsCard from "@/components/settings/NotificationPrefsCard";

export default function Settings() {
  return (
    <div className="p-4 space-y-6">
      <h1 className="text-lg font-semibold">Settings</h1>
      <NotificationPrefsCard />
    </div>
  );
}



