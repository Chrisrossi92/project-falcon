// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const shellProfileState = vi.hoisted(() => ({
  profileId: "operations",
  loading: false,
}));

vi.mock("@/lib/shell/useShellProfile", () => ({
  useShellProfile: () => ({
    profileId: shellProfileState.profileId,
    loading: shellProfileState.loading,
    metadataAuthority: "presentation_only",
    isPresentationOnly: true,
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
        <Route path="/orders" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("V1HiddenSurfaceRouteGuard", () => {
  beforeEach(() => {
    shellProfileState.profileId = "operations";
    shellProfileState.loading = false;
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
});
