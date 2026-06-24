import { Routes, Route, Navigate } from "react-router-dom";

import Layout from "@/layout/Layout";
import ClientPortalLayout from "@/layout/ClientPortalLayout";
import VendorWorkspaceLayout from "@/layout/VendorWorkspaceLayout";
import ProtectedRoute from "@/lib/hooks/ProtectedRoute";
import { PERMISSIONS } from "@/lib/permissions/constants";
import ClientPortalRouteGuard from "@/routes/ClientPortalRouteGuard";
import DefaultWorkspaceRedirect from "@/routes/DefaultWorkspaceRedirect";
import V1HiddenSurfaceRouteGuard from "@/routes/V1HiddenSurfaceRouteGuard";
import VendorWorkspaceRouteGuard from "@/routes/VendorWorkspaceRouteGuard";
import WorkspaceRouteGuard from "@/routes/WorkspaceRouteGuard";
import {
  notificationSettingsRoute,
  productMetadataDiagnosticsRoute,
} from "@/routes/diagnosticRoutes";
import { ROUTE_WORKSPACE_GROUPS, ROUTE_WORKSPACES } from "@/routes/workspaceRouteOwnership";

// Pages
import Login from "@/pages/auth/Login";
import AcceptCompanyInvitePage from "@/features/company-invitations/AcceptCompanyInvitePage";
import VendorAssignmentOfferPage from "@/features/vendorAssignmentOffers/VendorAssignmentOfferPage";
import VendorAssignmentWorkPage from "@/features/vendorAssignmentWork/VendorAssignmentWorkPage";
import VendorBidInvitationPage from "@/features/vendorBidInvitations/VendorBidInvitationPage";
import Settings from "@/pages/Settings";
import DashboardGate from "@/features/dashboard/DashboardGate";
import MyWorkPage from "@/features/dashboard/MyWorkPage";
import VendorAssignedOrderDetailPage from "@/features/vendorWorkspace/VendorAssignedOrderDetailPage";
import VendorAssignedOrdersPage from "@/features/vendorWorkspace/VendorAssignedOrdersPage";
import VendorAvailableWorkDetailPage from "@/features/vendorWorkspace/VendorAvailableWorkDetailPage";
import VendorAvailableWorkPage from "@/features/vendorWorkspace/VendorAvailableWorkPage";
import VendorMyBidsPage from "@/features/vendorWorkspace/VendorMyBidsPage";
import VendorPaymentsPage from "@/features/vendorWorkspace/VendorPaymentsPage";
import VendorWorkspaceProfilePage from "@/features/vendorWorkspace/VendorProfilePage";
import VendorWorkspaceDashboard from "@/features/vendorWorkspace/VendorWorkspaceDashboard";
import Orders from "@/pages/orders/Orders";
import HistoricalOrders from "@/pages/orders/HistoricalOrders";
import NewOrder from "@/pages/NewOrder";
import AmcNewOrderPage from "@/pages/orders/AmcNewOrderPage";
import OrderDetail from "@/pages/orders/OrderDetail";
import EditOrder from "@/pages/orders/EditOrder";
import Calendar from "@/pages/Calendar";
import Activity from "@/pages/Activity";
import ClientOrderRequestsPage from "@/features/clientRequests/ClientOrderRequestsPage";
import ClientPortalDashboard from "@/features/clientPortal/ClientPortalDashboard";
import ClientPortalInvitationPage from "@/features/clientPortal/ClientPortalInvitationPage";
import ClientPortalNewOrderPage from "@/features/clientPortal/ClientPortalNewOrderPage";
import ClientPortalOrderDetailPage from "@/features/clientPortal/ClientPortalOrderDetailPage";
import ClientPortalOrdersPage from "@/features/clientPortal/ClientPortalOrdersPage";
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
      <Route path="/client-portal/invitations/:token" element={<ClientPortalInvitationPage />} />
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
        <Route path="/vendor-workspace/available-work" element={<VendorAvailableWorkPage />} />
        <Route path="/vendor-workspace/available-work/:workKey" element={<VendorAvailableWorkDetailPage />} />
        <Route path="/vendor-workspace/my-bids" element={<VendorMyBidsPage />} />
        <Route path="/vendor-workspace/assigned-orders" element={<VendorAssignedOrdersPage />} />
        <Route path="/vendor-workspace/assigned-orders/:assignmentWorkKey" element={<VendorAssignedOrderDetailPage />} />
        <Route path="/vendor-workspace/payments" element={<VendorPaymentsPage />} />
        <Route path="/vendor-workspace/profile" element={<VendorWorkspaceProfilePage />} />
      </Route>

      {/* Authenticated Client Portal foundation */}
      <Route
        element={
          <ClientPortalRouteGuard>
            <ClientPortalLayout />
          </ClientPortalRouteGuard>
        }
      >
        <Route path="/client-portal" element={<ClientPortalDashboard />} />
        <Route path="/client-portal/orders" element={<ClientPortalOrdersPage />} />
        <Route path="/client-portal/orders/:orderId" element={<ClientPortalOrderDetailPage />} />
        <Route path="/client-portal/new-order" element={<ClientPortalNewOrderPage />} />
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
              <WorkspaceRouteGuard workspace={ROUTE_WORKSPACE_GROUPS.OPERATIONS}>
                <DashboardGate />
              </WorkspaceRouteGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/amc/dashboard"
          element={
            <ProtectedRoute>
              <WorkspaceRouteGuard workspace={ROUTE_WORKSPACES.AMC}>
                <DashboardGate />
              </WorkspaceRouteGuard>
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
              <WorkspaceRouteGuard workspace={ROUTE_WORKSPACES.INTERNAL}>
                <MyWorkPage />
              </WorkspaceRouteGuard>
            </ProtectedRoute>
          }
        />

        {/* Orders */}
        <Route
          path="/amc/orders"
          element={
            <ProtectedRoute
              requiredAnyPermissions={[
                PERMISSIONS.ORDERS_READ_ALL,
                PERMISSIONS.ORDERS_READ_ASSIGNED,
              ]}
            >
              <WorkspaceRouteGuard workspace={ROUTE_WORKSPACES.AMC}>
                <Orders />
              </WorkspaceRouteGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/amc/orders/new"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.ORDERS_CREATE}>
              <WorkspaceRouteGuard workspace={ROUTE_WORKSPACES.AMC}>
                <AmcNewOrderPage />
              </WorkspaceRouteGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/amc/orders/:id"
          element={
            <ProtectedRoute
              requiredAnyPermissions={[
                PERMISSIONS.ORDERS_READ_ALL,
                PERMISSIONS.ORDERS_READ_ASSIGNED,
              ]}
            >
              <WorkspaceRouteGuard workspace={ROUTE_WORKSPACES.AMC}>
                <OrderDetail />
              </WorkspaceRouteGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute
              requiredAnyPermissions={[
                PERMISSIONS.ORDERS_READ_ALL,
                PERMISSIONS.ORDERS_READ_ASSIGNED,
              ]}
            >
              <WorkspaceRouteGuard workspace={ROUTE_WORKSPACE_GROUPS.OPERATIONS}>
                <Orders />
              </WorkspaceRouteGuard>
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
              <WorkspaceRouteGuard workspace={ROUTE_WORKSPACE_GROUPS.OPERATIONS}>
                <HistoricalOrders />
              </WorkspaceRouteGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/new"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.ORDERS_CREATE}>
              <WorkspaceRouteGuard workspace={ROUTE_WORKSPACE_GROUPS.OPERATIONS}>
                <NewOrder />
              </WorkspaceRouteGuard>
            </ProtectedRoute>
          }
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
              <WorkspaceRouteGuard workspace={ROUTE_WORKSPACE_GROUPS.OPERATIONS}>
                <OrderDetail />
              </WorkspaceRouteGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/:id/edit"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.ORDERS_UPDATE_ALL}>
              <WorkspaceRouteGuard workspace={ROUTE_WORKSPACE_GROUPS.OPERATIONS}>
                <EditOrder />
              </WorkspaceRouteGuard>
            </ProtectedRoute>
          }
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
              <WorkspaceRouteGuard workspace={ROUTE_WORKSPACE_GROUPS.OPERATIONS}>
                <Calendar />
              </WorkspaceRouteGuard>
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
              <WorkspaceRouteGuard workspace={ROUTE_WORKSPACE_GROUPS.OPERATIONS}>
                <Activity />
              </WorkspaceRouteGuard>
            </ProtectedRoute>
          }
        />

        {/* Assignments */}
        <Route
          path="/assignments"
          element={
            <ProtectedRoute requiredAnyPermissions={ASSIGNMENT_NAV_PERMISSIONS}>
              <WorkspaceRouteGuard workspace={ROUTE_WORKSPACE_GROUPS.OPERATIONS}>
                <V1HiddenSurfaceRouteGuard>
                  <AssignmentsPage />
                </V1HiddenSurfaceRouteGuard>
              </WorkspaceRouteGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/assignments/:assignmentId"
          element={
            <ProtectedRoute requiredAnyPermissions={ASSIGNMENT_NAV_PERMISSIONS}>
              <WorkspaceRouteGuard workspace={ROUTE_WORKSPACE_GROUPS.OPERATIONS}>
                <V1HiddenSurfaceRouteGuard>
                  <AssignmentDetail />
                </V1HiddenSurfaceRouteGuard>
              </WorkspaceRouteGuard>
            </ProtectedRoute>
          }
        />

        {/* Relationships */}
        <Route
          path="/relationships"
          element={
            <ProtectedRoute requiredPermission={RELATIONSHIP_NAV_PERMISSION}>
              <WorkspaceRouteGuard workspace={ROUTE_WORKSPACE_GROUPS.OPERATIONS}>
                <V1HiddenSurfaceRouteGuard>
                  <RelationshipsPage />
                </V1HiddenSurfaceRouteGuard>
              </WorkspaceRouteGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/relationships/:relationshipId"
          element={
            <ProtectedRoute requiredPermission={RELATIONSHIP_NAV_PERMISSION}>
              <WorkspaceRouteGuard workspace={ROUTE_WORKSPACE_GROUPS.OPERATIONS}>
                <V1HiddenSurfaceRouteGuard>
                  <RelationshipsPage />
                </V1HiddenSurfaceRouteGuard>
              </WorkspaceRouteGuard>
            </ProtectedRoute>
          }
        />

        {/* Vendors */}
        <Route
          path="/amc/vendors"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.VENDORS_READ}>
              <WorkspaceRouteGuard workspace={ROUTE_WORKSPACES.AMC}>
                <V1HiddenSurfaceRouteGuard>
                  <VendorDirectoryPage />
                </V1HiddenSurfaceRouteGuard>
              </WorkspaceRouteGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/amc/vendors/:vendorProfileId"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.VENDORS_READ}>
              <WorkspaceRouteGuard workspace={ROUTE_WORKSPACES.AMC}>
                <V1HiddenSurfaceRouteGuard>
                  <VendorProfilePage />
                </V1HiddenSurfaceRouteGuard>
              </WorkspaceRouteGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendors"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.VENDORS_READ}>
              <WorkspaceRouteGuard workspace={ROUTE_WORKSPACES.AMC}>
                <V1HiddenSurfaceRouteGuard>
                  <VendorDirectoryPage />
                </V1HiddenSurfaceRouteGuard>
              </WorkspaceRouteGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendors/:vendorProfileId"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.VENDORS_READ}>
              <WorkspaceRouteGuard workspace={ROUTE_WORKSPACES.AMC}>
                <V1HiddenSurfaceRouteGuard>
                  <VendorProfilePage />
                </V1HiddenSurfaceRouteGuard>
              </WorkspaceRouteGuard>
            </ProtectedRoute>
          }
        />

        {/* Clients (legacy admin pages) */}
        <Route
          path="/amc/client-requests"
          element={
            <ProtectedRoute
              requiredAnyPermissions={[
                PERMISSIONS.CLIENT_PORTAL_ORDER_REQUESTS_READ,
                PERMISSIONS.CLIENT_PORTAL_ORDER_REQUESTS_MANAGE,
              ]}
            >
              <WorkspaceRouteGuard workspace={ROUTE_WORKSPACES.AMC}>
                <ClientOrderRequestsPage />
              </WorkspaceRouteGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/client-requests"
          element={
            <ProtectedRoute
              requiredAnyPermissions={[
                PERMISSIONS.CLIENT_PORTAL_ORDER_REQUESTS_READ,
                PERMISSIONS.CLIENT_PORTAL_ORDER_REQUESTS_MANAGE,
              ]}
            >
              <WorkspaceRouteGuard workspace={ROUTE_WORKSPACES.AMC}>
                <ClientOrderRequestsPage />
              </WorkspaceRouteGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/clients"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.CLIENTS_READ_ALL}>
              <WorkspaceRouteGuard workspace={ROUTE_WORKSPACE_GROUPS.OPERATIONS}>
                <ClientsDashboard />
              </WorkspaceRouteGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/clients/new"
          element={
            <ProtectedRoute
              requiredPermission={PERMISSIONS.CLIENTS_CREATE}
            >
              <WorkspaceRouteGuard workspace={ROUTE_WORKSPACE_GROUPS.OPERATIONS}>
                <NewClient />
              </WorkspaceRouteGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/clients/profile/:clientId"
          element={
            <ProtectedRoute requiredPermission={PERMISSIONS.CLIENTS_READ_ALL}>
              <WorkspaceRouteGuard workspace={ROUTE_WORKSPACE_GROUPS.OPERATIONS}>
                <ClientProfile />
              </WorkspaceRouteGuard>
            </ProtectedRoute>
          }
        />
        <Route
          path="/clients/edit/:clientId"
          element={
            <ProtectedRoute
              requiredPermission={PERMISSIONS.CLIENTS_UPDATE_ALL}
            >
              <WorkspaceRouteGuard workspace={ROUTE_WORKSPACE_GROUPS.OPERATIONS}>
                <EditClient />
              </WorkspaceRouteGuard>
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
              <WorkspaceRouteGuard workspace={ROUTE_WORKSPACE_GROUPS.OPERATIONS}>
                <ClientsIndex />
              </WorkspaceRouteGuard>
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
              <WorkspaceRouteGuard workspace={ROUTE_WORKSPACE_GROUPS.OPERATIONS}>
                <ClientDetail />
              </WorkspaceRouteGuard>
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
              <WorkspaceRouteGuard workspace={ROUTE_WORKSPACES.INTERNAL}>
                <UsersIndex />
              </WorkspaceRouteGuard>
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
