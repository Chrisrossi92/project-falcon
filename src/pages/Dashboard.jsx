import React from "react";
import { useRole } from "@/lib/hooks/useRole";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AppraiserDashboard from "@/pages/appraisers/AppraiserDashboard";

export default function Dashboard() {
  // useRole should expose a stable loading flag while it resolves
  const { isAdmin, isReviewer, loading } = useRole() || {};

  // HARD GATE: render nothing until role is ready (prevents any flash)
  if (loading) return null;

  const isAdminish = isAdmin || isReviewer;
  return isAdminish ? <AdminDashboard /> : <AppraiserDashboard />;
}



