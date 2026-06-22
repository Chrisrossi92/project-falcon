import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260607100500_client_portal_safe_order_read_model.sql',
);

const migrationSql = readFileSync(migrationPath, 'utf8');

const reportDownloadMigrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260607101000_client_portal_report_download_authorization.sql',
);

const reportDownloadMigrationSql = readFileSync(reportDownloadMigrationPath, 'utf8');

const reportDownloadFunctionPath = resolve(
  process.cwd(),
  'supabase/functions/client-portal-report-download-url/index.ts',
);

const reportDownloadFunctionSource = readFileSync(reportDownloadFunctionPath, 'utf8');

const orderRequestIntakeMigrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260607102500_client_portal_order_request_intake.sql',
);

const orderRequestIntakeMigrationSql = readFileSync(orderRequestIntakeMigrationPath, 'utf8');

const orderRequestReviewMigrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260607103000_client_portal_order_request_review_inbox.sql',
);

const orderRequestReviewMigrationSql = readFileSync(orderRequestReviewMigrationPath, 'utf8');

const orderRequestConversionMigrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260607104000_client_portal_order_request_conversion.sql',
);

const orderRequestConversionMigrationSql = readFileSync(orderRequestConversionMigrationPath, 'utf8');

const invitationFoundationMigrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260608110000_client_portal_invitation_token_foundation.sql',
);

const invitationFoundationMigrationSql = readFileSync(invitationFoundationMigrationPath, 'utf8');

const invitationAcceptanceMigrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260608120000_client_portal_invitation_acceptance_flow.sql',
);

const invitationAcceptanceMigrationSql = readFileSync(invitationAcceptanceMigrationPath, 'utf8');

const clientPortalMemberAccessMigrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260608140000_client_portal_member_access_without_company_membership.sql',
);

const clientPortalMemberAccessMigrationSql = readFileSync(clientPortalMemberAccessMigrationPath, 'utf8');

const orderRequestMembershipContextMigrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260608150000_client_portal_order_request_membership_context.sql',
);

const orderRequestMembershipContextMigrationSql = readFileSync(
  orderRequestMembershipContextMigrationPath,
  'utf8',
);

const pendingRequestVisibilityMigrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260608160000_client_portal_pending_request_visibility.sql',
);

const pendingRequestVisibilityMigrationSql = readFileSync(
  pendingRequestVisibilityMigrationPath,
  'utf8',
);

describe('Client Portal safe order read model migration', () => {
  it('creates dedicated Client Portal permissions, member mapping, view, and RPCs', () => {
    expect(migrationSql).toContain("'client_portal.dashboard.view'");
    expect(migrationSql).toContain("'client_portal.orders.read'");
    expect(migrationSql).toContain('create table if not exists public.client_portal_members');
    expect(migrationSql).toContain('create or replace view public.v_client_portal_order_status');
    expect(migrationSql).toContain('create or replace function public.rpc_client_portal_dashboard()');
    expect(migrationSql).toContain('create or replace function public.rpc_client_portal_orders()');
    expect(migrationSql).toContain('create or replace function public.rpc_client_portal_order_detail(p_order_key text)');
  });

  it('scopes reads to active mapped client accounts in the current company', () => {
    expect(migrationSql).toContain('public.current_company_id()');
    expect(migrationSql).toContain('public.current_app_user_id()');
    expect(migrationSql).toContain("cpm.status = 'active'");
    expect(migrationSql).toContain('public.current_app_user_client_portal_client_ids()');
    expect(migrationSql).toContain('v.client_id in (');
    expect(migrationSql).toContain("raise exception 'client_portal_access_required'");
  });

  it('returns opaque order keys and does not expose raw identifiers, storage paths, or signed URLs', () => {
    expect(migrationSql).toContain('client_portal_order_key(');
    expect(migrationSql).toContain("'client_portal_order_v1'");
    expect(migrationSql).toContain('order_key text');
    expect(migrationSql).not.toContain('signed_url');
    expect(migrationSql).not.toContain('storage_path,');
    expect(migrationSql).not.toContain('storage_bucket,');
  });

  it('limits report exposure to client-visible final report metadata', () => {
    expect(migrationSql).toContain("od.category = 'final_report'");
    expect(migrationSql).toContain("od.visibility_scope = 'client'");
    expect(migrationSql).toContain("od.status = 'active'");
    expect(migrationSql).toContain('report_available');
    expect(migrationSql).toContain('report_delivered_at');
    expect(migrationSql).toContain('report_file_name');
  });

  it('does not return vendor procurement assignment fee margin or private-note fields', () => {
    const forbiddenPayloadFields = [
      'vendor_company_id',
      'bid_request_id',
      'assigned_company_id',
      'appraiser_id',
      'reviewer_id',
      'internal_note',
      'private_note',
      'client_invoice_amount',
      'appraiser_fee',
      'base_fee',
      'fee_amount',
      'split_pct',
      'amc_margin',
      'paid_status',
      'invoice_number',
    ];

    forbiddenPayloadFields.forEach((field) => {
      expect(migrationSql).not.toContain(`${field} `);
      expect(migrationSql).not.toContain(`${field},`);
    });
  });
});

describe('Client Portal report download authorization', () => {
  it('creates a dedicated opaque-key report authorization RPC', () => {
    expect(reportDownloadMigrationSql).toContain(
      'create or replace function public.rpc_client_portal_report_authorize_download(p_order_key text)',
    );
    expect(reportDownloadMigrationSql).toContain("raise exception 'client_portal_order_key_required'");
    expect(reportDownloadMigrationSql).toContain("raise exception 'client_portal_access_required'");
    expect(reportDownloadMigrationSql).toContain("client_portal.reports.read");
    expect(reportDownloadMigrationSql).toContain('public.current_app_user_client_portal_client_ids()');
    expect(reportDownloadMigrationSql).toContain('v.company_id = public.current_company_id()');
  });

  it('authorizes only active client-visible final report documents', () => {
    expect(reportDownloadMigrationSql).toContain("od.category = 'final_report'");
    expect(reportDownloadMigrationSql).toContain("od.visibility_scope = 'client'");
    expect(reportDownloadMigrationSql).toContain("od.status = 'active'");
    expect(reportDownloadMigrationSql).not.toContain("od.category <> 'final_report'");
    expect(reportDownloadMigrationSql).not.toContain("od.visibility_scope <> 'client'");
  });

  it('does not expose raw order ids storage paths buckets or signed URLs from the authorization RPC', () => {
    expect(reportDownloadMigrationSql).not.toContain('order_id uuid');
    expect(reportDownloadMigrationSql).not.toContain('order_id,');
    expect(reportDownloadMigrationSql).not.toContain('storage_path');
    expect(reportDownloadMigrationSql).not.toContain('storage_bucket');
    expect(reportDownloadMigrationSql).not.toContain('signed_url');
  });

  it('uses a client-specific Edge Function to sign storage service-side', () => {
    expect(reportDownloadFunctionSource).toContain('rpc_client_portal_report_authorize_download');
    expect(reportDownloadFunctionSource).toContain('order_key');
    expect(reportDownloadFunctionSource).toContain('.eq("category", "final_report")');
    expect(reportDownloadFunctionSource).toContain('.eq("visibility_scope", "client")');
    expect(reportDownloadFunctionSource).toContain('.eq("status", "active")');
    expect(reportDownloadFunctionSource).toContain('createSignedUrl');
    expect(reportDownloadFunctionSource).not.toContain('order_id:');
    expect(reportDownloadFunctionSource).not.toContain('storage_path:');
    expect(reportDownloadFunctionSource).not.toContain('storage_bucket:');
  });
});

describe('Client Portal order request intake migration', () => {
  it('creates a dedicated request table and create RPC', () => {
    expect(orderRequestIntakeMigrationSql).toContain(
      'create table if not exists public.client_portal_order_requests',
    );
    expect(orderRequestIntakeMigrationSql).toContain(
      'create or replace function public.rpc_client_portal_order_request_create(',
    );
    expect(orderRequestIntakeMigrationSql).toContain(
      'create or replace function public.current_app_user_can_create_client_portal_order_request()',
    );
    expect(orderRequestIntakeMigrationSql).toContain('client_portal_order_request_key');
  });

  it('requires current company client portal membership and create permission', () => {
    expect(orderRequestIntakeMigrationSql).toContain('public.current_app_user_has_current_company()');
    expect(orderRequestIntakeMigrationSql).toContain('public.current_app_user_id() is not null');
    expect(orderRequestIntakeMigrationSql).toContain("client_portal.orders.create");
    expect(orderRequestIntakeMigrationSql).toContain('public.current_app_user_client_portal_client_ids()');
    expect(orderRequestIntakeMigrationSql).toContain(
      "raise exception 'client_portal_order_request_create_required'",
    );
  });

  it('captures client-safe request fields only', () => {
    [
      'property_address',
      'property_type',
      'report_type',
      'loan_purpose',
      'requested_due_date',
      'borrower_contact_name',
      'client_contact_phone',
      'client_contact_email',
      'notes',
    ].forEach((field) => {
      expect(orderRequestIntakeMigrationSql).toContain(field);
    });
  });

  it('does not accept raw ids or internal assignment procurement fee controls in the create RPC', () => {
    const createRpcSection = orderRequestIntakeMigrationSql.slice(
      orderRequestIntakeMigrationSql.indexOf('create or replace function public.rpc_client_portal_order_request_create('),
      orderRequestIntakeMigrationSql.indexOf('revoke all on function public.client_portal_order_request_key'),
    );

    [
      'p_company_id',
      'p_client_id',
      'p_order_id',
      'p_appraiser_id',
      'p_reviewer_id',
      'p_vendor',
      'p_fee',
      'p_margin',
      'bid_request',
      'assignment',
    ].forEach((field) => {
      expect(createRpcSection).not.toContain(field);
    });

    expect(createRpcSection).not.toContain('insert into public.orders');
    expect(createRpcSection).not.toContain('order_vendor_bid_requests');
    expect(createRpcSection).not.toContain('order_company_assignments');
  });
});

describe('Client Portal order request staff review migration', () => {
  it('drops any existing incompatible staff review view before recreating it', () => {
    const dropFunctionsIndex = orderRequestReviewMigrationSql.indexOf(
      'drop function if exists public.rpc_client_portal_order_requests_for_review();',
    );
    const dropViewIndex = orderRequestReviewMigrationSql.indexOf(
      'drop view if exists public.v_client_portal_order_request_staff_review;',
    );
    const createViewIndex = orderRequestReviewMigrationSql.indexOf(
      'create view public.v_client_portal_order_request_staff_review',
    );

    expect(dropFunctionsIndex).toBeGreaterThan(-1);
    expect(dropViewIndex).toBeGreaterThan(dropFunctionsIndex);
    expect(createViewIndex).toBeGreaterThan(dropViewIndex);
    expect(orderRequestReviewMigrationSql).not.toContain(
      'create or replace view public.v_client_portal_order_request_staff_review',
    );
  });

  it('creates staff read/manage permissions and review RPCs', () => {
    expect(orderRequestReviewMigrationSql).toContain("'client_portal.order_requests.read'");
    expect(orderRequestReviewMigrationSql).toContain("'client_portal.order_requests.manage'");
    expect(orderRequestReviewMigrationSql).toContain(
      'create or replace function public.rpc_client_portal_order_requests_for_review()',
    );
    expect(orderRequestReviewMigrationSql).toContain(
      'create or replace function public.rpc_client_portal_order_request_review_detail(p_request_key text)',
    );
    expect(orderRequestReviewMigrationSql).toContain(
      'create or replace function public.rpc_client_portal_order_request_review_update_status(',
    );
  });

  it('scopes staff review reads and status updates to the current company', () => {
    expect(orderRequestReviewMigrationSql).toContain('v.company_id = public.current_company_id()');
    expect(orderRequestReviewMigrationSql).toContain('cpor.company_id = public.current_company_id()');
    expect(orderRequestReviewMigrationSql).toContain(
      'public.current_app_user_can_read_client_portal_order_requests()',
    );
    expect(orderRequestReviewMigrationSql).toContain(
      'public.current_app_user_can_manage_client_portal_order_requests()',
    );
  });

  it('supports only safe review statuses in this slice', () => {
    expect(orderRequestReviewMigrationSql).toContain("v_status not in ('under_review', 'declined')");
    expect(orderRequestReviewMigrationSql).toContain("when 'under_review'");
    expect(orderRequestReviewMigrationSql).not.toContain("insert into public.orders");
    expect(orderRequestReviewMigrationSql).not.toContain("rpc_order_create");
    expect(orderRequestReviewMigrationSql).not.toContain("order_vendor_bid_requests");
    expect(orderRequestReviewMigrationSql).not.toContain("order_company_assignments");
  });

  it('preserves review attribution fields', () => {
    expect(orderRequestReviewMigrationSql).toContain('reviewed_by_user_id = public.current_app_user_id()');
    expect(orderRequestReviewMigrationSql).toContain('reviewed_at = now()');
    expect(orderRequestReviewMigrationSql).toContain('reviewed_by_name');
    expect(orderRequestReviewMigrationSql).toContain('reviewed_by_email');
  });
});

describe('Client Portal invitation token foundation migration', () => {
  it('creates the dedicated invitation table and lifecycle RPCs', () => {
    expect(invitationFoundationMigrationSql).toContain(
      'create table if not exists public.client_portal_invitations',
    );
    expect(invitationFoundationMigrationSql).toContain(
      'create or replace function public.rpc_client_portal_invitation_create(',
    );
    expect(invitationFoundationMigrationSql).toContain(
      'create or replace function public.rpc_client_portal_invitation_read(p_token text)',
    );
    expect(invitationFoundationMigrationSql).toContain(
      'create or replace function public.rpc_client_portal_invitation_accept(p_token text)',
    );
    expect(invitationFoundationMigrationSql).toContain("'client_portal.members.invite'");
  });

  it('stores only token hashes and returns the raw invite token only at creation time', () => {
    expect(invitationFoundationMigrationSql).toContain('token_hash text not null unique');
    expect(invitationFoundationMigrationSql).toContain('token_last_four text not null');
    expect(invitationFoundationMigrationSql).toContain("v_token := encode(extensions.gen_random_bytes(32), 'hex')");
    expect(invitationFoundationMigrationSql).toContain(
      "v_token_hash := encode(extensions.digest(v_token, 'sha256'), 'hex')",
    );
    expect(invitationFoundationMigrationSql).toContain('invitation_token text');
    expect(invitationFoundationMigrationSql).toContain('v_token,');
    expect(invitationFoundationMigrationSql).toContain('client_portal_invitations.token_hash is immutable');
  });

  it('requires staff invite permission and client update authority to create invites', () => {
    expect(invitationFoundationMigrationSql).toContain(
      "public.current_app_user_has_permission('client_portal.members.invite')",
    );
    expect(invitationFoundationMigrationSql).toContain(
      "raise exception 'client_portal_member_invite_permission_required'",
    );
    expect(invitationFoundationMigrationSql).toContain(
      'public.current_app_user_can_update_client_row(v_company_id, p_client_id)',
    );
    expect(invitationFoundationMigrationSql).toContain(
      "raise exception 'client_portal_member_invite_client_update_required'",
    );
  });

  it('fails closed for invalid expired revoked or accepted tokens', () => {
    expect(invitationFoundationMigrationSql).toContain("v_token !~ '^[0-9a-f]{64}$'");
    expect(invitationFoundationMigrationSql).toContain("raise exception 'client_portal_invitation_invalid_or_expired'");
    expect(invitationFoundationMigrationSql).toContain("set status = 'expired'");
    expect(invitationFoundationMigrationSql).toContain("if v_invitation.status <> 'pending' then");
    expect(invitationFoundationMigrationSql).toContain('for update');
  });

  it('accepts only the authenticated matching email and creates client portal membership', () => {
    expect(invitationFoundationMigrationSql).toContain('v_auth_user_id uuid := auth.uid()');
    expect(invitationFoundationMigrationSql).toContain("v_auth_email <> v_invitation.normalized_email");
    expect(invitationFoundationMigrationSql).toContain(
      "raise exception 'client_portal_invitation_email_mismatch'",
    );
    expect(invitationFoundationMigrationSql).toContain('insert into public.client_portal_members');
    expect(invitationFoundationMigrationSql).toContain('on conflict (company_id, client_id, user_id) do update');
    expect(invitationFoundationMigrationSql).toContain("set status = 'accepted'");
    expect(invitationFoundationMigrationSql).toContain('accepted_by_user_id = v_user_id');
  });

  it('does not grant operational company access during invite acceptance', () => {
    expect(invitationFoundationMigrationSql).not.toContain('insert into public.company_memberships');
    expect(invitationFoundationMigrationSql).not.toContain('update public.company_memberships');
    expect(invitationFoundationMigrationSql).not.toContain('insert into public.user_role_assignments');
    expect(invitationFoundationMigrationSql).not.toContain('update public.user_role_assignments');
  });

  it('keeps the invitation table service-role only and exposes access through RPC grants', () => {
    expect(invitationFoundationMigrationSql).toContain(
      'revoke all on table public.client_portal_invitations from public, anon, authenticated',
    );
    expect(invitationFoundationMigrationSql).toContain(
      'grant all on table public.client_portal_invitations to service_role',
    );
    expect(invitationFoundationMigrationSql).toContain(
      'grant execute on function public.rpc_client_portal_invitation_create(bigint, bigint, text)',
    );
    expect(invitationFoundationMigrationSql).toContain(
      'grant execute on function public.rpc_client_portal_invitation_read(text)',
    );
    expect(invitationFoundationMigrationSql).toContain(
      'grant execute on function public.rpc_client_portal_invitation_accept(text)',
    );
  });
});

describe('Client Portal invitation acceptance flow migration', () => {
  it('keeps invitation read public but safe for lifecycle state display', () => {
    expect(invitationAcceptanceMigrationSql).toContain(
      'create or replace function public.rpc_client_portal_invitation_read(p_token text)',
    );
    expect(invitationAcceptanceMigrationSql).toContain("v_token !~ '^[0-9a-f]{64}$'");
    expect(invitationAcceptanceMigrationSql).toContain(
      "raise exception 'client_portal_invitation_invalid_or_expired'",
    );
    expect(invitationAcceptanceMigrationSql).toContain("set status = 'expired'");
    expect(invitationAcceptanceMigrationSql).toContain('v_invitation.status,');
    expect(invitationAcceptanceMigrationSql).toContain(
      'Reads safe public Client Portal invitation display metadata by raw token, including pending, expired, revoked, or accepted state.',
    );
  });

  it('accepts pending invites idempotently for the authenticated matching email', () => {
    expect(invitationAcceptanceMigrationSql).toContain(
      'create or replace function public.rpc_client_portal_invitation_accept(p_token text)',
    );
    expect(invitationAcceptanceMigrationSql).toContain('v_auth_user_id uuid := auth.uid()');
    expect(invitationAcceptanceMigrationSql).toContain("v_auth_email <> v_invitation.normalized_email");
    expect(invitationAcceptanceMigrationSql).toContain("if v_invitation.status = 'accepted' then");
    expect(invitationAcceptanceMigrationSql).toContain('insert into public.client_portal_members');
    expect(invitationAcceptanceMigrationSql).toContain('on conflict (company_id, client_id, user_id) do update');
    expect(invitationAcceptanceMigrationSql).toContain("set status = 'accepted'");
  });

  it('does not grant operational company access during invite acceptance', () => {
    expect(invitationAcceptanceMigrationSql).not.toContain('insert into public.company_memberships');
    expect(invitationAcceptanceMigrationSql).not.toContain('update public.company_memberships');
    expect(invitationAcceptanceMigrationSql).not.toContain('insert into public.user_role_assignments');
    expect(invitationAcceptanceMigrationSql).not.toContain('update public.user_role_assignments');
  });

  it('keeps table access behind RPCs after replacing the functions', () => {
    expect(invitationAcceptanceMigrationSql).toContain(
      'grant execute on function public.rpc_client_portal_invitation_read(text)',
    );
    expect(invitationAcceptanceMigrationSql).toContain(
      'grant execute on function public.rpc_client_portal_invitation_accept(text)',
    );
    expect(invitationAcceptanceMigrationSql).not.toContain('grant all on table public.client_portal_invitations to authenticated');
    expect(invitationAcceptanceMigrationSql).not.toContain('grant all on table public.client_portal_members to authenticated');
  });
});

describe('Client Portal member access without operational company membership migration', () => {
  it('recognizes active client portal membership as the source of client portal access', () => {
    expect(clientPortalMemberAccessMigrationSql).toContain(
      'create or replace function public.current_app_user_has_active_client_portal_membership()',
    );
    expect(clientPortalMemberAccessMigrationSql).toContain('from public.client_portal_members cpm');
    expect(clientPortalMemberAccessMigrationSql).toContain("cpm.status = 'active'");
    expect(clientPortalMemberAccessMigrationSql).toContain(
      'create or replace function public.current_app_user_can_read_client_portal()',
    );
    expect(clientPortalMemberAccessMigrationSql).toContain(
      'public.current_app_user_has_permission(\'client_portal.dashboard.view\')',
    );
    expect(clientPortalMemberAccessMigrationSql).toContain(
      'from public.current_app_user_client_portal_client_ids()',
    );
  });

  it('adds only client portal permission keys from client portal membership', () => {
    expect(clientPortalMemberAccessMigrationSql).toContain(
      'create or replace function public.current_app_user_permission_keys()',
    );
    expect(clientPortalMemberAccessMigrationSql).toContain("'client_portal.dashboard.view'::text");
    expect(clientPortalMemberAccessMigrationSql).toContain("'client_portal.orders.read'::text");
    expect(clientPortalMemberAccessMigrationSql).toContain("'client_portal.orders.create'::text");
    expect(clientPortalMemberAccessMigrationSql).toContain("'client_portal.reports.read'::text");
    expect(clientPortalMemberAccessMigrationSql).toContain(
      'where public.current_app_user_has_active_client_portal_membership()',
    );
  });

  it('does not create operational company memberships or role assignments', () => {
    expect(clientPortalMemberAccessMigrationSql).not.toContain('insert into public.company_memberships');
    expect(clientPortalMemberAccessMigrationSql).not.toContain('update public.company_memberships');
    expect(clientPortalMemberAccessMigrationSql).not.toContain('insert into public.user_role_assignments');
    expect(clientPortalMemberAccessMigrationSql).not.toContain('update public.user_role_assignments');
  });
});

describe('Client Portal order request membership context migration', () => {
  it('resolves order request company and client from active client portal memberships', () => {
    expect(orderRequestMembershipContextMigrationSql).toContain(
      'create or replace function public.current_app_user_client_portal_memberships()',
    );
    expect(orderRequestMembershipContextMigrationSql).toContain('from public.client_portal_members cpm');
    expect(orderRequestMembershipContextMigrationSql).toContain("cpm.status = 'active'");
    expect(orderRequestMembershipContextMigrationSql).toContain(
      'select readable.company_id, readable.client_id',
    );
    expect(orderRequestMembershipContextMigrationSql).toContain(
      'from public.current_app_user_client_portal_memberships() readable',
    );
    expect(orderRequestMembershipContextMigrationSql).toContain('v_company_id');
    expect(orderRequestMembershipContextMigrationSql).toContain('v_client_id');
  });

  it('raises specific request-create auth permission membership and field errors', () => {
    [
      'client_portal_authentication_required',
      'client_portal_order_request_permission_required',
      'client_portal_membership_required',
      'property_address_required',
      'property_type_required',
      'report_type_required',
      'requested_due_date_must_be_future',
      'client_contact_email_invalid',
    ].forEach((errorName) => {
      expect(orderRequestMembershipContextMigrationSql).toContain(errorName);
    });
  });

  it('does not grant operational company access while fixing request creation', () => {
    expect(orderRequestMembershipContextMigrationSql).not.toContain('insert into public.company_memberships');
    expect(orderRequestMembershipContextMigrationSql).not.toContain('update public.company_memberships');
    expect(orderRequestMembershipContextMigrationSql).not.toContain('insert into public.user_role_assignments');
    expect(orderRequestMembershipContextMigrationSql).not.toContain('update public.user_role_assignments');
  });
});

describe('Client Portal pending request visibility migration', () => {
  it('creates a dedicated safe pending request RPC for client portal members', () => {
    expect(pendingRequestVisibilityMigrationSql).toContain(
      'create or replace function public.rpc_client_portal_pending_order_requests()',
    );
    expect(pendingRequestVisibilityMigrationSql).toContain(
      'public.current_app_user_can_read_client_portal()',
    );
    expect(pendingRequestVisibilityMigrationSql).toContain(
      'join public.current_app_user_client_portal_memberships() readable',
    );
    expect(pendingRequestVisibilityMigrationSql).toContain('readable.company_id = cpor.company_id');
    expect(pendingRequestVisibilityMigrationSql).toContain('readable.client_id = cpor.client_id');
  });

  it('returns only unconverted submitted or under-review intake requests', () => {
    expect(pendingRequestVisibilityMigrationSql).toContain('from public.client_portal_order_requests cpor');
    expect(pendingRequestVisibilityMigrationSql).toContain('cpor.accepted_order_id is null');
    expect(pendingRequestVisibilityMigrationSql).toContain("cpor.status in ('submitted', 'under_review')");
    expect(pendingRequestVisibilityMigrationSql).toContain("when 'submitted' then 'Submitted'");
    expect(pendingRequestVisibilityMigrationSql).toContain("when 'under_review' then 'Awaiting review'");
  });

  it('exposes client-safe pending request fields and no internal workflow details', () => {
    [
      'request_key text',
      'status_label text',
      'property_address text',
      'property_type text',
      'report_type text',
      'requested_due_date date',
      'submitted_at timestamptz',
      'status_copy text',
      'Your appraisal team is reviewing this request.',
    ].forEach((field) => {
      expect(pendingRequestVisibilityMigrationSql).toContain(field);
    });

    [
      'accepted_order_id uuid',
      'reviewed_by_user_id uuid',
      'reviewed_by_name',
      'reviewed_by_email',
      'vendor_company_id',
      'procurement_status',
      'assignment_key',
      'invoice',
      'fee_amount',
      'amc_margin',
      'internal_note',
      'private_note',
    ].forEach((field) => {
      expect(pendingRequestVisibilityMigrationSql).not.toContain(field);
    });
  });
});

describe('Client Portal order request conversion migration', () => {
  it('creates a dedicated staff conversion RPC', () => {
    expect(orderRequestConversionMigrationSql).toContain(
      'create or replace function public.rpc_client_portal_order_request_convert_to_order(',
    );
    expect(orderRequestConversionMigrationSql).toContain(
      'grant execute on function public.rpc_client_portal_order_request_convert_to_order(text)',
    );
    expect(orderRequestConversionMigrationSql).toContain(
      'comment on function public.rpc_client_portal_order_request_convert_to_order(text)',
    );
  });

  it('requires staff request manage and order create authority', () => {
    expect(orderRequestConversionMigrationSql).toContain(
      'public.current_app_user_can_manage_client_portal_order_requests()',
    );
    expect(orderRequestConversionMigrationSql).toContain('public.current_app_user_can_create_order()');
    expect(orderRequestConversionMigrationSql).toContain(
      "raise exception 'client_portal_order_requests_manage_required'",
    );
    expect(orderRequestConversionMigrationSql).toContain("raise exception 'orders_create_required'");
  });

  it('scopes conversion to the current company and opaque request key', () => {
    expect(orderRequestConversionMigrationSql).toContain('cpor.company_id = public.current_company_id()');
    expect(orderRequestConversionMigrationSql).toContain(
      'public.client_portal_order_request_key(cpor.id, cpor.company_id, cpor.client_id) = v_request_key',
    );
    expect(orderRequestConversionMigrationSql).toContain('for update');
  });

  it('blocks declined cancelled and already converted requests', () => {
    expect(orderRequestConversionMigrationSql).toContain("v_request.status in ('declined', 'cancelled')");
    expect(orderRequestConversionMigrationSql).toContain('v_request.accepted_order_id is not null');
    expect(orderRequestConversionMigrationSql).toContain("v_request.status = 'accepted'");
    expect(orderRequestConversionMigrationSql).toContain(
      "raise exception 'client_portal_order_request_already_converted'",
    );
  });

  it('maps client-safe intake fields into a new operational order and links the request', () => {
    expect(orderRequestConversionMigrationSql).toContain('insert into public.orders');
    [
      'v_request.client_id',
      'v_request.property_address',
      'v_request.property_type',
      'v_request.report_type',
      'v_request.borrower_contact_name',
      'v_request.client_contact_name',
      'v_request.client_contact_email',
      'v_request.client_contact_phone',
      'v_request.loan_purpose',
      'v_request.notes',
      'v_request.requested_due_date',
    ].forEach((field) => {
      expect(orderRequestConversionMigrationSql).toContain(field);
    });
    expect(orderRequestConversionMigrationSql).toContain("set status = 'accepted'");
    expect(orderRequestConversionMigrationSql).toContain('accepted_order_id = v_order.id');
  });

  it('does not create downstream operational side records during conversion', () => {
    [
      'insert into public.order_company_assignments',
      'insert into public.order_vendor_bid_requests',
      'insert into public.order_vendor_bid_request_recipients',
      'insert into public.order_vendor_bid_responses',
      'insert into public.amc_vendor_invoices',
      'insert into public.amc_vendor_payment_ledger',
      'insert into public.order_documents',
    ].forEach((statement) => {
      expect(orderRequestConversionMigrationSql).not.toContain(statement);
    });
  });
});
