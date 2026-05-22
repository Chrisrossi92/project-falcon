begin;

insert into public.permissions (key, category, label, description, is_system, is_owner_only)
values
  (
    'orders.cancel',
    'orders',
    'Cancel orders',
    'Future permission for cancelling legitimate orders that stop before completion.',
    true,
    false
  ),
  (
    'orders.void',
    'orders',
    'Void orders',
    'Future permission for administratively invalidating erroneous, duplicate, or mistaken orders.',
    true,
    false
  )
on conflict (key) do update
  set category = excluded.category,
      label = excluded.label,
      description = excluded.description,
      is_system = excluded.is_system,
      is_owner_only = excluded.is_owner_only,
      updated_at = now();

-- CRUD Stabilization Sprint 2L seeds future order cancel/void permissions only.
-- No role grants, RPCs, UI, statuses, or behavior are introduced.

commit;
