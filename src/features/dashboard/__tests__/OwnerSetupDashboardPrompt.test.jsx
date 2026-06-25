// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PERMISSIONS } from "@/lib/permissions/constants";

const permissionState = vi.hoisted(() => ({
  allowed: new Set(),
}));

vi.mock("@/lib/hooks/usePermissions", () => ({
  useCan: (permissionKey) => ({
    allowed: permissionState.allowed.has(permissionKey),
    loading: false,
    error: null,
    permissionKeys: [...permissionState.allowed],
    reload: vi.fn(),
  }),
}));

const { OwnerSetupDashboardPrompt } = await import("../DashboardPage.jsx");

const renderPrompt = (props) =>
  render(
    <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <OwnerSetupDashboardPrompt {...props} />
    </MemoryRouter>,
  );

describe("OwnerSetupDashboardPrompt", () => {
  beforeEach(() => {
    permissionState.allowed = new Set();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders guidance link for users with settings view permission", () => {
    permissionState.allowed = new Set([PERMISSIONS.SETTINGS_VIEW]);

    renderPrompt({ appContext: { is_owner: true } });

    expect(screen.getByText("Owner Setup Guidance")).toBeInTheDocument();
    expect(screen.getByText("Review operational setup readiness")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review Owner Setup" })).toHaveAttribute(
      "href",
      "/settings/owner-setup",
    );
    expect(screen.getByText(/review company setup/i)).toBeInTheDocument();
    expect(screen.queryByText(/diagnostic guidance only/i)).toBeNull();
    expect(screen.queryByText(/does not change permissions/i)).toBeNull();
    expect(screen.queryByText(/access granted/i)).toBeNull();
    expect(screen.queryByText(/required to access/i)).toBeNull();
    expect(screen.queryByText(/unlocks features/i)).toBeNull();
  });

  it("hides prompt when settings view permission is absent", () => {
    renderPrompt();

    expect(screen.queryByText("Review operational setup readiness")).toBeNull();
    expect(screen.queryByRole("link", { name: "Review Owner Setup" })).toBeNull();
  });

  it("hides setup readiness guidance from non-owner admin users", () => {
    permissionState.allowed = new Set([PERMISSIONS.SETTINGS_VIEW]);

    renderPrompt({ appContext: { is_owner: false, is_admin_role: true } });

    expect(screen.queryByText("Setup Readiness Guidance")).toBeNull();
    expect(screen.queryByText("Owner Setup Guidance")).toBeNull();
    expect(screen.queryByRole("link", { name: "Review Setup Readiness" })).toBeNull();
    expect(screen.queryByText(/does not grant owner authority/i)).toBeNull();
  });

  it("hides setup readiness guidance from appraiser-only users", () => {
    permissionState.allowed = new Set([PERMISSIONS.SETTINGS_VIEW]);

    renderPrompt({
      appContext: {
        is_owner: false,
        is_admin_role: false,
        is_appraiser_role: true,
      },
    });

    expect(screen.queryByText("Setup Readiness Guidance")).toBeNull();
    expect(screen.queryByRole("link", { name: "Review Setup Readiness" })).toBeNull();
  });
});
