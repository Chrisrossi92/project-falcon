begin;

create or replace function public.tg_notifications_queue_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_to_user_id uuid;
  v_email text;
  v_subject text;
  v_body text;
  v_template text;
  v_payload jsonb;
  v_company_id uuid;
  v_email_allowed boolean := false;
  v_claims jsonb := '{}'::jsonb;
begin
  begin
    begin
      v_claims := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
    exception
      when others then
        v_claims := '{}'::jsonb;
    end;

    if lower(coalesce(current_setting('app.suppress_notifications', true), '')) in ('1', 'true', 'on', 'yes')
       or lower(coalesce(v_claims->>'suppress_notifications', '')) in ('1', 'true', 'on', 'yes')
       or lower(coalesce(v_claims->>'suppress_email_queue', '')) in ('1', 'true', 'on', 'yes') then
      return NEW;
    end if;

    if NEW.user_id is null or nullif(btrim(coalesce(NEW.type, '')), '') is null then
      return NEW;
    end if;

    if NEW.order_id is not null then
      select o.company_id
        into v_company_id
        from public.orders o
       where o.id = NEW.order_id
       limit 1;
    end if;

    select prefs.effective_enabled
      into v_email_allowed
      from public.notification_user_effective_preference(
        NEW.user_id,
        NEW.type,
        'email',
        v_company_id
      ) prefs;

    if coalesce(v_email_allowed, false) is false then
      return NEW;
    end if;

    select target.to_user_id, target.email_address
      into v_to_user_id, v_email
      from public._notification_email_target_v1(NEW.user_id) target;

    if v_to_user_id is null or v_email is null then
      return NEW;
    end if;

    if NEW.order_id is not null then
      v_subject := coalesce(NEW.title, 'New update on your order');
    else
      v_subject := coalesce(NEW.title, 'New notification');
    end if;

    v_body := coalesce(NEW.message, NEW.body, NEW.title, 'You have a new notification.');
    v_template := coalesce(
      NEW.payload->>'email_template_key',
      NEW.payload->>'template_key',
      NEW.payload->>'templateKey',
      NEW.type,
      'notification'
    );
    v_payload := coalesce(NEW.payload, '{}'::jsonb) || jsonb_build_object(
      'notification_id', NEW.id,
      'notification_type', NEW.type,
      'category', NEW.category,
      'title', v_subject,
      'body', v_body,
      'message', v_body,
      'order_id', NEW.order_id,
      'link_path', NEW.link_path
    );

    insert into public.email_queue(
      user_id,
      to_email,
      subject,
      template,
      payload
    ) values (
      v_to_user_id,
      v_email,
      v_subject,
      v_template,
      v_payload
    );
  exception
    when others then
      null;
  end;

  return NEW;
end;
$$;

comment on function public.tg_notifications_queue_email() is
  'Queues canonical email_queue rows after in-app notification insert only when effective email preference allows it. Historical/import transactions may set app.suppress_notifications or suppress_notifications/suppress_email_queue JWT claims to prevent email queue fanout.';

commit;
