import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("activity note notification fanout", () => {
  const migration = readFileSync(
    "supabase/migrations/20260528100000_activity_note_notifications.sql",
    "utf8",
  );
  const emailFanoutMigration = readFileSync(
    "supabase/migrations/20260527091000_notification_email_fanout_effective_preferences.sql",
    "utf8",
  );
  const enrichedNotificationMigration = readFileSync(
    "supabase/migrations/20260527100000_notification_email_payload_enrichment.sql",
    "utf8",
  );
  const activityNoteForm = readFileSync(
    "src/components/activity/ActivityNoteForm.jsx",
    "utf8",
  );
  const pilotEmailMuteScript = readFileSync(
    "supabase/manual/20260527_rc1_internal_pilot_email_mute_mike_pam.sql",
    "utf8",
  );

  it("moves note notification fanout to an activity_log trigger", () => {
    expect(migration).toContain("create or replace function public.tg_activity_note_notification_v1()");
    expect(migration).toContain("after insert on public.activity_log");
    expect(migration).toContain("execute function public.tg_activity_note_notification_v1()");
    expect(migration).toContain("lower(btrim(coalesce(NEW.event_type, NEW.action, ''))) not in ('note', 'note_added', 'activity_note')");
    expect(migration).toContain("'note.added'");
    expect(activityNoteForm).toContain("await logNote(orderId, message, { actor })");
    expect(activityNoteForm).not.toContain("emitNotification");
  });

  it("notifies owner/admin and assigned reviewer for appraiser notes without notifying the actor", () => {
    expect(migration).toContain("v_actor_role = 'appraiser'");
    expect(migration).toContain("v_recipient_kinds := array['admin_owner', 'reviewer']");
    expect(migration).toContain("v_actor_user_id := coalesce(NEW.actor_user_id, NEW.user_id)");
    expect(migration).toContain("perform public.notify_order_v1_event(");
    expect(migration).toContain("v_actor_user_id");
    expect(enrichedNotificationMigration).toContain("if p_actor_user_id is not null and v_recipient.user_id = p_actor_user_id then");
    expect(enrichedNotificationMigration).toContain("continue;");
  });

  it("notifies assigned appraiser for reviewer/admin notes", () => {
    expect(migration).toContain("elsif v_actor_role = 'reviewer' then");
    expect(migration).toContain("v_recipient_kinds := array['appraiser', 'admin_owner']");
    expect(migration).toContain("else");
    expect(migration).toContain("v_recipient_kinds := array['appraiser', 'reviewer']");
  });

  it("uses the note actor and a short excerpt for notification title/body", () => {
    expect(migration).toContain("if p_event_type = 'note.added' then");
    expect(migration).toContain("v_note_excerpt := nullif(btrim(coalesce(v_payload->>'note_text', v_payload->>'message', '')), '')");
    expect(migration).toContain("char_length(v_note_excerpt) > 150");
    expect(migration).toContain("v_note_excerpt := left(v_note_excerpt, 147) || '...'");
    expect(migration).toContain("v_title := coalesce(nullif(v_payload #>> '{actor,name}', ''), 'Someone') || ' added a note'");
    expect(migration).toContain("v_body := coalesce(v_note_excerpt, 'A note was added to this order.')");
  });

  it("keeps note links order-safe and email preference gated", () => {
    expect(enrichedNotificationMigration).toContain("'/orders/' || v_order.id::text");
    expect(enrichedNotificationMigration).toContain("'link_path', '/orders/' || v_order.id::text");
    expect(emailFanoutMigration).toContain("public.notification_user_effective_preference(");
    expect(emailFanoutMigration).toContain("'email'");
    expect(emailFanoutMigration).toContain("if coalesce(v_email_allowed, false) is false then");
    expect(emailFanoutMigration).toContain("return NEW;");
  });

  it("keeps the Mike/Pam pilot mute scoped to email overrides, not in-app notifications", () => {
    expect(pilotEmailMuteScript).toContain("public.user_notification_prefs");
    expect(pilotEmailMuteScript).toContain("'email'");
    expect(pilotEmailMuteScript).toContain("enabled,");
    expect(pilotEmailMuteScript).toContain("false,");
    expect(pilotEmailMuteScript).toContain("Does not touch in_app preferences.");
    expect(pilotEmailMuteScript).not.toContain("'in_app',");
    expect(pilotEmailMuteScript).not.toContain("channel = 'in_app'");
  });
});
