// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation, useNavigationType } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OPERATIONS_MODES } from "@/lib/operations/operationsMode";
import { ROUTE_WORKSPACES } from "@/routes/workspaceRouteOwnership";

const operationsModeState = vi.hoisted(() => ({
  operationsMode: "internal_operations",
}));

vi.mock("@/lib/operations/OperationsModeProvider", () => ({
  useOperationsMode: () => ({
    operationsMode: operationsModeState.operationsMode,
  }),
}));

const { default: WorkspaceRouteGuard } = await import("../WorkspaceRouteGuard.jsx");

function LocationProbe() {
  const location = useLocation();
  const navigationType = useNavigationType();

  return (
    <>
      <div data-testid="location">{location.pathname}</div>
      <div data-testid="navigation-type">{navigationType}</div>
      <div data-testid="redirect-state">{JSON.stringify(location.state || {})}</div>
    </>
  );
}

function renderWorkspaceRoutes(initialPath) {
  render(
    <MemoryRouter
      initialEntries={[initialPath]}
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
    >
      <Routes>
        <Route
          path="/users"
          element={
            <WorkspaceRouteGuard workspace={ROUTE_WORKSPACES.INTERNAL}>
              <div data-testid="internal-route">Users</div>
            </WorkspaceRouteGuard>
          }
        />
        <Route
          path="/vendors"
          element={
            <WorkspaceRouteGuard workspace={ROUTE_WORKSPACES.AMC}>
              <div data-testid="amc-route">Vendors</div>
            </WorkspaceRouteGuard>
          }
        />
        <Route path="/dashboard" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("WorkspaceRouteGuard", () => {
  beforeEach(() => {
    operationsModeState.operationsMode = OPERATIONS_MODES.INTERNAL_OPERATIONS;
  });

  afterEach(() => {
    cleanup();
  });

  it("redirects an Internal-owned route while AMC Operations is selected", () => {
    operationsModeState.operationsMode = OPERATIONS_MODES.AMC_OPERATIONS;

    renderWorkspaceRoutes("/users");

    expect(screen.queryByTestId("internal-route")).toBeNull();
    expect(screen.getByTestId("location")).toHaveTextContent("/dashboard");
    expect(screen.getByTestId("navigation-type")).toHaveTextContent("REPLACE");
    expect(screen.getByTestId("redirect-state")).toHaveTextContent('"expectedWorkspace":"internal"');
    expect(screen.getByTestId("redirect-state")).toHaveTextContent('"selectedWorkspace":"amc"');
  });

  it("redirects an AMC-owned route while Internal Operations is selected", () => {
    renderWorkspaceRoutes("/vendors");

    expect(screen.queryByTestId("amc-route")).toBeNull();
    expect(screen.getByTestId("location")).toHaveTextContent("/dashboard");
    expect(screen.getByTestId("navigation-type")).toHaveTextContent("REPLACE");
    expect(screen.getByTestId("redirect-state")).toHaveTextContent('"expectedWorkspace":"amc"');
    expect(screen.getByTestId("redirect-state")).toHaveTextContent('"selectedWorkspace":"internal"');
  });

  it("fails closed for a wrong workspace deep link before rendering unsafe page content", () => {
    operationsModeState.operationsMode = OPERATIONS_MODES.AMC_OPERATIONS;

    renderWorkspaceRoutes("/users");

    expect(screen.queryByText("Users")).not.toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/dashboard");
  });

  it("renders correct workspace routes normally", () => {
    operationsModeState.operationsMode = OPERATIONS_MODES.AMC_OPERATIONS;

    renderWorkspaceRoutes("/vendors");

    expect(screen.getByTestId("amc-route")).toHaveTextContent("Vendors");
    expect(screen.queryByTestId("location")).toBeNull();
  });
});
