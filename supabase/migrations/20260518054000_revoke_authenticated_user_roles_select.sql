-- Phase 8C5K1: remove direct app-role reads from legacy role strings.
--
-- public.user_roles remains for backend compatibility while legacy helpers,
-- policies, and default-company fallback paths are replaced. Browser/app
-- callers must use company-scoped RPCs and permission/context projections.

revoke select on table public.user_roles from public;
revoke select on table public.user_roles from anon;
revoke select on table public.user_roles from authenticated;

comment on table public.user_roles is
  'Deprecated legacy role-string compatibility table. Frontend/app-role direct access is revoked; remaining backend helper and policy dependencies must be replaced before table retirement.';
