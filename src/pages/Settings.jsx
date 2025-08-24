// src/pages/Settings.jsx
import React from "react";
import ProfileForm from "@/components/settings/ProfileForm";
import PreferencesForm from "@/components/settings/PreferencesForm";
import NotificationsSettings from "@/components/settings/NotificationsSettings";

export default function Settings() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-gray-500">Update your profile and preferences.</p>
      </div>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-medium">Profile</h2>
        <ProfileForm />
      </section>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-medium">Preferences</h2>
        <PreferencesForm />
        <h2 className="mb-4 text-lg font-medium"></h2>
        <NotificationsSettings />
      </section>
    </div>
  );
}

