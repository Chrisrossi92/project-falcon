// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const setupContextState = vi.hoisted(() => ({
  current: {
    data: null,
    loading: false,
    error: null,
    permissionDenied: false,
    refetch: vi.fn(),
  },
}));

const profileApiMock = vi.hoisted(() => ({
  updateCompanyProfile: vi.fn(),
}));

const ownerSetupStateApiMock = vi.hoisted(() => ({
  completeOwnerSetup: vi.fn(),
}));

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

const permissionState = vi.hoisted(() => ({
  current: {
    allowed: false,
    loading: false,
    error: null,
    permissionKeys: [],
    reload: vi.fn(),
  },
}));

vi.mock("../../../features/company-setup/useCompanySetupContext.js", () => ({
  useCompanySetupContext: () => setupContextState.current,
}));

vi.mock("../../../features/company-setup/companyProfileApi.js", () => profileApiMock);

vi.mock("../../../features/company-setup/ownerSetupStateApi.js", () => ownerSetupStateApiMock);

vi.mock("react-hot-toast", () => ({
  default: toastMock,
}));

vi.mock("../../../lib/hooks/usePermissions.js", () => ({
  useCan: () => permissionState.current,
}));

const { default: OwnerSetup } = await import("../OwnerSetup.jsx");

const testDir = dirname(fileURLToPath(import.meta.url));
const pageSourcePath = resolve(testDir, "../OwnerSetup.jsx");
const routesSourcePath = resolve(testDir, "../../../routes/index.jsx");

function renderOwnerSetup() {
  return render(
    <MemoryRouter>
      <OwnerSetup />
    </MemoryRouter>,
  );
}

function renderOwnerSetupToStaticMarkup() {
  return renderToStaticMarkup(
    <MemoryRouter>
      <OwnerSetup />
    </MemoryRouter>,
  );
}

describe("OwnerSetup", () => {
  beforeEach(() => {
    setupContextState.current = {
      data: null,
      loading: false,
      error: null,
      permissionDenied: false,
      refetch: vi.fn(),
    };
    permissionState.current = {
      allowed: false,
      loading: false,
      error: null,
      permissionKeys: [],
      reload: vi.fn(),
    };
    profileApiMock.updateCompanyProfile.mockReset();
    ownerSetupStateApiMock.completeOwnerSetup.mockReset();
    toastMock.success.mockReset();
    toastMock.error.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the static non-authoritative setup shell", () => {
    const html = renderOwnerSetupToStaticMarkup();

    expect(html).toContain("Owner Setup");
    expect(html).toContain("What needs to be done before Falcon is operational?");
    expect(html).toContain("Company Setup Sections");
    expect(html).toContain("Company Profile");
    expect(html).toContain("Save Profile");
    expect(html).toContain("Internal Diagnostics");
    expect(html).toContain("Sample Operational Readiness Checklist");
    expect(html).toContain("Static sample fallback");
    expect(html).toContain("not permission authority");
    expect(html).not.toMatch(/access granted/i);
  });

  it("renders owner-facing setup progress summary before diagnostics", () => {
    const html = renderOwnerSetupToStaticMarkup();

    expect(html).toContain("Progress");
    expect(html).toContain("0%");
    expect(html).toContain("Required Complete");
    expect(html).toContain("Required Sections");
    expect(html).toContain("Minimum readiness");
    expect(html).toContain("Needs setup");
    expect(html).toContain("Next: Company Profile");
    expect(html.indexOf("What needs to be done before Falcon is operational?")).toBeLessThan(
      html.indexOf("Internal Diagnostics"),
    );
  });

  it("renders setup sections and the expected owner-facing setup labels", () => {
    const html = renderOwnerSetupToStaticMarkup();

    [
      "Company Profile",
      "Owner Profile",
      "Team Access",
      "Workflow Defaults",
      "Notification Defaults",
      "Order Numbering",
      "Branding",
      "Product Modes / Modules",
    ].forEach((step) => {
      expect(html).toContain(step);
    });

    expect(html).not.toContain("Workspace Defaults");
    expect(html).not.toContain("Workflow Settings");
    expect(html).not.toContain("Role Review");
  });

  it("renders normalized setup status labels for required, optional, deferred, and diagnostic areas", () => {
    const html = renderOwnerSetupToStaticMarkup();

    expect(html).toContain("Needs attention");
    expect(html).toContain("Optional");
    expect(html).toContain("Deferred");
    expect(html).toContain("Diagnostic only");
    expect(html).not.toContain("Future setup card");
    expect(html).not.toContain("Deferred storage");
    expect(html).not.toContain("Doctrine only");
  });

  it("explains deferred cards without rendering broken-looking actions", () => {
    renderOwnerSetup();

    [
      "Workflow Defaults setup section",
      "Order Numbering setup section",
    ].forEach((label) => {
      const section = screen.getByLabelText(label);
      expect(within(section).getByText("Deferred")).toBeInTheDocument();
      expect(within(section).getByText(/Planned later:/)).toBeInTheDocument();
      expect(within(section).queryByRole("button")).not.toBeInTheDocument();
      expect(within(section).queryByRole("link")).not.toBeInTheDocument();
    });

    ["Notification Defaults setup section", "Branding setup section"].forEach((label) => {
      const section = screen.getByLabelText(label);
      expect(within(section).getByText("Optional")).toBeInTheDocument();
      expect(within(section).queryByRole("button")).not.toBeInTheDocument();
      expect(within(section).queryByRole("link")).not.toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Save Profile" })).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Complete setup" })).not.toBeInTheDocument();
    expect(screen.getByText("Complete the required sections first.")).toBeInTheDocument();
    expect(screen.getAllByText("Company Profile").length).toBeGreaterThan(0);
    expect(screen.queryByText(/access granted/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/setup required to continue/i)).not.toBeInTheDocument();
  });

  it("shows the Team Access bridge only when users.read visibility is available", () => {
    permissionState.current = {
      allowed: true,
      loading: false,
      error: null,
      permissionKeys: ["users.read"],
      reload: vi.fn(),
    };

    renderOwnerSetup();

    const section = screen.getByLabelText("Team Access setup section");
    const link = within(section).getByRole("link", { name: "Open Team Access" });

    expect(link).toHaveAttribute("href", "/users");
    expect(within(section).queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /invite/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Invite Member")).not.toBeInTheDocument();
    expect(screen.queryByText("Invite New Member")).not.toBeInTheDocument();
    expect(screen.queryByText("Role Presets")).not.toBeInTheDocument();
  });

  it("keeps the Team Access bridge informational when users.read visibility is unavailable", () => {
    renderOwnerSetup();

    const section = screen.getByLabelText("Team Access setup section");

    expect(within(section).queryByRole("link", { name: "Open Team Access" })).not.toBeInTheDocument();
    expect(within(section).queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Profile" })).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("keeps setup authority out of the page source", () => {
    const source = readFileSync(pageSourcePath, "utf8");

    expect(source).toContain("SAMPLE_SETUP_CONTEXT");
    expect(source).toContain("mapOwnerSetupReadiness");
    expect(source).toContain("resolveCompanyReadiness");
    expect(source).toContain("useCompanySetupContext");
    expect(source).not.toMatch(/rpc_company_bootstrap/);
    expect(source).not.toMatch(/\.(insert|update|upsert|delete|rpc)\(/);
    expect(source).not.toMatch(/invite-company-member|rpc_company_member|InviteCompanyMemberModal|CompanyInvitationsPanel/);
    expect(source).not.toMatch(/access granted/i);
  });

  it("renders live setup context loading state safely", () => {
    setupContextState.current = {
      data: null,
      loading: true,
      error: null,
      permissionDenied: false,
      refetch: vi.fn(),
    };

    const html = renderOwnerSetupToStaticMarkup();

    expect(html).toContain("Loading guarded operational setup context");
    expect(html).toContain("Static sample fallback");
    expect(html).not.toMatch(/access granted/i);
  });

  it("renders live setup context readiness when available", () => {
    setupContextState.current = {
      data: {
        company_id: "owner-setup-live-company",
        company_status: "active",
        active_company_context_valid: true,
        profile_complete: true,
        owner_invariant_ok: true,
        active_owner_count: 1,
        active_member_count: 1,
        role_presets_ready: true,
        owner_role_ready: true,
        audit_readiness: { has_bootstrap_audit: true },
        dashboard_readiness: { has_any_dashboard: true },
        relationship_readiness: { active_relationship_count: 0 },
        assignment_readiness: { enabled: true },
      },
      loading: false,
      error: null,
      permissionDenied: false,
      refetch: vi.fn(),
    };

    const html = renderOwnerSetupToStaticMarkup();

    expect(html).toContain("Live operational setup context loaded through the guarded read-only RPC");
    expect(html).toContain("Live Operational Readiness Guidance");
    expect(html).toContain("Live operational readiness diagnostic");
    expect(html).toContain("Diagnostic only");
    expect(html.indexOf("Company Setup Sections")).toBeLessThan(
      html.indexOf("Live Operational Readiness Guidance"),
    );
    expect(html).toContain("Blockers");
    expect(html).toContain("Warnings");
    expect(html).toContain("Unknown / Deferred");
    expect(html).toContain("Diagnostic Status");
    expect(html).toContain("ready_for_orders");
    expect(html).toContain("order_numbering");
    expect(html).toContain("Static sample fallback");
    expect(html).not.toMatch(/access granted/i);
    expect(html).not.toMatch(/unlocked|activated/i);
  });

  it("maps safe live owner and role readiness signals to complete setup sections", () => {
    setupContextState.current = {
      data: {
        company_id: "owner-setup-live-company",
        company_name: "Live Company",
        company_status: "active",
        active_company_context_valid: true,
        profile_complete: true,
        owner_invariant_ok: true,
        active_owner_count: 1,
        active_member_count: 1,
        role_presets_ready: true,
        owner_role_ready: true,
        audit_readiness: { has_bootstrap_audit: true },
        dashboard_readiness: { has_any_dashboard: true },
        invitation_summary: { pending_count: 0 },
      },
      loading: false,
      error: null,
      permissionDenied: false,
      refetch: vi.fn(),
    };

    renderOwnerSetup();

    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("Minimum ready")).toBeInTheDocument();
    expect(screen.getByText("Company setup is ready for launch review.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Complete setup" })).toBeEnabled();
    expect(within(screen.getByLabelText("Owner Profile setup section")).getByText("Complete"))
      .toBeInTheDocument();
    expect(within(screen.getByLabelText("Team Access setup section")).getByText("Complete"))
      .toBeInTheDocument();
    expect(within(screen.getByLabelText("Order Numbering setup section")).getByText("Deferred"))
      .toBeInTheDocument();
    expect(within(screen.getByLabelText("Notification Defaults setup section")).getByText("Optional"))
      .toBeInTheDocument();
    expect(within(screen.getByLabelText("Branding setup section")).getByText("Optional"))
      .toBeInTheDocument();
    expect(screen.queryByText(/access granted/i)).not.toBeInTheDocument();
  });

  it("calls the setup completion RPC wrapper and shows setup complete after success", async () => {
    const refetch = vi.fn().mockResolvedValue({ company_id: "owner-setup-live-company" });
    setupContextState.current = {
      data: {
        company_id: "owner-setup-live-company",
        company_name: "Live Company",
        company_status: "active",
        active_company_context_valid: true,
        profile_complete: true,
        owner_invariant_ok: true,
        active_owner_count: 1,
        active_member_count: 1,
        role_presets_ready: true,
        owner_role_ready: true,
        audit_readiness: { has_bootstrap_audit: true },
        dashboard_readiness: { has_any_dashboard: true },
        invitation_summary: { pending_count: 0 },
      },
      loading: false,
      error: null,
      permissionDenied: false,
      refetch,
    };
    ownerSetupStateApiMock.completeOwnerSetup.mockResolvedValue({
      setup_state: { minimum_ready_at: "2026-06-22T15:00:00Z" },
      readiness: { minimum_ready: true },
    });

    renderOwnerSetup();

    fireEvent.click(screen.getByRole("button", { name: "Complete setup" }));

    await waitFor(() => {
      expect(ownerSetupStateApiMock.completeOwnerSetup).toHaveBeenCalledTimes(1);
      expect(refetch).toHaveBeenCalledTimes(1);
    });

    expect(screen.getAllByText("Setup complete").length).toBeGreaterThan(0);
    expect(
      screen.getByText("Setup is complete. Dashboard setup guidance will no longer appear for this company."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Complete setup" })).not.toBeInTheDocument();
    expect(toastMock.success).toHaveBeenCalledWith("Setup complete.");
  });

  it("shows server-side not-ready completion errors safely", async () => {
    setupContextState.current = {
      data: {
        company_id: "owner-setup-live-company",
        company_name: "Live Company",
        company_status: "active",
        active_company_context_valid: true,
        profile_complete: true,
        owner_invariant_ok: true,
        active_owner_count: 1,
        active_member_count: 1,
        role_presets_ready: true,
        owner_role_ready: true,
        audit_readiness: { has_bootstrap_audit: true },
        dashboard_readiness: { has_any_dashboard: true },
        invitation_summary: { pending_count: 0 },
      },
      loading: false,
      error: null,
      permissionDenied: false,
      refetch: vi.fn(),
    };
    ownerSetupStateApiMock.completeOwnerSetup.mockRejectedValue(
      Object.assign(new Error("owner_setup_minimum_readiness_required"), { code: "22023" }),
    );

    renderOwnerSetup();

    fireEvent.click(screen.getByRole("button", { name: "Complete setup" }));

    await waitFor(() => {
      expect(
        screen.getByText(/could not complete setup because required setup is still missing/i),
      ).toBeInTheDocument();
    });

    expect(toastMock.error).toHaveBeenCalledWith(
      "Falcon could not complete setup because required setup is still missing. Review the required sections and try again.",
    );
  });

  it("maps missing live owner and role setup to needs-attention sections", () => {
    setupContextState.current = {
      data: {
        company_id: "owner-setup-live-company",
        company_name: "Live Company",
        company_status: "active",
        active_company_context_valid: true,
        profile_complete: true,
        owner_invariant_ok: false,
        active_owner_count: 0,
        active_member_count: 1,
        role_presets_ready: false,
        owner_role_ready: false,
        audit_readiness: { has_bootstrap_audit: true },
        dashboard_readiness: { has_any_dashboard: true },
      },
      loading: false,
      error: null,
      permissionDenied: false,
      refetch: vi.fn(),
    };

    renderOwnerSetup();

    expect(screen.getByText("33%")).toBeInTheDocument();
    expect(screen.getAllByText("Next: Owner Profile").length).toBeGreaterThan(0);
    expect(
      within(screen.getByLabelText("Owner Profile setup section")).getByText("Needs attention"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByLabelText("Team Access setup section")).getByText("Needs attention"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Internal Diagnostics")).toBeInTheDocument();
    expect(screen.queryByText(/access granted/i)).not.toBeInTheDocument();
  });

  it("renders current profile values from live setup context", () => {
    setupContextState.current = {
      data: {
        company_id: "owner-setup-live-company",
        company_name: "Live Company",
        timezone: "America/Chicago",
        locale: "en-US",
        company_status: "active",
        active_company_context_valid: true,
        profile_complete: true,
        owner_invariant_ok: true,
        active_owner_count: 1,
        active_member_count: 1,
        role_presets_ready: true,
        owner_role_ready: true,
        audit_readiness: { has_bootstrap_audit: true },
        dashboard_readiness: { has_any_dashboard: true },
      },
      loading: false,
      error: null,
      permissionDenied: false,
      refetch: vi.fn(),
    };

    renderOwnerSetup();

    expect(screen.getByLabelText("Company Name")).toHaveValue("Live Company");
    expect(screen.getByLabelText("Timezone")).toHaveValue("America/Chicago");
    expect(screen.getByLabelText("Locale")).toHaveValue("en-US");
  });

  it("updates company profile through the guarded RPC API and refetches setup context", async () => {
    const refetch = vi.fn().mockResolvedValue({ company_id: "owner-setup-live-company" });
    setupContextState.current = {
      data: {
        company_id: "owner-setup-live-company",
        company_name: "Live Company",
        timezone: "America/New_York",
        locale: "en-US",
        company_status: "active",
        active_company_context_valid: true,
        profile_complete: true,
        owner_invariant_ok: true,
        active_owner_count: 1,
        active_member_count: 1,
        role_presets_ready: true,
        owner_role_ready: true,
        audit_readiness: { has_bootstrap_audit: true },
        dashboard_readiness: { has_any_dashboard: true },
      },
      loading: false,
      error: null,
      permissionDenied: false,
      refetch,
    };
    profileApiMock.updateCompanyProfile.mockResolvedValue({
      status: "updated",
      company_id: "owner-setup-live-company",
    });

    renderOwnerSetup();

    fireEvent.change(screen.getByLabelText("Company Name"), {
      target: { value: "Updated Company" },
    });
    fireEvent.change(screen.getByLabelText("Timezone"), {
      target: { value: "America/Chicago" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Profile" }));

    await waitFor(() => {
      expect(profileApiMock.updateCompanyProfile).toHaveBeenCalledWith({
        name: "Updated Company",
        timezone: "America/Chicago",
        locale: "en-US",
      });
      expect(refetch).toHaveBeenCalledTimes(1);
    });

    expect(toastMock.success).toHaveBeenCalledWith("Company profile updated.");
    expect(JSON.stringify(profileApiMock.updateCompanyProfile.mock.calls)).not.toMatch(
      /settings|operating_mode_settings|company_type|status|slug/,
    );
  });

  it("shows safe profile update errors", async () => {
    setupContextState.current = {
      data: {
        company_id: "owner-setup-live-company",
        company_name: "Live Company",
        timezone: "America/New_York",
        locale: "en-US",
      },
      loading: false,
      error: null,
      permissionDenied: false,
      refetch: vi.fn(),
    };
    profileApiMock.updateCompanyProfile.mockRejectedValue(
      Object.assign(new Error("company_update_profile_permission_required"), { code: "42501" }),
    );

    renderOwnerSetup();

    fireEvent.click(screen.getByRole("button", { name: "Save Profile" }));

    await waitFor(() => {
      expect(screen.getByText(/could not update this company profile/i)).toBeInTheDocument();
    });

    expect(toastMock.error).toHaveBeenCalledWith(
      "Falcon could not update this company profile with your current permissions.",
    );
  });

  it("renders setup context permission denied state safely", () => {
    setupContextState.current = {
      data: null,
      loading: false,
      error: new Error("setup_read_permission_missing"),
      permissionDenied: true,
      refetch: vi.fn(),
    };

    const html = renderOwnerSetupToStaticMarkup();

    expect(html).toContain("Operational setup context is unavailable for this current-company user");
    expect(html).toContain("setup_read_permission_missing");
    expect(html).toContain("Static sample fallback");
    expect(html).toContain("profile edits are disabled");
    expect(html).not.toMatch(/access granted/i);
  });

  it("adds only a settings-view protected direct route", () => {
    const routesSource = readFileSync(routesSourcePath, "utf8");

    expect(routesSource).toContain('path="/settings/owner-setup"');
    expect(routesSource).toContain("requiredPermission={PERMISSIONS.SETTINGS_VIEW}");
    expect(routesSource).toContain("<OwnerSetup />");
  });
});
