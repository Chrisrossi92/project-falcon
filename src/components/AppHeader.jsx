// src/components/AppHeader.jsx
import React from "react";
import { Link } from "react-router-dom";
import { useSession } from "@/lib/hooks/useSession";

export default function AppHeader() {
  const { user, role, isAdmin } = useSession();

  return (
    <header className="flex items-center justify-between px-4 py-2 border-b bg-white">
      <div className="flex items-center gap-3">
        <Link to="/" className="font-semibold">Falcon</Link>
        {/* ... your nav buttons ... */}
        {isAdmin && (
          <Link to="/admin/roles" className="text-sm text-blue-600 hover:underline">
            Manage Roles
          </Link>
        )}
      </div>
      <div className="flex items-center gap-3">
        {/* bell etc */}
        <span className="text-sm text-gray-600">
          {user?.email} • {role.charAt(0).toUpperCase() + role.slice(1)}
        </span>
        {/* existing Logout button stays the same */}
      </div>
    </header>
  );
}
