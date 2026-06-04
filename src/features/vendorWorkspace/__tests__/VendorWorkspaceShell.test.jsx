// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const VENDOR_WORKSPACE_VIEW = "vendor_workspace.view";

const sessionState = vi.hoisted(() => ({
  user: { id: "vendor-user-1" },
  isLoading: false,
}));

const permissionState = vi.hoisted(() => ({
  allowed: new Set(["vendor_workspace.view"]),
  loading: false,
  error: null,
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
    hasPermission: (permissionKey) => permissionState.allowed.has(permissionKey),
  }),
}));

const { default: VendorWorkspaceRouteGuard } = await import("@/routes/VendorWorkspaceRouteGuard");
const { default: VendorWorkspaceLayout } = await import("@/layout/VendorWorkspaceLayout");
const { default: VendorWorkspaceDashboard } = await import("../VendorWorkspaceDashboard.jsx");

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderVendorWorkspace(path = "/vendor-workspace/dashboard") {
  return render(
    <MemoryRouter
      initialEntries={[path]}
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
    >
      <Routes>
        <Route
          element={
            <VendorWorkspaceRouteGuard>
              <VendorWorkspaceLayout />
            </VendorWorkspaceRouteGuard>
          }
        >
          <Route path="/vendor-workspace/dashboard" element={<VendorWorkspaceDashboard />} />
        </Route>
        <Route path="/login" element={<LocationProbe />} />
        <Route path="/dashboard" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Vendor Workspace hidden shell", () => {
  beforeEach(() => {
    sessionState.user = { id: "vendor-user-1" };
    sessionState.isLoading = false;
    permissionState.allowed = new Set([VENDOR_WORKSPACE_VIEW]);
    permissionState.loading = false;
    permissionState.error = null;
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the hidden Vendor Workspace dashboard placeholder for vendor workspace permission", () => {
    const { container } = renderVendorWorkspace();

    expect(screen.getByRole("heading", { name: "Vendor Workspace" })).toBeInTheDocument();
    expect(
      screen.getByText("Manage available work, bids, assignments, documents, and profile details."),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Available Work").length).toBeGreaterThan(0);
    expect(screen.getAllByText("My Bids").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Assigned Orders").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Documents / Tasks").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Profile").length).toBeGreaterThan(0);
    expect(container.querySelector('[data-testid="operations-mode-switcher"]')).toBeNull();
    expect(screen.queryByText("Operations Command")).toBeNull();
  });

  it("requires vendor_workspace.view without redirecting unauthorized users into /dashboard", () => {
    permissionState.allowed = new Set();

    renderVendorWorkspace();

    expect(screen.getByText("Vendor Workspace unavailable")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Vendor Workspace" })).toBeNull();
    expect(screen.queryByTestId("location")).toBeNull();
  });

  it("redirects unauthenticated users to login only", () => {
    sessionState.user = null;

    renderVendorWorkspace();

    expect(screen.getByTestId("location")).toHaveTextContent("/login");
  });
});
