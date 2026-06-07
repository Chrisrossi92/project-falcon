import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const migrationSql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260606131000_amc_payment_ledger_actor_fk_fix.sql'),
  'utf8',
);

const ledgerSql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260606120000_amc_vendor_payment_ledger_scheduling.sql'),
  'utf8',
);

describe('AMC-13B.6 payment ledger actor FK migration', () => {
  it('moves ledger actor constraints to the app-user identity model', () => {
    expect(migrationSql).toContain('drop constraint amc_vendor_payment_ledger_scheduled_by_user_id_fkey');
    expect(migrationSql).toContain('drop constraint amc_vendor_payment_ledger_paid_by_user_id_fkey');
    expect(migrationSql).toContain('foreign key (scheduled_by_user_id)');
    expect(migrationSql).toContain('references public.users(id)');
    expect(migrationSql).toContain('foreign key (paid_by_user_id)');
    expect(migrationSql).not.toContain('references auth.users(id)');
  });

  it('preserves resolvable legacy auth actors before enforcing the corrected FKs', () => {
    expect(migrationSql).toContain('ledger.scheduled_by_user_id = app_user.auth_id');
    expect(migrationSql).toContain('set scheduled_by_user_id = app_user.id');
    expect(migrationSql).toContain('ledger.paid_by_user_id = app_user.auth_id');
    expect(migrationSql).toContain('set paid_by_user_id = app_user.id');
    expect(migrationSql).toContain('set scheduled_by_user_id = null');
    expect(migrationSql).toContain('set paid_by_user_id = null');
  });

  it('validates the corrected constraints for existing data', () => {
    expect(migrationSql).toContain('validate constraint amc_vendor_payment_ledger_scheduled_by_user_id_fkey');
    expect(migrationSql).toContain('validate constraint amc_vendor_payment_ledger_paid_by_user_id_fkey');
  });

  it('keeps schedule and mark-paid RPC actor writes aligned to current_app_user_id', () => {
    expect(ledgerSql).toContain('v_actor_user_id uuid := public.current_app_user_id()');
    expect(ledgerSql).toContain('scheduled_by_user_id');
    expect(ledgerSql).toContain('v_actor_user_id');
    expect(ledgerSql).toContain('paid_by_user_id = v_actor_user_id');
    expect(ledgerSql).toContain("'scheduled_by_user_id', v_actor_user_id");
    expect(ledgerSql).toContain("'paid_by_user_id', v_actor_user_id");
  });

  it('does not weaken payment permissions or expose forbidden payment data', () => {
    expect(ledgerSql).toContain("current_app_user_has_permission('vendors.read')");
    expect(ledgerSql).toContain("current_app_user_has_permission('billing.update')");
    expect(ledgerSql).toContain("lower(coalesce(oca.submission_payload #>> '{invoice,status}', '')) = 'approved'");
    expect(ledgerSql).toContain("vpl.status = 'scheduled'");
    expect(ledgerSql).not.toContain('client_fee');
    expect(ledgerSql).not.toContain('amc_margin');
    expect(ledgerSql).not.toContain('bank_account');
    expect(ledgerSql).not.toContain('ach_account');
  });
});
