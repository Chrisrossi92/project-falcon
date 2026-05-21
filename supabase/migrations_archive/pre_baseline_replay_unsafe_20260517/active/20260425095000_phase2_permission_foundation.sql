begin;

-- Phase 2 Step 1:
-- Permission system foundation only.
-- This migration creates normalized permission tables and system seed data.
-- It intentionally does not connect permissions to RLS, helpers, or app logic yet.

create extension if not exists "pgcrypto";

create table if not exists public.permissions (
  key text primary key,
  category text not null,
  label text not null,
  description text,
  is_system boolean not null default true,
  is_owner_only boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid null,
  name text not null,
  description text,
  is_template boolean not null default false,
  is_system boolean not null default false,
  is_owner_role boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists roles_company_name_unique
  on public.roles (company_id, lower(name))
  where company_id is not null;

create unique index if not exists roles_template_name_unique
  on public.roles (lower(name))
  where company_id is null;

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_key text not null references public.permissions(key) on delete cascade,
  granted_by uuid null references public.users(id),
  granted_at timestamptz not null default now(),
  primary key (role_id, permission_key)
);

insert into public.permissions (key, category, label, description, is_system, is_owner_only)
values
  ('company.read', 'company', 'Read company', 'View company profile and basic company context.', true, false),
  ('company.update_profile', 'company', 'Update company profile', 'Update company profile and public business details.', true, false),
  ('company.manage_branding', 'company', 'Manage branding', 'Manage company branding settings.', true, false),
  ('company.manage_locations', 'company', 'Manage locations', 'Manage company locations and service areas.', true, false),
  ('company.manage_integrations', 'company', 'Manage integrations', 'Manage company integrations.', true, false),
  ('company.manage_security', 'company', 'Manage security', 'Manage company security settings.', true, true),
  ('company.transfer_ownership', 'company', 'Transfer ownership', 'Transfer company ownership.', true, true),
  ('company.delete_or_deactivate', 'company', 'Delete or deactivate company', 'Delete or deactivate the company account.', true, true),

  ('users.read', 'users', 'Read users', 'View company users.', true, false),
  ('users.invite', 'users', 'Invite users', 'Invite users to the company.', true, false),
  ('users.create', 'users', 'Create users', 'Create company users.', true, false),
  ('users.update', 'users', 'Update users', 'Update company user profile and access details.', true, false),
  ('users.deactivate', 'users', 'Deactivate users', 'Deactivate company users.', true, false),
  ('users.reset_mfa', 'users', 'Reset MFA', 'Reset multifactor authentication for users.', true, false),
  ('users.manage_company_access', 'users', 'Manage company access', 'Manage user company access.', true, false),
  ('users.grant_owner', 'users', 'Grant owner', 'Grant owner authority.', true, true),
  ('users.revoke_owner', 'users', 'Revoke owner', 'Revoke owner authority.', true, true),

  ('roles.read', 'roles', 'Read roles', 'View roles and permission bundles.', true, false),
  ('roles.create', 'roles', 'Create roles', 'Create company roles.', true, false),
  ('roles.update', 'roles', 'Update roles', 'Update company roles.', true, false),
  ('roles.delete', 'roles', 'Delete roles', 'Delete company roles.', true, false),
  ('roles.assign', 'roles', 'Assign roles', 'Assign roles to users.', true, false),
  ('roles.manage_permissions', 'roles', 'Manage role permissions', 'Manage permissions granted to roles.', true, false),
  ('roles.manage_owner_role', 'roles', 'Manage owner role', 'Manage protected owner role permissions.', true, true),
  ('roles.delete_system_role', 'roles', 'Delete system role', 'Delete protected system roles.', true, true),

  ('clients.create', 'clients', 'Create clients', 'Create client records.', true, false),
  ('clients.read.assigned', 'clients', 'Read assigned clients', 'View clients connected to assigned work.', true, false),
  ('clients.read.all', 'clients', 'Read all clients', 'View all company clients.', true, false),
  ('clients.update.assigned', 'clients', 'Update assigned clients', 'Update clients connected to assigned work.', true, false),
  ('clients.update.all', 'clients', 'Update all clients', 'Update all company clients.', true, false),
  ('clients.delete', 'clients', 'Delete clients', 'Delete client records.', true, false),
  ('clients.archive', 'clients', 'Archive clients', 'Archive client records.', true, false),

  ('orders.create', 'orders', 'Create orders', 'Create orders.', true, false),
  ('orders.read.assigned', 'orders', 'Read assigned orders', 'View assigned or responsible orders.', true, false),
  ('orders.read.all', 'orders', 'Read all orders', 'View all company orders.', true, false),
  ('orders.update.assigned', 'orders', 'Update assigned orders', 'Update assigned or responsible orders.', true, false),
  ('orders.update.all', 'orders', 'Update all orders', 'Update all company orders.', true, false),
  ('orders.delete', 'orders', 'Delete orders', 'Delete orders.', true, false),
  ('orders.archive', 'orders', 'Archive orders', 'Archive orders.', true, false),
  ('orders.export', 'orders', 'Export orders', 'Export order data.', true, false),

  ('assignments.read', 'assignments', 'Read assignments', 'View order assignments.', true, false),
  ('assignments.assign_appraiser', 'assignments', 'Assign appraiser', 'Assign appraisers to orders.', true, false),
  ('assignments.assign_reviewer', 'assignments', 'Assign reviewer', 'Assign reviewers to orders.', true, false),
  ('assignments.assign_inspector', 'assignments', 'Assign inspector', 'Assign inspectors to orders.', true, false),
  ('assignments.assign_billing', 'assignments', 'Assign billing', 'Assign billing responsibility to orders.', true, false),
  ('assignments.reassign', 'assignments', 'Reassign orders', 'Reassign order responsibility.', true, false),
  ('assignments.clear', 'assignments', 'Clear assignments', 'Clear order assignments.', true, false),

  ('workflow.status.submit_to_review', 'workflow', 'Submit to review', 'Submit assigned work to review.', true, false),
  ('workflow.status.request_revisions', 'workflow', 'Request revisions', 'Request revisions on review work.', true, false),
  ('workflow.status.resubmit', 'workflow', 'Resubmit after revisions', 'Resubmit work after revisions.', true, false),
  ('workflow.status.approve_review', 'workflow', 'Approve review', 'Approve reviewed work.', true, false),
  ('workflow.status.ready_for_client', 'workflow', 'Mark ready for client', 'Mark work ready for client delivery.', true, false),
  ('workflow.status.deliver_to_client', 'workflow', 'Deliver to client', 'Deliver completed work to the client.', true, false),
  ('workflow.status.complete', 'workflow', 'Complete order', 'Complete orders.', true, false),
  ('workflow.status.reopen', 'workflow', 'Reopen order', 'Reopen completed or closed orders.', true, false),
  ('workflow.override_status', 'workflow', 'Override status', 'Override normal workflow status rules.', true, false),

  ('activity.read.assigned', 'activity', 'Read assigned activity', 'View activity for assigned or responsible work.', true, false),
  ('activity.read.all', 'activity', 'Read all activity', 'View all company activity.', true, false),
  ('activity.create.note.assigned', 'activity', 'Create assigned note', 'Create notes on assigned or responsible work.', true, false),
  ('activity.create.note.all', 'activity', 'Create note on all work', 'Create notes on any company order.', true, false),
  ('activity.create.system_event', 'activity', 'Create system activity', 'Create system activity events.', true, false),
  ('activity.edit_own_note', 'activity', 'Edit own note', 'Edit own activity notes.', true, false),
  ('activity.delete_own_note', 'activity', 'Delete own note', 'Delete own activity notes.', true, false),
  ('activity.moderate', 'activity', 'Moderate activity', 'Moderate activity and communication records.', true, false),

  ('communications.view.assigned', 'communications', 'View assigned communications', 'View communications for assigned or responsible work.', true, false),
  ('communications.view.all', 'communications', 'View all communications', 'View all company communications.', true, false),
  ('communications.reply.assigned', 'communications', 'Reply to assigned communications', 'Reply to communications for assigned or responsible work.', true, false),
  ('communications.reply.all', 'communications', 'Reply to all communications', 'Reply to all company communications.', true, false),
  ('communications.tag_users', 'communications', 'Tag users', 'Tag users in communications.', true, false),
  ('communications.mark_important', 'communications', 'Mark communication important', 'Mark communications as important.', true, false),

  ('notifications.read_own', 'notifications', 'Read own notifications', 'Read own notifications.', true, false),
  ('notifications.mark_read_own', 'notifications', 'Mark own notifications read', 'Mark own notifications as read.', true, false),
  ('notifications.preferences.manage_own', 'notifications', 'Manage own notification preferences', 'Manage own notification preferences.', true, false),
  ('notifications.preferences.manage_company', 'notifications', 'Manage company notification preferences', 'Manage company notification preferences.', true, false),
  ('notifications.send_manual', 'notifications', 'Send manual notifications', 'Send manual notifications.', true, false),
  ('notifications.audit_delivery', 'notifications', 'Audit notification delivery', 'Audit notification delivery.', true, false),

  ('documents.upload.assigned', 'documents', 'Upload assigned documents', 'Upload documents for assigned or responsible work.', true, false),
  ('documents.upload.all', 'documents', 'Upload all documents', 'Upload documents for any company work.', true, false),
  ('documents.read.assigned', 'documents', 'Read assigned documents', 'Read documents for assigned or responsible work.', true, false),
  ('documents.read.all', 'documents', 'Read all documents', 'Read all company documents.', true, false),
  ('documents.delete', 'documents', 'Delete documents', 'Delete documents.', true, false),
  ('documents.publish_to_client', 'documents', 'Publish documents to client', 'Publish documents to clients.', true, false),

  ('billing.read', 'billing', 'Read billing', 'View billing records.', true, false),
  ('billing.update', 'billing', 'Update billing', 'Update billing records.', true, false),
  ('billing.invoice.create', 'billing', 'Create invoices', 'Create invoices.', true, false),
  ('billing.invoice.send', 'billing', 'Send invoices', 'Send invoices.', true, false),
  ('billing.payment.record', 'billing', 'Record payments', 'Record payments.', true, false),
  ('billing.export', 'billing', 'Export billing', 'Export billing records.', true, false),
  ('billing.manage_rates', 'billing', 'Manage rates', 'Manage billing rates.', true, false),
  ('billing.manage_subscription', 'billing', 'Manage subscription', 'Manage company subscription and billing authority.', true, true),

  ('reports.view_operations', 'reports', 'View operations reports', 'View operations reports.', true, false),
  ('reports.view_review_queue', 'reports', 'View review queue reports', 'View review queue reports.', true, false),
  ('reports.view_appraiser_performance', 'reports', 'View appraiser performance reports', 'View appraiser performance reports.', true, false),
  ('reports.view_billing', 'reports', 'View billing reports', 'View billing reports.', true, false),
  ('reports.export', 'reports', 'Export reports', 'Export reports.', true, false),

  ('settings.view', 'settings', 'View settings', 'View settings.', true, false),
  ('settings.manage_workflow', 'settings', 'Manage workflow settings', 'Manage workflow settings.', true, false),
  ('settings.manage_notifications', 'settings', 'Manage notification settings', 'Manage notification settings.', true, false),
  ('settings.manage_templates', 'settings', 'Manage templates', 'Manage templates.', true, false),
  ('settings.manage_authentication', 'settings', 'Manage authentication settings', 'Manage authentication settings.', true, true),
  ('settings.manage_data_retention', 'settings', 'Manage data retention', 'Manage data retention settings.', true, true),
  ('settings.manage_integrations.secrets', 'settings', 'Manage integration secrets', 'Manage integration secrets.', true, true),

  ('navigation.dashboard.view', 'navigation', 'View dashboard navigation', 'Show dashboard navigation.', true, false),
  ('navigation.orders.view', 'navigation', 'View orders navigation', 'Show orders navigation.', true, false),
  ('navigation.clients.view', 'navigation', 'View clients navigation', 'Show clients navigation.', true, false),
  ('navigation.users.view', 'navigation', 'View users navigation', 'Show users navigation.', true, false),
  ('navigation.reports.view', 'navigation', 'View reports navigation', 'Show reports navigation.', true, false),
  ('navigation.billing.view', 'navigation', 'View billing navigation', 'Show billing navigation.', true, false),
  ('navigation.settings.view', 'navigation', 'View settings navigation', 'Show settings navigation.', true, false)
on conflict (key) do update
  set category = excluded.category,
      label = excluded.label,
      description = excluded.description,
      is_system = excluded.is_system,
      is_owner_only = excluded.is_owner_only,
      updated_at = now();

insert into public.roles (name, description, is_template, is_system, is_owner_role)
select name, description, true, true, is_owner_role
from (
  values
    ('Owner', 'Protected owner role with full company authority.', true),
    ('Admin', 'Operational manager role for company workflow and staff operations.', false),
    ('Appraiser', 'Primary production role for assigned appraisal work.', false),
    ('Reviewer', 'Quality control role for assigned review work.', false),
    ('Billing', 'Financial workflow role for billing and invoice work.', false)
) as seed(name, description, is_owner_role)
where not exists (
  select 1
    from public.roles r
   where r.company_id is null
     and lower(r.name) = lower(seed.name)
);

insert into public.role_permissions (role_id, permission_key)
select r.id, p.key
  from public.roles r
  cross join public.permissions p
 where r.company_id is null
   and lower(r.name) = 'owner'
on conflict (role_id, permission_key) do nothing;

with role_permission_seed(role_name, permission_key) as (
  values
    ('Admin', 'navigation.dashboard.view'),
    ('Admin', 'navigation.orders.view'),
    ('Admin', 'navigation.clients.view'),
    ('Admin', 'navigation.users.view'),
    ('Admin', 'navigation.reports.view'),
    ('Admin', 'navigation.settings.view'),
    ('Admin', 'orders.create'),
    ('Admin', 'orders.read.all'),
    ('Admin', 'orders.update.all'),
    ('Admin', 'orders.archive'),
    ('Admin', 'orders.export'),
    ('Admin', 'clients.create'),
    ('Admin', 'clients.read.all'),
    ('Admin', 'clients.update.all'),
    ('Admin', 'clients.archive'),
    ('Admin', 'assignments.read'),
    ('Admin', 'assignments.assign_appraiser'),
    ('Admin', 'assignments.assign_reviewer'),
    ('Admin', 'assignments.assign_inspector'),
    ('Admin', 'assignments.assign_billing'),
    ('Admin', 'assignments.reassign'),
    ('Admin', 'assignments.clear'),
    ('Admin', 'workflow.status.ready_for_client'),
    ('Admin', 'workflow.status.deliver_to_client'),
    ('Admin', 'workflow.status.complete'),
    ('Admin', 'workflow.status.reopen'),
    ('Admin', 'workflow.override_status'),
    ('Admin', 'activity.read.all'),
    ('Admin', 'activity.create.note.all'),
    ('Admin', 'activity.moderate'),
    ('Admin', 'communications.view.all'),
    ('Admin', 'communications.reply.all'),
    ('Admin', 'communications.tag_users'),
    ('Admin', 'communications.mark_important'),
    ('Admin', 'notifications.read_own'),
    ('Admin', 'notifications.mark_read_own'),
    ('Admin', 'notifications.preferences.manage_own'),
    ('Admin', 'notifications.preferences.manage_company'),
    ('Admin', 'notifications.audit_delivery'),
    ('Admin', 'documents.upload.all'),
    ('Admin', 'documents.read.all'),
    ('Admin', 'documents.delete'),
    ('Admin', 'documents.publish_to_client'),
    ('Admin', 'reports.view_operations'),
    ('Admin', 'reports.view_review_queue'),
    ('Admin', 'reports.export'),
    ('Admin', 'settings.view'),
    ('Admin', 'settings.manage_workflow'),
    ('Admin', 'settings.manage_notifications'),
    ('Admin', 'settings.manage_templates'),
    ('Admin', 'users.read'),
    ('Admin', 'users.invite'),
    ('Admin', 'users.update'),
    ('Admin', 'users.deactivate'),
    ('Admin', 'roles.read'),
    ('Admin', 'roles.assign'),

    ('Appraiser', 'navigation.dashboard.view'),
    ('Appraiser', 'navigation.orders.view'),
    ('Appraiser', 'orders.read.assigned'),
    ('Appraiser', 'orders.update.assigned'),
    ('Appraiser', 'clients.read.assigned'),
    ('Appraiser', 'workflow.status.submit_to_review'),
    ('Appraiser', 'workflow.status.resubmit'),
    ('Appraiser', 'activity.read.assigned'),
    ('Appraiser', 'activity.create.note.assigned'),
    ('Appraiser', 'communications.view.assigned'),
    ('Appraiser', 'communications.reply.assigned'),
    ('Appraiser', 'communications.tag_users'),
    ('Appraiser', 'documents.upload.assigned'),
    ('Appraiser', 'documents.read.assigned'),
    ('Appraiser', 'notifications.read_own'),
    ('Appraiser', 'notifications.mark_read_own'),
    ('Appraiser', 'notifications.preferences.manage_own'),

    ('Reviewer', 'navigation.dashboard.view'),
    ('Reviewer', 'navigation.orders.view'),
    ('Reviewer', 'orders.read.assigned'),
    ('Reviewer', 'orders.update.assigned'),
    ('Reviewer', 'workflow.status.request_revisions'),
    ('Reviewer', 'workflow.status.approve_review'),
    ('Reviewer', 'workflow.status.ready_for_client'),
    ('Reviewer', 'activity.read.assigned'),
    ('Reviewer', 'activity.create.note.assigned'),
    ('Reviewer', 'communications.view.assigned'),
    ('Reviewer', 'communications.reply.assigned'),
    ('Reviewer', 'communications.tag_users'),
    ('Reviewer', 'documents.read.assigned'),
    ('Reviewer', 'notifications.read_own'),
    ('Reviewer', 'notifications.mark_read_own'),
    ('Reviewer', 'notifications.preferences.manage_own'),
    ('Reviewer', 'reports.view_review_queue'),

    ('Billing', 'navigation.dashboard.view'),
    ('Billing', 'navigation.orders.view'),
    ('Billing', 'navigation.billing.view'),
    ('Billing', 'orders.read.assigned'),
    ('Billing', 'clients.read.assigned'),
    ('Billing', 'billing.read'),
    ('Billing', 'billing.update'),
    ('Billing', 'billing.invoice.create'),
    ('Billing', 'billing.invoice.send'),
    ('Billing', 'billing.payment.record'),
    ('Billing', 'billing.export'),
    ('Billing', 'activity.read.assigned'),
    ('Billing', 'activity.create.note.assigned'),
    ('Billing', 'communications.view.assigned'),
    ('Billing', 'communications.reply.assigned'),
    ('Billing', 'notifications.read_own'),
    ('Billing', 'notifications.mark_read_own'),
    ('Billing', 'notifications.preferences.manage_own'),
    ('Billing', 'reports.view_billing')
)
insert into public.role_permissions (role_id, permission_key)
select r.id, s.permission_key
  from role_permission_seed s
  join public.roles r
    on r.company_id is null
   and lower(r.name) = lower(s.role_name)
  join public.permissions p
    on p.key = s.permission_key
on conflict (role_id, permission_key) do nothing;

commit;
