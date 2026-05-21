-- Falcon baseline runtime access layer curated from remote public schema dump.
-- Contains RLS enablement, policies, triggers, trigger disable/comment state, and curated grants.
-- Ownership, GRANT ALL, ALTER DEFAULT PRIVILEGES, and platform-role noise are intentionally omitted.

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;




CREATE OR REPLACE TRIGGER "set_timestamp_user_roles" BEFORE UPDATE ON "public"."user_roles" FOR EACH ROW EXECUTE FUNCTION "public"."tg_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_activity_denorm_actor" BEFORE INSERT OR UPDATE ON "public"."activity_log" FOR EACH ROW EXECUTE FUNCTION "public"."tg_activity_denorm_actor"();



CREATE OR REPLACE TRIGGER "trg_activity_log_compat" BEFORE INSERT OR UPDATE ON "public"."activity_log" FOR EACH ROW EXECUTE FUNCTION "public"."activity_log_compat"();



CREATE OR REPLACE TRIGGER "trg_freeze_writes_email_outbox" BEFORE INSERT OR DELETE OR UPDATE ON "public"."email_outbox" FOR EACH ROW EXECUTE FUNCTION "public"."_block_deprecated_runtime_writes"();



CREATE OR REPLACE TRIGGER "trg_freeze_writes_notification_preferences" BEFORE INSERT OR DELETE OR UPDATE ON "public"."notification_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."_block_deprecated_runtime_writes"();



CREATE OR REPLACE TRIGGER "trg_instance_blueprint_set_updated_at" BEFORE UPDATE ON "public"."instance_blueprint" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_notifications_queue_email" AFTER INSERT ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."tg_notifications_queue_email"();



CREATE OR REPLACE TRIGGER "trg_orders_activity" AFTER UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."trg_orders_activity"();

ALTER TABLE "public"."orders" DISABLE TRIGGER "trg_orders_activity";



COMMENT ON TRIGGER "trg_orders_activity" ON "public"."orders" IS 'Disabled 2026-05-03: legacy duplicate activity trigger. Canonical order audit logging is handled by trg_orders_audit_upd / trg_orders_audit_ins.';



CREATE OR REPLACE TRIGGER "trg_orders_audit_ins" AFTER INSERT ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."tg_orders_audit_ins"();



CREATE OR REPLACE TRIGGER "trg_orders_audit_upd" AFTER UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."tg_orders_audit_upd"();



CREATE OR REPLACE TRIGGER "trg_orders_insert_assignment_notification" AFTER INSERT OR UPDATE OF "appraiser_id" ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."tg_orders_insert_assignment_notification"();



CREATE OR REPLACE TRIGGER "trg_orders_log" AFTER INSERT OR UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."log_order_changes"();

ALTER TABLE "public"."orders" DISABLE TRIGGER "trg_orders_log";



COMMENT ON TRIGGER "trg_orders_log" ON "public"."orders" IS 'Disabled 2026-05-03: legacy duplicate activity trigger. Canonical order audit logging is handled by trg_orders_audit_upd / trg_orders_audit_ins.';



CREATE OR REPLACE TRIGGER "trg_schema_decisions_set_updated_at" BEFORE UPDATE ON "public"."schema_decisions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_schema_registry_set_updated_at" BEFORE UPDATE ON "public"."schema_registry" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_users_after_insert_prefs" AFTER INSERT ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."_trg_users_after_insert_prefs"();



CREATE POLICY "Admins can insert logs" ON "public"."activity_log" FOR INSERT WITH CHECK (("auth"."role"() = 'admin'::"text"));



CREATE POLICY "Admins can read all" ON "public"."review_flow" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can read all logs" ON "public"."activity_log" FOR SELECT USING (("auth"."role"() = 'admin'::"text"));



CREATE POLICY "Allow assigned reviewers to read" ON "public"."review_flow" FOR SELECT USING (("auth"."uid"() = "assigned_to"));



CREATE POLICY "Allow delete for all" ON "public"."clients" FOR DELETE USING (true);



CREATE POLICY "Allow insert for All" ON "public"."users" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow insert for all" ON "public"."clients" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow insert for all" ON "public"."order_status_log" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow insert for all users" ON "public"."contacts" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow insert for authenticated" ON "public"."activity_log" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow read to all" ON "public"."users" FOR SELECT USING (true);



CREATE POLICY "Allow select for All" ON "public"."users" FOR SELECT USING (true);



CREATE POLICY "Allow select for all users" ON "public"."contacts" FOR SELECT USING (true);



CREATE POLICY "Allow update for all" ON "public"."order_status_log" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "Allow update for all" ON "public"."users" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "Allow update for all users" ON "public"."clients" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "Allow update for all users" ON "public"."contacts" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "Logged-in users can insert logs" ON "public"."activity_log" FOR INSERT WITH CHECK (("auth"."role"() = ANY (ARRAY['admin'::"text", 'appraiser'::"text"])));



CREATE POLICY "Public profiles are readable" ON "public"."profiles_legacy" FOR SELECT USING (true);



CREATE POLICY "Users can insert own data" ON "public"."users" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can read their notifications" ON "public"."notifications" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view own data" ON "public"."users" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "act_order_scoped" ON "public"."activity_log" USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "activity_log"."order_id") AND ("public"."current_is_admin"() OR ("o"."appraiser_id" = "public"."current_user_id"()) OR (EXISTS ( SELECT 1
           FROM "public"."order_assignments" "oa"
          WHERE (("oa"."order_id" = "o"."id") AND ("oa"."user_id" = "public"."current_user_id"())))) OR (EXISTS ( SELECT 1
           FROM "public"."review_flow" "rf"
          WHERE (("rf"."order_id" = "o"."id") AND ("rf"."assigned_to" = "public"."current_user_id"()))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "activity_log"."order_id") AND ("public"."current_is_admin"() OR ("o"."appraiser_id" = "public"."current_user_id"()) OR (EXISTS ( SELECT 1
           FROM "public"."order_assignments" "oa"
          WHERE (("oa"."order_id" = "o"."id") AND ("oa"."user_id" = "public"."current_user_id"())))) OR (EXISTS ( SELECT 1
           FROM "public"."review_flow" "rf"
          WHERE (("rf"."order_id" = "o"."id") AND ("rf"."assigned_to" = "public"."current_user_id"())))))))));



CREATE POLICY "activity insert note" ON "public"."activity_log" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "activity read for authenticated" ON "public"."activity_log" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "activity_admin_all" ON "public"."activity_events" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."role" = 'admin'::"text")))));



CREATE POLICY "activity_appraiser_relevant" ON "public"."activity_log" FOR SELECT USING (("public"."current_is_appraiser"() AND (("created_by" = "public"."current_user_id"()) OR (EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "activity_log"."order_id") AND (("o"."appraiser_id" = "public"."current_user_id"()) OR ("o"."assigned_to" = "public"."current_user_id"()))))))));



CREATE POLICY "activity_delete_block" ON "public"."activity_log" FOR DELETE TO "authenticated" USING (false);



CREATE POLICY "activity_delete_none" ON "public"."activity_log" FOR DELETE USING ("public"."current_is_admin"());



ALTER TABLE "public"."activity_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "activity_insert" ON "public"."activity_log" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "activity_insert_block" ON "public"."activity_log" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "activity_insert_visible" ON "public"."activity_log" FOR INSERT WITH CHECK (("public"."current_is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "activity_log"."order_id") AND (COALESCE("o"."appraiser_id", "o"."assigned_to") = "public"."current_app_user_id"()))))));



CREATE POLICY "activity_insert_visible_order" ON "public"."activity_log" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "activity_log"."order_id") AND (((("current_setting"('request.jwt.claims'::"text", true))::"jsonb" ->> 'role'::"text") = ANY (ARRAY['admin'::"text", 'reviewer'::"text"])) OR (COALESCE("o"."appraiser_id", "o"."assigned_to") = "public"."current_app_user_id"()))))));



ALTER TABLE "public"."activity_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "activity_log_read" ON "public"."activity_log" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "activity_owner_admin_full_access" ON "public"."activity_log" USING ("public"."current_is_admin"()) WITH CHECK ("public"."current_is_admin"());



CREATE POLICY "activity_read" ON "public"."activity_log" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "activity_read_auth" ON "public"."activity_log" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "activity_read_own_orders" ON "public"."activity_log" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "activity_log"."order_id") AND ((("auth"."role"() = 'anon'::"text") AND false) OR (("auth"."uid"() IS NOT NULL) AND (("o"."appraiser_id" = "auth"."uid"()) OR true)))))));



CREATE POLICY "activity_select_admin" ON "public"."activity_log" FOR SELECT USING ("public"."current_is_admin"());



CREATE POLICY "activity_select_appraiser" ON "public"."activity_log" FOR SELECT USING (("public"."current_is_appraiser"() AND (EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "activity_log"."order_id") AND (COALESCE("o"."appraiser_id", "o"."assigned_to") = "public"."current_app_user_id"()))))));



CREATE POLICY "activity_select_my_orders" ON "public"."activity_log" FOR SELECT USING (("public"."current_is_appraiser"() AND (EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "activity_log"."order_id") AND (COALESCE("o"."appraiser_id", "o"."assigned_to") = "public"."current_app_user_id"()))))));



CREATE POLICY "activity_select_own_orders" ON "public"."activity_log" FOR SELECT USING (true);



CREATE POLICY "activity_update_block" ON "public"."activity_log" FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);



CREATE POLICY "activity_update_none" ON "public"."activity_log" FOR UPDATE USING (false) WITH CHECK (false);



CREATE POLICY "allow_admin_update_orders" ON "public"."orders" FOR UPDATE USING ("public"."current_is_admin"()) WITH CHECK ("public"."current_is_admin"());



CREATE POLICY "allow_insert_notifications" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "allow_select_notification_policies" ON "public"."notification_policies" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "allow_select_own_notifications" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."amcs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."appointments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."appraiser_licenses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "appt_order_scoped" ON "public"."appointments" USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "appointments"."order_id") AND (( SELECT "v_is_admin"."is_admin"
           FROM "public"."v_is_admin") OR ("o"."appraiser_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."order_assignments" "oa"
          WHERE (("oa"."order_id" = "o"."id") AND ("oa"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
           FROM "public"."review_flow" "rf"
          WHERE (("rf"."order_id" = "o"."id") AND ("rf"."assigned_to" = "auth"."uid"()))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "appointments"."order_id") AND (( SELECT "v_is_admin"."is_admin"
           FROM "public"."v_is_admin") OR ("o"."appraiser_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."order_assignments" "oa"
          WHERE (("oa"."order_id" = "o"."id") AND ("oa"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
           FROM "public"."review_flow" "rf"
          WHERE (("rf"."order_id" = "o"."id") AND ("rf"."assigned_to" = "auth"."uid"())))))))));



ALTER TABLE "public"."calendar_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "calendar_read" ON "public"."calendar_events" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "clients_admin_select" ON "public"."clients" FOR SELECT USING (((("current_setting"('request.jwt.claims'::"text", true))::"jsonb" ->> 'role'::"text") = ANY (ARRAY['admin'::"text", 'reviewer'::"text"])));



CREATE POLICY "clients_admin_write" ON "public"."clients" USING (((("current_setting"('request.jwt.claims'::"text", true))::"jsonb" ->> 'role'::"text") = ANY (ARRAY['admin'::"text", 'reviewer'::"text"]))) WITH CHECK (((("current_setting"('request.jwt.claims'::"text", true))::"jsonb" ->> 'role'::"text") = ANY (ARRAY['admin'::"text", 'reviewer'::"text"])));



CREATE POLICY "clients_appraiser_select" ON "public"."clients" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."client_id" = "clients"."id") AND (COALESCE("o"."is_archived", false) = false) AND (COALESCE("o"."appraiser_id", "o"."assigned_to") = "public"."current_user_id"())))));



CREATE POLICY "clients_delete_none" ON "public"."clients" FOR DELETE TO "authenticated" USING (false);



CREATE POLICY "clients_insert_none" ON "public"."clients" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "clients_owner_admin_write" ON "public"."clients" USING ("public"."current_is_admin"()) WITH CHECK ("public"."current_is_admin"());



CREATE POLICY "clients_related_read" ON "public"."clients" FOR SELECT USING (("public"."current_is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."client_id" = "clients"."id") AND (("o"."appraiser_id" = "public"."current_user_id"()) OR (EXISTS ( SELECT 1
           FROM "public"."order_assignments" "oa"
          WHERE (("oa"."order_id" = "o"."id") AND ("oa"."user_id" = "public"."current_user_id"())))) OR (EXISTS ( SELECT 1
           FROM "public"."review_flow" "rf"
          WHERE (("rf"."order_id" = "o"."id") AND ("rf"."assigned_to" = "public"."current_user_id"()))))))))));



CREATE POLICY "clients_select_admin" ON "public"."clients" FOR SELECT USING ("public"."current_is_admin"());



CREATE POLICY "clients_select_my_clients" ON "public"."clients" FOR SELECT USING (("public"."current_is_appraiser"() AND (EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."client_id" = "clients"."id") AND (COALESCE("o"."is_archived", false) = false) AND (COALESCE("o"."appraiser_id", "o"."assigned_to") = "public"."current_app_user_id"()))))));



CREATE POLICY "clients_select_scoped" ON "public"."clients" FOR SELECT TO "authenticated" USING ((("public"."current_user_role"() = 'admin'::"text") OR ("lower"(COALESCE("status", ''::"text")) = 'active'::"text")));



CREATE POLICY "clients_update_none" ON "public"."clients" FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);



CREATE POLICY "clients_write_admin" ON "public"."clients" USING ("public"."current_is_admin"()) WITH CHECK ("public"."current_is_admin"());



ALTER TABLE "public"."contacts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "contacts_related_read" ON "public"."contacts" FOR SELECT USING ((( SELECT "v_is_admin"."is_admin"
   FROM "public"."v_is_admin") OR (EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."client_id" = "contacts"."client_id") AND (("o"."appraiser_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."order_assignments" "oa"
          WHERE (("oa"."order_id" = "o"."id") AND ("oa"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
           FROM "public"."review_flow" "rf"
          WHERE (("rf"."order_id" = "o"."id") AND ("rf"."assigned_to" = "auth"."uid"()))))))))));



CREATE POLICY "docs_admin_all" ON "public"."user_documents" USING (( SELECT "v_is_admin"."is_admin"
   FROM "public"."v_is_admin")) WITH CHECK (( SELECT "v_is_admin"."is_admin"
   FROM "public"."v_is_admin"));



CREATE POLICY "docs_self_rw" ON "public"."user_documents" USING (("user_id" IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."auth_id" = "auth"."uid"())))) WITH CHECK (("user_id" IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."auth_id" = "auth"."uid"()))));



ALTER TABLE "public"."email_outbox" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "email_outbox_insert_self" ON "public"."email_outbox" FOR INSERT WITH CHECK (("to_user_id" = "auth"."uid"()));



CREATE POLICY "email_outbox_select_admin" ON "public"."email_outbox" FOR SELECT USING (((("current_setting"('request.jwt.claims'::"text", true))::"jsonb" ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "email_outbox_update_admin" ON "public"."email_outbox" FOR UPDATE USING (((("current_setting"('request.jwt.claims'::"text", true))::"jsonb" ->> 'role'::"text") = 'admin'::"text")) WITH CHECK (((("current_setting"('request.jwt.claims'::"text", true))::"jsonb" ->> 'role'::"text") = 'admin'::"text"));



ALTER TABLE "public"."email_queue" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "email_queue_block_delete" ON "public"."email_queue" FOR DELETE USING (false);



CREATE POLICY "email_queue_block_insert" ON "public"."email_queue" FOR INSERT WITH CHECK (false);



CREATE POLICY "email_queue_block_update" ON "public"."email_queue" FOR UPDATE USING (false);



CREATE POLICY "email_queue_select_own" ON "public"."email_queue" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "insert activity (assigned/appraiser/admin)" ON "public"."activity_log" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "activity_log"."order_id") AND (("o"."appraiser_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."user_profiles" "up"
          WHERE (("up"."user_id" = "auth"."uid"()) AND ("up"."role" = ANY (ARRAY['admin'::"text", 'reviewer'::"text"]))))))))));



CREATE POLICY "insert own activity" ON "public"."order_activity" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "insert own settings" ON "public"."user_settings" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "lic_admin_all" ON "public"."appraiser_licenses" USING (( SELECT "v_is_admin"."is_admin"
   FROM "public"."v_is_admin")) WITH CHECK (( SELECT "v_is_admin"."is_admin"
   FROM "public"."v_is_admin"));



CREATE POLICY "lic_self_rw" ON "public"."appraiser_licenses" USING (("user_id" IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."auth_id" = "auth"."uid"())))) WITH CHECK (("user_id" IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."auth_id" = "auth"."uid"()))));



CREATE POLICY "notif_delete_none" ON "public"."notifications" FOR DELETE TO "authenticated" USING (false);



CREATE POLICY "notif_delete_own" ON "public"."notifications" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "notif_insert_none" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "notif_insert_own" ON "public"."notifications" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "notif_policies_admin_all" ON "public"."notification_policies" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."role" = 'admin'::"text")))));



CREATE POLICY "notif_select_own" ON "public"."notifications" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "notif_select_owner" ON "public"."notifications" FOR SELECT USING (("user_id" = "public"."current_app_user_id"()));



CREATE POLICY "notif_select_self" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "notif_update_own" ON "public"."notifications" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "notif_update_self" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."notification_policies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_prefs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_block_delete" ON "public"."notifications" FOR DELETE USING (false);



CREATE POLICY "notifications_block_insert" ON "public"."notifications" FOR INSERT WITH CHECK (false);



CREATE POLICY "notifications_block_insert_delete" ON "public"."notifications" FOR INSERT WITH CHECK (false);



CREATE POLICY "notifications_select_own" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "notifications_update_read_own" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "notifprefs_select_self" ON "public"."notification_preferences" FOR SELECT USING (("user_id" = "public"."current_app_user_id"()));



CREATE POLICY "notifprefs_update_self" ON "public"."notification_preferences" FOR UPDATE USING (("user_id" = "public"."current_app_user_id"())) WITH CHECK (("user_id" = "public"."current_app_user_id"()));



CREATE POLICY "notifprefs_upsert_self" ON "public"."notification_preferences" FOR INSERT WITH CHECK (("user_id" = "public"."current_app_user_id"()));



ALTER TABLE "public"."order_activity" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_activity_admin_delete" ON "public"."order_activity" FOR DELETE TO "authenticated" USING (("public"."current_user_role"() = 'admin'::"text"));



CREATE POLICY "order_activity_admin_update" ON "public"."order_activity" FOR UPDATE TO "authenticated" USING (("public"."current_user_role"() = 'admin'::"text")) WITH CHECK (("public"."current_user_role"() = 'admin'::"text"));



CREATE POLICY "order_activity_insert_self" ON "public"."order_activity" FOR INSERT TO "authenticated" WITH CHECK (((NOT ("created_by" IS DISTINCT FROM "auth"."uid"())) OR (NOT ("user_id" IS DISTINCT FROM "auth"."uid"()))));



CREATE POLICY "order_activity_no_inserts" ON "public"."order_activity" FOR INSERT WITH CHECK (false);



CREATE POLICY "order_activity_no_updates" ON "public"."order_activity" FOR UPDATE USING (false);



CREATE POLICY "order_activity_select_visible" ON "public"."order_activity" FOR SELECT TO "authenticated" USING ("public"."can_read_order"("order_id"));



ALTER TABLE "public"."order_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_counters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_status_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "orders_appraiser_read_own" ON "public"."orders" FOR SELECT USING (("public"."current_is_appraiser"() AND (("appraiser_id" = "public"."current_user_id"()) OR ("assigned_to" = "public"."current_user_id"()))));



CREATE POLICY "orders_appraiser_update_own" ON "public"."orders" FOR UPDATE USING (("public"."current_is_appraiser"() AND (("appraiser_id" = "public"."current_user_id"()) OR ("assigned_to" = "public"."current_user_id"())))) WITH CHECK (("public"."current_is_appraiser"() AND (("appraiser_id" = "public"."current_user_id"()) OR ("assigned_to" = "public"."current_user_id"()))));



CREATE POLICY "orders_delete_admin" ON "public"."orders" FOR DELETE USING ("public"."current_is_admin"());



CREATE POLICY "orders_insert_admin" ON "public"."orders" FOR INSERT WITH CHECK ("public"."current_is_admin"());



CREATE POLICY "orders_owner_admin_full_access" ON "public"."orders" USING ("public"."current_is_admin"()) WITH CHECK ("public"."current_is_admin"());



CREATE POLICY "orders_select_lifecycle_visibility" ON "public"."orders" FOR SELECT TO "authenticated" USING (("public"."current_is_admin"() OR (COALESCE("appraiser_id", "assigned_to") = "public"."current_app_user_id"()) OR (("reviewer_id" = "public"."current_app_user_id"()) AND ("lower"(COALESCE("status", ''::"text")) = ANY (ARRAY['in_review'::"text", 'needs_revisions'::"text", 'review_cleared'::"text", 'completed'::"text"])))));



CREATE POLICY "orders_update_admin" ON "public"."orders" FOR UPDATE USING ("public"."current_is_admin"()) WITH CHECK ("public"."current_is_admin"());



CREATE POLICY "orders_update_lifecycle_visibility" ON "public"."orders" FOR UPDATE TO "authenticated" USING (("public"."current_is_admin"() OR (COALESCE("appraiser_id", "assigned_to") = "public"."current_app_user_id"()) OR (("reviewer_id" = "public"."current_app_user_id"()) AND ("lower"(COALESCE("status", ''::"text")) = ANY (ARRAY['in_review'::"text", 'needs_revisions'::"text", 'review_cleared'::"text", 'completed'::"text"]))))) WITH CHECK (("public"."current_is_admin"() OR (COALESCE("appraiser_id", "assigned_to") = "public"."current_app_user_id"()) OR (("reviewer_id" = "public"."current_app_user_id"()) AND ("lower"(COALESCE("status", ''::"text")) = ANY (ARRAY['in_review'::"text", 'needs_revisions'::"text", 'review_cleared'::"text", 'completed'::"text"])))));



CREATE POLICY "orders_update_my_assigned" ON "public"."orders" FOR UPDATE USING (("public"."current_is_appraiser"() AND (COALESCE("appraiser_id", "assigned_to") = "public"."current_app_user_id"()))) WITH CHECK (("public"."current_is_appraiser"() AND (COALESCE("appraiser_id", "assigned_to") = "public"."current_app_user_id"())));



ALTER TABLE "public"."permissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "prefs_insert_self" ON "public"."notification_prefs" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "prefs_select_own" ON "public"."notification_prefs" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "prefs_select_own" ON "public"."user_notification_prefs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "prefs_select_self" ON "public"."notification_prefs" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "prefs_update_own" ON "public"."notification_prefs" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "prefs_update_own" ON "public"."user_notification_prefs" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "prefs_update_self" ON "public"."notification_prefs" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "prefs_upsert_own" ON "public"."notification_prefs" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "prefs_upsert_own" ON "public"."user_notification_prefs" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."profiles_legacy" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_read" ON "public"."profiles_legacy" FOR SELECT USING (true);



CREATE POLICY "read activity (assigned or admin)" ON "public"."activity_log" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."orders" "o"
     LEFT JOIN "public"."user_roles" "ur" ON (("ur"."user_id" = "public"."current_user_id"())))
  WHERE (("o"."id" = "activity_log"."order_id") AND (("o"."appraiser_id" = "public"."current_user_id"()) OR ("ur"."role" = ANY (ARRAY['admin'::"text", 'owner'::"text", 'reviewer'::"text"])))))));



CREATE POLICY "read activity (assigned/appraiser/admin)" ON "public"."activity_log" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "activity_log"."order_id") AND (("o"."appraiser_id" = "public"."current_user_id"()) OR (EXISTS ( SELECT 1
           FROM "public"."user_roles" "ur"
          WHERE (("ur"."user_id" = "public"."current_user_id"()) AND ("ur"."role" = ANY (ARRAY['admin'::"text", 'owner'::"text", 'reviewer'::"text"]))))))))));



CREATE POLICY "read order activity (assigned or admin)" ON "public"."order_activity" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."orders" "o"
     LEFT JOIN "public"."user_roles" "ur" ON (("ur"."user_id" = "auth"."uid"())))
  WHERE (("o"."id" = "order_activity"."order_id") AND (("o"."appraiser_id" = "auth"."uid"()) OR ("ur"."role" = ANY (ARRAY['admin'::"text", 'reviewer'::"text"])))))));



ALTER TABLE "public"."review_flow" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."role_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "select own settings" ON "public"."user_settings" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."staging_orders_2025" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staging_raw_orders_2025_csv" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "stat_order_scoped" ON "public"."order_status_log" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_status_log"."order_id") AND (( SELECT "v_is_admin"."is_admin"
           FROM "public"."v_is_admin") OR ("o"."appraiser_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."order_assignments" "oa"
          WHERE (("oa"."order_id" = "o"."id") AND ("oa"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
           FROM "public"."review_flow" "rf"
          WHERE (("rf"."order_id" = "o"."id") AND ("rf"."assigned_to" = "auth"."uid"())))))))));



CREATE POLICY "update own settings" ON "public"."user_settings" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."user_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_notification_prefs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_profiles_read" ON "public"."user_profiles" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_roles_read" ON "public"."user_roles" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."user_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_settings_admin_read" ON "public"."user_settings" FOR SELECT USING (( SELECT "v_is_admin"."is_admin"
   FROM "public"."v_is_admin"));



CREATE POLICY "user_settings_self_rw" ON "public"."user_settings" USING (("user_id" IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."auth_id" = "auth"."uid"())))) WITH CHECK (("user_id" IN ( SELECT "users"."id"
   FROM "public"."users"
  WHERE ("users"."auth_id" = "auth"."uid"()))));



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_admin_delete" ON "public"."users" FOR DELETE USING (( SELECT "v_is_admin"."is_admin"
   FROM "public"."v_is_admin"));



CREATE POLICY "users_admin_insert" ON "public"."users" FOR INSERT WITH CHECK (( SELECT "v_is_admin"."is_admin"
   FROM "public"."v_is_admin"));



CREATE POLICY "users_admin_read" ON "public"."users" FOR SELECT USING (( SELECT "v_is_admin"."is_admin"
   FROM "public"."v_is_admin"));



CREATE POLICY "users_admin_update" ON "public"."users" FOR UPDATE USING (( SELECT "v_is_admin"."is_admin"
   FROM "public"."v_is_admin")) WITH CHECK (( SELECT "v_is_admin"."is_admin"
   FROM "public"."v_is_admin"));



CREATE POLICY "users_any_authenticated_read" ON "public"."users" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "users_delete_none" ON "public"."users" FOR DELETE TO "authenticated" USING (false);



CREATE POLICY "users_insert_none" ON "public"."users" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "users_owner_admin_delete" ON "public"."users" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = "auth"."uid"()) AND (("u"."role" = 'owner'::"text") OR ("u"."is_admin" = true))))));



CREATE POLICY "users_owner_admin_update" ON "public"."users" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = "auth"."uid"()) AND (("u"."role" = 'owner'::"text") OR ("u"."is_admin" = true)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."auth_id" = "auth"."uid"()) AND (("u"."role" = 'owner'::"text") OR ("u"."is_admin" = true))))));



CREATE POLICY "users_read_role_aware" ON "public"."users" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "users_select_policy" ON "public"."users" FOR SELECT TO "authenticated" USING ((("public"."current_user_role"() = 'admin'::"text") OR ("auth"."uid"() = "auth_id")));



CREATE POLICY "users_self_rw" ON "public"."users" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "users_update_none" ON "public"."users" FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);

-- Curated application grants.
-- These preserve PostgREST/RPC access shape without replaying pg_dump's GRANT ALL/default-privilege noise.
GRANT USAGE ON SCHEMA "public" TO "anon", "authenticated", "service_role";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "public" TO "anon", "authenticated", "service_role";
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA "public" TO "anon", "authenticated", "service_role";
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA "public" TO "anon", "authenticated", "service_role";

-- Manual review notes:
-- - Grants are intentionally broad for bootstrap parity but avoid GRANT ALL and default privileges.
-- - Future hardening should replace these with narrow table/function grants after replay is stable.

RESET ALL;
