import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const testDir = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(testDir, "../../../..");
const migrationPath = resolve(
  repoRoot,
  "supabase/migrations/20260610160000_vendor_workspace_report_upload_permission_alignment.sql",
);
const edgePath = resolve(
  repoRoot,
  "supabase/functions/vendor-workspace-report-upload-url/index.ts",
);

const migrationSql = readFileSync(migrationPath, "utf8");
const edgeSource = readFileSync(edgePath, "utf8");

describe("Vendor Workspace report upload production alignment", () => {
  it("ensures Vendor Admin has the permissions required by report upload preparation", () => {
    [
      "'vendor_assignments.progress'",
      "'vendor_documents.upload'",
      "insert into public.permissions",
      "insert into public.role_permissions",
      "lower(r.name) = lower(seed.role_name)",
      "on conflict (role_id, permission_key) do nothing",
    ].forEach((sqlSnippet) => {
      expect(migrationSql).toContain(sqlSnippet);
    });
  });

  it("returns structured safe diagnostics from the report upload Edge Function", () => {
    [
      "function safeRpcErrorDetails",
      '"upload_not_authorized"',
      '"signed_upload_failed"',
      "[vendor-workspace-report-upload-url] prepare denied",
      "[vendor-workspace-report-upload-url] prepare rejected",
      "field_errors",
      "assignment_status",
      "rpc_code",
      "rpc_message",
      "storage_bucket_present",
      "storage_path_present",
    ].forEach((sourceSnippet) => {
      expect(edgeSource).toContain(sourceSnippet);
    });
  });

  it("allows production preflight requests with the headers used by supabase.functions.invoke", () => {
    [
      '"https://continentalres.com"',
      '"https://www.continentalres.com"',
      '"Access-Control-Allow-Origin": allowedOrigin(req)',
      '"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"',
      '"Access-Control-Allow-Methods": "POST, OPTIONS"',
      '"Access-Control-Max-Age": "86400"',
      'if (req.method === "OPTIONS")',
      'return new Response("ok", { headers: corsHeaders(req) })',
    ].forEach((sourceSnippet) => {
      expect(edgeSource).toContain(sourceSnippet);
    });
  });

  it("keeps report upload diagnostics free of storage paths in client responses", () => {
    expect(edgeSource).not.toContain("storage_path: prepared.upload.storage_path");
    expect(edgeSource).not.toContain("storage_bucket: prepared.upload.storage_bucket");
    expect(edgeSource).not.toContain("assignment_id:");
    expect(edgeSource).not.toContain("order_id:");
  });
});
