import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const testDir = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(testDir, "../../../..");
const migrationPath = resolve(
  repoRoot,
  "supabase/migrations/20260609110000_amc_vendor_product_taxonomy_simplification.sql",
);

const migrationSql = readFileSync(migrationPath, "utf8");

describe("AMC-10C vendor product taxonomy simplification migration", () => {
  it("normalizes legacy vendor products to major appraisal categories", () => {
    [
      "when 'commercial' then 'commercial_appraisal'",
      "when 'commercial_appraisal' then 'commercial_appraisal'",
      "when 'residential' then 'residential_appraisal'",
      "when 'residential_appraisal' then 'residential_appraisal'",
      "when 'appraisal' then 'appraisal'",
    ].forEach((expected) => {
      expect(migrationSql).toContain(expected);
    });
  });

  it("derives commercial and residential order categories from property subtypes", () => {
    [
      "when 'industrial' then 'commercial_appraisal'",
      "when 'office' then 'commercial_appraisal'",
      "when 'retail' then 'commercial_appraisal'",
      "when 'mixed_use' then 'commercial_appraisal'",
      "when 'special_purpose' then 'commercial_appraisal'",
      "when 'single_family' then 'residential_appraisal'",
      "when 'condo' then 'residential_appraisal'",
      "when 'two_to_four_family' then 'residential_appraisal'",
      "when 'manufactured_home' then 'residential_appraisal'",
    ].forEach((expected) => {
      expect(migrationSql).toContain(expected);
    });
  });

  it("scores exact subtype above major product and broad appraisal fallback", () => {
    expect(migrationSql).toContain("then 35");
    expect(migrationSql).toContain("then 25");
    expect(migrationSql).toContain("then 15");
    expect(migrationSql).toContain("'exact_subtype'");
    expect(migrationSql).toContain("'major_product'");
    expect(migrationSql).toContain("'broad_appraisal'");
  });

  it("keeps geography rules and AMC order scope unchanged", () => {
    expect(migrationSql).toContain("coalesce(v_order.operations_scope, 'internal_operations') <> 'amc_operations'");
    expect(migrationSql).toContain("public.amc_candidate_normalized_zip(vsa.zip) = v_order_zip");
    expect(migrationSql).toContain("public.amc_candidate_normalized_county(vsa.county) = v_order_county");
    expect(migrationSql).toContain("public.amc_candidate_normalized_state(vsa.state) = v_order_state");
    expect(migrationSql).toContain("then 'statewide'");
  });

  it("keeps candidate matching read-only", () => {
    expect(migrationSql).not.toContain("insert into public.order_company_assignments");
    expect(migrationSql).not.toContain("update public.order_company_assignments");
    expect(migrationSql).not.toContain("insert into public.orders");
    expect(migrationSql).not.toContain("update public.orders");
    expect(migrationSql).not.toContain("create table");
    expect(migrationSql).not.toContain("alter table");
  });
});
