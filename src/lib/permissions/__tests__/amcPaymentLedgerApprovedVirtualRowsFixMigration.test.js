import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const migrationSql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260620030000_amc_payment_ledger_approved_virtual_rows_fix.sql'),
  'utf8',
);

describe('AMC payment ledger approved virtual rows fix migration', () => {
  it('keeps approved ledger rows virtual until payment is scheduled or paid', () => {
    expect(migrationSql).toContain("vpl.status in ('scheduled', 'paid')");
    expect(migrationSql).not.toContain("vpl.status in ('approved', 'scheduled', 'paid')");
  });

  it('derives unscheduled payment queue status from invoice status before stale payment payload status', () => {
    const expectedPrecedence =
      "coalesce(vpl.status, lower(coalesce(oca.submission_payload #>> '{invoice,status}', '')), lower(coalesce(oca.submission_payload #>> '{payment,status}', '')))";

    expect(migrationSql).toContain(`${expectedPrecedence} as payment_status`);
    expect(migrationSql).toContain(`${expectedPrecedence} = v_status`);
  });
});
