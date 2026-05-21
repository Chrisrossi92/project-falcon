begin;

-- Align template role permissions with the reviewer-to-admin workflow split.
-- Reviewers clear review into `review_cleared`; client release / ready-for-client
-- is admin/owner-owned by default after review clearance.
-- Keep `workflow.status.approve_review` for the reviewer clear-review action.

delete from public.role_permissions rp
using public.roles r
where rp.role_id = r.id
  and r.company_id is null
  and lower(r.name) = 'reviewer'
  and rp.permission_key = 'workflow.status.ready_for_client';

commit;
