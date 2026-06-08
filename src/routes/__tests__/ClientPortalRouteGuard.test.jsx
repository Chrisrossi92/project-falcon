// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PERMISSIONS } from "@/lib/permissions/constants";

const sessionState = vi.hoisted(() => ({
  user: { id: "auth-client" },
  isLoading: false,
}));

const permissionState = vi.hoisted(() => ({
  loading: false,
  error: null,
  permissions: new Set(),
}));

vi.mock("@/lib/hooks/useSession", () => ({
  default: () => ({
    user: sessionState.user,
    userId: sessionState.user?.id ?? null,
    isLoading: sessionState.isLoading,
  }),
}));

vi.mock("@/lib/hooks/usePermissions", () => ({
  useEffectivePermissions: () => ({
    loading: permissionState.loading,
    error: permissionState.error,
    hasAnyPermission: (keys) => keys.some((key) => permissionState.permissions.has(key)),
  }),
}));

const { default: ClientPortalRouteGuard } = await import("../ClientPortalRouteGuard.jsx");

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderGuard() {
  render(
    <MemoryRouter
      initialEntries={["/client-portal"]}
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
    >
      <Routes>
        <Route
          path="/client-portal"
          element={
            <ClientPortalRouteGuard>
              <div data-testid="client-portal">Client Portal</div>
            </ClientPortalRouteGuard>
          }
        />
        <Route path="/login" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ClientPortalRouteGuard", () => {
  beforeEach(() => {
    sessionState.user = { id: "auth-client" };
    sessionState.isLoading = false;
    permissionState.loading = false;
    permissionState.error = null;
    permissionState.permissions = new Set();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the client portal for users with client portal access", () => {
    permissionState.permissions = new Set([PERMISSIONS.CLIENT_PORTAL_ORDERS_READ]);

    renderGuard();

    expect(screen.getByTestId("client-portal")).toHaveTextContent("Client Portal");
  });

  it("renders the client portal for users with dashboard client portal access", () => {
    permissionState.permissions = new Set([PERMISSIONS.CLIENT_PORTAL_DASHBOARD_VIEW]);

    renderGuard();

    expect(screen.getByTestId("client-portal")).toHaveTextContent("Client Portal");
  });

  it("denies internal or AMC users without client portal access", () => {
    permissionState.permissions = new Set([PERMISSIONS.ORDERS_READ_ALL, PERMISSIONS.VENDORS_READ]);

    renderGuard();

    expect(screen.queryByTestId("client-portal")).toBeNull();
    expect(screen.getByText("Client Portal unavailable")).toBeInTheDocument();
    expect(screen.getByText(/return to the original invitation link to finish setup/i)).toBeInTheDocument();
  });

  it("redirects unauthenticated users to login", () => {
    sessionState.user = null;

    renderGuard();

    expect(screen.getByTestId("location")).toHaveTextContent("/login");
  });
});
