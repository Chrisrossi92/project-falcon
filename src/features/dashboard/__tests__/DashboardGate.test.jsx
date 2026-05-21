// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PERMISSIONS } from "@/lib/permissions/constants";

const permissionState = vi.hoisted(() => ({
  error: null,
  loading: false,
  permissionKeys: [],
}));

vi.mock("@/lib/hooks/usePermissions", () => ({
  useEffectivePermissions: () => ({
    error: permissionState.error,
    loading: permissionState.loading,
    permissionKeys: permissionState.permissionKeys,
    permissions: permissionState.permissionKeys,
    hasPermission: (permissionKey) => permissionState.permissionKeys.includes(permissionKey),
    hasAnyPermission: (permissionKeys) =>
      permissionKeys.some((permissionKey) => permissionState.permissionKeys.includes(permissionKey)),
  }),
}));

vi.mock("@/features/dashboard/DashboardPage", () => ({
  default: () => <div data-testid="order-dashboard">Order dashboard</div>,
}));

vi.mock("@/features/dashboard/AssignmentDashboardPage", () => ({
  ASSIGNMENT_DASHBOARD_PERMISSIONS: [
    PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED,
    PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_OWNER,
  ],
  default: () => <div data-testid="assignment-dashboard">Assignment dashboard</div>,
}));

vi.mock("@/features/assignments/AssignmentPrimitives", () => ({
  AssignmentState: ({ title, message }) => (
    <div data-testid="assignment-state">
      <div>{title}</div>
      {message && <p>{message}</p>}
    </div>
  ),
  LoadingState: ({ message }) => <div data-testid="loading-state">{message}</div>,
}));

const { default: DashboardGate } = await import("../DashboardGate.jsx");

describe("DashboardGate current dashboard resolution helper migration", () => {
  beforeEach(() => {
    permissionState.error = null;
    permissionState.loading = false;
    permissionState.permissionKeys = [];
  });

  afterEach(() => {
    cleanup();
  });

  it("preserves loading behavior", () => {
    permissionState.loading = true;
    permissionState.permissionKeys = [PERMISSIONS.NAVIGATION_ORDERS_VIEW];

    render(<DashboardGate />);

    expect(screen.getByTestId("loading-state")).toHaveTextContent("Loading dashboard...");
    expect(screen.queryByTestId("order-dashboard")).toBeNull();
    expect(screen.queryByTestId("assignment-dashboard")).toBeNull();
  });

  it("renders the existing order dashboard for order-capable users", () => {
    permissionState.permissionKeys = [PERMISSIONS.ORDERS_READ_ASSIGNED];

    render(<DashboardGate />);

    expect(screen.getByTestId("order-dashboard")).toBeInTheDocument();
    expect(screen.queryByTestId("assignment-dashboard")).toBeNull();
    expect(screen.queryByTestId("assignment-state")).toBeNull();
  });

  it("renders the existing assignment dashboard for assignment-only users", () => {
    permissionState.permissionKeys = [PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED];

    render(<DashboardGate />);

    expect(screen.getByTestId("assignment-dashboard")).toBeInTheDocument();
    expect(screen.queryByTestId("order-dashboard")).toBeNull();
    expect(screen.queryByTestId("assignment-state")).toBeNull();
  });

  it("preserves mixed-user priority toward the order dashboard", () => {
    permissionState.permissionKeys = [
      PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED,
      PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_OWNER,
      PERMISSIONS.NAVIGATION_ORDERS_VIEW,
    ];

    render(<DashboardGate />);

    expect(screen.getByTestId("order-dashboard")).toBeInTheDocument();
    expect(screen.queryByTestId("assignment-dashboard")).toBeNull();
  });

  it("preserves no-capability fallback copy", () => {
    render(<DashboardGate />);

    expect(screen.getByTestId("assignment-state")).toHaveTextContent("Dashboard unavailable");
    expect(screen.getByTestId("assignment-state")).toHaveTextContent(
      "Dashboard access requires order read permission or assignment packet read permission for the current company.",
    );
    expect(screen.queryByTestId("order-dashboard")).toBeNull();
    expect(screen.queryByTestId("assignment-dashboard")).toBeNull();
  });

  it("does not render future Vendor or Client dashboard shells", () => {
    permissionState.permissionKeys = [
      PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_OWNER,
      PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED,
    ];

    render(<DashboardGate />);

    expect(screen.queryByText(/Vendor Packet Dashboard/i)).toBeNull();
    expect(screen.queryByText(/Client Order Status Dashboard/i)).toBeNull();
    expect(screen.queryByText(/Client Portal/i)).toBeNull();
    expect(screen.queryByText(/Vendor Portal/i)).toBeNull();
  });
});
