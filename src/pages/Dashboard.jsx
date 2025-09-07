// src/pages/Dashboard.jsx
import React from "react";
import { useRole } from "@/lib/hooks/useRole";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AppraiserDashboard from "@/pages/appraisers/AppraiserDashboard";

/**
 * Chooses the right dashboard:
 * - Admin/Reviewer -> AdminDashboard (sees all)
 * - Everyone else  -> AppraiserDashboard (sees only my orders/events)
 */
export default function Dashboard() {
  const { isAdmin, isReviewer } = useRole() || {};
  const isAdminish = isAdmin || isReviewer;

  return isAdminish ? <AdminDashboard /> : <AppraiserDashboard />;
}



