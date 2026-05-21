BEGIN;

-- -------------------------------------------------------------------
-- Helpers (tiny functions so policies read cleanly)
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_is_admin()
RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role IN ('admin','reviewer')
  );
$$;

CREATE OR REPLACE FUNCTION public.current_is_appraiser()
RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role = 'appraiser'
  );
$$;

-- -------------------------------------------------------------------
-- ORDERS
-- -------------------------------------------------------------------
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- View policy state (drop & create so we converge)
DROP POLICY IF EXISTS orders_select_admin ON public.orders;
CREATE POLICY orders_select_admin ON public.orders
FOR SELECT USING ( public.current_is_admin() );

DROP POLICY IF EXISTS orders_select_appraiser ON public.orders;
CREATE POLICY orders_select_appraiser ON public.orders
FOR SELECT USING ( public.current_is_appraiser()
                   AND COALESCE(appraiser_id, assigned_to) = auth.uid() );

-- INSERT / UPDATE / DELETE
DROP POLICY IF EXISTS orders_insert_admin ON public.orders;
CREATE POLICY orders_insert_admin ON public.orders
FOR INSERT WITH CHECK ( public.current_is_admin() );

DROP POLICY IF EXISTS orders_update_admin ON public.orders;
CREATE POLICY orders_update_admin ON public.orders
FOR UPDATE USING ( public.current_is_admin() ) WITH CHECK ( public.current_is_admin() );

-- Appraiser may update their assigned orders (status/dates/etc.) — adjust if you want tighter scopes
DROP POLICY IF EXISTS orders_update_my_assigned ON public.orders;
CREATE POLICY orders_update_my_assigned ON public.orders
FOR UPDATE USING ( public.current_is_appraiser()
                   AND COALESCE(appraiser_id, assigned_to) = auth.uid() )
          WITH CHECK ( public.current_is_appraiser()
                       AND COALESCE(appraiser_id, assigned_to) = auth.uid() );

DROP POLICY IF EXISTS orders_delete_admin ON public.orders;
CREATE POLICY orders_delete_admin ON public.orders
FOR DELETE USING ( public.current_is_admin() );

-- Helpful indexes for the above
CREATE INDEX IF NOT EXISTS idx_orders_appraiser ON public.orders (appraiser_id);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_to ON public.orders (assigned_to);
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON public.orders (client_id);

-- -------------------------------------------------------------------
-- CLIENTS
-- -------------------------------------------------------------------
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clients_select_admin ON public.clients;
CREATE POLICY clients_select_admin ON public.clients
FOR SELECT USING ( public.current_is_admin() );

-- Appraiser sees a client only if they have an order with that client
DROP POLICY IF EXISTS clients_select_my_clients ON public.clients;
CREATE POLICY clients_select_my_clients ON public.clients
FOR SELECT USING (
  public.current_is_appraiser() AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.client_id = clients.id
      AND COALESCE(o.is_archived,false) = false
      AND COALESCE(o.appraiser_id, o.assigned_to) = auth.uid()
  )
);

-- Writes only for admins/reviewers
DROP POLICY IF EXISTS clients_write_admin ON public.clients;
CREATE POLICY clients_write_admin ON public.clients
FOR ALL USING ( public.current_is_admin() )
WITH CHECK ( public.current_is_admin() );

-- -------------------------------------------------------------------
-- ACTIVITY LOG (read feed + add notes)
-- -------------------------------------------------------------------
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS activity_select_admin ON public.activity_log;
CREATE POLICY activity_select_admin ON public.activity_log
FOR SELECT USING ( public.current_is_admin() );

DROP POLICY IF EXISTS activity_select_my_orders ON public.activity_log;
CREATE POLICY activity_select_my_orders ON public.activity_log
FOR SELECT USING (
  public.current_is_appraiser() AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = activity_log.order_id
      AND COALESCE(o.appraiser_id, o.assigned_to) = auth.uid()
  )
);

-- Insert allowed for admins/reviewers or the appraiser on that order
DROP POLICY IF EXISTS activity_insert_visible ON public.activity_log;
CREATE POLICY activity_insert_visible ON public.activity_log
FOR INSERT WITH CHECK (
  public.current_is_admin()
  OR EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = activity_log.order_id
      AND COALESCE(o.appraiser_id, o.assigned_to) = auth.uid()
  )
);

-- (Optional) prevent direct updates/deletes to activity rows
DROP POLICY IF EXISTS activity_update_none ON public.activity_log;
CREATE POLICY activity_update_none ON public.activity_log
FOR UPDATE USING ( false ) WITH CHECK ( false );

DROP POLICY IF EXISTS activity_delete_none ON public.activity_log;
CREATE POLICY activity_delete_none ON public.activity_log
FOR DELETE USING ( public.current_is_admin() ); -- or false to block

-- Helpful index
CREATE INDEX IF NOT EXISTS idx_activity_order_id_created_at
  ON public.activity_log (order_id, created_at DESC);

COMMIT;
