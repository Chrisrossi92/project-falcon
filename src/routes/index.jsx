// src/routes/index.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Layout from "@/layout/Layout";
import ProtectedRoute from "@/lib/hooks/ProtectedRoute";
import { useRole } from "@/lib/hooks/useRole";

// Pages
import Login from "@/pages/auth/Login";
import Settings from "@/pages/Settings";
import AdminDashboard from "@/pages/AdminDashboard";
import AppraiserDashboard from "@/pages/AppraiserDashboard";
import ReviewerDashboard from "@/pages/ReviewerDashboard";
import Orders from "@/pages/Orders";
import NewOrder from "@/pages/NewOrder";
import OrderDetail from "@/pages/orders/OrderDetail";
import EditOrder from "@/pages/EditOrder";
import Calendar from "@/pages/Calendar";
import ClientsDashboard from "@/pages/ClientsDashboard";
import NewClient from "@/pages/NewClient";
// ⬇️ use the new client profile page
import ClientProfile from "@/pages/clients/ClientProfile";
import EditClient from "@/pages/EditClient";
import UsersDashboard from "@/pages/UsersDashboard";
import AdminUsers from "@/pages/AdminUsers";
import UserDetail from "@/pages/UserDetail";
import EditUser from "@/pages/EditUser";
import UserHub from "@/pages/UserHub";

function RoleSwitch() {
  const { role } = useRole() || {};
  const r = String(role || "").toLowerCase();
  if (r === "admin") return <AdminDashboard />;
  if (r === "reviewer") return <ReviewerDashboard />;
  return <AppraiserDashboard />;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* Authenticated area */}
      <Route element={<Layout />}>
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute roles={["admin", "reviewer", "appraiser"]}>
              <RoleSwitch />
            </ProtectedRoute>
          }
        />

        {/* Orders */}
        <Route
          path="/orders"
          element={
            <ProtectedRoute roles={["admin", "reviewer", "appraiser"]}>
              <Orders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/new"
          element={
            <ProtectedRoute roles={["admin"]}>
              <NewOrder />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/:id"
          element={
            <ProtectedRoute roles={["admin", "reviewer", "appraiser"]}>
              <OrderDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/:id/edit"
          element={
            <ProtectedRoute roles={["admin"]}>
              <EditOrder />
            </ProtectedRoute>
          }
        />

        {/* Calendar */}
        <Route
          path="/calendar"
          element={
            <ProtectedRoute roles={["admin", "reviewer", "appraiser"]}>
              <Calendar />
            </ProtectedRoute>
          }
        />

        {/* Clients */}
        <Route
          path="/clients"
          element={
            <ProtectedRoute roles={["admin"]}>
              <ClientsDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clients/new"
          element={
            <ProtectedRoute roles={["admin"]}>
              <NewClient />
            </ProtectedRoute>
          }
        />
        {/* Client profile — support both :clientId and :id param names */}
        <Route
          path="/clients/:clientId"
          element={
            <ProtectedRoute roles={["admin"]}>
              <ClientProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clients/:id"
          element={
            <ProtectedRoute roles={["admin"]}>
              <ClientProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clients/edit/:clientId"
          element={
            <ProtectedRoute roles={["admin"]}>
              <EditClient />
            </ProtectedRoute>
          }
        />

        {/* Users */}
        <Route
          path="/users"
          element={
            <ProtectedRoute roles={["admin", "manager", "reviewer", "appraiser"]}>
              <UsersDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute roles={["admin", "manager"]}>
              <AdminUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users/:userId"
          element={
            <ProtectedRoute roles={["admin"]}>
              <UserDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users/new"
          element={
            <ProtectedRoute roles={["admin"]}>
              <UserDetail />
            </ProtectedRoute>
          }
        />

        {/* Profile / Settings */}
        <Route
          path="/profile/edit"
          element={
            <ProtectedRoute roles={["admin", "manager", "reviewer", "appraiser"]}>
              <EditUser />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute roles={["admin", "manager", "reviewer", "appraiser"]}>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users/view/:userId"
          element={
            <ProtectedRoute roles={["admin", "manager", "reviewer", "appraiser"]}>
              <UserHub />
            </ProtectedRoute>
          }
        />

        {/* Default */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>

      {/* Fallback for anything truly unmatched */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}






















