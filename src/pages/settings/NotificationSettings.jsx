import React from "react";
import NotificationPrefsPanel from "@/components/settings/NotificationPrefsPanel";

export default function NotificationSettings() {
  // Full-page version: show title + admin sections if user is admin
  return <div className="max-w-4xl mx-auto p-4"><NotificationPrefsPanel showAdminSections showTitle /></div>;
}


