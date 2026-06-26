// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PERMISSIONS } from "@/lib/permissions/constants";

const permissionState = vi.hoisted(() => ({
  permissionKeys: [],
  loading: false,
}));

const shellProfileState = vi.hoisted(() => ({
  profileId: "operations",
  loading: false,
}));

vi.mock("@/lib/hooks/usePermissions", () => ({
  useEffectivePermissions: () => ({
    permissionKeys: permissionState.permissionKeys,
    permissions: permissionState.permissionKeys,
    loading: permissionState.loading,
    error: null,
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

const { default: DefaultWorkspaceRedirect } = await import("../DefaultWorkspaceRedirect.jsx");

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderRedirect() {
  render(
    <MemoryRouter
      initialEntries={["/"]}
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
    >
      <Routes>
        <Route path="/" element={<DefaultWorkspaceRedirect />} />
        <Route path="/dashboard" element={<LocationProbe />} />
        <Route path="/client-portal" element={<LocationProbe />} />
        <Route path="/vendor-workspace/dashboard" element={<LocationProbe />} />
        <Route path="/my-work" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("DefaultWorkspaceRedirect", () => {
  beforeEach(() => {
    permissionState.permissionKeys = [];
    permissionState.loading = false;
    shellProfileState.profileId = "operations";
    shellProfileState.loading = false;
  });

  afterEach(() => {
    cleanup();
  });

  it("routes internal appraiser shell users to My Work when existing order read allows it", () => {
    shellProfileState.profileId = "my_work";
    permissionState.permissionKeys = [PERMISSIONS.ORDERS_READ_ASSIGNED];

    renderRedirect();

    expect(screen.getByTestId("location")).toHaveTextContent("/my-work");
  });

  it("keeps owner/admin and reviewer defaults on Operations Dashboard until a dedicated review route exists", () => {
    shellProfileState.profileId = "review_queue";
    permissionState.permissionKeys = [PERMISSIONS.ORDERS_READ_ASSIGNED];

    renderRedirect();

    expect(screen.getByTestId("location")).toHaveTextContent("/dashboard");
  });

  it("does not route to My Work without existing order-read visibility", () => {
    shellProfileState.profileId = "my_work";

    renderRedirect();

    expect(screen.getByTestId("location")).toHaveTextContent("/dashboard");
  });

  it("routes client-only portal users to the Client Portal by default", () => {
    permissionState.permissionKeys = [
      PERMISSIONS.CLIENT_PORTAL_DASHBOARD_VIEW,
      PERMISSIONS.CLIENT_PORTAL_ORDERS_READ,
    ];

    renderRedirect();

    expect(screen.getByTestId("location")).toHaveTextContent("/client-portal");
  });

  it("routes vendor-only portal users to the Vendor Workspace by default", () => {
    permissionState.permissionKeys = [
      PERMISSIONS.VENDOR_WORKSPACE_VIEW,
      PERMISSIONS.VENDOR_ASSIGNMENTS_READ,
      PERMISSIONS.VENDOR_PROFILE_READ,
    ];

    renderRedirect();

    expect(screen.getByTestId("location")).toHaveTextContent("/vendor-workspace/dashboard");
  });

  it("keeps users with operational and client access on the operational default", () => {
    permissionState.permissionKeys = [
      PERMISSIONS.CLIENT_PORTAL_DASHBOARD_VIEW,
      PERMISSIONS.ORDERS_READ_ASSIGNED,
    ];

    renderRedirect();

    expect(screen.getByTestId("location")).toHaveTextContent("/dashboard");
  });
});
