import { Routes, Route, Navigate } from "react-router-dom";

import Layout from "@/layout/Layout";
import VendorWorkspaceLayout from "@/layout/VendorWorkspaceLayout";
import ProtectedRoute from "@/lib/hooks/ProtectedRoute";
import { PERMISSIONS } from "@/lib/permissions/constants";
import DefaultWorkspaceRedirect from "@/routes/DefaultWorkspaceRedirect";
import V1HiddenSurfaceRouteGuard from "@/routes/V1HiddenSurfaceRouteGuard";
import VendorWorkspaceRouteGuard from "@/routes/VendorWorkspaceRouteGuard";
import {
  notificationSettingsRoute,
  productMetadataDiagnosticsRoute,
} from "@/routes/diagnosticRoutes";

// Pages
import Login from "@/pages/auth/Login";
import AcceptCompanyInvitePage from "@/features/company-invitations/AcceptCompanyInvitePage";
import VendorAssignmentOfferPage from "@/features/vendorAssignmentOffers/VendorAssignmentOfferPage";
import VendorAssignmentWorkPage from "@/features/vendorAssignmentWork/VendorAssignmentWorkPage";
import VendorBidInvitationPage from "@/features/vendorBidInvitations/VendorBidInvitationPage";
import Settings from "@/pages/Settings";
import DashboardGate from "@/features/dashboard/DashboardGate";
import MyWorkPage from "@/features/dashboard/MyWorkPage";
import VendorWorkspaceDashboard from "@/features/vendorWorkspace/VendorWorkspaceDashboard";
import Orders from "@/pages/orders/Orders";
import HistoricalOrders from "@/pages/orders/HistoricalOrders";
import NewOrder from "@/pages/NewOrder";
import OrderDetail from "@/pages/orders/OrderDetail";
import EditOrder from "@/pages/orders/EditOrder";
import Calendar from "@/pages/Calendar";
import Activity from "@/pages/Activity";
import AssignmentsPage, { ASSIGNMENT_NAV_PERMISSIONS } from "@/features/assignments/AssignmentsPage";
import AssignmentDetail from "@/features/assignments/AssignmentDetail";
import RelationshipsPage, { RELATIONSHIP_NAV_PERMISSION } from "@/features/relationships/RelationshipsPage";
import VendorDirectoryPage from "@/features/vendors/VendorDirectoryPage";
import VendorProfilePage from "@/features/vendors/VendorProfilePage";

// Clients (legacy admin pages kept)
import ClientsDashboard from "@/pages/clients/ClientsDashboard";
import NewClient from "@/pages/clients/NewClient";
import ClientProfile from "@/pages/clients/ClientProfile";
import EditClient from "@/pages/clients/EditClient";

// Users
import OwnerSetup from "@/pages/admin/OwnerSetup";
import ProductMetadataDiagnostics from "@/pages/admin/ProductMetadataDiagnostics";
import UsersIndex from "@/pages/admin/UsersIndex";

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
      <Route path="/accept-invite/:invitationId" element={<AcceptCompanyInvitePage />} />
      <Route path="/vendor/bid-invitations/:token" element={<VendorBidInvitationPage />} />
      <Route path="/vendor/assignment-offers/:token" element={<VendorAssignmentOfferPage />} />
      <Route path="/vendor/assignment-work/:token" element={<VendorAssignmentWorkPage />} />

      {/* Hidden authenticated Vendor Workspace foundation */}
      <Route
        element={
          <VendorWorkspaceRouteGuard>
            <VendorWorkspaceLayout />
          </VendorWorkspaceRouteGuard>
        }
      >
        <Route path="/vendor-workspace" element={<Navigate to="/vendor-workspace/dashboard" replace />} />
        <Route path="/vendor-workspace/dashboard" element={<VendorWorkspaceDashboard />} />
      </Route>

      {/* Authenticated area */}
      <Route element={<Layout />}>
        <Route
          index
          element={
            <ProtectedRoute>
              <DefaultWorkspaceRedirect />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardGate />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-work"
          element={
            <ProtectedRoute
              requiredAnyPermissions={[
                PERMISSIONS.ORDERS_READ_ALL,
                PERMISSIONS.ORDERS_READ_ASSIGNED,
              ]}
            >
              <MyWorkPage />
            </ProtectedRoute>
          }
        />

        {/* Orders */}
        <Route
          path="/orders"
          element={
            <ProtectedRoute
              requiredAnyPermissions={[
                PERMISSIONS.ORDERS_READ_ALL,
                PERMISSIONS.ORDERS_READ_ASSIGNED,
              ]}
            >
              <Orders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/historical"
          element={
            <ProtectedRoute
              requiredAnyPermissions={[
                PERMISSIONS.ORDERS_READ_ALL,
                PERMISSIONS.ORDERS_READ_ASSIGNED,
              ]}
            >
              <HistoricalOrders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/new"
          element={<ProtectedRoute requiredPermission={PERMISSIONS.ORDERS_CREATE}><NewOrder /></ProtectedRoute>}
        />
        <Route
          path="/orders/:id"
          element={
            <ProtectedRoute
              requiredAnyPermissions={[
                PERMISSIONS.ORDERS_READ_ALL,
                PERMISSIONS.ORDERS_READ_ASSIGNED,
              ]}
            >
              <OrderDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/:id/edit"
          element={<ProtectedRoute requiredPermission={PERMISSIONS.ORDERS_UPDATE_ALL}><EditOrder /></ProtectedRoute>}
        />

        {/* Calendar */}
        <Route
          path="/calendar"
          element={
            <ProtectedRoute
              requiredAnyPermissions={[
                PERMISSIONS.NAVIGATION_ORDERS_VIEW,
                PERMISSIONS.ORDERS_READ_ALL,
                PERMISSIONS.ORDERS_READ_ASSIGNED,
              ]}
            >
              <Calendar />
            </ProtectedRoute>
          }
        />

        {/* Activity */}
        <Route
          path="/activity"
          element={
            <ProtectedRoute
              requiredAnyPermissions={[
                PERMISSIONS.ACTIVITY_READ_ALL,
                PERMISSIONS.ACTIVITY_READ_ASSIGNED,
              ]}
            >
              <Activity />
            </ProtectedRoute>
          }
        />

        {/* Assignments */}
        <Route
          path="/assignments"
          element={
            <ProtectedRoute requiredAnyPermissions={ASSIGNMENT_NAV_PERMISSIONS}>
              <V1HiddenSurfaceRouteGuard>
                <AssignmentsPage />
              </V1HiddenSurfaceRouteGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/assignments/:assignmentId"
          element={
            <ProtectedRoute requiredAnyPermissions={ASSIGNMENT_NAV_PERMISSIONS}>
              <V1HiddenSurfaceRouteGuard>
                <AssignmentDetail />
              </V1HiddenSurfaceRouteGuard>
            </ProtectedRoute>
          }
        />

        {/* Relationships */}
        <Route
          path="/relationships"
          element={
            <ProtectedRoute requiredPermission={RELATIONSHIP_NAV_PERMISSION}>
              <V1HiddenSurfaceRouteGuard>
                <RelationshipsPage />
              </V1HiddenSurfaceRouteGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/relationships/:relationshipId"
          element={
            <ProtectedRoute requiredPermission={RELATIONSHIP_NAV_PERMISSION}>
              <V1HiddenSurfaceRouteGuard>
                <RelationshipsPage />
              </V1HiddenSurfaceRouteGuard>
            </ProtectedRoute>
          }
        />

        {/* Vendors */}
        <Route
          path="/vendors"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.VENDORS_READ}>
              <V1HiddenSurfaceRouteGuard>
                <VendorDirectoryPage />
              </V1HiddenSurfaceRouteGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendors/:vendorProfileId"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.VENDORS_READ}>
              <V1HiddenSurfaceRouteGuard>
                <VendorProfilePage />
              </V1HiddenSurfaceRouteGuard>
            </ProtectedRoute>
          }
        />

        {/* Clients (legacy admin pages) */}
        <Route
          path="/clients"
          element={<ProtectedRoute requiredPermission={PERMISSIONS.CLIENTS_READ_ALL}><ClientsDashboard /></ProtectedRoute>}
        />
        <Route
          path="/clients/new"
          element={
            <ProtectedRoute
              requiredPermission={PERMISSIONS.CLIENTS_CREATE}
            >
              <NewClient />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clients/profile/:clientId"
          element={<ProtectedRoute requiredPermission={PERMISSIONS.CLIENTS_READ_ALL}><ClientProfile /></ProtectedRoute>}
        />
        <Route
          path="/clients/edit/:clientId"
          element={
            <ProtectedRoute
              requiredPermission={PERMISSIONS.CLIENTS_UPDATE_ALL}
            >
              <EditClient />
            </ProtectedRoute>
          }
        />

        {/* Optional: cards + role-aware detail */}
        <Route
          path="/clients/cards"
          element={
            <ProtectedRoute
              requiredAnyPermissions={[
                PERMISSIONS.CLIENTS_READ_ALL,
                PERMISSIONS.CLIENTS_READ_ASSIGNED,
              ]}
            >
              <ClientsIndex />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clients/:id"
          element={
            <ProtectedRoute
              requiredAnyPermissions={[
                PERMISSIONS.CLIENTS_READ_ALL,
                PERMISSIONS.CLIENTS_READ_ASSIGNED,
              ]}
            >
              <ClientDetail />
            </ProtectedRoute>
          }
        />

        {/* Users — Team Access via company member RPCs */}
        <Route
          path="/users"
          element={
            <ProtectedRoute
              requiredPermission={PERMISSIONS.USERS_READ}
            >
              <UsersIndex />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users/:userId"
          element={<Navigate to="/users" replace />}
        />
        <Route
          path="/users/new"
          element={<Navigate to="/users" replace />}
        />
        <Route
          path="/users/view/:userId"
          element={<Navigate to="/settings" replace />}
        />

        {/* Settings */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute
              requiredPermission={PERMISSIONS.SETTINGS_VIEW}
            >
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path={notificationSettingsRoute.path}
          element={
            <ProtectedRoute
              requiredPermission={notificationSettingsRoute.requiredPermission}
            >
              <NotificationSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path={productMetadataDiagnosticsRoute.path}
          element={
            <ProtectedRoute
              requiredPermission={productMetadataDiagnosticsRoute.requiredPermission}
            >
              <ProductMetadataDiagnostics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/owner-setup"
          element={
            <ProtectedRoute
              requiredPermission={PERMISSIONS.SETTINGS_VIEW}
            >
              <OwnerSetup />
            </ProtectedRoute>
          }
        />

        {/* Default */}
        <Route
          path="*"
          element={
            <ProtectedRoute>
              <DefaultWorkspaceRedirect />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
