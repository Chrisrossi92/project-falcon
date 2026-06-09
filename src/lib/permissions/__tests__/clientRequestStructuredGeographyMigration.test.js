import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const testDir = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(testDir, "../../../..");
const migrationPath = resolve(
  repoRoot,
  "supabase/migrations/20260609100000_client_request_structured_geography_conversion.sql",
);
const candidateMigrationPath = resolve(
  repoRoot,
  "supabase/migrations/20260601140000_amc_vendor_assignment_candidate_rpcs.sql",
);

const migrationSql = readFileSync(migrationPath, "utf8");
const candidateMigrationSql = readFileSync(candidateMigrationPath, "utf8");

describe("AMC-10A/10B structured client request geography migration", () => {
  it("adds structured geography columns to client portal requests", () => {
    expect(migrationSql).toContain("add column if not exists property_city text null");
    expect(migrationSql).toContain("add column if not exists property_state text null");
    expect(migrationSql).toContain("add column if not exists property_postal_code text null");
    expect(migrationSql).toContain("add column if not exists property_county text null");
  });

  it("stores structured geography through the client request create RPC", () => {
    [
      "p_property_city text default null",
      "p_property_state text default null",
      "p_property_postal_code text default null",
      "p_property_county text default null",
      "v_property_city",
      "v_property_state",
      "v_property_postal_code",
      "v_property_county",
    ].forEach((expected) => {
      expect(migrationSql).toContain(expected);
    });

    expect(migrationSql).toContain("property_city_required");
    expect(migrationSql).toContain("property_state_required");
    expect(migrationSql).toContain("property_postal_code_required");
  });

  it("does not create operational orders during client request submission", () => {
    const createFunction = migrationSql.slice(
      migrationSql.indexOf("create or replace function public.rpc_client_portal_order_request_create"),
      migrationSql.indexOf("drop function if exists public.rpc_client_portal_order_request_convert_to_order"),
    );

    expect(createFunction).toContain("insert into public.client_portal_order_requests");
    expect(createFunction).toContain("insert into public.notifications");
    expect(createFunction).not.toContain("insert into public.orders");
    expect(createFunction).not.toContain("insert into public.order_vendor_bid_requests");
    expect(createFunction).not.toContain("insert into public.order_company_assignments");
  });

  it("copies structured geography and product fields into existing order columns during conversion", () => {
    [
      "property_address,",
      "address,",
      "city,",
      "state,",
      "county,",
      "postal_code,",
      "zip,",
      "property_type,",
      "report_type,",
      "client_due_at,",
      "final_due_at,",
      "due_to_client,",
      "due_date,",
      "v_request.property_city",
      "v_request.property_state",
      "v_request.property_county",
      "v_request.property_postal_code",
      "v_request.property_type",
      "v_request.report_type",
    ].forEach((expected) => {
      expect(migrationSql).toContain(expected);
    });
  });

  it("keeps converted requests procurement-ready for the existing candidate matcher", () => {
    expect(candidateMigrationSql).toContain("v_order_state := public.amc_candidate_normalized_state(v_order.state)");
    expect(candidateMigrationSql).toContain("v_order_county := public.amc_candidate_normalized_county(v_order.county)");
    expect(candidateMigrationSql).toContain("v_order_zip := public.amc_candidate_normalized_zip(coalesce(v_order.postal_code, v_order.zip))");
    expect(candidateMigrationSql).toContain("v_order_product_slugs := public.amc_candidate_order_product_slugs");

    expect(migrationSql).toContain("v_request.property_state");
    expect(migrationSql).toContain("v_request.property_county");
    expect(migrationSql).toContain("v_request.property_postal_code");
    expect(migrationSql).toContain("v_request.report_type");
    expect(migrationSql).toContain("v_request.property_type");
  });

  it("exposes structured address fields in client-safe and staff-safe read models", () => {
    expect(migrationSql).toContain("create or replace function public.rpc_client_portal_pending_order_requests()");
    expect(migrationSql).toContain("create view public.v_client_portal_order_request_staff_review");
    expect(migrationSql).toContain("property_city text");
    expect(migrationSql).toContain("property_state text");
    expect(migrationSql).toContain("property_postal_code text");
    expect(migrationSql).toContain("property_county text");
  });
});
