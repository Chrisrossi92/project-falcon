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
  v_old_site_visit_at timestamptz := date_trunc(
    'minute',
    coalesce(OLD.site_visit_at::timestamptz, OLD.site_visit_date::timestamptz, OLD.inspection_date::timestamptz)
  );
  v_new_site_visit_at timestamptz := date_trunc(
    'minute',
    coalesce(NEW.site_visit_at::timestamptz, NEW.site_visit_date::timestamptz, NEW.inspection_date::timestamptz)
  );
  v_old_review_due_date date := coalesce(OLD.review_due_at::date, OLD.review_due_date, OLD.due_for_review);
  v_new_review_due_date date := coalesce(NEW.review_due_at::date, NEW.review_due_date, NEW.due_for_review);
  v_old_final_due_date date := coalesce(OLD.final_due_at::date, OLD.client_due_at::date, OLD.due_to_client, OLD.due_date);
  v_new_final_due_date date := coalesce(NEW.final_due_at::date, NEW.client_due_at::date, NEW.due_to_client, NEW.due_date);
begin
  if NEW.status is distinct from OLD.status then
    insert into public.activity_log(order_id, company_id, event_type, detail, actor_id)
    values (NEW.id, NEW.company_id, 'status_changed', jsonb_build_object('from', OLD.status, 'to', NEW.status), v_actor);
  end if;

  if v_new_site_visit_at is distinct from v_old_site_visit_at
     or v_new_review_due_date is distinct from v_old_review_due_date
     or v_new_final_due_date is distinct from v_old_final_due_date then
    insert into public.activity_log(order_id, company_id, event_type, detail, actor_id)
    values (
      NEW.id,
      NEW.company_id,
      'dates_updated',
      jsonb_build_object(
        'site_visit_at', v_new_site_visit_at,
        'review_due_at', v_new_review_due_date,
        'final_due_at', v_new_final_due_date
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
  'V1 assignment/date/fee activity audit trigger. Date activity uses normalized business values so fee-only or no-op saves do not create false dates_updated activity.';

create or replace function public.tg_orders_v1_date_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid := public.current_app_user_id();
  v_old_site_visit_at timestamptz;
  v_new_site_visit_at timestamptz;
  v_old_review_due_date date;
  v_new_review_due_date date;
  v_old_final_due_date date;
  v_new_final_due_date date;
begin
  v_old_site_visit_at := date_trunc(
    'minute',
    coalesce(OLD.site_visit_at::timestamptz, OLD.site_visit_date::timestamptz, OLD.inspection_date::timestamptz)
  );
  v_new_site_visit_at := date_trunc(
    'minute',
    coalesce(NEW.site_visit_at::timestamptz, NEW.site_visit_date::timestamptz, NEW.inspection_date::timestamptz)
  );
  v_old_review_due_date := coalesce(OLD.review_due_at::date, OLD.review_due_date, OLD.due_for_review);
  v_new_review_due_date := coalesce(NEW.review_due_at::date, NEW.review_due_date, NEW.due_for_review);
  v_old_final_due_date := coalesce(OLD.final_due_at::date, OLD.client_due_at::date, OLD.due_to_client, OLD.due_date);
  v_new_final_due_date := coalesce(NEW.final_due_at::date, NEW.client_due_at::date, NEW.due_to_client, NEW.due_date);

  if v_new_site_visit_at is distinct from v_old_site_visit_at then
    perform public.notify_order_v1_event(
      NEW.id,
      'order.site_visit_updated',
      array['appraiser', 'admin_owner'],
      jsonb_build_object(
        'previous_site_visit_at', v_old_site_visit_at,
        'site_visit_at', v_new_site_visit_at
      ),
      v_actor_user_id
    );
  end if;

  if v_new_review_due_date is distinct from v_old_review_due_date
     or v_new_final_due_date is distinct from v_old_final_due_date then
    perform public.notify_order_v1_event(
      NEW.id,
      'order.dates_updated',
      array['appraiser', 'reviewer', 'admin_owner'],
      jsonb_build_object(
        'previous_review_due_at', v_old_review_due_date,
        'review_due_at', v_new_review_due_date,
        'previous_final_due_at', v_old_final_due_date,
        'final_due_at', v_new_final_due_date
      ),
      v_actor_user_id
    );
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_orders_v1_date_notification on public.orders;
create trigger trg_orders_v1_date_notification
after update of
  site_visit_at,
  site_visit_date,
  inspection_date,
  review_due_at,
  review_due_date,
  due_for_review,
  final_due_at,
  due_date,
  client_due_at,
  due_to_client
on public.orders
for each row execute function public.tg_orders_v1_date_notification();

comment on function public.tg_orders_v1_date_notification() is
  'RC1 date notification guard. Emits date/site-visit notifications only when normalized business date values actually change, preventing fee-only or no-op saves from queuing noisy emails.';

commit;
