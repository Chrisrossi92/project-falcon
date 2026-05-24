import { describe, expect, it } from 'vitest';

import { PERMISSIONS } from '../../permissions/constants.js';
import { SHELL_PROFILE_AUTHORITY, SHELL_PROFILE_IDS } from '../resolveShellProfile.js';
import {
  buildShellProfileInput,
  getShellProfileExposure,
  resolveShellProfileExposure,
} from '../shellProfileExposure.js';

const activeAppContext = Object.freeze({
  user_id: 'user-1',
  current_company_id: 'company-1',
  has_current_company_membership: true,
  primary_role_key: 'appraiser',
  role_keys: ['appraiser'],
  role_assignments: [
    {
      role_key: 'appraiser',
      role_name: 'Staff Appraiser',
      display_name: 'Staff Appraiser',
    },
  ],
  is_owner: false,
  is_admin_role: false,
  is_appraiser_role: true,
  is_reviewer_role: false,
});
describe('shell profile exposure', () => {
  it('builds resolver input from current app context and permission state', () => {
    const input = buildShellProfileInput({
      appContext: activeAppContext,
      permissions: {
        permissionKeys: [PERMISSIONS.ORDERS_READ_ASSIGNED, PERMISSIONS.ORDERS_READ_ASSIGNED],
      },
    });

    expect(input).toMatchObject({
      authenticated: true,
      userId: 'user-1',
      currentCompanyId: 'company-1',
      membershipActive: true,
      hasAppraiserResponsibilities: true,
    });
    expect(input.permissionKeys).toEqual([PERMISSIONS.ORDERS_READ_ASSIGNED]);
    expect(input.roleLabels).toEqual(['appraiser', 'Staff Appraiser']);
    expect(Object.isFrozen(input)).toBe(true);
    expect(Object.isFrozen(input.permissionKeys)).toBe(true);
    expect(Object.isFrozen(input.roleLabels)).toBe(true);
  });

  it('exposes resolved profile metadata without changing authority', () => {
    const exposure = getShellProfileExposure({
      appContext: {
        ...activeAppContext,
        primary_role_key: 'owner',
        role_keys: ['owner'],
        is_owner: true,
        is_appraiser_role: true,
      },
      permissions: {
        permissionKeys: [PERMISSIONS.USERS_READ, PERMISSIONS.ORDERS_READ_ASSIGNED],
      },
    });

    expect(exposure).toMatchObject({
      profileId: SHELL_PROFILE_IDS.OPERATIONS,
      resolutionReason: 'owner_admin_authority',
      metadataAuthority: SHELL_PROFILE_AUTHORITY.PRESENTATION_ONLY,
      isPresentationOnly: true,
    });
    expect(exposure.profile).toMatchObject({
      id: SHELL_PROFILE_IDS.OPERATIONS,
      displayLabel: 'Operations',
      metadataAuthority: SHELL_PROFILE_AUTHORITY.PRESENTATION_ONLY,
    });
    expect(exposure.resolution.metadataAuthority).toBe(SHELL_PROFILE_AUTHORITY.PRESENTATION_ONLY);
    expect(Object.isFrozen(exposure)).toBe(true);
  });

  it('keeps assignment-only access in received work as observation only', () => {
    const exposure = getShellProfileExposure({
      appContext: activeAppContext,
      permissions: {
        permissionKeys: [PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED],
      },
    });

    expect(exposure).toMatchObject({
      profileId: SHELL_PROFILE_IDS.RECEIVED_WORK,
      resolutionReason: 'assignment_only',
    });
    expect(exposure.profile.displayLabel).toBe('Received Work');
    expect(exposure.capabilities.assignmentOnlyAccess).toBe(true);
  });

  it('uses non-leaky fallback profiles for missing or inactive context', () => {
    expect(
      getShellProfileExposure({
        session: { user: { id: 'user-1' } },
        permissions: { permissionKeys: [PERMISSIONS.ORDERS_READ_ALL] },
      }).profileId,
    ).toBe(SHELL_PROFILE_IDS.COMPANY_REQUIRED);

    expect(
      getShellProfileExposure({
        appContext: {
          ...activeAppContext,
          has_current_company_membership: false,
        },
        permissions: { permissionKeys: [PERMISSIONS.ORDERS_READ_ALL] },
      }).profileId,
    ).toBe(SHELL_PROFILE_IDS.MEMBERSHIP_INACTIVE);
  });

  it('does not expose route, navigation, command, workflow, or permission authority fields', () => {
    const exposure = resolveShellProfileExposure({
      authenticated: true,
      currentCompanyId: 'company-1',
      membershipStatus: 'active',
      permissionKeys: [PERMISSIONS.USERS_READ],
    });

    expect(exposure).not.toHaveProperty('route');
    expect(exposure).not.toHaveProperty('path');
    expect(exposure).not.toHaveProperty('navigation');
    expect(exposure).not.toHaveProperty('commands');
    expect(exposure).not.toHaveProperty('workflow');
    expect(exposure).not.toHaveProperty('requiredPermission');
    expect(exposure.profile).not.toHaveProperty('route');
    expect(exposure.profile).not.toHaveProperty('path');
    expect(exposure.profile).not.toHaveProperty('component');
  });
});
