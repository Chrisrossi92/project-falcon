// src/routes/index.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Orders from "../pages/Orders";
import Clients from "../pages/ClientsDashboard";
import Users from "../pages/UsersDashboard";
import Calendar from "../pages/Calendar";
import Login from "../pages/Login";
import EditClient from "../pages/EditClient";
import EditUser from "../pages/EditUser";
import UserDetail from "../pages/UserDetail";
import OrderDetail from "../pages/OrderDetail";
import AdminDashboard from "../pages/AdminDashboard";
import AppraiserDashboard from "../pages/AppraiserDashboard";
import ClientDetail from "../pages/ClientDetail";
import Layout from "../layout/Layout";

import { useSession } from "@/lib/hooks/useSession";
import { useRole } from "@/lib/hooks/useRole";
import NewOrder from "@/pages/NewOrder";
import ProtectedRoute from "@/lib/hooks/ProtectedRoute";
import NewClient from "../pages/NewClient";
import UserHub from "../pages/UserHub";
import Settings from "../pages/Settings";
import AdminUsers from "../pages/AdminUsers";

const ProtectedRoutes = () => {
  const { user, loading: sessionLoading } = useSession();
  const { role, loading: roleLoading, error: roleError } = useRole();

  if (sessionLoading || roleLoading) {
    return <div className="p-6">Checking session…</div>;
  }
  if (roleError) {
    return <div className="p-6 text-red-600">Error loading role: {roleError}</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {user ? (
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" />} />

          <Route
            path="dashboard"
            element={role === "admin" ? <AdminDashboard /> : <AppraiserDashboard />}
          />

          {/* Orders */}
          <Route path="orders" element={<Orders />} />
          <Route path="orders/new" element={<NewOrder />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="orders/:id/edit" element={<OrderDetail />} />

          {/* Calendar */}
          <Route path="calendar" element={<Calendar />} />

          {/* Clients - Admin only */}
          <Route
            path="clients"
            element={
              <ProtectedRoute roles={["admin"]}>
                <Clients />
              </ProtectedRoute>
            }
          />
          <Route
            path="clients/:clientId"
            element={
              <ProtectedRoute roles={["admin"]}>
                <ClientDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="clients/new"
            element={
              <ProtectedRoute roles={["admin"]}>
                <NewClient />
              </ProtectedRoute>
            }
          />
          <Route
            path="clients/edit/:clientId"
            element={
              <ProtectedRoute roles={["admin"]}>
                <EditClient />
              </ProtectedRoute>
            }
          />

          {/* Users */}
          <Route
            path="users"
            element={
              <ProtectedRoute>
                <Users />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/users"
            element={
              <ProtectedRoute roles={["admin", "manager"]}>
                <AdminUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="users/:userId"
            element={
              <ProtectedRoute roles={["admin"]}>
                <UserDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="users/new"
            element={
              <ProtectedRoute roles={["admin"]}>
                <UserDetail />
              </ProtectedRoute>
            }
          />

          <Route
            path="profile/edit"
            element={
              <ProtectedRoute>
                <EditUser />
              </ProtectedRoute>
            }
          />

          <Route
            path="settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Route>
      ) : (
        <Route path="*" element={<Navigate to="/login" />} />
      )}

      <Route
        path="users/view/:userId"
        element={
          <ProtectedRoute>
            <UserHub />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default ProtectedRoutes;













