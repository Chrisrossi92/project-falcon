begin;

create or replace function public.tg_orders_audit_upd()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.current_app_user_id();
  v_old_appraiser_id uuid := coalesce(OLD.appraiser_id, OLD.assigned_to);
  v_new_appraiser_id uuid := coalesce(NEW.appraiser_id, NEW.assigned_to);
begin
  if NEW.status is distinct from OLD.status then
    insert into public.activity_log(order_id, company_id, event_type, detail, actor_id)
    values (NEW.id, NEW.company_id, 'status_changed', jsonb_build_object('from', OLD.status, 'to', NEW.status), v_actor);
  end if;

  if NEW.site_visit_at is distinct from OLD.site_visit_at
     or NEW.review_due_at is distinct from OLD.review_due_at
     or NEW.final_due_at is distinct from OLD.final_due_at then
    insert into public.activity_log(order_id, company_id, event_type, detail, actor_id)
    values (
      NEW.id,
      NEW.company_id,
      'dates_updated',
      jsonb_build_object(
        'site_visit_at', NEW.site_visit_at,
        'review_due_at', NEW.review_due_at,
        'final_due_at', NEW.final_due_at
      ),
      v_actor
    );
  end if;

  if v_new_appraiser_id is distinct from v_old_appraiser_id then
    insert into public.activity_log(order_id, company_id, event_type, detail, actor_id)
    values (
      NEW.id,
      NEW.company_id,
      'assignee_changed',
      jsonb_build_object(
        'field', 'appraiser',
        'from', v_old_appraiser_id,
        'to', v_new_appraiser_id
      ),
      v_actor
    );
  end if;

  if NEW.reviewer_id is distinct from OLD.reviewer_id then
    insert into public.activity_log(order_id, company_id, event_type, detail, actor_id)
    values (
      NEW.id,
      NEW.company_id,
      'assignee_changed',
      jsonb_build_object('field', 'reviewer_id', 'from', OLD.reviewer_id, 'to', NEW.reviewer_id),
      v_actor
    );
  end if;

  if NEW.base_fee is distinct from OLD.base_fee or NEW.fee_amount is distinct from OLD.fee_amount then
    insert into public.activity_log(order_id, company_id, event_type, detail, actor_id)
    values (
      NEW.id,
      NEW.company_id,
      'fee_changed',
      jsonb_build_object('base_fee', NEW.base_fee, 'fee_amount', NEW.fee_amount),
      v_actor
    );
  end if;

  return NEW;
end;
$$;

comment on function public.tg_orders_audit_upd() is
  'V1 assignment activity audit trigger. Treats appraiser_id and assigned_to as one logical appraiser assignment to avoid duplicate assignment activity rows.';

commit;
