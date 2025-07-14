// components/UserDrawerContent.jsx
import React from "react";

export default function UserDrawerContent({ data: user }) {
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold">User Overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-gray-500">User ID</div>
          <div>{user.id || "—"}</div>
        </div>
        <div>
          <div className="text-gray-500">Name</div>
          <div>{user.name || "—"}</div>
        </div>
        <div>
          <div className="text-gray-500">Email</div>
          <div>{user.email || "—"}</div>
        </div>
        <div>
          <div className="text-gray-500">Role</div>
          <div className="capitalize">{user.role || "—"}</div>
        </div>
      </div>
    </div>
  );
}
