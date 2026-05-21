2025-09-06_orders_activity.sq

BEGIN;

-- 1) Activity table ---------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.activity_log (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_type text NOT NULL,                      -- e.g., order_created, status_changed, dates_updated, assignee_changed, note_added
  detail     jsonb NOT NULL DEFAULT '{}',        -- flexible payload: {"from":"in_progress","to":"in_review"} etc.
  actor_id   uuid,                                -- auth.uid() when available
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_order_id_created_at
  ON public.activity_log (order_id, created_at DESC);

-- 2) RLS: enable + policies ------------------------------------------
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- helper predicates for readability
-- Admin/Reviewer can see everything
DROP POLICY IF EXISTS activity_select_admin ON public.activity_log;
CREATE POLICY activity_select_admin ON public.activity_log
FOR SELECT USING (
  (current_setting('request.jwt.claims', true)::jsonb ->> 'role') IN ('admin','reviewer')
);

-- Appraiser can see logs for orders they can see (assigned to them)
DROP POLICY IF EXISTS activity_select_appraiser ON public.activity_log;
CREATE POLICY activity_select_appraiser ON public.activity_log
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = activity_log.order_id
      AND COALESCE(o.appraiser_id, o.assigned_to) = auth.uid()
  )
);

-- Allow inserts when the user can see the order (used by RPC and by triggers)
DROP POLICY IF EXISTS activity_insert_visible_order ON public.activity_log;
CREATE POLICY activity_insert_visible_order ON public.activity_log
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = activity_log.order_id
      AND (
        (current_setting('request.jwt.claims', true)::jsonb ->> 'role') IN ('admin','reviewer')
        OR COALESCE(o.appraiser_id, o.assigned_to) = auth.uid()
      )
  )
);

-- 3) RPC to add a user note ------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_log_event(p_order_id uuid, p_type text, p_detail jsonb DEFAULT '{}')
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_role text := (current_setting('request.jwt.claims', true)::jsonb ->> 'role');
  v_uid  uuid := auth.uid();
BEGIN
  -- basic visibility check (mirrors RLS)
  IF NOT EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = p_order_id
      AND ( v_role IN ('admin','reviewer') OR COALESCE(o.appraiser_id, o.assigned_to) = v_uid )
  ) THEN
    RAISE EXCEPTION 'not authorized to log event for this order';
  END IF;

  INSERT INTO public.activity_log(order_id, event_type, detail, actor_id)
  VALUES (p_order_id, p_type, COALESCE(p_detail,'{}'::jsonb), v_uid);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_log_event(uuid, text, jsonb) TO anon, authenticated;

-- 4) Order audit triggers (create/update) ------------------------------
CREATE OR REPLACE FUNCTION public.tg_orders_audit_ins()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.activity_log(order_id, event_type, detail, actor_id)
  VALUES (NEW.id, 'order_created',
          jsonb_build_object(
            'status', NEW.status,
            'date_ordered', NEW.date_ordered,
            'client_id', NEW.client_id
          ),
          auth.uid());
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.tg_orders_audit_upd()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_changes jsonb := '{}'::jsonb;
BEGIN
  -- status
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.activity_log(order_id, event_type, detail, actor_id)
    VALUES (NEW.id, 'status_changed', jsonb_build_object('from', OLD.status, 'to', NEW.status), auth.uid());
  END IF;

  -- dates
  IF NEW.site_visit_at IS DISTINCT FROM OLD.site_visit_at
     OR NEW.review_due_at IS DISTINCT FROM OLD.review_due_at
     OR NEW.final_due_at  IS DISTINCT FROM OLD.final_due_at THEN
    INSERT INTO public.activity_log(order_id, event_type, detail, actor_id)
    VALUES (
      NEW.id,
      'dates_updated',
      jsonb_build_object(
        'site_visit_at', NEW.site_visit_at,
        'review_due_at', NEW.review_due_at,
        'final_due_at',  NEW.final_due_at
      ),
      auth.uid()
    );
  END IF;

  -- assignments
  IF NEW.appraiser_id IS DISTINCT FROM OLD.appraiser_id THEN
    INSERT INTO public.activity_log(order_id, event_type, detail, actor_id)
    VALUES (NEW.id, 'assignee_changed', jsonb_build_object('field','appraiser_id','from',OLD.appraiser_id,'to',NEW.appraiser_id), auth.uid());
  END IF;

  IF NEW.reviewer_id IS DISTINCT FROM OLD.reviewer_id THEN
    INSERT INTO public.activity_log(order_id, event_type, detail, actor_id)
    VALUES (NEW.id, 'assignee_changed', jsonb_build_object('field','reviewer_id','from',OLD.reviewer_id,'to',NEW.reviewer_id), auth.uid());
  END IF;

  -- fee change (optional, helpful)
  IF NEW.base_fee IS DISTINCT FROM OLD.base_fee OR NEW.fee_amount IS DISTINCT FROM OLD.fee_amount THEN
    INSERT INTO public.activity_log(order_id, event_type, detail, actor_id)
    VALUES (NEW.id, 'fee_changed', jsonb_build_object('base_fee',NEW.base_fee,'fee_amount',NEW.fee_amount), auth.uid());
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_orders_audit_ins ON public.orders;
CREATE TRIGGER trg_orders_audit_ins
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.tg_orders_audit_ins();

DROP TRIGGER IF EXISTS trg_orders_audit_upd ON public.orders;
CREATE TRIGGER trg_orders_audit_upd
AFTER UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.tg_orders_audit_upd();

COMMIT;

-- Quick tests:
-- SELECT * FROM public.activity_log ORDER BY created_at DESC LIMIT 10;
