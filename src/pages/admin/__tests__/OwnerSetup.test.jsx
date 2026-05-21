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
    toastMock.success.mockReset();
    toastMock.error.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the static non-authoritative setup shell", () => {
    const html = renderOwnerSetupToStaticMarkup();

    expect(html).toContain("Owner Setup");
    expect(html).toContain("Setup guidance");
    expect(html).toContain("current workspace setup");
    expect(html).toContain("Company Profile");
    expect(html).toContain("Save Profile");
    expect(html).toContain("Live read-only setup context");
    expect(html).toContain("Sample Readiness Checklist");
    expect(html).toContain("Static sample fallback");
    expect(html).toContain("not permission authority");
    expect(html).not.toMatch(/access granted/i);
  });

  it("renders grouped setup sections and the expected future setup cards", () => {
    const html = renderOwnerSetupToStaticMarkup();

    ["Core Setup", "Operations Setup", "Communication / Branding", "Readiness"].forEach(
      (heading) => {
        expect(html).toContain(heading);
      },
    );

    [
      "Company Profile",
      "Owner Profile",
      "Basic Settings",
      "Branding",
      "Order Numbering",
      "Workflow Assumptions",
      "Team / Staff Invitations",
      "Role Review",
      "Notification Preferences",
      "Readiness Checklist",
    ].forEach((step) => {
      expect(html).toContain(step);
    });
  });

  it("renders normalized setup status labels for actionable, deferred, and diagnostic cards", () => {
    const html = renderOwnerSetupToStaticMarkup();

    expect(html).toContain("Available");
    expect(html).toContain("Coming later");
    expect(html).toContain("Deferred");
    expect(html).toContain("Diagnostic only");
    expect(html).not.toContain("Future setup card");
    expect(html).not.toContain("Deferred storage");
    expect(html).not.toContain("Doctrine only");
  });

  it("explains deferred cards without rendering broken-looking actions", () => {
    renderOwnerSetup();

    [
      "Basic Settings setup card",
      "Order Numbering setup card",
      "Notification Preferences setup card",
      "Branding setup card",
    ].forEach((label) => {
      const card = screen.getByLabelText(label);
      expect(within(card).getByText("Deferred")).toBeInTheDocument();
      expect(within(card).getByText(/Planned later:/)).toBeInTheDocument();
      expect(within(card).queryByRole("button")).not.toBeInTheDocument();
      expect(within(card).queryByRole("link")).not.toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Save Profile" })).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(1);
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

    const card = screen.getByLabelText("Team / Staff Invitations setup card");
    const link = within(card).getByRole("link", { name: "Open Team Access" });

    expect(link).toHaveAttribute("href", "/users");
    expect(within(card).queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /invite/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Invite Member")).not.toBeInTheDocument();
    expect(screen.queryByText("Invite New Member")).not.toBeInTheDocument();
    expect(screen.queryByText("Role Presets")).not.toBeInTheDocument();
  });

  it("keeps the Team Access bridge informational when users.read visibility is unavailable", () => {
    renderOwnerSetup();

    const card = screen.getByLabelText("Team / Staff Invitations setup card");

    expect(within(card).queryByRole("link", { name: "Open Team Access" })).not.toBeInTheDocument();
    expect(within(card).queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Profile" })).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("keeps setup authority out of the page source", () => {
    const source = readFileSync(pageSourcePath, "utf8");

    expect(source).toContain("SAMPLE_SETUP_CONTEXT");
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

    expect(html).toContain("Loading guarded setup context");
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

    expect(html).toContain("Live setup context loaded through the guarded read-only RPC");
    expect(html).toContain("Live Readiness Guidance");
    expect(html).toContain("Live readiness diagnostic");
    expect(html).toContain("Diagnostic only");
    expect(html).toContain("Blockers");
    expect(html).toContain("Warnings");
    expect(html).toContain("Unknown / Deferred");
    expect(html).toContain("Diagnostic Status");
    expect(html).toContain("ready_for_orders");
    expect(html).toContain("order_numbering");
    expect(html).toContain("Static sample fallback");
    expect(html).not.toMatch(/access granted/i);
    expect(html).not.toMatch(/unlocked|activated|complete/i);
  });

  it("maps safe live owner and role readiness signals to ready card badges", () => {
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
        invitation_summary: { pending_count: 0 },
      },
      loading: false,
      error: null,
      permissionDenied: false,
      refetch: vi.fn(),
    };

    renderOwnerSetup();

    expect(within(screen.getByLabelText("Owner Profile setup card")).getByText("Ready"))
      .toBeInTheDocument();
    expect(within(screen.getByLabelText("Role Review setup card")).getByText("Ready"))
      .toBeInTheDocument();
    expect(within(screen.getByLabelText("Order Numbering setup card")).getByText("Deferred"))
      .toBeInTheDocument();
    expect(within(screen.getByLabelText("Notification Preferences setup card")).getByText("Deferred"))
      .toBeInTheDocument();
    expect(within(screen.getByLabelText("Branding setup card")).getByText("Deferred"))
      .toBeInTheDocument();
    expect(screen.getByText("Available")).toBeInTheDocument();
    expect(screen.queryByText(/access granted/i)).not.toBeInTheDocument();
  });

  it("maps missing live owner and role diagnostics to needs-attention card badges", () => {
    setupContextState.current = {
      data: {
        company_id: "owner-setup-live-company",
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

    expect(
      within(screen.getByLabelText("Owner Profile setup card")).getByText("Needs attention"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByLabelText("Role Review setup card")).getByText("Needs attention"),
    ).toBeInTheDocument();
    expect(within(screen.getByLabelText("Readiness Checklist setup card")).getByText(
      "Diagnostic only",
    )).toBeInTheDocument();
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

    expect(html).toContain("Setup context is unavailable for this current-company user");
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
