begin;

create extension if not exists "pgcrypto";

create table if not exists public.order_company_assignment_internal_notes (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.order_company_assignments(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  owner_company_id uuid not null references public.companies(id) on delete cascade,
  author_user_id uuid not null references public.users(id) on delete restrict,
  note_context text not null default 'review',
  note_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_company_assignment_internal_notes_context_valid
    check (note_context in ('review', 'revision', 'completion', 'general')),
  constraint order_company_assignment_internal_notes_text_present
    check (length(btrim(note_text)) > 0 and length(note_text) <= 4000)
);

create index if not exists order_company_assignment_internal_notes_assignment_created_idx
  on public.order_company_assignment_internal_notes (assignment_id, created_at desc);

create index if not exists order_company_assignment_internal_notes_owner_assignment_idx
  on public.order_company_assignment_internal_notes (owner_company_id, assignment_id);

create index if not exists order_company_assignment_internal_notes_order_idx
  on public.order_company_assignment_internal_notes (order_id);

alter table public.order_company_assignment_internal_notes enable row level security;

revoke all privileges on table public.order_company_assignment_internal_notes from public, anon, authenticated;
grant all privileges on table public.order_company_assignment_internal_notes to service_role;

comment on table public.order_company_assignment_internal_notes is
  'AMC-11A internal-only coordinator notes for vendor assignment review/revision decisions. These notes are coordinator-private, are not assignment activity, are not notification payloads, are not public token payloads, and must never be returned by Vendor Workspace RPCs.';

comment on column public.order_company_assignment_internal_notes.note_text is
  'Private internal/AMC coordinator note text. Keep separate from vendor-facing revision instructions and vendor notifications.';

create or replace function public.rpc_amc_vendor_assignment_internal_notes(
  p_assignment_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_assignment public.order_company_assignments%rowtype;
  v_order public.orders%rowtype;
  v_relationship public.company_relationships%rowtype;
  v_items jsonb := '[]'::jsonb;
begin
  if p_assignment_id is null then
    raise exception 'assignment id is required';
  end if;

  if v_actor_user_id is null then
    raise exception 'current app user not found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current company membership is required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('order_company_assignments.read_owner') then
    raise exception 'missing required owner assignment read permission'
      using errcode = '42501';
  end if;

  select oca.*
    into v_assignment
    from public.order_company_assignments oca
   where oca.id = p_assignment_id;

  if not found then
    raise exception 'vendor assignment note context not found';
  end if;

  select o.*
    into v_order
    from public.orders o
   where o.id = v_assignment.order_id;

  if not found then
    raise exception 'assignment source order not found';
  end if;

  select cr.*
    into v_relationship
    from public.company_relationships cr
   where cr.id = v_assignment.relationship_id;

  if not found then
    raise exception 'assignment relationship not found';
  end if;

  if v_assignment.owner_company_id <> v_company_id
     or coalesce(v_order.company_id, public.default_company_id()) <> v_company_id
     or v_relationship.source_company_id <> v_assignment.owner_company_id
     or v_relationship.target_company_id <> v_assignment.assigned_company_id
     or v_relationship.relationship_type <> 'amc_vendor'
     or v_assignment.assignment_type <> 'vendor_appraisal'
     or coalesce(v_order.operations_scope, 'internal_operations') <> 'amc_operations'
     or not public.current_app_user_can_read_order(v_assignment.order_id) then
    raise exception 'vendor assignment internal notes are not available'
      using errcode = '42501';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'note_key', encode(
          extensions.digest(
            concat_ws(':', n.id::text, n.assignment_id::text, n.created_at::text),
            'sha256'
          ),
          'hex'
        ),
        'note_context', n.note_context,
        'note_text', n.note_text,
        'author_name', coalesce(nullif(u.display_name, ''), nullif(u.full_name, ''), nullif(u.name, ''), u.email, 'Internal user'),
        'created_at', n.created_at
      )
      order by n.created_at desc, n.id desc
    ),
    '[]'::jsonb
  )
    into v_items
    from public.order_company_assignment_internal_notes n
    left join public.users u
      on u.id = n.author_user_id
   where n.assignment_id = v_assignment.id
     and n.owner_company_id = v_company_id;

  return jsonb_build_object(
    'ok', true,
    'items', v_items
  );
end;
$$;

create or replace function public.rpc_amc_add_vendor_assignment_internal_note(
  p_assignment_id uuid,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_company_id uuid := public.current_company_id();
  v_assignment public.order_company_assignments%rowtype;
  v_order public.orders%rowtype;
  v_relationship public.company_relationships%rowtype;
  v_note_text text := nullif(btrim(coalesce(p_payload->>'note_text', p_payload->>'note', '')), '');
  v_note_context text := lower(nullif(btrim(coalesce(p_payload->>'note_context', p_payload->>'context', 'review')), ''));
  v_note_id uuid;
  v_created_at timestamptz;
begin
  if p_assignment_id is null then
    raise exception 'assignment id is required';
  end if;

  if v_actor_user_id is null then
    raise exception 'current app user not found'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_current_company() then
    raise exception 'current company membership is required'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('order_company_assignments.read_owner') then
    raise exception 'missing required owner assignment read permission'
      using errcode = '42501';
  end if;

  if not public.current_app_user_has_permission('order_company_assignments.complete') then
    raise exception 'missing required vendor assignment review permission'
      using errcode = '42501';
  end if;

  if v_note_text is null then
    return jsonb_build_object(
      'ok', false,
      'error', 'internal_note_invalid',
      'field_errors', jsonb_build_object('note_text', 'Add an internal note.')
    );
  end if;

  if length(v_note_text) > 4000 then
    return jsonb_build_object(
      'ok', false,
      'error', 'internal_note_invalid',
      'field_errors', jsonb_build_object('note_text', 'Internal notes must be 4000 characters or fewer.')
    );
  end if;

  if v_note_context is null or v_note_context not in ('review', 'revision', 'completion', 'general') then
    return jsonb_build_object(
      'ok', false,
      'error', 'internal_note_invalid',
      'field_errors', jsonb_build_object('note_context', 'Choose a valid note context.')
    );
  end if;

  select oca.*
    into v_assignment
    from public.order_company_assignments oca
   where oca.id = p_assignment_id;

  if not found then
    raise exception 'vendor assignment note context not found';
  end if;

  select o.*
    into v_order
    from public.orders o
   where o.id = v_assignment.order_id;

  if not found then
    raise exception 'assignment source order not found';
  end if;

  select cr.*
    into v_relationship
    from public.company_relationships cr
   where cr.id = v_assignment.relationship_id;

  if not found then
    raise exception 'assignment relationship not found';
  end if;

  if v_assignment.owner_company_id <> v_company_id
     or coalesce(v_order.company_id, public.default_company_id()) <> v_company_id
     or v_relationship.source_company_id <> v_assignment.owner_company_id
     or v_relationship.target_company_id <> v_assignment.assigned_company_id
     or v_relationship.relationship_type <> 'amc_vendor'
     or v_assignment.assignment_type <> 'vendor_appraisal'
     or coalesce(v_order.operations_scope, 'internal_operations') <> 'amc_operations'
     or not public.current_app_user_can_read_order(v_assignment.order_id) then
    raise exception 'vendor assignment internal notes are not available'
      using errcode = '42501';
  end if;

  insert into public.order_company_assignment_internal_notes (
    assignment_id,
    order_id,
    owner_company_id,
    author_user_id,
    note_context,
    note_text
  )
  values (
    v_assignment.id,
    v_assignment.order_id,
    v_company_id,
    v_actor_user_id,
    v_note_context,
    v_note_text
  )
  returning id, created_at
    into v_note_id, v_created_at;

  return jsonb_build_object(
    'ok', true,
    'message', 'Internal note saved.',
    'note', jsonb_build_object(
      'note_key', encode(
        extensions.digest(
          concat_ws(':', v_note_id::text, v_assignment.id::text, v_created_at::text),
          'sha256'
        ),
        'hex'
      ),
      'note_context', v_note_context,
      'note_text', v_note_text,
      'created_at', v_created_at
    )
  );
end;
$$;

revoke all on function public.rpc_amc_vendor_assignment_internal_notes(uuid) from public, anon;
revoke all on function public.rpc_amc_add_vendor_assignment_internal_note(uuid, jsonb) from public, anon;

grant execute on function public.rpc_amc_vendor_assignment_internal_notes(uuid) to authenticated, service_role;
grant execute on function public.rpc_amc_add_vendor_assignment_internal_note(uuid, jsonb) to authenticated, service_role;

comment on function public.rpc_amc_vendor_assignment_internal_notes(uuid) is
  'AMC-11A owner/AMC-only vendor assignment internal notes read. Requires owner assignment read authority, owner current company scope, AMC order scope, vendor_appraisal/amc_vendor context, and current_app_user_can_read_order. Returns private coordinator notes only and never returns Vendor Workspace payload fields, notifications, activity payloads, public token data, storage paths, client fees, AMC margins, candidate/procurement data, or vendor-facing revision instructions.';

comment on function public.rpc_amc_add_vendor_assignment_internal_note(uuid, jsonb) is
  'AMC-11A owner/AMC-only vendor assignment internal note create. Requires owner assignment read and complete/review authority, owner current company scope, AMC order scope, vendor_appraisal/amc_vendor context, and current_app_user_can_read_order. Writes only to order_company_assignment_internal_notes and intentionally does not write shared activity, notifications, Vendor Workspace payloads, public token payloads, assignment lifecycle status, orders, or vendor-facing revision instructions.';

commit;
