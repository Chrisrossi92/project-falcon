// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation, useParams } from "react-router-dom";
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

vi.mock("@/features/dashboard/DashboardGate", () => ({
  default: () => <div data-testid="dashboard-gate">Dashboard</div>,
}));

vi.mock("@/pages/orders/Orders", () => ({
  default: () => <div data-testid="orders-page">Orders List</div>,
}));

vi.mock("@/pages/orders/OrderDetail", () => ({
  default: () => {
    const { id } = useParams();
    return <div data-testid="order-detail-page">Order Detail {id}</div>;
  },
}));

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

describe("AMC Order route aliases", () => {
  beforeEach(() => {
    operationsModeState.operationsMode = "amc_operations";
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the order list at the AMC product-local alias in AMC Operations mode", () => {
    renderAppRoute("/amc/orders");

    expect(screen.getByTestId("orders-page")).toHaveTextContent("Orders List");
    expect(screen.getByTestId("location")).toHaveTextContent("/amc/orders");
  });

  it("renders order detail at the AMC product-local alias in AMC Operations mode", () => {
    renderAppRoute("/amc/orders/order-1");

    expect(screen.getByTestId("order-detail-page")).toHaveTextContent("Order Detail order-1");
    expect(screen.getByTestId("location")).toHaveTextContent("/amc/orders/order-1");
  });

  it("keeps the order compatibility routes working in AMC Operations mode", () => {
    renderAppRoute("/orders");

    expect(screen.getByTestId("orders-page")).toHaveTextContent("Orders List");
    expect(screen.getByTestId("location")).toHaveTextContent("/orders");

    cleanup();
    renderAppRoute("/orders/order-1");

    expect(screen.getByTestId("order-detail-page")).toHaveTextContent("Order Detail order-1");
    expect(screen.getByTestId("location")).toHaveTextContent("/orders/order-1");
  });

  it("blocks AMC order aliases from rendering order pages in Internal Operations mode", () => {
    operationsModeState.operationsMode = "internal_operations";

    renderAppRoute("/amc/orders");

    expect(screen.queryByTestId("orders-page")).toBeNull();
    expect(screen.getByTestId("location")).toHaveTextContent("/dashboard");

    cleanup();
    renderAppRoute("/amc/orders/order-1");

    expect(screen.queryByTestId("order-detail-page")).toBeNull();
    expect(screen.getByTestId("location")).toHaveTextContent("/dashboard");
  });
});
