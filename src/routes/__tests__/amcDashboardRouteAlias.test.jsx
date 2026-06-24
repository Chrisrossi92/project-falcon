// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const operationsModeState = vi.hoisted(() => ({
  operationsMode: "amc_operations",
}));

vi.mock("@/layout/Layout", async () => {
  const { Outlet } = await import("react-router-dom");
  return {
    default: () => <Outlet />,
  };
});

vi.mock("@/lib/hooks/useSession", () => ({
  default: () => ({
    user: { id: "user-1", email: "amc@example.test" },
    isLoading: false,
  }),
}));

vi.mock("@/lib/hooks/usePermissions", () => ({
  useEffectivePermissions: () => ({
    loading: false,
    error: null,
    permissionKeys: ["orders.read.assigned"],
    permissions: ["orders.read.assigned"],
    hasPermission: () => true,
    hasAnyPermission: () => true,
    hasAllPermissions: () => true,
  }),
}));

vi.mock("@/lib/operations/OperationsModeProvider", () => ({
  useOperationsMode: () => ({
    operationsMode: operationsModeState.operationsMode,
    operationsModeLabel:
      operationsModeState.operationsMode === "amc_operations"
        ? "AMC Operations"
        : "Internal Operations",
  }),
}));

vi.mock("@/features/dashboard/DashboardGate", async () => {
  const { useOperationsMode } = await import("@/lib/operations/OperationsModeProvider");
  return {
    default: () => {
      const { operationsMode, operationsModeLabel } = useOperationsMode();
      return (
        <div data-testid="dashboard-gate">
          <span>{operationsMode}</span>
          <span>{operationsModeLabel}</span>
        </div>
      );
    },
  };
});

const { default: AppRoutes } = await import("../index.jsx");

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderAppRoute(path) {
  render(
    <MemoryRouter
      initialEntries={[path]}
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
    >
      <AppRoutes />
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe("AMC Dashboard route alias", () => {
  beforeEach(() => {
    operationsModeState.operationsMode = "amc_operations";
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the dashboard at the AMC product-local alias in AMC Operations mode", () => {
    renderAppRoute("/amc/dashboard");

    expect(screen.getByTestId("dashboard-gate")).toHaveTextContent("amc_operations");
    expect(screen.getByTestId("dashboard-gate")).toHaveTextContent("AMC Operations");
    expect(screen.getByTestId("location")).toHaveTextContent("/amc/dashboard");
  });

  it("keeps the dashboard compatibility route working in AMC Operations mode", () => {
    renderAppRoute("/dashboard");

    expect(screen.getByTestId("dashboard-gate")).toHaveTextContent("amc_operations");
    expect(screen.getByTestId("location")).toHaveTextContent("/dashboard");
  });

  it("blocks the AMC dashboard alias from rendering at the alias path in Internal Operations mode", () => {
    operationsModeState.operationsMode = "internal_operations";

    renderAppRoute("/amc/dashboard");

    expect(screen.getByTestId("location")).toHaveTextContent("/dashboard");
    expect(screen.queryByText("/amc/dashboard")).toBeNull();
  });
});
