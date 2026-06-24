import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";

const setupContextState = vi.hoisted(() => ({
  current: {
    data: null,
    loading: false,
    error: null,
    permissionDenied: false,
    refetch: vi.fn(),
  },
}));

vi.mock("../../../features/company-setup/useCompanySetupContext.js", () => ({
  useCompanySetupContext: () => setupContextState.current,
}));

vi.mock("../../../lib/productContext/useProductContextDiagnostics.js", () => ({
  useProductContextDiagnostics: () => ({
    productContext: "amc",
    productContextLabel: "Falcon AMC",
    pathname: "/settings/product-metadata-diagnostics",
    routeFamily: "shared_legacy",
    source: "product_metadata_diagnostics",
    operationsMode: "amc_operations",
    operationsModeProvided: true,
    diagnosticOnly: true,
    affectsAuth: false,
    affectsRouting: false,
    affectsCompanyContext: false,
    affectsDataAccess: false,
    legalBoundary: false,
  }),
}));

const { default: ProductMetadataDiagnostics } = await import("../ProductMetadataDiagnostics.jsx");

const sourcePath = resolve(dirname(fileURLToPath(import.meta.url)), "../ProductMetadataDiagnostics.jsx");

describe("ProductMetadataDiagnostics", () => {
  beforeEach(() => {
    setupContextState.current = {
      data: null,
      loading: false,
      error: null,
      permissionDenied: false,
      refetch: vi.fn(),
    };
  });

  it("renders the read-only diagnostic metadata surface", () => {
    const html = renderToStaticMarkup(<ProductMetadataDiagnostics />);

    expect(html).toContain("Product Metadata Diagnostics");
    expect(html).toContain("Diagnostic only");
    expect(html).toContain("read-only and non-authoritative");
    expect(html).toContain("Product Context Diagnostics");
    expect(html).toContain("Falcon AMC");
    expect(html).toContain("Diagnostic only");
    expect(html).toContain("auth=false");
    expect(html).toContain("routing=false");
    expect(html).toContain("company=false");
    expect(html).toContain("data=false");
    expect(html).toContain("legal=false");
    expect(html).toContain("Shadow Route Diagnostics");
    expect(html).toContain("Permission Metadata");
    expect(html).toContain("Billing Authority");
  });

  it("renders current-live vs shadow navigation parity diagnostics", () => {
    const html = renderToStaticMarkup(<ProductMetadataDiagnostics />);

    expect(html).toContain("Live Navigation Parity Diagnostics");
    expect(html).toContain("diagnostic-only and non-authoritative");
    expect(html).toContain("Matched concepts");
    expect(html).toContain("Live-only diagnostic gaps");
    expect(html).toContain("Shadow-only / future gaps");
    expect(html).toContain("Permission metadata remains descriptive");
    expect(html).toContain("Dashboard");
    expect(html).toContain("Orders");
    expect(html).toContain("Assignments");
    expect(html).toContain("Reviews");
    expect(html).toContain("Product Metadata Diagnostics");
  });

  it("renders current-live vs shadow command palette parity diagnostics", () => {
    const html = renderToStaticMarkup(<ProductMetadataDiagnostics />);

    expect(html).toContain("Live Command Palette Parity Diagnostics");
    expect(html).toContain("diagnostic-only and non-authoritative");
    expect(html).toContain("Matched commands");
    expect(html).toContain("Live-only command gaps");
    expect(html).toContain("Shadow-only / future command gaps");
    expect(html).toContain("Parity shadow command lanes");
    expect(html).toContain("Open Orders");
    expect(html).toContain("Go to Orders");
    expect(html).toContain("Open Review Queue");
    expect(html).toContain("Go to Assignments");
    expect(html).toContain("Permission metadata remains descriptive");
  });

  it("renders current-live vs shadow dashboard parity diagnostics", () => {
    const html = renderToStaticMarkup(<ProductMetadataDiagnostics />);

    expect(html).toContain("Live Dashboard Parity Diagnostics");
    expect(html).toContain("diagnostic-only and non-authoritative");
    expect(html).toContain("Matched dashboard concepts");
    expect(html).toContain("Live-only dashboard entries");
    expect(html).toContain("Shadow-only / future dashboard gaps");
    expect(html).toContain("Parity shadow dashboard lanes");
    expect(html).toContain("Active Order Attention");
    expect(html).toContain("Operational Attention");
    expect(html).toContain("Due Soon and Overdue");
    expect(html).toContain("Review / QC Queue");
    expect(html).toContain("Widget / Section Notes");
    expect(html).toContain("DashboardGate and component-level permissions remain authoritative");
  });

  it("renders the static company setup readiness diagnostics preview", () => {
    const html = renderToStaticMarkup(<ProductMetadataDiagnostics />);

    expect(html).toContain("Company Setup Readiness Preview");
    expect(html).toContain("Static sample fallback");
    expect(html).toContain("Sample Status");
    expect(html).toContain("ready_for_orders");
    expect(html).toContain("Unknown Domains");
    expect(html).toContain("order_numbering");
    expect(html).toContain("notification_defaults");
    expect(html).toContain("onboarding_persistence");
    expect(html).toContain("module_package_state");
    expect(html).not.toMatch(/access granted/i);
  });

  it("renders live setup context loading state safely", () => {
    setupContextState.current = {
      data: null,
      loading: true,
      error: null,
      permissionDenied: false,
      refetch: vi.fn(),
    };

    const html = renderToStaticMarkup(<ProductMetadataDiagnostics />);

    expect(html).toContain("Live read-only setup context");
    expect(html).toContain("Loading guarded setup context");
    expect(html).toContain("Static sample fallback");
    expect(html).not.toMatch(/access granted/i);
  });

  it("renders live setup context readiness when available", () => {
    setupContextState.current = {
      data: {
        company_id: "live-company-id",
        company_status: "active",
        active_company_context_valid: true,
        profile_complete: true,
        owner_invariant_ok: true,
        active_owner_count: 1,
        active_member_count: 2,
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

    const html = renderToStaticMarkup(<ProductMetadataDiagnostics />);

    expect(html).toContain("Live setup context loaded through the guarded read-only RPC");
    expect(html).toContain("Live Status");
    expect(html).toContain("live-company-id");
    expect(html).toContain("Live Unknown Domains");
    expect(html).toContain("Static sample fallback");
    expect(html).not.toMatch(/access granted/i);
  });

  it("renders setup context permission denied state safely", () => {
    setupContextState.current = {
      data: null,
      loading: false,
      error: new Error("setup_read_permission_missing"),
      permissionDenied: true,
      refetch: vi.fn(),
    };

    const html = renderToStaticMarkup(<ProductMetadataDiagnostics />);

    expect(html).toContain("Setup context is unavailable for this current-company user");
    expect(html).toContain("setup_read_permission_missing");
    expect(html).toContain("Static sample fallback");
    expect(html).not.toMatch(/access granted/i);
  });

  it("does not import or call mutating services or bootstrap RPCs", () => {
    const source = readFileSync(sourcePath, "utf8");

    expect(source).toContain("getNavigationParityDiagnostics");
    expect(source).toContain("getCommandPaletteParityDiagnostics");
    expect(source).toContain("getDashboardParityDiagnostics");
    expect(source).toContain("SAMPLE_READINESS_SETUP_CONTEXT");
    expect(source).toContain("useCompanySetupContext");
    expect(source).not.toMatch(/from\s+["'][^"']*(services|supabase)[^"']*["']/);
    expect(source).not.toMatch(/rpc_company_bootstrap/);
    expect(source).not.toMatch(/\.(insert|update|upsert|delete|rpc)\(/);
  });
});
