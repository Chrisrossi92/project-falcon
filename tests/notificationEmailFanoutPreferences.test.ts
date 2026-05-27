import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260527091000_notification_email_fanout_effective_preferences.sql",
  "utf8"
);

describe("notification email fanout effective preferences migration", () => {
  it("queues email through the notifications trigger only after resolving effective email preferences", () => {
    expect(migration).toContain("create or replace function public.tg_notifications_queue_email()");
    expect(migration).toContain("public.notification_user_effective_preference(");
    expect(migration).toContain("NEW.user_id");
    expect(migration).toContain("'email'");
    expect(migration).toContain("insert into public.email_queue");
  });

  it("skips email queue insertion when the effective email preference is disabled", () => {
    expect(migration).toContain("v_email_allowed boolean := false");
    expect(migration).toContain("if coalesce(v_email_allowed, false) is false then");
    expect(migration).toContain("return NEW;");
  });

  it("keeps in-app notification creation non-blocking when email enqueue fails", () => {
    expect(migration).toContain("exception");
    expect(migration).toContain("when others then");
    expect(migration).toContain("null;");
    expect(migration).toContain("return NEW;");
  });

  it("uses public.users.id identity and avoids deprecated profile/preference email target lookup", () => {
    expect(migration).toContain("where u.id = p_user_id");
    expect(migration).toContain("up.user_id = p_user_id");
    expect(migration).not.toContain("auth.uid()");
    expect(migration).not.toContain("_notification_email_target(NEW.user_id)");
    expect(migration).not.toContain("notification_preferences");
    expect(migration).not.toContain("public.profiles");
  });

  it("preserves locked-on email behavior through notification policy channel state", () => {
    expect(migration).toContain("public.notification_policy_channel_state");
    expect(migration).toContain("when state.locked then true");
    expect(migration).toContain("else coalesce(user_pref.enabled, state.default_enabled)");
  });
});
