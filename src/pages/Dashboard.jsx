// src/pages/Dashboard.jsx
import React from "react";
import { useSession } from "@/lib/hooks/useSession";
import AdminDashboard from "./admin/AdminDashboard";
import ReviewerDashboard from "./reviewers/ReviewerDashboard";
import AppraiserDashboard from "./appraisers/AppraiserDashboard";

export default function Dashboard() {
  const { isAdmin, isReviewer } = useSession();

  if (isAdmin) return <AdminDashboard />;
  if (isReviewer) return <ReviewerDashboard />;
  return <AppraiserDashboard />;
}


