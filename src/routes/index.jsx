import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Layout from "@/layout/Layout";
import ProtectedRoute from "@/lib/hooks/ProtectedRoute";

// Pages
import Login from "@/pages/auth/Login";
import Settings from "@/pages/Settings";
import DashboardPage from "@/features/dashboard/DashboardPage";
import Orders from "@/pages/orders/Orders";
import NewOrder from "@/pages/NewOrder";
import OrderDetail from "@/pages/orders/OrderDetail";
import EditOrder from "@/pages/orders/EditOrder";
import Calendar from "@/pages/Calendar";

// Clients (legacy admin pages kept)
import ClientsDashboard from "@/pages/clients/ClientsDashboard";
import NewClient from "@/pages/clients/NewClient";
import ClientProfile from "@/pages/clients/ClientProfile";
import EditClient from "@/pages/clients/EditClient";

// Users
import UsersIndex from "@/pages/admin/UsersIndex";   // <- roster + role/split controls
import UserDetail from "@/pages/users/UserDetail";
import EditUser from "@/pages/users/EditUser";
import UserHub from "@/pages/users/UserHub";

// Optional: role-aware clients cards/detail (if you added them)
import ClientsIndex from "@/pages/clients/ClientsIndex";
import ClientDetail from "@/pages/clients/ClientDetail";

// Notifications
import NotificationSettings from "@/pages/settings/NotificationSettings";

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
            <ProtectedRoute roles={["owner", "admin", "reviewer", "appraiser"]}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Orders */}
        <Route
          path="/orders"
          element={
            <ProtectedRoute roles={["owner", "admin", "reviewer", "appraiser"]}>
              <Orders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/new"
          element={<ProtectedRoute roles={["owner", "admin"]}><NewOrder /></ProtectedRoute>}
        />
        <Route
          path="/orders/:id"
          element={<ProtectedRoute roles={["owner", "admin", "reviewer", "appraiser"]}><OrderDetail /></ProtectedRoute>}
        />
        <Route
          path="/orders/:id/edit"
          element={<ProtectedRoute roles={["owner", "admin"]}><EditOrder /></ProtectedRoute>}
        />

        {/* Calendar */}
        <Route
          path="/calendar"
          element={<ProtectedRoute roles={["owner", "admin", "reviewer", "appraiser"]}><Calendar /></ProtectedRoute>}
        />

        {/* Clients (legacy admin pages) */}
        <Route
          path="/clients"
          element={<ProtectedRoute roles={["owner", "admin"]}><ClientsDashboard /></ProtectedRoute>}
        />
        <Route
          path="/clients/new"
          element={<ProtectedRoute roles={["owner", "admin"]}><NewClient /></ProtectedRoute>}
        />
        <Route
          path="/clients/profile/:clientId"
          element={<ProtectedRoute roles={["owner", "admin"]}><ClientProfile /></ProtectedRoute>}
        />
        <Route
          path="/clients/edit/:clientId"
          element={<ProtectedRoute roles={["owner", "admin"]}><EditClient /></ProtectedRoute>}
        />

        {/* Optional: cards + role-aware detail */}
        <Route
          path="/clients/cards"
          element={<ProtectedRoute roles={["owner", "admin", "appraiser"]}><ClientsIndex /></ProtectedRoute>}
        />
        <Route
          path="/clients/:id"
          element={<ProtectedRoute roles={["owner", "admin", "appraiser"]}><ClientDetail /></ProtectedRoute>}
        />

        {/* ✅ Users — single page with admin role/split controls */}
        <Route
          path="/users"
          element={<ProtectedRoute roles={["owner", "admin", "manager", "reviewer", "appraiser"]}><UsersIndex /></ProtectedRoute>}
        />
        <Route
          path="/users/:userId"
          element={<ProtectedRoute roles={["owner", "admin"]}><UserDetail /></ProtectedRoute>}
        />
        <Route
          path="/users/new"
          element={<ProtectedRoute roles={["owner", "admin"]}><UserDetail /></ProtectedRoute>}
        />
        <Route
          path="/users/view/:userId"
          element={<ProtectedRoute roles={["owner", "admin", "manager", "reviewer", "appraiser"]}><UserHub /></ProtectedRoute>}
        />

        {/* Settings */}
        <Route
          path="/settings"
          element={<ProtectedRoute roles={["owner", "admin", "manager", "reviewer", "appraiser"]}><Settings /></ProtectedRoute>}
        />
        <Route
          path="/settings/notifications"
          element={<ProtectedRoute roles={["owner", "admin", "manager", "reviewer", "appraiser"]}><NotificationSettings /></ProtectedRoute>}
        />

        {/* Default */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}















