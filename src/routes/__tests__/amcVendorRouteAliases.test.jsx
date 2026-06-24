// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, useParams } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

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
    hasPermission: (permission) => permission === "vendors.read",
    hasAnyPermission: (permissions = []) => permissions.includes("vendors.read"),
    hasAllPermissions: (permissions = []) =>
      permissions.every((permission) => permission === "vendors.read"),
  }),
}));

vi.mock("@/lib/operations/OperationsModeProvider", () => ({
  useOperationsMode: () => ({
    operationsMode: "amc_operations",
  }),
}));

vi.mock("@/lib/shell/useShellProfile", () => ({
  useShellProfile: () => ({
    profileId: "operations",
    loading: false,
    metadataAuthority: "presentation_only",
    isPresentationOnly: true,
  }),
}));

vi.mock("@/features/vendors/VendorDirectoryPage", () => ({
  default: () => <div data-testid="vendor-directory-page">Vendor Directory</div>,
}));

vi.mock("@/features/vendors/VendorProfilePage", () => ({
  default: () => {
    const { vendorProfileId } = useParams();
    return <div data-testid="vendor-profile-page">Vendor Profile {vendorProfileId}</div>;
  },
}));

const { default: AppRoutes } = await import("../index.jsx");

function renderAppRoute(path) {
  render(
    <MemoryRouter
      initialEntries={[path]}
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
    >
      <AppRoutes />
    </MemoryRouter>,
  );
}

describe("AMC Vendor Directory route aliases", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the Vendor Directory at the AMC product-local alias", () => {
    renderAppRoute("/amc/vendors");

    expect(screen.getByTestId("vendor-directory-page")).toHaveTextContent("Vendor Directory");
  });

  it("renders the Vendor Profile at the AMC product-local alias", () => {
    renderAppRoute("/amc/vendors/profile-1");

    expect(screen.getByTestId("vendor-profile-page")).toHaveTextContent("Vendor Profile profile-1");
  });

  it("keeps the Vendor Directory compatibility route working", () => {
    renderAppRoute("/vendors");

    expect(screen.getByTestId("vendor-directory-page")).toHaveTextContent("Vendor Directory");
  });

  it("keeps the Vendor Profile compatibility route working", () => {
    renderAppRoute("/vendors/profile-1");

    expect(screen.getByTestId("vendor-profile-page")).toHaveTextContent("Vendor Profile profile-1");
  });
});
