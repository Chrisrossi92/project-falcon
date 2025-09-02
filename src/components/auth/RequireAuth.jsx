import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "@/lib/hooks/useSession";

export default function RequireAuth({ children }) {
  const { user, loading } = useSession();
  const loc = useLocation();

  if (loading) return <div className="p-6 text-sm text-gray-600">Checking your session…</div>;
  if (!user)   return <Navigate to="/login" replace state={{ from: loc }} />;
  return children;
}

