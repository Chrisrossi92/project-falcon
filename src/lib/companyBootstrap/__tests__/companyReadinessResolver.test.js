import { describe, expect, it } from 'vitest';

import {
  COMPANY_READINESS_SEVERITIES,
  COMPANY_READINESS_STATUSES,
  resolveCompanyReadiness,
} from '../companyReadinessResolver.js';

const GENERATED_AT = '2026-05-19T12:00:00.000Z';

const findItem = (result, key) => result.checklistItems.find((item) => item.key === key);

const completeSetupContext = {
  company_id: '11111111-1111-4111-8111-111111111111',
  company_status: 'active',
  active_company_context_valid: true,
  profile_complete: true,
  owner_invariant_ok: true,
  active_owner_count: 1,
  active_member_count: 1,
  role_presets_ready: true,
  owner_role_ready: true,
  audit_readiness: {
    has_bootstrap_audit: true,
  },
  dashboard_readiness: {
    has_any_dashboard: true,
  },
  relationship_readiness: {
    relationship_count: 0,
  },
  assignment_readiness: {
    assignment_count: 0,
  },
  invitation_summary: {
    pending_count: 0,
  },
};

describe('company readiness resolver', () => {
  it('returns a critical and unknown-safe result for empty setup context', () => {
    const result = resolveCompanyReadiness(null, { generatedAt: GENERATED_AT });

    expect(result).toMatchObject({
      companyId: null,
      status: COMPANY_READINESS_STATUSES.UNKNOWN,
      generatedAt: GENERATED_AT,
    });
    expect(result.severityCounts.critical).toBeGreaterThan(0);
    expect(result.severityCounts.unknown).toBeGreaterThan(0);
    expect(result.blockingItems).toContain('setup_context_available');
    expect(findItem(result, 'setup_context_available')).toMatchObject({
      severity: COMPANY_READINESS_SEVERITIES.CRITICAL,
      status: 'fail',
      blocking: true,
    });
    expect(findItem(result, 'order_numbering')).toMatchObject({
      severity: COMPANY_READINESS_SEVERITIES.UNKNOWN,
      status: 'unknown',
      blocking: false,
    });
  });

  it('returns ready_for_orders for a complete-enough Staff Appraisal setup context', () => {
    const result = resolveCompanyReadiness(completeSetupContext, { generatedAt: GENERATED_AT });

    expect(result).toMatchObject({
      companyId: completeSetupContext.company_id,
      status: COMPANY_READINESS_STATUSES.READY_FOR_ORDERS,
      blockingItems: [],
    });
    expect(findItem(result, 'company_profile')).toMatchObject({ status: 'pass' });
    expect(findItem(result, 'owner_presence')).toMatchObject({ status: 'pass' });
    expect(findItem(result, 'role_presets')).toMatchObject({ status: 'pass' });
    expect(findItem(result, 'bootstrap_audit_event')).toMatchObject({ status: 'pass' });
  });

  it('marks missing owner readiness as a critical blocker', () => {
    const result = resolveCompanyReadiness(
      {
        ...completeSetupContext,
        owner_invariant_ok: false,
        active_owner_count: 0,
      },
      { generatedAt: GENERATED_AT },
    );

    expect(result.status).toBe(COMPANY_READINESS_STATUSES.NOT_READY);
    expect(result.blockingItems).toContain('owner_presence');
    expect(findItem(result, 'owner_presence')).toMatchObject({
      severity: COMPANY_READINESS_SEVERITIES.CRITICAL,
      status: 'fail',
      blocking: true,
    });
  });

  it('marks missing role presets as a critical blocker', () => {
    const result = resolveCompanyReadiness(
      {
        ...completeSetupContext,
        role_presets_ready: false,
      },
      { generatedAt: GENERATED_AT },
    );

    expect(result.status).toBe(COMPANY_READINESS_STATUSES.NOT_READY);
    expect(result.blockingItems).toContain('role_presets');
    expect(findItem(result, 'role_presets')).toMatchObject({
      severity: COMPANY_READINESS_SEVERITIES.CRITICAL,
      status: 'fail',
      blocking: true,
    });
  });

  it('keeps unresolved order numbering and notification defaults unknown', () => {
    const result = resolveCompanyReadiness(completeSetupContext, { generatedAt: GENERATED_AT });

    expect(findItem(result, 'order_numbering')).toMatchObject({
      severity: COMPANY_READINESS_SEVERITIES.UNKNOWN,
      status: 'unknown',
      blocking: false,
    });
    expect(findItem(result, 'notification_defaults')).toMatchObject({
      severity: COMPANY_READINESS_SEVERITIES.UNKNOWN,
      status: 'unknown',
      blocking: false,
    });
    expect(result.warnings).toEqual(
      expect.arrayContaining(['order_numbering', 'notification_defaults']),
    );
  });

  it('does not return authority or grant fields', () => {
    const result = resolveCompanyReadiness(completeSetupContext, { generatedAt: GENERATED_AT });
    const serialized = JSON.stringify(result);

    expect(serialized).not.toMatch(/grant/i);
    expect(serialized).not.toMatch(/permission/i);
    expect(serialized).not.toMatch(/canAccess/i);
    expect(serialized).not.toMatch(/authorized/i);
  });

  it('is deterministic when generatedAt is supplied', () => {
    const first = resolveCompanyReadiness(completeSetupContext, { generatedAt: GENERATED_AT });
    const second = resolveCompanyReadiness(completeSetupContext, { generatedAt: GENERATED_AT });

    expect(second).toEqual(first);
  });
});
