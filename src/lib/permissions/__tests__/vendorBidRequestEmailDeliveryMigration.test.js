import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.resolve(
  process.cwd(),
  "supabase/migrations/20260609120000_amc_vendor_bid_request_email_delivery.sql",
);
const migrationSql = fs.readFileSync(migrationPath, "utf8");
const normalizedSql = migrationSql.replace(/\s+/g, " ").toLowerCase();

describe("AMC-11 vendor bid request email delivery migration", () => {
  it("recreates the bid request create RPC and preserves grants", () => {
    expect(migrationSql).toContain("create or replace function public.rpc_order_vendor_bid_request_create");
    expect(migrationSql).toContain("revoke all on function public.rpc_order_vendor_bid_request_create(uuid, jsonb) from public, anon");
    expect(migrationSql).toContain("grant execute on function public.rpc_order_vendor_bid_request_create(uuid, jsonb) to authenticated, service_role");
  });

  it("creates tokenized bid invitations and queues vendor bid emails", () => {
    expect(migrationSql).toContain("insert into public.order_vendor_bid_request_recipient_invitations");
    expect(migrationSql).toContain("token_hash");
    expect(migrationSql).toContain("extensions.digest(v_token, 'sha256')");
    expect(migrationSql).toContain("'/vendor/bid-invitations/' || v_token");
    expect(migrationSql).toContain("insert into public.email_queue");
    expect(migrationSql).toContain("'VENDOR_BID_INVITATION'");
  });

  it("queues a vendor-safe packet summary without operational order mutation", () => {
    expect(migrationSql).toContain("'property_address'");
    expect(migrationSql).toContain("'city'");
    expect(migrationSql).toContain("'state'");
    expect(migrationSql).toContain("'postal_code'");
    expect(migrationSql).toContain("'property_type'");
    expect(migrationSql).toContain("'report_type'");
    expect(migrationSql).toContain("'response_due_at'");
    expect(migrationSql).toContain("'desired_vendor_due_at'");
    expect(migrationSql).toContain("'request_message'");
    expect(normalizedSql).not.toContain("insert into public.order_company_assignments");
    expect(normalizedSql).not.toContain("update public.orders");
    expect(normalizedSql).not.toContain("'base_fee'");
    expect(normalizedSql).not.toContain("'appraiser_fee'");
    expect(normalizedSql).not.toContain("'client_invoice_amount'");
    expect(normalizedSql).not.toContain("'staff_notes'");
    expect(normalizedSql).not.toContain("'internal_notes'");
  });

  it("keeps manual fallback warnings when vendor email is missing", () => {
    expect(migrationSql).toContain("'missing_email'");
    expect(migrationSql).toContain("'vendor_contact_email_missing'");
    expect(migrationSql).toContain("'email_warning'");
  });

  it("does not send email directly from SQL", () => {
    expect(normalizedSql).not.toContain("resend");
    expect(normalizedSql).not.toContain("http_post");
    expect(normalizedSql).not.toContain("net.http");
  });
});
