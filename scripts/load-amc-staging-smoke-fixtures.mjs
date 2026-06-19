import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

import {
  AMC_STAGING_REF as STAGING_REF,
  invalidStagingEnv,
  loadStagingEnvFile,
  productionRefs,
  projectRefFromUrl,
} from "./lib/amc-staging-env.mjs";
import { amcSmokeArtifactDir } from "./lib/amc-smoke-artifacts.mjs";

loadStagingEnvFile();
const stagingRef = process.env.AMC_STAGING_PROJECT_REF || "";
const supabaseUrl = process.env.AMC_STAGING_SUPABASE_URL || "";
const serviceRoleKey = process.env.AMC_STAGING_SUPABASE_SERVICE_ROLE_KEY || "";
const anonKey = process.env.AMC_STAGING_SUPABASE_ANON_KEY || "";
const artifactDir = amcSmokeArtifactDir();

const PASSWORD = process.env.AMC_STAGING_SMOKE_PASSWORD || "FalconSmoke123!";
const OWNER_EMAIL = process.env.AMC_STAGING_SMOKE_OWNER_EMAIL || "amc.smoke.owner+staging@example.test";
const VENDOR_EMAIL = process.env.AMC_STAGING_SMOKE_VENDOR_EMAIL || "amc.smoke.vendor+staging@example.test";
const WRONG_VENDOR_EMAIL =
  process.env.AMC_STAGING_SMOKE_WRONG_VENDOR_EMAIL || "amc.smoke.wrongvendor+staging@example.test";
const ORDER_NUMBER = "AMC-STAGING-SMOKE-001";
const SMOKE_LABEL = "AMC SMOKE - DO NOT USE";

function usage() {
  console.error(`AMC staging fixture loader requires explicit staging-only environment variables:

  AMC_STAGING_PROJECT_REF=${STAGING_REF}
  AMC_STAGING_SUPABASE_URL=https://${STAGING_REF}.supabase.co
  AMC_STAGING_SUPABASE_SERVICE_ROLE_KEY=<staging-service-role-or-secret-key>
  AMC_STAGING_SUPABASE_ANON_KEY=<staging-anon-or-publishable-key>

Optional:
  AMC_PRODUCTION_PROJECT_REFS=comma,separated,refs,to,refuse
  AMC_SMOKE_ARTIFACT_DIR=<optional; defaults to RUNNER_TEMP/TMPDIR/os.tmpdir()>/project-falcon-amc-smoke
  AMC_STAGING_SMOKE_OWNER_EMAIL=amc.smoke.owner+staging@example.test
  AMC_STAGING_SMOKE_VENDOR_EMAIL=amc.smoke.vendor+staging@example.test
  AMC_STAGING_SMOKE_WRONG_VENDOR_EMAIL=amc.smoke.wrongvendor+staging@example.test
  AMC_STAGING_SMOKE_PASSWORD=FalconSmoke123!
  `);
}

function assertDisposableEmail(name, email) {
  if (!/@(example\.test|example\.com|test\.local)$/i.test(email)) {
    console.error(`Refusing fixture load: ${name} must use a disposable test email domain.`);
    process.exit(2);
  }
}

function assertStagingTarget() {
  if (invalidStagingEnv().length > 0) {
    usage();
    process.exit(2);
  }

  const actualRef = projectRefFromUrl(supabaseUrl);
  if (stagingRef !== STAGING_REF || actualRef !== STAGING_REF) {
    console.error(`Refusing fixture load: expected staging ref ${STAGING_REF}, got env ref ${stagingRef} and URL ref ${actualRef}.`);
    process.exit(2);
  }

  if (productionRefs().has(actualRef)) {
    console.error(`Refusing fixture load: ${actualRef} is listed as a production project ref.`);
    process.exit(2);
  }

  assertDisposableEmail("AMC_STAGING_SMOKE_OWNER_EMAIL", OWNER_EMAIL);
  assertDisposableEmail("AMC_STAGING_SMOKE_VENDOR_EMAIL", VENDOR_EMAIL);
  assertDisposableEmail("AMC_STAGING_SMOKE_WRONG_VENDOR_EMAIL", WRONG_VENDOR_EMAIL);
}

function assertOk(response, label) {
  if (response.error) {
    const detail = response.error.message || JSON.stringify(response.error);
    throw new Error(`${label}: ${detail}`);
  }
  return response.data;
}

function writeDisposablePdf(fileName, title) {
  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << >> >>
endobj
4 0 obj
<< /Length 72 >>
stream
BT /F1 12 Tf 72 720 Td (${title}) Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000221 00000 n 
trailer
<< /Root 1 0 R /Size 5 >>
startxref
343
%%EOF
`;

  writeFileSync(resolve(artifactDir, fileName), pdf);
  return pdf;
}

async function findAuthUserByEmail(admin, email) {
  const perPage = 1000;
  for (let page = 1; page < 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`list auth users: ${error.message}`);
    const user = data?.users?.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (!data?.users || data.users.length < perPage) return null;
  }
  throw new Error("Auth user search exceeded safety page limit.");
}

async function ensureAuthUser(admin, { email, fullName, companyId }) {
  const appMetadata = {
    provider: "email",
    providers: ["email"],
    active_company_id: companyId,
    current_company_id: companyId,
    amc_smoke_fixture: true,
    staging_smoke: true,
  };
  const userMetadata = { full_name: fullName, amc_smoke_fixture: true, staging_smoke: true };
  const existing = await findAuthUserByEmail(admin, email);

  if (existing) {
    const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
      password: PASSWORD,
      email_confirm: true,
      app_metadata: { ...(existing.app_metadata || {}), ...appMetadata },
      user_metadata: { ...(existing.user_metadata || {}), ...userMetadata },
    });
    if (error) throw new Error(`update auth user ${email}: ${error.message}`);
    return data.user;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    app_metadata: appMetadata,
    user_metadata: userMetadata,
  });
  if (error) throw new Error(`create auth user ${email}: ${error.message}`);
  return data.user;
}

async function upsertSingle(client, table, row, onConflict, label) {
  const data = assertOk(
    await client.from(table).upsert(row, { onConflict }).select("*").single(),
    label,
  );
  return data;
}

async function updateOrInsertRelationship(client, row) {
  const existing = assertOk(
    await client
      .from("company_relationships")
      .select("*")
      .eq("source_company_id", row.source_company_id)
      .eq("target_company_id", row.target_company_id)
      .eq("relationship_type", row.relationship_type)
      .in("status", ["invited", "active", "suspended"])
      .maybeSingle(),
    "lookup relationship",
  );

  if (existing) {
    return assertOk(
      await client.from("company_relationships").update(row).eq("id", existing.id).select("*").single(),
      "update relationship",
    );
  }

  return assertOk(
    await client.from("company_relationships").insert(row).select("*").single(),
    "insert relationship",
  );
}

async function replaceRows(client, table, filters, rows, label) {
  let deleteQuery = client.from(table).delete();
  Object.entries(filters).forEach(([key, value]) => {
    deleteQuery = deleteQuery.eq(key, value);
  });
  assertOk(await deleteQuery, `${label} delete`);
  if (rows.length === 0) return [];
  return assertOk(await client.from(table).insert(rows).select("*"), `${label} insert`);
}

async function signInAs(email) {
  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`sign in ${email}: ${error.message}`);
  return { client, token: data.session?.access_token };
}

async function rpcAs(client, name, args = {}) {
  const { data, error } = await client.rpc(name, args);
  if (error) throw new Error(`${name}: ${error.message}`);
  return data;
}

function firstRow(payload) {
  return Array.isArray(payload) ? payload[0] : payload;
}

async function main() {
  assertStagingTarget();
  mkdirSync(artifactDir, { recursive: true });
  writeDisposablePdf("amc-staging-smoke-report.pdf", `${SMOKE_LABEL} disposable report PDF`);
  writeDisposablePdf("amc-staging-smoke-invoice.pdf", `${SMOKE_LABEL} disposable invoice PDF`);
  const sourceDocumentPdf = writeDisposablePdf(
    "amc-staging-smoke-engagement.pdf",
    `${SMOKE_LABEL} disposable engagement letter PDF`,
  );

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const ownerCompany = assertOk(
    await admin.from("companies").select("*").eq("slug", "falcon_default").single(),
    "lookup owner company",
  );

  const vendorCompany = await upsertSingle(
    admin,
    "companies",
    {
      slug: "amc-staging-smoke-disposable-vendor",
      name: `${SMOKE_LABEL} Vendor`,
      status: "active",
      timezone: "America/New_York",
      locale: "en-US",
      settings: { demo_seed: "amc_13e", disposable: true, staging_smoke: true },
      company_type: "vendor",
      operating_mode_settings: {},
    },
    "slug",
    "upsert vendor company",
  );

  const wrongVendorCompany = await upsertSingle(
    admin,
    "companies",
    {
      slug: "amc-staging-smoke-wrong-vendor",
      name: `${SMOKE_LABEL} Wrong Vendor`,
      status: "active",
      timezone: "America/New_York",
      locale: "en-US",
      settings: { demo_seed: "amc_13e", disposable: true, staging_smoke: true, fixture_role: "wrong_vendor_denial" },
      company_type: "vendor",
      operating_mode_settings: {},
    },
    "slug",
    "upsert wrong vendor company",
  );

  const roles = assertOk(
    await admin.from("roles").select("*").is("company_id", null).in("name", ["Owner", "Admin", "Vendor Admin"]).eq("is_template", true),
    "lookup role templates",
  );
  const roleByName = new Map(roles.map((role) => [role.name.toLowerCase(), role]));
  const ownerRole = roleByName.get("owner");
  const adminRole = roleByName.get("admin");
  const vendorRole = roleByName.get("vendor admin");
  if (!ownerRole || !adminRole || !vendorRole) {
    throw new Error("Owner, Admin, and Vendor Admin role templates are required.");
  }

  const ownerAuth = await ensureAuthUser(admin, {
    email: OWNER_EMAIL,
    fullName: "AMC Staging Smoke Owner",
    companyId: ownerCompany.id,
  });
  const vendorAuth = await ensureAuthUser(admin, {
    email: VENDOR_EMAIL,
    fullName: "AMC Staging Smoke Vendor",
    companyId: vendorCompany.id,
  });
  const wrongVendorAuth = await ensureAuthUser(admin, {
    email: WRONG_VENDOR_EMAIL,
    fullName: "AMC Staging Smoke Wrong Vendor",
    companyId: wrongVendorCompany.id,
  });

  const ownerUser = await upsertSingle(
    admin,
    "users",
    {
      name: `${SMOKE_LABEL} Owner`,
      email: OWNER_EMAIL,
      role: "owner",
      display_name: `${SMOKE_LABEL} Owner`,
      full_name: `${SMOKE_LABEL} Owner`,
      status: "active",
      auth_id: ownerAuth.id,
      uid: ownerAuth.id,
      is_admin: true,
      is_active: true,
    },
    "email",
    "upsert owner app user",
  );
  const vendorUser = await upsertSingle(
    admin,
    "users",
    {
      name: `${SMOKE_LABEL} Vendor`,
      email: VENDOR_EMAIL,
      role: "manager",
      display_name: `${SMOKE_LABEL} Vendor`,
      full_name: `${SMOKE_LABEL} Vendor`,
      status: "active",
      auth_id: vendorAuth.id,
      uid: vendorAuth.id,
      is_admin: false,
      is_active: true,
    },
    "email",
    "upsert vendor app user",
  );
  const wrongVendorUser = await upsertSingle(
    admin,
    "users",
    {
      name: `${SMOKE_LABEL} Wrong Vendor`,
      email: WRONG_VENDOR_EMAIL,
      role: "manager",
      display_name: `${SMOKE_LABEL} Wrong Vendor`,
      full_name: `${SMOKE_LABEL} Wrong Vendor`,
      status: "active",
      auth_id: wrongVendorAuth.id,
      uid: wrongVendorAuth.id,
      is_admin: false,
      is_active: true,
    },
    "email",
    "upsert wrong vendor app user",
  );

  await Promise.all([
    upsertSingle(admin, "company_memberships", { company_id: ownerCompany.id, user_id: ownerUser.id, status: "active", membership_type: "amc_staging_smoke_owner", is_primary: true }, "company_id,user_id", "owner membership"),
    upsertSingle(admin, "company_memberships", { company_id: ownerCompany.id, user_id: vendorUser.id, status: "active", membership_type: "amc_staging_smoke_vendor_shell_compat", is_primary: true }, "company_id,user_id", "vendor owner-company membership"),
    upsertSingle(admin, "company_memberships", { company_id: vendorCompany.id, user_id: vendorUser.id, status: "active", membership_type: "amc_staging_smoke_vendor", is_primary: true }, "company_id,user_id", "vendor membership"),
    upsertSingle(admin, "company_memberships", { company_id: wrongVendorCompany.id, user_id: wrongVendorUser.id, status: "active", membership_type: "amc_staging_smoke_wrong_vendor", is_primary: true }, "company_id,user_id", "wrong vendor membership"),
  ]);

  await Promise.all([
    upsertSingle(admin, "user_role_assignments", { company_id: ownerCompany.id, user_id: ownerUser.id, role_id: ownerRole.id, status: "active", is_primary: true, assigned_by: ownerUser.id }, "company_id,user_id,role_id", "owner role"),
    upsertSingle(admin, "user_role_assignments", { company_id: ownerCompany.id, user_id: ownerUser.id, role_id: adminRole.id, status: "active", is_primary: false, assigned_by: ownerUser.id }, "company_id,user_id,role_id", "admin role"),
    upsertSingle(admin, "user_role_assignments", { company_id: ownerCompany.id, user_id: vendorUser.id, role_id: vendorRole.id, status: "active", is_primary: true, assigned_by: ownerUser.id }, "company_id,user_id,role_id", "vendor owner-company role"),
    upsertSingle(admin, "user_role_assignments", { company_id: vendorCompany.id, user_id: vendorUser.id, role_id: vendorRole.id, status: "active", is_primary: true, assigned_by: ownerUser.id }, "company_id,user_id,role_id", "vendor role"),
    upsertSingle(admin, "user_role_assignments", { company_id: wrongVendorCompany.id, user_id: wrongVendorUser.id, role_id: vendorRole.id, status: "active", is_primary: true, assigned_by: ownerUser.id }, "company_id,user_id,role_id", "wrong vendor role"),
  ]);

  const relationship = await updateOrInsertRelationship(admin, {
    source_company_id: ownerCompany.id,
    target_company_id: vendorCompany.id,
    relationship_type: "amc_vendor",
    status: "active",
    invited_by_user_id: ownerUser.id,
    approved_by_user_id: ownerUser.id,
    invited_at: new Date().toISOString(),
    approved_at: new Date().toISOString(),
    starts_at: new Date().toISOString(),
    settings: { demo_seed: "amc_13e", disposable: true, staging_smoke: true },
    compliance: { summary: "Disposable AMC staging smoke compliance summary", demo_seed: "amc_13e" },
      notes: `${SMOKE_LABEL}. AMC-13E disposable staging smoke vendor relationship.`,
  });
  const wrongRelationship = await updateOrInsertRelationship(admin, {
    source_company_id: ownerCompany.id,
    target_company_id: wrongVendorCompany.id,
    relationship_type: "amc_vendor",
    status: "active",
    invited_by_user_id: ownerUser.id,
    approved_by_user_id: ownerUser.id,
    invited_at: new Date().toISOString(),
    approved_at: new Date().toISOString(),
    starts_at: new Date().toISOString(),
    settings: { demo_seed: "amc_13e", disposable: true, staging_smoke: true, fixture_role: "wrong_vendor_denial" },
    compliance: { summary: "Wrong-vendor staging edge smoke relationship", demo_seed: "amc_13e" },
    notes: `${SMOKE_LABEL}. AMC-13E disposable wrong-vendor denial relationship.`,
  });

  const vendorProfile = await upsertSingle(
    admin,
    "company_vendor_profiles",
    {
      owner_company_id: ownerCompany.id,
      vendor_company_id: vendorCompany.id,
      relationship_id: relationship.id,
      vendor_status: "active",
      public_phone: "555-1137",
      default_assignment_instructions: "Disposable AMC staging smoke fixture.",
      capabilities: { commercial: true, residential: true, default_turn_time_days: 5 },
      product_eligibility: { commercial_appraisal: true, residential_appraisal: true, appraisal: true },
      internal_notes: `${SMOKE_LABEL}. Disposable AMC-13E staging smoke fixture.`,
      tags: ["amc-smoke", "staging-smoke", "disposable"],
    },
    "owner_company_id,vendor_company_id",
    "upsert vendor profile",
  );
  const wrongVendorProfile = await upsertSingle(
    admin,
    "company_vendor_profiles",
    {
      owner_company_id: ownerCompany.id,
      vendor_company_id: wrongVendorCompany.id,
      relationship_id: wrongRelationship.id,
      vendor_status: "active",
      public_phone: "555-1171",
      default_assignment_instructions: "Disposable AMC staging wrong-vendor fixture.",
      capabilities: { commercial: true, residential: true, default_turn_time_days: 6 },
      product_eligibility: { commercial_appraisal: true, residential_appraisal: true, appraisal: true },
      internal_notes: `${SMOKE_LABEL}. Disposable AMC-13E wrong-vendor edge fixture.`,
      tags: ["amc-smoke", "staging-smoke", "wrong-vendor"],
    },
    "owner_company_id,vendor_company_id",
    "upsert wrong vendor profile",
  );

  await replaceRows(
    admin,
    "vendor_contacts",
    { vendor_profile_id: vendorProfile.id },
    [{
      vendor_profile_id: vendorProfile.id,
      user_id: vendorUser.id,
      name: `${SMOKE_LABEL} Vendor`,
      email: VENDOR_EMAIL,
      phone: "555-1138",
      role_label: "Smoke Test Vendor Contact",
      is_primary: true,
      receives_assignment_notifications: true,
      notes: `${SMOKE_LABEL}. Disposable AMC-13E vendor contact.`,
    }],
    "vendor contacts",
  );

  await replaceRows(
    admin,
    "vendor_service_areas",
    { vendor_profile_id: vendorProfile.id },
    ["commercial", "commercial_appraisal", "residential", "residential_appraisal", "appraisal"].map((productType) => ({
      vendor_profile_id: vendorProfile.id,
      state: "OH",
      county: "Franklin",
      product_type: productType,
      status: "active",
    })),
    "vendor service areas",
  );

  await replaceRows(
    admin,
    "vendor_service_areas",
    { vendor_profile_id: wrongVendorProfile.id },
    ["commercial", "commercial_appraisal", "residential", "residential_appraisal", "appraisal"].map((productType) => ({
      vendor_profile_id: wrongVendorProfile.id,
      state: "OH",
      county: "Franklin",
      product_type: productType,
      status: "active",
    })),
    "wrong vendor service areas",
  );

  const order = await upsertSingle(
    admin,
    "orders",
    {
      company_id: ownerCompany.id,
      owner_id: ownerUser.id,
      order_number: ORDER_NUMBER,
      external_order_no: ORDER_NUMBER,
      title: `${SMOKE_LABEL} Disposable Full MVP Order`,
      status: "new",
      manual_client: `${SMOKE_LABEL} Demo Lender`,
      manual_client_name: `${SMOKE_LABEL} Demo Lender`,
      property_address: `${SMOKE_LABEL} - 1313 Staging Smoke Test Lane`,
      address: `${SMOKE_LABEL} - 1313 Staging Smoke Test Lane`,
      city: "Columbus",
      state: "OH",
      county: "Franklin",
      postal_code: "43215",
      zip: "43215",
      property_type: "Commercial",
      report_type: "Appraisal",
      date_ordered: new Date().toISOString().slice(0, 10),
      due_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      client_due_at: new Date(Date.now() + 14 * 86400000).toISOString(),
      final_due_at: new Date(Date.now() + 14 * 86400000).toISOString(),
      review_due_at: new Date(Date.now() + 12 * 86400000).toISOString(),
      special_instructions: `${SMOKE_LABEL}. Disposable AMC-13E staging smoke order. Do not use outside staging testing.`,
      notes: `${SMOKE_LABEL}. AMC-13E disposable staging smoke fixture.`,
      operations_scope: "amc_operations",
      fee_amount: 1200,
      appraiser_fee: 650,
    },
    "order_number",
    "upsert smoke order",
  );

  const existingRequests = assertOk(
    await admin.from("order_vendor_bid_requests").select("id").eq("order_id", order.id),
    "lookup existing bid requests",
  );
  const requestIds = existingRequests.map((request) => request.id);
  if (requestIds.length > 0) {
    const recipients = assertOk(
      await admin.from("order_vendor_bid_request_recipients").select("id").in("bid_request_id", requestIds),
      "lookup existing recipients",
    );
    const recipientIds = recipients.map((recipient) => recipient.id);
    if (recipientIds.length > 0) {
      assertOk(await admin.from("order_vendor_bid_responses").delete().in("recipient_id", recipientIds), "delete existing bid responses");
      assertOk(await admin.from("order_vendor_bid_request_recipients").delete().in("id", recipientIds), "delete existing recipients");
    }
    assertOk(await admin.from("order_vendor_bid_requests").delete().in("id", requestIds), "delete existing bid requests");
  }

  const bidRequest = assertOk(
    await admin
      .from("order_vendor_bid_requests")
      .insert({
        company_id: ownerCompany.id,
        order_id: order.id,
        requested_by_user_id: ownerUser.id,
        request_message: `${SMOKE_LABEL}. Disposable AMC staging smoke bid request. Please submit fee, turn time, and availability.`,
        response_due_at: new Date(Date.now() + 3 * 86400000).toISOString(),
        client_due_at: new Date(Date.now() + 14 * 86400000).toISOString(),
        desired_vendor_due_at: new Date(Date.now() + 10 * 86400000).toISOString(),
        review_due_at: new Date(Date.now() + 12 * 86400000).toISOString(),
        status: "sent",
        metadata: { demo_seed: "amc_13e", disposable: true, staging_smoke: true },
      })
      .select("*")
      .single(),
    "insert bid request",
  );

  assertOk(
    await admin
      .from("order_vendor_bid_request_recipients")
      .insert({
        bid_request_id: bidRequest.id,
        vendor_profile_id: vendorProfile.id,
        vendor_company_id: vendorCompany.id,
        relationship_id: relationship.id,
        status: "sent",
        sent_at: new Date().toISOString(),
        metadata: { demo_seed: "amc_13e", disposable: true, staging_smoke: true },
      })
      .select("*")
      .single(),
    "insert bid recipient",
  );

  const storagePath = "amc-staging-smoke-fixtures/AMC-STAGING-SMOKE-001/source/amc-staging-smoke-engagement.pdf";
  const uploadResult = await admin.storage
    .from("order-documents")
    .upload(storagePath, Buffer.from(sourceDocumentPdf), {
      contentType: "application/pdf",
      upsert: true,
    });
  if (uploadResult.error) {
    throw new Error(`upload source document object: ${uploadResult.error.message}`);
  }

  const existingDocument = assertOk(
    await admin.from("order_documents").select("*").eq("storage_bucket", "order-documents").eq("storage_path", storagePath).maybeSingle(),
    "lookup source document",
  );
  const documentPayload = {
    company_id: ownerCompany.id,
    order_id: order.id,
    uploaded_by_user_id: ownerUser.id,
    category: "source_documents",
    title: `${SMOKE_LABEL} Engagement Letter`,
    file_name: "amc-staging-smoke-engagement.pdf",
    mime_type: "application/pdf",
    file_size: 512,
    storage_bucket: "order-documents",
    storage_path: storagePath,
    visibility_scope: "vendor",
    status: "active",
  };
  if (existingDocument) {
    assertOk(await admin.from("order_documents").update(documentPayload).eq("id", existingDocument.id), "update source document");
  } else {
    assertOk(await admin.from("order_documents").insert(documentPayload), "insert source document");
  }

  const ownerSession = await signInAs(OWNER_EMAIL);
  const vendorSession = await signInAs(VENDOR_EMAIL);
  const wrongVendorSession = await signInAs(WRONG_VENDOR_EMAIL);

  const ownerContext = firstRow(await rpcAs(ownerSession.client, "rpc_current_user_app_context"));
  const vendorContext = firstRow(await rpcAs(vendorSession.client, "rpc_current_user_app_context"));
  const wrongVendorContext = firstRow(await rpcAs(wrongVendorSession.client, "rpc_current_user_app_context"));
  const vendorAvailable = await rpcAs(vendorSession.client, "rpc_vendor_workspace_available_work");
  const wrongVendorAvailable = await rpcAs(wrongVendorSession.client, "rpc_vendor_workspace_available_work");

  const vendorRows = Array.isArray(vendorAvailable?.items) ? vendorAvailable.items : [];
  const wrongVendorRows = Array.isArray(wrongVendorAvailable?.items) ? wrongVendorAvailable.items : [];
  const smokeRows = vendorRows.filter((item) => item?.order?.order_number === ORDER_NUMBER);
  const wrongSmokeRows = wrongVendorRows.filter((item) => item?.order?.order_number === ORDER_NUMBER);

  if (ownerContext?.current_company_id !== ownerCompany.id) {
    throw new Error("Owner login did not resolve owner company context.");
  }
  if (vendorContext?.current_company_id !== vendorCompany.id) {
    throw new Error("Vendor login did not resolve vendor company context.");
  }
  if (wrongVendorContext?.current_company_id !== wrongVendorCompany.id) {
    throw new Error("Wrong-vendor login did not resolve wrong-vendor company context.");
  }
  if (smokeRows.length !== 1) {
    throw new Error(`Expected one vendor available-work row for ${ORDER_NUMBER}, found ${smokeRows.length}.`);
  }
  if (wrongSmokeRows.length !== 0) {
    throw new Error(`Expected zero wrong-vendor available-work rows for ${ORDER_NUMBER}, found ${wrongSmokeRows.length}.`);
  }

  console.log(JSON.stringify({
    project_ref: stagingRef,
    owner_login: OWNER_EMAIL,
    vendor_login: VENDOR_EMAIL,
    wrong_vendor_login: WRONG_VENDOR_EMAIL,
    temporary_password: PASSWORD,
    owner_company_slug: ownerCompany.slug,
    vendor_company_slug: vendorCompany.slug,
    wrong_vendor_company_slug: wrongVendorCompany.slug,
    order_number: ORDER_NUMBER,
    vendor_available_work_rows: smokeRows.length,
    wrong_vendor_available_work_rows: wrongSmokeRows.length,
    report_pdf: resolve(artifactDir, "amc-staging-smoke-report.pdf"),
    invoice_pdf: resolve(artifactDir, "amc-staging-smoke-invoice.pdf"),
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
