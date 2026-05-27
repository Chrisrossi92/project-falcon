import { describe, expect, it } from 'vitest';

import { PERMISSIONS } from '../../permissions/constants.js';
import {
  SHELL_PROFILE_AUTHORITY,
  SHELL_PROFILE_IDS,
  getShellProfileCapabilities,
  resolveShellProfile,
} from '../resolveShellProfile.js';

const baseContext = Object.freeze({
  authenticated: true,
  currentCompanyId: 'company-1',
  membershipStatus: 'active',
});

const resolve = (overrides = {}) => resolveShellProfile({ ...baseContext, ...overrides });

describe('resolveShellProfile', () => {
  it('returns a non-leaky unavailable profile when no authenticated session is present', () => {
    const resolution = resolveShellProfile({
      currentCompanyId: 'company-1',
      membershipStatus: 'active',
      permissionKeys: [PERMISSIONS.ORDERS_READ_ALL],
    });

    expect(resolution).toMatchObject({
      id: SHELL_PROFILE_IDS.UNAVAILABLE,
      label: 'Access unavailable',
      reason: 'auth_required',
      metadataAuthority: SHELL_PROFILE_AUTHORITY.PRESENTATION_ONLY,
    });
  });

  it('requires current company before selecting a work shell', () => {
    const resolution = resolveShellProfile({
      authenticated: true,
      membershipStatus: 'active',
      permissionKeys: [PERMISSIONS.ORDERS_READ_ALL],
    });

    expect(resolution.id).toBe(SHELL_PROFILE_IDS.COMPANY_REQUIRED);
    expect(resolution.reason).toBe('current_company_required');
  });

  it('returns membership_inactive before selecting a work shell', () => {
    const resolution = resolve({
      membershipStatus: 'suspended',
      permissionKeys: [PERMISSIONS.ORDERS_READ_ALL],
    });

    expect(resolution.id).toBe(SHELL_PROFILE_IDS.MEMBERSHIP_INACTIVE);
    expect(resolution.reason).toBe('membership_inactive');
  });

  it('resolves owner/admin authority to operations', () => {
    const resolution = resolve({
      permissionKeys: [PERMISSIONS.USERS_READ],
    });

    expect(resolution).toMatchObject({
      id: SHELL_PROFILE_IDS.OPERATIONS,
      label: 'Operations',
      reason: 'owner_admin_authority',
    });
    expect(resolution.capabilities.hasOwnerAdminAuthority).toBe(true);
  });

  it('keeps owner/admin plus appraiser or reviewer production work in operations by default', () => {
    expect(
      resolve({
        roleLabels: ['owner', 'appraiser'],
        permissionKeys: [
          PERMISSIONS.USERS_READ,
          PERMISSIONS.ORDERS_READ_ASSIGNED,
          PERMISSIONS.WORKFLOW_STATUS_SUBMIT_TO_REVIEW,
        ],
      }).id,
    ).toBe(SHELL_PROFILE_IDS.OPERATIONS);

    expect(
      resolve({
        roleLabels: ['admin', 'reviewer'],
        permissionKeys: [
          PERMISSIONS.SETTINGS_VIEW,
          PERMISSIONS.WORKFLOW_STATUS_REQUEST_REVISIONS,
        ],
        reviewWorkWaiting: true,
      }).id,
    ).toBe(SHELL_PROFILE_IDS.OPERATIONS);
  });

  it('resolves assignment-only users to received_work', () => {
    const resolution = resolve({
      permissionKeys: [PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED],
    });

    expect(resolution).toMatchObject({
      id: SHELL_PROFILE_IDS.RECEIVED_WORK,
      label: 'Received Work',
      reason: 'assignment_only',
    });
    expect(resolution.capabilities.assignmentOnlyAccess).toBe(true);
  });

  it('does not treat mixed internal order and assignment access as assignment-only', () => {
    const resolution = resolve({
      permissionKeys: [
        PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED,
        PERMISSIONS.ORDERS_READ_ASSIGNED,
      ],
    });

    expect(resolution.id).toBe(SHELL_PROFILE_IDS.MY_WORK);
    expect(resolution.capabilities.assignmentOnlyAccess).toBe(false);
  });

  it('resolves appraiser-only users to my_work', () => {
    const resolution = resolve({
      roleLabels: ['staff_appraiser'],
      permissionKeys: [PERMISSIONS.ORDERS_READ_ASSIGNED],
    });

    expect(resolution).toMatchObject({
      id: SHELL_PROFILE_IDS.MY_WORK,
      label: 'My Work',
      reason: 'appraiser_work',
    });
  });

  it('resolves reviewer-only users to review_queue', () => {
    const resolution = resolve({
      roleLabels: ['reviewer'],
      permissionKeys: [PERMISSIONS.WORKFLOW_STATUS_APPROVE_REVIEW],
    });

    expect(resolution).toMatchObject({
      id: SHELL_PROFILE_IDS.REVIEW_QUEUE,
      label: 'Review Queue',
      reason: 'reviewer_responsibility',
    });
  });

  it('uses deterministic appraiser/reviewer hybrid defaults without creating a combined shell', () => {
    expect(
      resolve({
        roleLabels: ['appraiser', 'reviewer'],
        permissionKeys: [
          PERMISSIONS.ORDERS_READ_ASSIGNED,
          PERMISSIONS.WORKFLOW_STATUS_REQUEST_REVISIONS,
        ],
      }).id,
    ).toBe(SHELL_PROFILE_IDS.MY_WORK);

    const reviewWaitingResolution = resolve({
      roleLabels: ['appraiser', 'reviewer'],
      permissionKeys: [
        PERMISSIONS.ORDERS_READ_ASSIGNED,
        PERMISSIONS.WORKFLOW_STATUS_REQUEST_REVISIONS,
      ],
      reviewWorkWaiting: true,
    });

    expect(reviewWaitingResolution).toMatchObject({
      id: SHELL_PROFILE_IDS.REVIEW_QUEUE,
      reason: 'review_work_waiting',
    });
  });

  it('lets the primary reviewer role control hybrid appraiser/reviewer worldview', () => {
    const resolution = resolve({
      primaryRoleLabel: 'reviewer',
      roleLabels: ['reviewer', 'appraiser'],
      permissionKeys: [
        PERMISSIONS.ORDERS_READ_ASSIGNED,
        PERMISSIONS.WORKFLOW_STATUS_REQUEST_REVISIONS,
      ],
    });

    expect(resolution).toMatchObject({
      id: SHELL_PROFILE_IDS.REVIEW_QUEUE,
      reason: 'primary_reviewer_role',
    });
    expect(resolution.capabilities.hasAppraiserResponsibility).toBe(true);
    expect(resolution.capabilities.hasReviewerResponsibility).toBe(true);
  });

  it('lets the primary appraiser role control hybrid appraiser/reviewer worldview', () => {
    const resolution = resolve({
      primaryRoleLabel: 'appraiser',
      roleLabels: ['reviewer', 'appraiser'],
      permissionKeys: [
        PERMISSIONS.ORDERS_READ_ASSIGNED,
        PERMISSIONS.WORKFLOW_STATUS_REQUEST_REVISIONS,
      ],
      reviewWorkWaiting: true,
    });

    expect(resolution).toMatchObject({
      id: SHELL_PROFILE_IDS.MY_WORK,
      reason: 'primary_appraiser_role',
    });
    expect(resolution.capabilities.hasAppraiserResponsibility).toBe(true);
    expect(resolution.capabilities.hasReviewerResponsibility).toBe(true);
  });

  it('only resolves requests when future client requests authority and module availability are explicit', () => {
    expect(
      resolve({
        hasClientRequestsAuthority: true,
      }).id,
    ).toBe(SHELL_PROFILE_IDS.UNAVAILABLE);

    expect(
      resolve({
        hasClientRequestsAuthority: true,
        requestsModuleAvailable: true,
      }).id,
    ).toBe(SHELL_PROFILE_IDS.REQUESTS);
  });

  it('returns module_unavailable for an explicitly requested disabled future profile', () => {
    const resolution = resolve({
      requestedProfileId: SHELL_PROFILE_IDS.REQUESTS,
      hasClientRequestsAuthority: true,
      requestsModuleAvailable: false,
    });

    expect(resolution).toMatchObject({
      id: SHELL_PROFILE_IDS.MODULE_UNAVAILABLE,
      reason: 'module_unavailable',
    });
  });

  it('returns profile_ambiguous only when ambiguity is explicitly supplied', () => {
    const resolution = resolve({
      profileAmbiguous: true,
      roleLabels: ['appraiser'],
      permissionKeys: [PERMISSIONS.ORDERS_READ_ASSIGNED],
    });

    expect(resolution).toMatchObject({
      id: SHELL_PROFILE_IDS.PROFILE_AMBIGUOUS,
      reason: 'profile_ambiguous',
    });
  });

  it('exposes normalized capabilities without granting access', () => {
    const capabilities = getShellProfileCapabilities({
      permissions: {
        [PERMISSIONS.USERS_READ]: true,
        [PERMISSIONS.ORDERS_READ_ASSIGNED]: false,
      },
      roles: new Set(['Owner', '']),
      authenticated: true,
      currentCompanyId: 'company-1',
    });

    expect(capabilities).toMatchObject({
      authenticated: true,
      currentCompanyPresent: true,
      hasOwnerAdminAuthority: true,
      hasAppraiserResponsibility: false,
    });
    expect(capabilities.permissionKeys).toEqual([PERMISSIONS.USERS_READ]);
    expect(capabilities.roleLabels).toEqual(['owner']);
  });

  it('is deterministic and side-effect free for the same plain input', () => {
    const input = {
      ...baseContext,
      roleLabels: ['appraiser', 'reviewer'],
      permissionKeys: [
        PERMISSIONS.ORDERS_READ_ASSIGNED,
        PERMISSIONS.WORKFLOW_STATUS_REQUEST_REVISIONS,
      ],
    };

    expect(resolveShellProfile(input)).toEqual(resolveShellProfile(input));
    expect(input).toEqual({
      ...baseContext,
      roleLabels: ['appraiser', 'reviewer'],
      permissionKeys: [
        PERMISSIONS.ORDERS_READ_ASSIGNED,
        PERMISSIONS.WORKFLOW_STATUS_REQUEST_REVISIONS,
      ],
    });
  });
});
