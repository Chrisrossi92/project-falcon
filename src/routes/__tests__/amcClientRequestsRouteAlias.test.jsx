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
    hasPermission: () => true,
    hasAnyPermission: () => true,
    hasAllPermissions: () => true,
  }),
}));

vi.mock("@/lib/operations/OperationsModeProvider", () => ({
  useOperationsMode: () => ({
    operationsMode: operationsModeState.operationsMode,
  }),
}));

vi.mock("@/features/clientRequests/ClientOrderRequestsPage", () => ({
  default: () => <div data-testid="client-requests-page">Client Order Requests</div>,
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

describe("AMC Client Requests route alias", () => {
  beforeEach(() => {
    operationsModeState.operationsMode = "amc_operations";
  });

  afterEach(() => {
    cleanup();
  });

  it("renders Client Requests at the AMC product-local alias", () => {
    renderAppRoute("/amc/client-requests");

    expect(screen.getByTestId("client-requests-page")).toHaveTextContent("Client Order Requests");
    expect(screen.getByTestId("location")).toHaveTextContent("/amc/client-requests");
  });

  it("keeps the Client Requests compatibility route working", () => {
    renderAppRoute("/client-requests");

    expect(screen.getByTestId("client-requests-page")).toHaveTextContent("Client Order Requests");
    expect(screen.getByTestId("location")).toHaveTextContent("/client-requests");
  });

  it("blocks the AMC alias from Internal Operations mode like the compatibility route", () => {
    operationsModeState.operationsMode = "internal_operations";

    renderAppRoute("/amc/client-requests");

    expect(screen.queryByTestId("client-requests-page")).toBeNull();
    expect(screen.getByTestId("location")).toHaveTextContent("/dashboard");
  });
});
