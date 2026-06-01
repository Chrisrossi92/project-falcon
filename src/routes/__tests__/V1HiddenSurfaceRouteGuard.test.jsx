// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const shellProfileState = vi.hoisted(() => ({
  profileId: "operations",
  loading: false,
}));

const operationsModeState = vi.hoisted(() => ({
  operationsMode: "internal_operations",
}));

vi.mock("@/lib/shell/useShellProfile", () => ({
  useShellProfile: () => ({
    profileId: shellProfileState.profileId,
    loading: shellProfileState.loading,
    metadataAuthority: "presentation_only",
    isPresentationOnly: true,
  }),
}));

vi.mock("@/lib/operations/OperationsModeProvider", () => ({
  useOperationsMode: () => ({
    operationsMode: operationsModeState.operationsMode,
  }),
}));

const { default: V1HiddenSurfaceRouteGuard } = await import("../V1HiddenSurfaceRouteGuard.jsx");

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderGuardedRoute(initialPath = "/assignments") {
  render(
    <MemoryRouter
      initialEntries={[initialPath]}
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
    >
      <Routes>
        <Route
          path="/assignments"
          element={
            <V1HiddenSurfaceRouteGuard>
              <div data-testid="hidden-surface">Assignments</div>
            </V1HiddenSurfaceRouteGuard>
          }
        />
        <Route
          path="/relationships"
          element={
            <V1HiddenSurfaceRouteGuard>
              <div data-testid="hidden-surface">Relationships</div>
            </V1HiddenSurfaceRouteGuard>
          }
        />
        <Route
          path="/vendors"
          element={
            <V1HiddenSurfaceRouteGuard>
              <div data-testid="hidden-surface">Vendors</div>
            </V1HiddenSurfaceRouteGuard>
          }
        />
        <Route
          path="/vendors/:vendorProfileId"
          element={
            <V1HiddenSurfaceRouteGuard>
              <div data-testid="hidden-surface">Vendor profile</div>
            </V1HiddenSurfaceRouteGuard>
          }
        />
        <Route path="/orders" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("V1HiddenSurfaceRouteGuard", () => {
  beforeEach(() => {
    shellProfileState.profileId = "operations";
    shellProfileState.loading = false;
    operationsModeState.operationsMode = "internal_operations";
  });

  afterEach(() => {
    cleanup();
  });

  it("redirects Staff Appraisal owner/admin operations users away from Assignments", () => {
    renderGuardedRoute("/assignments");

    expect(screen.getByTestId("location")).toHaveTextContent("/orders");
    expect(screen.queryByTestId("hidden-surface")).toBeNull();
  });

  it("redirects Staff Appraisal users away from Relationships", () => {
    renderGuardedRoute("/relationships");

    expect(screen.getByTestId("location")).toHaveTextContent("/orders");
    expect(screen.queryByTestId("hidden-surface")).toBeNull();
  });

  it("redirects Staff Appraisal users away from the hidden Vendor Directory", () => {
    renderGuardedRoute("/vendors");

    expect(screen.getByTestId("location")).toHaveTextContent("/orders");
    expect(screen.queryByTestId("hidden-surface")).toBeNull();
  });

  it("redirects Staff Appraisal users away from hidden Vendor Profile details", () => {
    renderGuardedRoute("/vendors/profile-1");

    expect(screen.getByTestId("location")).toHaveTextContent("/orders");
    expect(screen.queryByTestId("hidden-surface")).toBeNull();
  });

  it("allows hidden Vendor Directory access in AMC Operations mode to remain permission governed", () => {
    operationsModeState.operationsMode = "amc_operations";

    renderGuardedRoute("/vendors");

    expect(screen.getByTestId("hidden-surface")).toHaveTextContent("Vendors");
    expect(screen.queryByTestId("location")).toBeNull();
  });

  it("allows hidden Vendor Profile access in AMC Operations mode to remain permission governed", () => {
    operationsModeState.operationsMode = "amc_operations";

    renderGuardedRoute("/vendors/profile-1");

    expect(screen.getByTestId("hidden-surface")).toHaveTextContent("Vendor profile");
    expect(screen.queryByTestId("location")).toBeNull();
  });

  it("does not flash restricted content while shell profile is loading", () => {
    shellProfileState.loading = true;

    renderGuardedRoute("/assignments");

    expect(screen.getByText("Checking your workspace…")).toBeInTheDocument();
    expect(screen.queryByTestId("hidden-surface")).toBeNull();
  });

  it("allows non-Staff assignment-only surfaces to remain permission governed", () => {
    shellProfileState.profileId = "received_work";

    renderGuardedRoute("/assignments");

    expect(screen.getByTestId("hidden-surface")).toHaveTextContent("Assignments");
    expect(screen.queryByTestId("location")).toBeNull();
  });

  it("allows non-Staff hidden Vendor Directory access to remain permission governed", () => {
    shellProfileState.profileId = "received_work";

    renderGuardedRoute("/vendors");

    expect(screen.getByTestId("hidden-surface")).toHaveTextContent("Vendors");
    expect(screen.queryByTestId("location")).toBeNull();
  });

  it("allows non-Staff hidden Vendor Profile details to remain permission governed", () => {
    shellProfileState.profileId = "received_work";

    renderGuardedRoute("/vendors/profile-1");

    expect(screen.getByTestId("hidden-surface")).toHaveTextContent("Vendor profile");
    expect(screen.queryByTestId("location")).toBeNull();
  });
});
