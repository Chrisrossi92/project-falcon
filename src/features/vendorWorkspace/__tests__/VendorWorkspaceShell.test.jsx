// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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

const apiMock = vi.hoisted(() => ({
  fetchVendorWorkspaceDashboardSummary: vi.fn(),
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

vi.mock("@/features/vendorWorkspace/api.js", () => apiMock);

const { default: VendorWorkspaceRouteGuard } = await import("@/routes/VendorWorkspaceRouteGuard");
const { default: VendorWorkspaceLayout } = await import("@/layout/VendorWorkspaceLayout");
const { default: VendorWorkspaceDashboard } = await import("../VendorWorkspaceDashboard.jsx");

const dashboardSource = readFileSync(
  resolve(process.cwd(), "src/features/vendorWorkspace/VendorWorkspaceDashboard.jsx"),
  "utf8",
);

const dashboardSummary = Object.freeze({
  ok: true,
  counts: {
    available_work: 3,
    pending_bids: 2,
    assignment_offers: 1,
    active_assigned_orders: 4,
    submitted_awaiting_review: 5,
    needs_attention: 6,
  },
  actions: [
    {
      kind: "bid_request",
      priority: "due_soon",
      label: "Submit bid",
      due_at: "2026-06-05T14:30:00.000Z",
      order: {
        order_number: "AMC-DEMO-003",
        property_address: "123 Market Street",
        city: "Columbus",
        state: "OH",
        postal_code: "43215",
        county: "Franklin",
        property_type: "Office",
        report_type: "Commercial Appraisal",
      },
      owner: {
        company_name: "Continental AMC",
      },
    },
  ],
});

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
    apiMock.fetchVendorWorkspaceDashboardSummary.mockReset();
    apiMock.fetchVendorWorkspaceDashboardSummary.mockResolvedValue(dashboardSummary);
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the hidden Vendor Workspace dashboard for vendor workspace permission", async () => {
    const { container } = renderVendorWorkspace();

    expect(screen.getByRole("heading", { name: "Vendor Workspace" })).toBeInTheDocument();
    expect(
      screen.getByText("Manage available work, bids, assignments, documents, and profile details."),
    ).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "My Next Actions" })).toBeInTheDocument();
    expect(apiMock.fetchVendorWorkspaceDashboardSummary).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText("Available Work").length).toBeGreaterThan(0);
    expect(screen.getByText("Pending Bids")).toBeInTheDocument();
    expect(screen.getByText("Assignment Offers")).toBeInTheDocument();
    expect(screen.getByText("Active Assigned Orders")).toBeInTheDocument();
    expect(screen.getByText("Submitted / Awaiting Review")).toBeInTheDocument();
    expect(screen.getByText("Needs Attention")).toBeInTheDocument();
    expect(container.querySelector('[data-testid="operations-mode-switcher"]')).toBeNull();
    expect(screen.queryByText("Operations Command")).toBeNull();
  });

  it("renders dashboard counts and safe action summary fields", async () => {
    const { container } = renderVendorWorkspace();

    expect(await screen.findByText("Submit bid")).toBeInTheDocument();
    ["3", "2", "1", "4", "5", "6"].forEach((count) => {
      expect(screen.getByText(count)).toBeInTheDocument();
    });
    expect(screen.getByText("AMC-DEMO-003")).toBeInTheDocument();
    expect(screen.getByText("123 Market Street, Columbus, OH, 43215")).toBeInTheDocument();
    expect(screen.getByText("Commercial Appraisal")).toBeInTheDocument();
    expect(screen.getByText("Office")).toBeInTheDocument();
    expect(screen.getByText("Continental AMC")).toBeInTheDocument();
    expect(screen.getByText("Due soon")).toBeInTheDocument();

    [
      "order-id-1",
      "relationship-id-1",
      "vendor-profile-id-1",
      "bid-request-id-1",
      "recipient-id-1",
      "response-id-1",
      "candidate_snapshot",
      "handoff_payload",
    ].forEach((hiddenText) => {
      expect(screen.queryByText(hiddenText)).toBeNull();
    });

    expect(container.querySelector('a[href^="/orders"]')).toBeNull();
    expect(container.querySelector('a[href^="/vendors"]')).toBeNull();
    expect(container.querySelector('a[href^="/clients"]')).toBeNull();
  });

  it("renders loading, error, and empty states", async () => {
    apiMock.fetchVendorWorkspaceDashboardSummary.mockImplementation(() => new Promise(() => {}));
    const loadingView = renderVendorWorkspace();

    expect(screen.getByLabelText("Loading Vendor Workspace dashboard")).toBeInTheDocument();
    loadingView.unmount();

    apiMock.fetchVendorWorkspaceDashboardSummary.mockRejectedValue(new Error("vendor dashboard failed"));
    const errorView = renderVendorWorkspace();

    expect(await screen.findByText("Vendor dashboard unavailable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    errorView.unmount();

    apiMock.fetchVendorWorkspaceDashboardSummary.mockResolvedValue({
      ok: true,
      counts: {
        available_work: 0,
        pending_bids: 0,
        assignment_offers: 0,
        active_assigned_orders: 0,
        submitted_awaiting_review: 0,
        needs_attention: 0,
      },
      actions: [],
    });
    renderVendorWorkspace();

    expect(
      await screen.findByText("No vendor action items need attention right now."),
    ).toBeInTheDocument();
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

  it("keeps dashboard source isolated from shared order/vendor/client and owner-side bid APIs", () => {
    expect(dashboardSource).not.toContain("@/features/orders");
    expect(dashboardSource).not.toContain("@/features/vendors");
    expect(dashboardSource).not.toContain("@/features/clients");
    expect(dashboardSource).not.toContain("@/features/bids");
    expect(dashboardSource).not.toContain("listOrderVendorBidRequests");
    expect(dashboardSource).not.toContain("fetchAmcOrderProcurementSummaries");
  });
});
