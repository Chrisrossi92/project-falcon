import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  process.cwd(),
  "supabase/migrations/20260610100000_amc_order_detail_assignment_activity_alignment.sql",
);
const migrationSql = fs.readFileSync(migrationPath, "utf8");
const normalizedSql = migrationSql.replace(/\s+/g, " ").toLowerCase();

describe("AMC-12.1 order detail assignment activity alignment migration", () => {
  it("safely recreates the owner assignment list RPC with accepted bid terms", () => {
    expect(migrationSql).toContain("drop function if exists public.rpc_order_company_assignment_list_for_order(uuid)");
    expect(migrationSql).toContain("create or replace function public.rpc_order_company_assignment_list_for_order");
    expect(migrationSql).toContain("accepted_fee_amount numeric");
    expect(migrationSql).toContain("accepted_turn_time_days integer");
    expect(migrationSql).toContain("accepted_vendor_due_at timestamptz");
    expect(migrationSql).toContain("selected_bid_response_id uuid");
    expect(migrationSql).toContain("oca.terms ->> 'fee_amount'");
    expect(migrationSql).toContain("oca.handoff_payload ->> 'bid_response_id'");
    expect(migrationSql).toContain("grant execute on function public.rpc_order_company_assignment_list_for_order(uuid) to authenticated, service_role");
  });

  it("creates backend-only procurement activity triggers for the AMC lifecycle", () => {
    expect(migrationSql).toContain("create or replace function public.amc_log_order_procurement_activity");
    expect(migrationSql).toContain("'client_request_converted'");
    expect(migrationSql).toContain("'bid_request_sent'");
    expect(migrationSql).toContain("'bid_response_received'");
    expect(migrationSql).toContain("'bid_selected'");
    expect(migrationSql).toContain("'assignment_offered'");
    expect(migrationSql).toContain("'assignment_accepted'");
    expect(migrationSql).toContain("create trigger amc_client_request_conversion_activity");
    expect(migrationSql).toContain("create trigger amc_bid_request_activity");
    expect(migrationSql).toContain("create trigger amc_bid_response_activity");
    expect(migrationSql).toContain("create trigger amc_bid_selected_activity");
    expect(migrationSql).toContain("create trigger amc_vendor_assignment_activity_insert");
    expect(migrationSql).toContain("create trigger amc_vendor_assignment_activity_update");
  });

  it("writes activity only without notification or email side effects", () => {
    expect(migrationSql).toContain("insert into public.activity_log");
    expect(normalizedSql).not.toContain("insert into public.notifications");
    expect(normalizedSql).not.toContain("insert into public.email_queue");
    expect(normalizedSql).not.toContain("notify_order_company_assignment_event");
    expect(normalizedSql).not.toContain("notify_safe");
    expect(normalizedSql).not.toContain("resend");
  });
});
