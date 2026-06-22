import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  "supabase/migrations/20260621107000_vendor_coverage_v2a_bid_request_from_eligible_rpc.sql",
  "utf8",
);

describe("Vendor Coverage Engine V2A eligible bid request RPC migration", () => {
  it("creates the eligible-vendor bid request wrapper with guarded RPC posture", () => {
    expect(migrationSql).toContain("rpc_order_vendor_bid_request_create_from_eligible");
    expect(migrationSql).toContain("p_order_id uuid");
    expect(migrationSql).toContain("p_vendor_profile_ids uuid[]");
    expect(migrationSql).toContain("p_payload jsonb");
    expect(migrationSql).toContain("security definer");
    expect(migrationSql).toContain("set search_path = public");
    expect(migrationSql).toContain(
      "grant execute on function public.rpc_order_vendor_bid_request_create_from_eligible(uuid, uuid[], jsonb)",
    );
  });

  it("requires authenticated current-company procurement and vendor read authority", () => {
    expect(migrationSql).toContain("public.current_app_user_id()");
    expect(migrationSql).toContain("public.current_app_user_has_current_company()");
    expect(migrationSql).toContain("public.current_app_user_has_permission('bid_requests.create')");
    expect(migrationSql).toContain("raise exception 'bid_request_create_permission_required'");
    expect(migrationSql).toContain("public.current_app_user_has_permission('vendors.read')");
    expect(migrationSql).toContain("raise exception 'vendor_read_permission_required'");
  });

  it("re-runs deterministic coverage eligibility server-side", () => {
    expect(migrationSql).toContain("public.amc_vendor_coverage_normalized_state(v_order.state)");
    expect(migrationSql).toContain("public.amc_vendor_coverage_normalized_county(v_order.county)");
    expect(migrationSql).toContain("public.amc_vendor_coverage_assignment_type_from_order(v_order.report_type)");
    expect(migrationSql).toContain("join public.vendor_coverage_states");
    expect(migrationSql).toContain("join public.vendor_coverage_counties");
    expect(migrationSql).toContain("join public.vendor_property_types");
    expect(migrationSql).toContain("join public.vendor_assignment_types");
    expect(migrationSql).toContain("raise exception 'eligible_vendor_profile_ineligible'");
  });

  it("accepts only active vendors and active AMC vendor relationships", () => {
    expect(migrationSql).toContain("cvp.vendor_status = 'active'");
    expect(migrationSql).toContain("vc.status = 'active'");
    expect(migrationSql).toContain("cr.relationship_type = 'amc_vendor'");
    expect(migrationSql).toContain("cr.status = 'active'");
    expect(migrationSql).not.toContain("cvp.vendor_status <> 'inactive'");
    expect(migrationSql).not.toContain("cvp.vendor_status <> 'suspended'");
  });

  it("delegates bid request creation to the existing RPC and preserves duplicate prevention", () => {
    expect(migrationSql).toContain("return public.rpc_order_vendor_bid_request_create(p_order_id, v_payload_for_create)");
    expect(migrationSql).toContain("'recipients', v_recipients");
    expect(migrationSql).not.toContain("insert into public.order_vendor_bid_requests");
    expect(migrationSql).not.toContain("insert into public.order_vendor_bid_request_recipients");
  });

  it("adds eligible-vendors source metadata and avoids assignment or order mutations", () => {
    expect(migrationSql).toContain("'source', 'eligible_vendors_panel'");
    expect(migrationSql).toContain("'deterministic_coverage_match', true");
    expect(migrationSql).not.toContain("insert into public.order_company_assignments");
    expect(migrationSql).not.toContain("update public.order_company_assignments");
    expect(migrationSql).not.toContain("update public.orders");
    expect(migrationSql).not.toContain("insert into public.orders");
  });
});
