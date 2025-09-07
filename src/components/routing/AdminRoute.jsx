import React from "react";
import { Navigate } from "react-router-dom";
import { useRole } from "@/lib/hooks/useRole";

/** Admin-only gate (reviewers are NOT allowed) */
export default function AdminRoute({ children }) {
  const { isAdmin } = useRole() || {};
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}
