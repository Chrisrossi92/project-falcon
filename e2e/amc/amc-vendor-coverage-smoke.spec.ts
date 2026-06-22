import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import {
  assertAmcStagingSmokeTarget,
  login,
  openAmcOrderDetail,
  prepareFixtureIfRequested,
  requiredValue,
  signIn,
} from "./helpers/stagingSmoke";

const OWNER_EMAIL = process.env.AMC_STAGING_SMOKE_OWNER_EMAIL || "amc.smoke.owner+staging@example.test";
const PASSWORD = process.env.AMC_STAGING_SMOKE_PASSWORD || "FalconSmoke123!";
const ORDER_NUMBER = process.env.AMC_STAGING_VENDOR_COVERAGE_ORDER_NUMBER || "AMC-STAGING-COVERAGE-MATCH-001";
const SMOKE_LABEL = "AMC VENDOR COVERAGE SMOKE - DO NOT USE";
const MATCHING_VENDOR_NAME = `${SMOKE_LABEL} Matching Vendor`;
const NON_MATCHING_VENDOR_NAME = `${SMOKE_LABEL} Non Matching Vendor`;
const INACTIVE_VENDOR_NAME = `${SMOKE_LABEL} Inactive Vendor`;
const SUSPENDED_VENDOR_NAME = `${SMOKE_LABEL} Suspended Vendor`;

let adminClient = null;
let ownerClient = null;
let fixtureState = null;

test.describe.configure({ mode: "serial" });

function assertOk(response, label) {
  if (response.error) {
    throw new Error(`${label}: ${response.error.message || JSON.stringify(response.error)}`);
  }
  return response.data;
}

async function upsertSingle(client, table, row, onConflict, label) {
  return assertOk(await client.from(table).upsert(row, { onConflict }).select("*").single(), label);
}

async function replaceCoverage(vendorProfileId, vendorCompanyId, coverage) {
  for (const table of [
    "vendor_coverage_states",
    "vendor_coverage_counties",
    "vendor_property_types",
    "vendor_assignment_types",
  ]) {
    assertOk(await adminClient.from(table).delete().eq("vendor_profile_id", vendorProfileId), `clear ${table}`);
  }

  if (coverage.states?.length) {
    assertOk(
      await adminClient.from("vendor_coverage_states").insert(
        coverage.states.map((stateCode) => ({
          vendor_profile_id: vendorProfileId,
          company_id: vendorCompanyId,
          state_code: stateCode,
        })),
      ),
      "insert coverage states",
    );
  }

  if (coverage.counties?.length) {
    assertOk(
      await adminClient.from("vendor_coverage_counties").insert(
        coverage.counties.map((county) => ({
          vendor_profile_id: vendorProfileId,
          company_id: vendorCompanyId,
          state_code: county.state_code,
          county_name: county.county_name,
        })),
      ),
      "insert coverage counties",
    );
  }

  if (coverage.propertyTypes?.length) {
    assertOk(
      await adminClient.from("vendor_property_types").insert(
        coverage.propertyTypes.map((propertyType) => ({
          vendor_profile_id: vendorProfileId,
          company_id: vendorCompanyId,
          property_type: propertyType,
        })),
      ),
      "insert property types",
    );
  }

  if (coverage.assignmentTypes?.length) {
    assertOk(
      await adminClient.from("vendor_assignment_types").insert(
        coverage.assignmentTypes.map((assignmentType) => ({
          vendor_profile_id: vendorProfileId,
          company_id: vendorCompanyId,
          assignment_type: assignmentType,
        })),
      ),
      "insert assignment types",
    );
  }
}

async function seedVendorProfile({ slug, name, status, coverage }) {
  const company = await upsertSingle(
    adminClient,
    "companies",
    {
      slug,
      name,
      status: "active",
      timezone: "America/New_York",
      locale: "en-US",
      settings: { disposable: true, staging_smoke: true, vendor_coverage_smoke: true },
      company_type: "vendor",
      operating_mode_settings: {},
    },
    "slug",
    `upsert ${name} company`,
  );

  const profile = await upsertSingle(
    adminClient,
    "company_vendor_profiles",
    {
      owner_company_id: fixtureState.ownerCompany.id,
      vendor_company_id: company.id,
      vendor_status: status,
      public_phone: "555-1720",
      default_assignment_instructions: "Disposable vendor coverage matching smoke fixture.",
      capabilities: { commercial: true, vendor_coverage_smoke: true },
      product_eligibility: { commercial: true, appraisal: true },
      internal_notes: `${SMOKE_LABEL}. Disposable targeted coverage matching fixture.`,
      tags: ["vendor-coverage-smoke", "staging-smoke", "disposable"],
    },
    "owner_company_id,vendor_company_id",
    `upsert ${name} vendor profile`,
  );

  await replaceCoverage(profile.id, company.id, coverage);
  return { company, profile };
}

async function seedCoverageFixture() {
  adminClient = createClient(requiredValue("AMC_STAGING_SUPABASE_URL"), requiredValue("AMC_STAGING_SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const ownerCompany = assertOk(
    await adminClient.from("companies").select("*").eq("slug", "falcon_default").single(),
    "lookup owner company",
  );
  const ownerUser = assertOk(
    await adminClient.from("users").select("*").eq("email", OWNER_EMAIL).maybeSingle(),
    "lookup owner user",
  );
  if (!ownerUser?.id) {
    throw new Error(
      `Disposable owner ${OWNER_EMAIL} was not found. Run with E2E_AMC_PREPARE_FIXTURE=1 once to create the staging owner fixture.`,
    );
  }

  fixtureState = { ownerCompany, ownerUser };

  const order = await upsertSingle(
    adminClient,
    "orders",
    {
      company_id: ownerCompany.id,
      owner_id: ownerUser.id,
      order_number: ORDER_NUMBER,
      external_order_no: ORDER_NUMBER,
      title: `${SMOKE_LABEL} Order`,
      status: "new",
      manual_client: `${SMOKE_LABEL} Demo Lender`,
      manual_client_name: `${SMOKE_LABEL} Demo Lender`,
      property_address: `${SMOKE_LABEL} - 1717 Coverage Match Lane`,
      address: `${SMOKE_LABEL} - 1717 Coverage Match Lane`,
      city: "Toledo",
      state: "OH",
      county: "Lucas",
      postal_code: "43604",
      zip: "43604",
      property_type: "commercial",
      report_type: "Appraisal",
      date_ordered: new Date().toISOString().slice(0, 10),
      due_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      client_due_at: new Date(Date.now() + 14 * 86400000).toISOString(),
      final_due_at: new Date(Date.now() + 14 * 86400000).toISOString(),
      review_due_at: new Date(Date.now() + 12 * 86400000).toISOString(),
      special_instructions: `${SMOKE_LABEL}. Disposable targeted coverage matching order. Do not use outside staging/local smoke testing.`,
      notes: `${SMOKE_LABEL}. Targeted V1C coverage matching fixture.`,
      operations_scope: "amc_operations",
      fee_amount: 1200,
      appraiser_fee: 650,
    },
    "order_number",
    "upsert coverage matching order",
  );

  const matchingVendor = await seedVendorProfile({
    slug: "amc-vendor-coverage-smoke-matching",
    name: MATCHING_VENDOR_NAME,
    status: "active",
    coverage: {
      states: ["OH"],
      counties: [{ state_code: "OH", county_name: "Lucas" }],
      propertyTypes: ["commercial"],
      assignmentTypes: ["appraisal"],
    },
  });

  const nonMatchingVendor = await seedVendorProfile({
    slug: "amc-vendor-coverage-smoke-non-matching",
    name: NON_MATCHING_VENDOR_NAME,
    status: "active",
    coverage: {
      states: ["OH"],
      counties: [{ state_code: "OH", county_name: "Cuyahoga" }],
      propertyTypes: ["commercial"],
      assignmentTypes: ["appraisal"],
    },
  });

  const inactiveVendor = await seedVendorProfile({
    slug: "amc-vendor-coverage-smoke-inactive",
    name: INACTIVE_VENDOR_NAME,
    status: "inactive",
    coverage: {
      states: ["OH"],
      counties: [{ state_code: "OH", county_name: "Lucas" }],
      propertyTypes: ["commercial"],
      assignmentTypes: ["appraisal"],
    },
  });

  const suspendedVendor = await seedVendorProfile({
    slug: "amc-vendor-coverage-smoke-suspended",
    name: SUSPENDED_VENDOR_NAME,
    status: "suspended",
    coverage: {
      states: ["OH"],
      counties: [{ state_code: "OH", county_name: "Lucas" }],
      propertyTypes: ["commercial"],
      assignmentTypes: ["appraisal"],
    },
  });

  fixtureState = {
    ...fixtureState,
    order,
    matchingVendor,
    nonMatchingVendor,
    inactiveVendor,
    suspendedVendor,
  };
}

async function runMatchingRpc() {
  const { client } = await signIn(OWNER_EMAIL, PASSWORD);
  ownerClient = client;

  return assertOk(
    await ownerClient.rpc("rpc_get_matching_vendors_for_order", {
      p_order_id: fixtureState.order.id,
    }),
    "rpc_get_matching_vendors_for_order",
  );
}

test.beforeAll(async () => {
  assertAmcStagingSmokeTarget({
    ownerEmail: OWNER_EMAIL,
    smokeLabel: "AMC vendor coverage targeted smoke",
  });
  prepareFixtureIfRequested();
  await seedCoverageFixture();
});

test("matches only active vendors with exact normalized coverage", async () => {
  const matches = await runMatchingRpc();
  const names = matches.map((row) => row.company_name);
  const matchingRow = matches.find((row) => row.company_name === MATCHING_VENDOR_NAME);

  expect(names).toContain(MATCHING_VENDOR_NAME);
  expect(names).not.toContain(NON_MATCHING_VENDOR_NAME);
  expect(names).not.toContain(INACTIVE_VENDOR_NAME);
  expect(names).not.toContain(SUSPENDED_VENDOR_NAME);
  expect(matchingRow).toMatchObject({
    vendor_profile_id: fixtureState.matchingVendor.profile.id,
    company_id: fixtureState.matchingVendor.company.id,
    company_name: MATCHING_VENDOR_NAME,
    matched_state: "OH",
    matched_county: "Lucas",
    matched_property_type: "commercial",
    matched_assignment_type: "appraisal",
  });
});

test("shows eligible vendors on Order Detail without bid automation controls", async ({ page }) => {
  await login(page, OWNER_EMAIL, PASSWORD);
  await openAmcOrderDetail(page, ORDER_NUMBER);

  const eligibleVendors = page.getByLabel("Eligible vendors");
  await expect(eligibleVendors).toBeVisible({ timeout: 15000 });
  await expect(eligibleVendors.getByText(MATCHING_VENDOR_NAME)).toBeVisible({ timeout: 15000 });
  await expect(eligibleVendors.getByText(NON_MATCHING_VENDOR_NAME)).toHaveCount(0);
  await expect(eligibleVendors.getByText(INACTIVE_VENDOR_NAME)).toHaveCount(0);
  await expect(eligibleVendors.getByText(SUSPENDED_VENDOR_NAME)).toHaveCount(0);
  await expect(eligibleVendors.getByText("OH")).toBeVisible();
  await expect(eligibleVendors.getByText("Lucas")).toBeVisible();
  await expect(eligibleVendors.getByText("Commercial")).toBeVisible();
  await expect(eligibleVendors.getByText("Appraisal")).toBeVisible();
  await expect(eligibleVendors.getByText(/not a recommendation, score, ranking, or bid request/i)).toBeVisible();
  await expect(eligibleVendors.getByRole("button", { name: /request bids|bulk|bid/i })).toHaveCount(0);
  await expect(eligibleVendors.getByRole("link", { name: /request bids|bulk|bid/i })).toHaveCount(0);
});
