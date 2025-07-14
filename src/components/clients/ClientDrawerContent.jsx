// components/ClientDrawerContent.jsx
import React from "react";

export default function ClientDrawerContent({ data: client }) {
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold">Client Overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-gray-500">Client ID</div>
          <div>{client.id || "—"}</div>
        </div>
        <div>
          <div className="text-gray-500">Client Name</div>
          <div>{client.name || "—"}</div>
        </div>
        <div>
          <div className="text-gray-500">Primary Contact</div>
          <div>{client.primary_contact || "—"}</div>
        </div>
        <div>
          <div className="text-gray-500">Email</div>
          <div>{client.email || "—"}</div>
        </div>
        <div>
          <div className="text-gray-500">Phone</div>
          <div>{client.phone || "—"}</div>
        </div>
      </div>
    </div>
  );
}
