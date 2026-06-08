// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PERMISSIONS } from "@/lib/permissions/constants";

const permissionState = vi.hoisted(() => ({
  loading: false,
  permissionKeys: [],
}));

const shellProfileState = vi.hoisted(() => ({
  profileId: "operations",
  loading: false,
}));

vi.mock("@/components/shell/TopNav", () => ({
  default: () => <nav data-testid="operations-shell-nav">Operations shell nav</nav>,
}));

vi.mock("@/lib/hooks/usePermissions", () => ({
  useEffectivePermissions: () => ({
    loading: permissionState.loading,
    error: null,
    permissionKeys: permissionState.permissionKeys,
    permissions: permissionState.permissionKeys,
    hasAnyPermission: (permissionKeys) =>
      permissionKeys.some((permissionKey) => permissionState.permissionKeys.includes(permissionKey)),
  }),
}));

vi.mock("@/lib/shell/useShellProfile", () => ({
  useShellProfile: () => ({
    profileId: shellProfileState.profileId,
    loading: shellProfileState.loading,
    metadataAuthority: "presentation_only",
    isPresentationOnly: true,
  }),
}));

const { default: Layout } = await import("../Layout.jsx");

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderLayout(initialPath = "/dashboard") {
  render(
    <MemoryRouter
      initialEntries={[initialPath]}
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
    >
      <Routes>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<div data-testid="operations-content">Dashboard</div>} />
        </Route>
        <Route path="/client-portal" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Layout client-only routing", () => {
  beforeEach(() => {
    permissionState.loading = false;
    permissionState.permissionKeys = [];
    shellProfileState.profileId = "operations";
    shellProfileState.loading = false;
  });

  afterEach(() => {
    cleanup();
  });

  it("redirects client-only users before rendering the operations shell", () => {
    permissionState.permissionKeys = [
      PERMISSIONS.CLIENT_PORTAL_DASHBOARD_VIEW,
      PERMISSIONS.CLIENT_PORTAL_ORDERS_READ,
    ];

    renderLayout();

    expect(screen.getByTestId("location")).toHaveTextContent("/client-portal");
    expect(screen.queryByTestId("operations-shell-nav")).toBeNull();
    expect(screen.queryByTestId("operations-content")).toBeNull();
  });

  it("keeps operational users in the operations shell", () => {
    permissionState.permissionKeys = [PERMISSIONS.ORDERS_READ_ASSIGNED];

    renderLayout();

    expect(screen.getByTestId("operations-shell-nav")).toBeInTheDocument();
    expect(screen.getByTestId("operations-content")).toBeInTheDocument();
  });
});
