import { execFileSync } from "node:child_process";
import { statSync } from "node:fs";

import { amcSmokeArtifactPath } from "./lib/amc-smoke-artifacts.mjs";

// Local-only AMC edge smoke runner.
// Run after:
//   npm run supabase:reset:local
//   npm run amc:smoke:fixtures:load

const SUPABASE_URL = "http://127.0.0.1:54321";
const DB_CONTAINER = "supabase_db_project-falcon";
const PASSWORD = "FalconSmoke123!";
const OWNER_EMAIL = "amc.smoke.owner@example.test";
const VENDOR_EMAIL = "amc.smoke.vendor@example.test";
const WRONG_VENDOR_EMAIL = "amc.smoke.wrongvendor@example.test";
const REPORT_PATH = amcSmokeArtifactPath("amc-smoke-report.pdf");
const INVOICE_PATH = amcSmokeArtifactPath("amc-smoke-invoice.pdf");

const results = [];
const defects = [];
const vendorPayloads = [];

function mark(step, status, notes = "") {
  results.push({ step, status, notes });
  const prefix = status === "PASS" ? "PASS" : status === "WARN" ? "WARN" : "FAIL";
  console.log(`${prefix} ${step}${notes ? ` - ${notes}` : ""}`);
}

function fail(step, error) {
  const message = error?.message || String(error);
  mark(step, "FAIL", message);
  defects.push({ step, message });
  throw error;
}

function localAnonKey() {
  const out = execFileSync("supabase", ["status", "-o", "env"], { encoding: "utf8" });
  const line = out.split(/\r?\n/).find((entry) => entry.startsWith("ANON_KEY="));
  if (!line) throw new Error("Local Supabase anon key not found");
  return line.slice("ANON_KEY=".length).trim();
}

const ANON_KEY = localAnonKey();

async function request(path, { token, body }) {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
      Authorization: `Bearer ${token || ANON_KEY}`,
    },
    body: JSON.stringify(body || {}),
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!response.ok) {
    const message = json?.message || json?.error || text || `HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.body = json;
    throw error;
  }
  return json;
}

async function login(email) {
  const response = await request("/auth/v1/token?grant_type=password", {
    body: { email, password: PASSWORD },
  });
  if (!response?.access_token) throw new Error(`Login failed for ${email}`);
  return response.access_token;
}

async function rpc(token, name, params = {}, captureVendorPayload = false) {
  const data = await request(`/rest/v1/rpc/${name}`, { token, body: params });
  if (captureVendorPayload) {
    vendorPayloads.push({ name, data });
  }
  return data;
}

function psql(sql) {
  return execFileSync(
    "docker",
    [
      "exec",
      "-i",
      DB_CONTAINER,
      "env",
      "PGPASSWORD=postgres",
      "psql",
      "-h",
      "127.0.0.1",
      "-U",
      "supabase_admin",
      "-d",
      "postgres",
      "-At",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      sql,
    ],
    { encoding: "utf8" },
  ).trim();
}

function psqlJson(sql) {
  const out = psql(sql);
  if (!out) return null;
  return JSON.parse(out.split(/\r?\n/).at(-1));
}

function insertStorageObject(bucket, path, filePath) {
  const size = statSync(filePath).size;
  const escapedPath = path.replaceAll("'", "''");
  const escapedBucket = bucket.replaceAll("'", "''");
  psql(`
    insert into storage.objects (bucket_id, name, metadata, version)
    values (
      '${escapedBucket}',
      '${escapedPath}',
      jsonb_build_object('size', ${size}, 'mimetype', 'application/pdf', 'amc_edge_smoke_fixture', true),
      gen_random_uuid()::text
    )
    on conflict (bucket_id, name) do update
      set metadata = excluded.metadata,
          version = excluded.version,
          updated_at = now();
  `);
}

function setupWrongVendor() {
  return psqlJson(`
    do $$
    declare
      v_owner_company_id uuid;
      v_owner_user_id uuid;
      v_wrong_company_id uuid;
      v_wrong_auth_id uuid;
      v_wrong_user_id uuid;
      v_vendor_role_id uuid;
      v_relationship_id uuid;
    begin
      select id into v_owner_company_id from public.companies where slug = 'falcon_default';
      select id into v_owner_user_id from public.users where email = '${OWNER_EMAIL}';
      select id into v_vendor_role_id
        from public.roles
       where company_id is null
         and lower(name) = 'vendor admin'
         and is_template
       limit 1;

      insert into public.companies (
        slug, name, status, timezone, locale, settings, company_type, operating_mode_settings
      ) values (
        'amc-smoke-wrong-vendor',
        'AMC Smoke Wrong Vendor',
        'active',
        'America/New_York',
        'en-US',
        '{"demo_seed":"amc_13b_8","disposable":true,"fixture_role":"wrong_vendor_denial"}'::jsonb,
        'vendor',
        '{}'::jsonb
      )
      on conflict (slug) do update
        set name = excluded.name,
            status = excluded.status,
            settings = public.companies.settings || excluded.settings,
            company_type = excluded.company_type,
            updated_at = now()
      returning id into v_wrong_company_id;

      select id into v_wrong_auth_id
        from auth.users
       where lower(email) = '${WRONG_VENDOR_EMAIL}'
         and deleted_at is null
       limit 1;

      if v_wrong_auth_id is null then
        v_wrong_auth_id := gen_random_uuid();
        insert into auth.users (
          instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
          confirmation_token, recovery_token, email_change, email_change_token_new,
          email_change_token_current, raw_app_meta_data, raw_user_meta_data,
          created_at, updated_at, is_sso_user, is_anonymous
        ) values (
          '00000000-0000-0000-0000-000000000000',
          v_wrong_auth_id,
          'authenticated',
          'authenticated',
          '${WRONG_VENDOR_EMAIL}',
          crypt('${PASSWORD}', gen_salt('bf')),
          now(),
          '', '', '', '', '',
          jsonb_build_object(
            'provider', 'email',
            'providers', jsonb_build_array('email'),
            'active_company_id', v_wrong_company_id,
            'current_company_id', v_wrong_company_id,
            'amc_smoke_fixture', true
          ),
          '{"full_name":"AMC Smoke Wrong Vendor","amc_smoke_fixture":true}'::jsonb,
          now(),
          now(),
          false,
          false
        );
      else
        update auth.users
           set encrypted_password = crypt('${PASSWORD}', gen_salt('bf')),
               email_confirmed_at = coalesce(email_confirmed_at, now()),
               raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
                 'provider', 'email',
                 'providers', jsonb_build_array('email'),
                 'active_company_id', v_wrong_company_id,
                 'current_company_id', v_wrong_company_id,
                 'amc_smoke_fixture', true
               ),
               raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"full_name":"AMC Smoke Wrong Vendor","amc_smoke_fixture":true}'::jsonb,
               updated_at = now()
         where id = v_wrong_auth_id;
      end if;

      insert into auth.identities (
        provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
      ) values (
        v_wrong_auth_id::text,
        v_wrong_auth_id,
        jsonb_build_object('sub', v_wrong_auth_id::text, 'email', '${WRONG_VENDOR_EMAIL}', 'email_verified', true),
        'email',
        now(),
        now(),
        now()
      )
      on conflict (provider_id, provider) do update
        set identity_data = excluded.identity_data,
            updated_at = now();

      insert into public.users (
        name, email, role, display_name, full_name, status, auth_id, uid, is_admin, is_active, created_at, updated_at
      ) values (
        'AMC Smoke Wrong Vendor',
        '${WRONG_VENDOR_EMAIL}',
        'manager',
        'AMC Smoke Wrong Vendor',
        'AMC Smoke Wrong Vendor',
        'active',
        v_wrong_auth_id,
        v_wrong_auth_id,
        false,
        true,
        now(),
        now()
      )
      on conflict (email) do update
        set name = excluded.name,
            role = excluded.role,
            display_name = excluded.display_name,
            full_name = excluded.full_name,
            status = excluded.status,
            auth_id = excluded.auth_id,
            uid = excluded.uid,
            is_admin = excluded.is_admin,
            is_active = excluded.is_active,
            updated_at = now()
      returning id into v_wrong_user_id;

      insert into public.company_memberships (company_id, user_id, status, membership_type, is_primary, joined_at)
      values (v_wrong_company_id, v_wrong_user_id, 'active', 'amc_smoke_wrong_vendor', true, now())
      on conflict (company_id, user_id) do update
        set status = excluded.status,
            membership_type = excluded.membership_type,
            is_primary = excluded.is_primary,
            updated_at = now();

      insert into public.user_role_assignments (company_id, user_id, role_id, status, is_primary, assigned_by, assigned_at)
      values (v_wrong_company_id, v_wrong_user_id, v_vendor_role_id, 'active', true, v_owner_user_id, now())
      on conflict (company_id, user_id, role_id) do update
        set status = excluded.status,
            is_primary = excluded.is_primary,
            assigned_by = excluded.assigned_by,
            expires_at = null,
            updated_at = now();

      insert into public.company_relationships (
        source_company_id, target_company_id, relationship_type, status, invited_by_user_id,
        approved_by_user_id, invited_at, approved_at, starts_at, settings, compliance, notes
      ) values (
        v_owner_company_id,
        v_wrong_company_id,
        'amc_vendor',
        'active',
        v_owner_user_id,
        v_owner_user_id,
        now(),
        now(),
        now(),
        '{"demo_seed":"amc_13b_8","disposable":true,"fixture_role":"wrong_vendor_denial"}'::jsonb,
        '{"summary":"Wrong-vendor edge smoke relationship"}'::jsonb,
        'AMC-13B.8 wrong-vendor edge fixture.'
      )
      on conflict (source_company_id, target_company_id, relationship_type)
        where status = any (array['invited', 'active', 'suspended'])
      do update
        set status = excluded.status,
            approved_by_user_id = excluded.approved_by_user_id,
            approved_at = excluded.approved_at,
            starts_at = excluded.starts_at,
            settings = public.company_relationships.settings || excluded.settings,
            compliance = public.company_relationships.compliance || excluded.compliance,
            notes = excluded.notes,
            updated_at = now()
      returning id into v_relationship_id;

      insert into public.company_vendor_profiles (
        owner_company_id, vendor_company_id, relationship_id, vendor_status, public_phone,
        default_assignment_instructions, capabilities, product_eligibility, internal_notes, tags
      ) values (
        v_owner_company_id,
        v_wrong_company_id,
        v_relationship_id,
        'active',
        '555-0171',
        'Wrong-vendor AMC-13B.8 edge fixture.',
        '{"commercial":true,"residential":true,"default_turn_time_days":6}'::jsonb,
        '{"commercial_appraisal":true,"residential_appraisal":true,"appraisal":true}'::jsonb,
        'Wrong-vendor edge fixture internal note.',
        array['amc-smoke', 'wrong-vendor']
      )
      on conflict (owner_company_id, vendor_company_id) do update
        set relationship_id = excluded.relationship_id,
            vendor_status = excluded.vendor_status,
            public_phone = excluded.public_phone,
            capabilities = excluded.capabilities,
            product_eligibility = excluded.product_eligibility,
            internal_notes = excluded.internal_notes,
            tags = excluded.tags,
            updated_at = now();
    end;
    $$;

    select jsonb_build_object(
      'wrong_vendor_company_id', (select id from public.companies where slug = 'amc-smoke-wrong-vendor'),
      'wrong_vendor_user_id', (select id from public.users where email = '${WRONG_VENDOR_EMAIL}')
    )::text;
  `);
}

function getFixtureContext() {
  return psqlJson(`
    select jsonb_build_object(
      'order_id', o.id,
      'owner_company_id', o.company_id,
      'primary_vendor_company_id', c.id,
      'primary_vendor_profile_id', cvp.id,
      'primary_relationship_id', cr.id,
      'order_number', o.order_number
    )::text
    from public.orders o
    join public.companies c on c.slug = 'amc-smoke-disposable-vendor'
    join public.company_relationships cr
      on cr.source_company_id = o.company_id
     and cr.target_company_id = c.id
     and cr.relationship_type = 'amc_vendor'
     and cr.status = 'active'
    join public.company_vendor_profiles cvp
      on cvp.owner_company_id = o.company_id
     and cvp.vendor_company_id = c.id
    where o.order_number = 'AMC-SMOKE-001'
    limit 1;
  `);
}

function createFreshBidRecipient() {
  return psqlJson(`
    with ctx as (
      select
        o.id as order_id,
        o.company_id as owner_company_id,
        u.id as owner_user_id,
        c.id as vendor_company_id,
        cvp.id as vendor_profile_id,
        cr.id as relationship_id
      from public.orders o
      join public.users u on u.email = '${OWNER_EMAIL}'
      join public.companies c on c.slug = 'amc-smoke-disposable-vendor'
      join public.company_relationships cr
        on cr.source_company_id = o.company_id
       and cr.target_company_id = c.id
       and cr.relationship_type = 'amc_vendor'
       and cr.status = 'active'
      join public.company_vendor_profiles cvp
        on cvp.owner_company_id = o.company_id
       and cvp.vendor_company_id = c.id
      where o.order_number = 'AMC-SMOKE-001'
      limit 1
    ),
    request_row as (
      insert into public.order_vendor_bid_requests (
        company_id, order_id, requested_by_user_id, request_message, response_due_at,
        client_due_at, desired_vendor_due_at, review_due_at, status, metadata
      )
      select
        owner_company_id,
        order_id,
        owner_user_id,
        'AMC-13B.8 corrected invoice edge bid request.',
        now() + interval '3 days',
        now() + interval '14 days',
        now() + interval '10 days',
        now() + interval '12 days',
        'sent',
        '{"demo_seed":"amc_13b_8_invoice","disposable":true}'::jsonb
      from ctx
      returning id
    ),
    recipient_row as (
      insert into public.order_vendor_bid_request_recipients (
        bid_request_id, vendor_profile_id, vendor_company_id, relationship_id, status, sent_at, metadata
      )
      select
        request_row.id,
        ctx.vendor_profile_id,
        ctx.vendor_company_id,
        ctx.relationship_id,
        'sent',
        now(),
        '{"demo_seed":"amc_13b_8_invoice","disposable":true}'::jsonb
      from request_row
      cross join ctx
      returning id, vendor_company_id
    )
    select jsonb_build_object(
      'recipient_id', recipient_row.id,
      'work_key', encode(extensions.digest(concat_ws(':', 'vendor_available_work_v1', recipient_row.id::text, recipient_row.vendor_company_id::text), 'sha256'), 'hex')
    )::text
    from recipient_row;
  `);
}

function responseIdForWorkKey(workKey) {
  return psqlJson(`
    select jsonb_build_object(
      'response_id', obr.id,
      'recipient_id', brr.id,
      'recipient_status', brr.status
    )::text
    from public.order_vendor_bid_request_recipients brr
    join public.order_vendor_bid_responses obr on obr.recipient_id = brr.id
    where encode(extensions.digest(concat_ws(':', 'vendor_available_work_v1', brr.id::text, brr.vendor_company_id::text), 'sha256'), 'hex') = '${workKey}'
    order by obr.created_at desc
    limit 1;
  `);
}

function assignmentContext() {
  return psqlJson(`
    select jsonb_build_object(
      'assignment_id', oca.id,
      'assignment_work_key', encode(extensions.digest(concat_ws(':', 'vendor_assignment_work_v1', oca.id::text, oca.assigned_company_id::text), 'sha256'), 'hex'),
      'status', oca.status,
      'invoice_key', encode(extensions.digest(concat_ws(':', 'amc_vendor_invoice_v1', oca.id::text, oca.owner_company_id::text), 'sha256'), 'hex')
    )::text
    from public.order_company_assignments oca
    join public.orders o on o.id = oca.order_id
    where o.order_number = 'AMC-SMOKE-001'
      and oca.assignment_type = 'vendor_appraisal'
    order by oca.created_at desc
    limit 1;
  `);
}

async function uploadReportDocument(vendorToken, assignmentWorkKey, fileName, filePath, role = "submitted_report") {
  const fileSize = statSync(filePath).size;
  const prepared = await rpc(vendorToken, "rpc_vendor_workspace_prepare_report_document_upload", {
    p_assignment_work_key: assignmentWorkKey,
    p_payload: {
      file_name: fileName,
      mime_type: "application/pdf",
      file_size: fileSize,
      document_role: role,
    },
  });
  if (!prepared?.ok) throw new Error(`Report upload prepare failed: ${JSON.stringify(prepared)}`);
  insertStorageObject(prepared.upload.storage_bucket, prepared.upload.storage_path, filePath);
  const registered = await rpc(vendorToken, "rpc_vendor_workspace_register_report_document", {
    p_assignment_work_key: assignmentWorkKey,
    p_payload: {
      document_key: prepared.document.document_key,
      file_name: fileName,
      mime_type: "application/pdf",
      file_size: fileSize,
      document_role: role,
    },
  }, true);
  if (!registered?.ok) throw new Error(`Report upload register failed: ${JSON.stringify(registered)}`);
  return registered.document.document_key;
}

async function uploadInvoiceDocument(vendorToken, assignmentWorkKey, fileName, filePath) {
  const fileSize = statSync(filePath).size;
  const prepared = await rpc(vendorToken, "rpc_vendor_workspace_prepare_invoice_upload", {
    p_assignment_work_key: assignmentWorkKey,
    p_payload: {
      file_name: fileName,
      mime_type: "application/pdf",
      file_size: fileSize,
      document_role: "vendor_invoice",
    },
  });
  if (!prepared?.ok) throw new Error(`Invoice upload prepare failed: ${JSON.stringify(prepared)}`);
  insertStorageObject(prepared.upload.storage_bucket, prepared.upload.storage_path, filePath);
  const registered = await rpc(vendorToken, "rpc_vendor_workspace_register_invoice_document", {
    p_assignment_work_key: assignmentWorkKey,
    p_payload: {
      document_key: prepared.document.document_key,
      file_name: fileName,
      mime_type: "application/pdf",
      file_size: fileSize,
      document_role: "vendor_invoice",
    },
  }, true);
  if (!registered?.ok) throw new Error(`Invoice upload register failed: ${JSON.stringify(registered)}`);
  return registered.document.document_key;
}

function ownerBidStateForWorkKey(workKey) {
  return psqlJson(`
    select jsonb_build_object(
      'recipient_status', brr.status,
      'decline_reason', brr.metadata ->> 'decline_reason',
      'decline_comments', brr.metadata ->> 'decline_comments',
      'request_status', br.status
    )::text
    from public.order_vendor_bid_request_recipients brr
    join public.order_vendor_bid_requests br on br.id = brr.bid_request_id
    where encode(extensions.digest(concat_ws(':', 'vendor_available_work_v1', brr.id::text, brr.vendor_company_id::text), 'sha256'), 'hex') = '${workKey}'
    limit 1;
  `);
}

function internalNoteLeakCheck() {
  return psqlJson(`
    select jsonb_build_object(
      'internal_reviewer_note_in_assignment_payload',
        exists (
          select 1
          from public.order_company_assignments oca
          join public.orders o on o.id = oca.order_id
          where o.order_number = 'AMC-SMOKE-001'
            and coalesce(oca.submission_payload::text, '') ilike '%internal_reviewer_note%'
        ),
      'internal_notes_tables_rows',
        (select count(*) from public.order_company_assignment_internal_notes)
    )::text;
  `);
}

function assertNoVendorPayloadLeakage() {
  const payloadText = JSON.stringify(vendorPayloads);
  const uuidMatches = payloadText.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi) || [];
  const forbiddenTerms = [
    "storage_path",
    "storage_bucket",
    "order-documents",
    "amc-smoke-fixtures/",
    "vendor-report-uploads/",
    "vendor-invoice-uploads/",
    "internal_reviewer_note",
    "internal_note",
    "client_fee",
    "amc_margin",
    "fee_amount_client",
  ];
  const foundTerms = forbiddenTerms.filter((term) => payloadText.includes(term));

  if (uuidMatches.length > 0) {
    throw new Error(`Vendor payload exposed UUID-looking values: ${[...new Set(uuidMatches)].slice(0, 5).join(", ")}`);
  }
  if (foundTerms.length > 0) {
    throw new Error(`Vendor payload exposed forbidden terms: ${foundTerms.join(", ")}`);
  }
}

async function main() {
  const ownerToken = await login(OWNER_EMAIL);
  mark("Auth: owner login", "PASS");
  const vendorToken = await login(VENDOR_EMAIL);
  mark("Auth: primary vendor login", "PASS");
  const wrongVendorFixture = setupWrongVendor();
  if (!wrongVendorFixture?.wrong_vendor_company_id) {
    throw new Error(`Wrong vendor fixture failed: ${JSON.stringify(wrongVendorFixture)}`);
  }
  const wrongVendorToken = await login(WRONG_VENDOR_EMAIL);
  mark("Fixture: second disposable vendor login", "PASS", WRONG_VENDOR_EMAIL);

  const ctx = getFixtureContext();
  if (!ctx?.order_id) throw new Error(`Fixture context missing: ${JSON.stringify(ctx)}`);

  const primaryAvailable = await rpc(vendorToken, "rpc_vendor_workspace_available_work", {}, true);
  const primaryWork = primaryAvailable?.items?.find((item) => item.order_number === "AMC-SMOKE-001") || primaryAvailable?.items?.[0];
  if (!primaryWork?.work_key) throw new Error(`Primary vendor available work missing: ${JSON.stringify(primaryAvailable)}`);
  const primaryDetail = await rpc(vendorToken, "rpc_vendor_workspace_available_work_detail", { p_work_key: primaryWork.work_key }, true);
  if (!primaryDetail?.ok) throw new Error(`Primary work detail unavailable: ${JSON.stringify(primaryDetail)}`);
  mark("Setup: primary vendor open opportunity loaded", "PASS", `work_key=${primaryWork.work_key}`);

  const wrongAvailable = await rpc(wrongVendorToken, "rpc_vendor_workspace_available_work", {}, true);
  if (Array.isArray(wrongAvailable?.items) && wrongAvailable.items.length === 0) {
    mark("Wrong vendor: cannot see first vendor available work", "PASS");
  } else {
    fail("Wrong vendor: cannot see first vendor available work", new Error(JSON.stringify(wrongAvailable)));
  }

  const wrongDetail = await rpc(wrongVendorToken, "rpc_vendor_workspace_available_work_detail", {
    p_work_key: primaryWork.work_key,
  }, true);
  if (wrongDetail?.ok === false) {
    mark("Wrong vendor: cannot open first vendor work detail", "PASS", wrongDetail.error || "unavailable");
  } else {
    fail("Wrong vendor: cannot open first vendor work detail", new Error(JSON.stringify(wrongDetail)));
  }

  const opportunityDoc = primaryDetail?.item?.documents?.[0] || primaryDetail?.documents?.[0];
  if (opportunityDoc?.document_key) {
    const wrongDoc = await rpc(wrongVendorToken, "rpc_vendor_workspace_authorize_document_access", {
      p_work_key: primaryWork.work_key,
      p_document_key: opportunityDoc.document_key,
    }, true);
    if (wrongDoc?.ok === false) {
      mark("Wrong vendor: cannot access first vendor opportunity document", "PASS", wrongDoc.error || "unavailable");
    } else {
      fail("Wrong vendor: cannot access first vendor opportunity document", new Error(JSON.stringify(wrongDoc)));
    }
  } else {
    mark("Wrong vendor: cannot access first vendor opportunity document", "WARN", "primary detail returned no opportunity document key");
  }

  const decline = await rpc(vendorToken, "rpc_vendor_workspace_decline_bid_opportunity", {
    p_work_key: primaryWork.work_key,
    p_payload: {
      reason: "Too busy / capacity",
      comments: "AMC-13B.8 disposable decline smoke.",
    },
  }, true);
  if (!decline?.ok || decline.status !== "declined") {
    throw new Error(`Decline failed: ${JSON.stringify(decline)}`);
  }
  mark("Declined bid: vendor passes opportunity", "PASS", decline.decline?.reason || "declined");

  const declinedOwnerState = ownerBidStateForWorkKey(primaryWork.work_key);
  if (declinedOwnerState?.recipient_status === "declined") {
    mark("Declined bid: owner-side recipient reflects pass", "PASS", declinedOwnerState.request_status);
  } else {
    fail("Declined bid: owner-side recipient reflects pass", new Error(JSON.stringify(declinedOwnerState)));
  }

  const myBids = await rpc(vendorToken, "rpc_vendor_workspace_my_bids", {}, true);
  const passedBid = myBids?.items?.find((item) => item.work_key === primaryWork.work_key);
  if (passedBid?.bid_status === "passed") {
    mark("Declined bid: Vendor My Bids shows Passed Opportunity", "PASS", passedBid.decline?.reason || "passed");
  } else {
    fail("Declined bid: Vendor My Bids shows Passed Opportunity", new Error(JSON.stringify(myBids)));
  }

  const declinedDetail = await rpc(vendorToken, "rpc_vendor_workspace_available_work_detail", {
    p_work_key: primaryWork.work_key,
  }, true);
  if (declinedDetail?.ok && (declinedDetail?.item?.bid_status === "passed" || declinedDetail?.item?.status === "declined")) {
    mark("Declined bid: history detail remains read-only passed state", "PASS");
  } else {
    mark("Declined bid: history detail remains read-only passed state", "WARN", JSON.stringify(declinedDetail));
  }

  const freshBid = createFreshBidRecipient();
  if (!freshBid?.work_key) throw new Error(`Fresh bid fixture failed: ${JSON.stringify(freshBid)}`);
  mark("Rejected invoice setup: fresh bid recipient created", "PASS", freshBid.work_key);

  const bid = await rpc(vendorToken, "rpc_vendor_workspace_submit_bid_response", {
    p_work_key: freshBid.work_key,
    p_payload: {
      fee_amount: "650",
      currency: "USD",
      turn_time_days: "5",
      proposed_due_at: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
      comments: "AMC-13B.8 rejected invoice edge bid.",
    },
  }, true);
  if (!bid?.ok) throw new Error(`Fresh bid submit failed: ${JSON.stringify(bid)}`);

  const response = responseIdForWorkKey(freshBid.work_key);
  if (!response?.response_id) throw new Error(`Response id missing: ${JSON.stringify(response)}`);
  await rpc(ownerToken, "rpc_order_vendor_bid_response_select", { p_response_id: response.response_id });
  const offer = await rpc(ownerToken, "rpc_order_vendor_bid_response_convert_to_assignment_offer", {
    p_response_id: response.response_id,
    p_payload: {
      instructions: "AMC-13B.8 rejected invoice edge assignment offer.",
      due_at: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      review_due_at: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000).toISOString(),
    },
  });
  if (!offer?.assignment_id) throw new Error(`Offer conversion failed: ${JSON.stringify(offer)}`);
  mark("Rejected invoice setup: selected bid converted to assignment offer", "PASS", offer.assignment_id);

  const invitation = await rpc(ownerToken, "rpc_order_company_assignment_invitation_create", {
    p_assignment_id: offer.assignment_id,
    p_payload: { sent_to_email: VENDOR_EMAIL, metadata: { amc_edge_smoke_fixture: true } },
  });
  const accepted = await rpc(vendorToken, "rpc_order_company_assignment_invitation_respond", {
    p_token: invitation.token,
    p_action: "accept",
    p_reason: null,
  });
  if (!accepted?.ok) throw new Error(`Assignment accept failed: ${JSON.stringify(accepted)}`);

  let assignment = assignmentContext();
  const assignedDetail = await rpc(vendorToken, "rpc_vendor_workspace_assigned_order_detail", {
    p_assignment_work_key: assignment.assignment_work_key,
  }, true);
  if (!assignedDetail?.ok) throw new Error(`Assigned detail failed: ${JSON.stringify(assignedDetail)}`);
  const wrongAssigned = await rpc(wrongVendorToken, "rpc_vendor_workspace_assigned_order_detail", {
    p_assignment_work_key: assignment.assignment_work_key,
  }, true);
  if (wrongAssigned?.ok === false) {
    mark("Wrong vendor: cannot open first vendor assigned order detail", "PASS", wrongAssigned.error || "unavailable");
  } else {
    fail("Wrong vendor: cannot open first vendor assigned order detail", new Error(JSON.stringify(wrongAssigned)));
  }

  const assignedDoc = assignedDetail?.item?.documents?.[0] || assignedDetail?.documents?.[0];
  if (assignedDoc?.document_key) {
    const wrongAssignedDoc = await rpc(wrongVendorToken, "rpc_vendor_workspace_authorize_assignment_document_access", {
      p_assignment_work_key: assignment.assignment_work_key,
      p_document_key: assignedDoc.document_key,
    }, true);
    if (wrongAssignedDoc?.ok === false) {
      mark("Wrong vendor: cannot access first vendor assignment document", "PASS", wrongAssignedDoc.error || "unavailable");
    } else {
      fail("Wrong vendor: cannot access first vendor assignment document", new Error(JSON.stringify(wrongAssignedDoc)));
    }
  } else {
    mark("Wrong vendor: cannot access first vendor assignment document", "WARN", "assigned detail returned no document key");
  }

  const started = await rpc(vendorToken, "rpc_vendor_workspace_start_assigned_order", {
    p_assignment_work_key: assignment.assignment_work_key,
  }, true);
  if (!started?.ok) throw new Error(`Start work failed: ${JSON.stringify(started)}`);
  const reportKey = await uploadReportDocument(vendorToken, assignment.assignment_work_key, "amc-edge-report.pdf", REPORT_PATH);
  const submitted = await rpc(vendorToken, "rpc_vendor_workspace_submit_report", {
    p_assignment_work_key: assignment.assignment_work_key,
    p_payload: {
      comments: "AMC-13B.8 rejected invoice edge report.",
      document_keys: [reportKey],
    },
  }, true);
  if (!submitted?.ok) throw new Error(`Submit report failed: ${JSON.stringify(submitted)}`);
  await rpc(ownerToken, "rpc_order_company_assignment_complete", {
    p_assignment_id: assignment.assignment_id,
    p_completion_note: "AMC-13B.8 completion before rejected invoice edge.",
  });

  const invoiceDocKey = await uploadInvoiceDocument(vendorToken, assignment.assignment_work_key, "amc-edge-invoice.pdf", INVOICE_PATH);
  const invoice = await rpc(vendorToken, "rpc_vendor_workspace_submit_invoice", {
    p_assignment_work_key: assignment.assignment_work_key,
    p_payload: {
      invoice_number: "AMC-EDGE-INV-001",
      invoice_amount: "650",
      currency: "USD",
      invoice_date: new Date().toISOString().slice(0, 10),
      vendor_note: "AMC-13B.8 invoice to reject.",
      document_keys: [invoiceDocKey],
    },
  }, true);
  if (!invoice?.ok) throw new Error(`Submit invoice failed: ${JSON.stringify(invoice)}`);
  mark("Rejected invoice: vendor submits invoice", "PASS", invoice.invoice?.invoice_number || "submitted");

  assignment = assignmentContext();
  const rejected = await rpc(ownerToken, "rpc_amc_review_vendor_invoice", {
    p_invoice_key: assignment.invoice_key,
    p_payload: {
      decision: "reject",
      reviewer_note: "Internal-only AMC-13B.8 rejection note.",
      vendor_message: "Please correct the invoice amount and upload a revised PDF.",
    },
  });
  if (!rejected?.ok || rejected.invoice?.invoice_status !== "rejected") {
    throw new Error(`Reject invoice failed: ${JSON.stringify(rejected)}`);
  }
  mark("Rejected invoice: owner rejects with safe vendor message", "PASS");

  const rejectedPayments = await rpc(vendorToken, "rpc_vendor_workspace_payments", {}, true);
  const rejectedPayment = rejectedPayments?.items?.find((item) => item.assignment_work_key === assignment.assignment_work_key);
  if (rejectedPayment?.payment_status_key === "rejected" && JSON.stringify(rejectedPayment).includes("Please correct the invoice amount")) {
    mark("Rejected invoice: Vendor Payments shows rejection and correction path", "PASS");
  } else {
    fail("Rejected invoice: Vendor Payments shows rejection and correction path", new Error(JSON.stringify(rejectedPayment)));
  }

  const correctedDocKey = await uploadInvoiceDocument(vendorToken, assignment.assignment_work_key, "amc-edge-invoice-corrected.pdf", INVOICE_PATH);
  const corrected = await rpc(vendorToken, "rpc_vendor_workspace_resubmit_invoice", {
    p_assignment_work_key: assignment.assignment_work_key,
    p_payload: {
      invoice_number: "AMC-EDGE-INV-001-R",
      invoice_amount: "625",
      currency: "USD",
      invoice_date: new Date().toISOString().slice(0, 10),
      vendor_note: "Corrected AMC-13B.8 invoice.",
      document_keys: [correctedDocKey],
    },
  }, true);
  if (!corrected?.ok || (corrected.status !== "invoice_received" && corrected.invoice?.invoice_status !== "invoice_received")) {
    throw new Error(`Corrected invoice submit failed: ${JSON.stringify(corrected)}`);
  }
  mark("Rejected invoice: vendor submits corrected invoice", "PASS");

  const invoiceQueue = await rpc(ownerToken, "rpc_amc_vendor_invoices", { p_status: "invoice_received" });
  const correctedQueueRow = invoiceQueue?.items?.find((item) => item.assignment_work_key === assignment.assignment_work_key);
  if (correctedQueueRow?.invoice_status === "invoice_received" && correctedQueueRow?.invoice_number === "AMC-EDGE-INV-001-R") {
    mark("Rejected invoice: owner queue sees corrected invoice back in review", "PASS");
  } else {
    fail("Rejected invoice: owner queue sees corrected invoice back in review", new Error(JSON.stringify(correctedQueueRow)));
  }

  const vendorOrdersRest = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=id,order_number&limit=5`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${vendorToken}` },
  });
  const vendorOrdersBody = await vendorOrdersRest.text();
  let vendorOrdersJson = [];
  try {
    vendorOrdersJson = vendorOrdersBody ? JSON.parse(vendorOrdersBody) : [];
  } catch {}
  if (vendorOrdersRest.ok && Array.isArray(vendorOrdersJson) && vendorOrdersJson.length === 0) {
    mark("Route isolation probe: vendor REST order rows are not exposed", "PASS", "HTTP 200 empty result under RLS");
  } else if (!vendorOrdersRest.ok) {
    mark("Route isolation probe: vendor REST order rows are not exposed", "PASS", `HTTP ${vendorOrdersRest.status}`);
  } else {
    mark("Route isolation probe: vendor REST order rows are not exposed", "WARN", vendorOrdersBody);
  }

  assertNoVendorPayloadLeakage();
  mark("Leakage: no raw UUIDs/storage paths/internal notes/client fee/AMC margin in captured Vendor Workspace RPC payloads", "PASS");

  const internalNoteAudit = internalNoteLeakCheck();
  if (internalNoteAudit?.internal_reviewer_note_in_assignment_payload) {
    mark("Leakage: internal reviewer note exists only in internal assignment payload", "PASS", "Vendor RPC payload scan did not expose it");
  } else {
    mark("Leakage: internal reviewer note audit", "WARN", "expected internal note was not present for audit");
  }

  console.log("\nEDGE_SMOKE_RESULTS_JSON");
  console.log(JSON.stringify({ results, defects }, null, 2));
}

main().catch((error) => {
  console.error("\nEDGE_SMOKE_FAILED", error?.message || error);
  if (error?.body) console.error(JSON.stringify(error.body, null, 2));
  console.log("\nEDGE_SMOKE_RESULTS_JSON");
  console.log(JSON.stringify({ results, defects }, null, 2));
  process.exit(1);
});
