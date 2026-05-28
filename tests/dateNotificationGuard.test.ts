import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("RC1 date notification guard", () => {
  const migration = readFileSync(
    "supabase/migrations/20260528110000_rc1_date_notification_change_guard.sql",
    "utf8",
  );

  it("compares normalized business dates instead of raw timestamp formatting", () => {
    expect(migration).toContain("v_old_review_due_date := coalesce(OLD.review_due_at::date, OLD.review_due_date, OLD.due_for_review)");
    expect(migration).toContain("v_new_review_due_date := coalesce(NEW.review_due_at::date, NEW.review_due_date, NEW.due_for_review)");
    expect(migration).toContain("v_old_final_due_date := coalesce(OLD.final_due_at::date, OLD.client_due_at::date, OLD.due_to_client, OLD.due_date)");
    expect(migration).toContain("v_new_final_due_date := coalesce(NEW.final_due_at::date, NEW.client_due_at::date, NEW.due_to_client, NEW.due_date)");
    expect(migration).toContain("date_trunc(");
    expect(migration).toContain("'minute'");
  });

  it("keeps fee-only and no-op saves from emitting date notifications", () => {
    expect(migration).toContain("if v_new_review_due_date is distinct from v_old_review_due_date");
    expect(migration).toContain("or v_new_final_due_date is distinct from v_old_final_due_date then");
    expect(migration).toContain("if v_new_site_visit_at is distinct from v_old_site_visit_at then");
    expect(migration).toContain("'fee_changed'");
  });

  it("uses the same normalized guard for dates_updated activity rows", () => {
    expect(migration).toContain("create or replace function public.tg_orders_audit_upd()");
    expect(migration).toContain("'dates_updated'");
    expect(migration).toContain("or v_new_review_due_date is distinct from v_old_review_due_date");
    expect(migration).toContain("or v_new_final_due_date is distinct from v_old_final_due_date then");
    expect(migration).toContain("fee-only or no-op saves do not create false dates_updated activity");
  });

  it("still emits high-signal date and site visit events for true changes", () => {
    expect(migration).toContain("'order.site_visit_updated'");
    expect(migration).toContain("'order.dates_updated'");
    expect(migration).toContain("array['appraiser', 'admin_owner']");
    expect(migration).toContain("array['appraiser', 'reviewer', 'admin_owner']");
  });
});
