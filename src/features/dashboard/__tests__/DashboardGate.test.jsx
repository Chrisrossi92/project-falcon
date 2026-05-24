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

const shellProfileState = vi.hoisted(() => ({
  exposure: {
    id: "operations",
    metadataAuthority: "presentation_only",
    shellMetadata: {
      id: "operations",
      dashboardTitle: "Operations Dashboard",
      metadataAuthority: "presentation_only",
    },
  },
}));

const dashboardProps = vi.hoisted(() => ({
  assignment: [],
  order: [],
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

vi.mock("@/lib/shell/useShellProfile", () => ({
  useShellProfile: () => shellProfileState.exposure,
}));

vi.mock("@/features/dashboard/DashboardPage", () => ({
  default: (props) => {
    dashboardProps.order.push(props);
    return <div data-testid="order-dashboard">Order dashboard</div>;
  },
}));

vi.mock("@/features/dashboard/AssignmentDashboardPage", () => ({
  ASSIGNMENT_DASHBOARD_PERMISSIONS: [
    PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED,
    PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_OWNER,
  ],
  default: (props) => {
    dashboardProps.assignment.push(props);
    return <div data-testid="assignment-dashboard">Assignment dashboard</div>;
  },
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
    shellProfileState.exposure = {
      id: "operations",
      metadataAuthority: "presentation_only",
      shellMetadata: {
        id: "operations",
        dashboardTitle: "Operations Dashboard",
        metadataAuthority: "presentation_only",
      },
    };
    dashboardProps.assignment = [];
    dashboardProps.order = [];
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
    expect(dashboardProps.order).toHaveLength(1);
    expect(dashboardProps.order[0].shellProfilePresentation).toBe(shellProfileState.exposure);
    expect(dashboardProps.assignment).toHaveLength(0);
  });

  it("renders the existing assignment dashboard for assignment-only users", () => {
    permissionState.permissionKeys = [PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED];

    render(<DashboardGate />);

    expect(screen.getByTestId("assignment-dashboard")).toBeInTheDocument();
    expect(screen.queryByTestId("order-dashboard")).toBeNull();
    expect(screen.queryByTestId("assignment-state")).toBeNull();
    expect(dashboardProps.assignment).toHaveLength(1);
    expect(dashboardProps.assignment[0].shellProfilePresentation).toBe(shellProfileState.exposure);
    expect(dashboardProps.order).toHaveLength(0);
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

  it("does not let shell metadata select the assignment dashboard for order-capable users", () => {
    permissionState.permissionKeys = [PERMISSIONS.ORDERS_READ_ASSIGNED];
    shellProfileState.exposure = {
      id: "received_work",
      metadataAuthority: "presentation_only",
      shellMetadata: {
        id: "received_work",
        dashboardTitle: "Received Work",
        metadataAuthority: "presentation_only",
      },
    };

    render(<DashboardGate />);

    expect(screen.getByTestId("order-dashboard")).toBeInTheDocument();
    expect(screen.queryByTestId("assignment-dashboard")).toBeNull();
    expect(dashboardProps.order[0].shellProfilePresentation).toBe(shellProfileState.exposure);
  });

  it("does not let shell metadata select the order dashboard for assignment-only users", () => {
    permissionState.permissionKeys = [PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED];
    shellProfileState.exposure = {
      id: "operations",
      metadataAuthority: "presentation_only",
      shellMetadata: {
        id: "operations",
        dashboardTitle: "Operations Dashboard",
        metadataAuthority: "presentation_only",
      },
    };

    render(<DashboardGate />);

    expect(screen.getByTestId("assignment-dashboard")).toBeInTheDocument();
    expect(screen.queryByTestId("order-dashboard")).toBeNull();
    expect(dashboardProps.assignment[0].shellProfilePresentation).toBe(shellProfileState.exposure);
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
