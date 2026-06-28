import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  "supabase/migrations/20260626093000_historical_import_notification_email_suppression.sql",
  "utf8",
);

const generatorSource = readFileSync(
  "scripts/historical-import/generate-historical-import-sql.mjs",
  "utf8",
);

describe("historical import email suppression", () => {
  it("adds transaction-local guards to notification email queue fanout", () => {
    expect(migrationSql).toContain("create or replace function public.tg_notifications_queue_email()");
    expect(migrationSql).toContain("current_setting('app.suppress_notifications', true)");
    expect(migrationSql).toContain("v_claims->>'suppress_notifications'");
    expect(migrationSql).toContain("v_claims->>'suppress_email_queue'");
    expect(migrationSql).toContain("return NEW;");
  });

  it("sets suppression flags in generated historical order SQL", () => {
    expect(generatorSource).toContain('"suppress_notifications":true');
    expect(generatorSource).toContain('"suppress_email_queue":true');
    expect(generatorSource).toContain(`set local "app.suppress_notifications" = 'on';`);
  });
});
