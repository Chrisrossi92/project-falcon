// src/pages/Dashboard.jsx
import React from "react";
import { useSession } from "@/lib/hooks/useSession";
import AdminDashboard from "./AdminDashboard";
import ReviewerDashboard from "./ReviewerDashboard";
import AppraiserDashboard from "./AppraiserDashboard";

export default function Dashboard() {
  const { isAdmin, isReviewer } = useSession();

  if (isAdmin) return <AdminDashboard />;
  if (isReviewer) return <ReviewerDashboard />;
  return <AppraiserDashboard />;
}


