import { describe, expect, it } from 'vitest';

import {
  WORKSPACE_NAVIGATION_IDS,
  WORKSPACE_NAVIGATION_STATUSES,
  getWorkspaceNavigationDefinition,
  getWorkspaceNavigationLabelOverrides,
  getWorkspaceNavigationMobileOrder,
  getWorkspaceNavigationSections,
} from '../workspaceNavigationDefinitions.js';

const sectionIds = (sections) => sections.map((section) => section.id);
const sectionLabels = (sections) => sections.map((section) => section.label);
const sectionNavIds = (definition) =>
  definition.sections.flatMap((section) => section.navEntryIds);

describe('workspace navigation definitions', () => {
  it('defines Internal Operations workspace sections without AMC vendor navigation', () => {
    const definition = getWorkspaceNavigationDefinition(
      WORKSPACE_NAVIGATION_IDS.INTERNAL_OPERATIONS,
    );

    expect(definition).toMatchObject({
      id: WORKSPACE_NAVIGATION_IDS.INTERNAL_OPERATIONS,
      label: 'Internal Operations',
      status: WORKSPACE_NAVIGATION_STATUSES.ACTIVE_LIVE,
      activeLive: true,
      futureOnly: false,
    });
    expect(sectionIds(definition.sections)).toEqual([
      'operations',
      'management',
      'reporting',
      'system',
    ]);
    expect(sectionLabels(definition.sections)).toEqual([
      'Operations',
      'Management',
      'Reporting',
      'System',
    ]);
    expect(sectionNavIds(definition)).toEqual([
      'dashboard',
      'orders',
      'calendar',
      'assignments',
      'my_work',
      'clients.primary',
      'users',
      'relationships',
      'settings',
      'settings.ownerSetup',
      'settings.notifications',
      'settings.productMetadataDiagnostics',
    ]);
    expect(sectionNavIds(definition)).not.toContain('vendors');
    expect(definition.hiddenPrimaryNavEntryIds).toEqual(['vendors']);
  });

  it('defines AMC Operations workspace sections without internal-only primary navigation', () => {
    const definition = getWorkspaceNavigationDefinition(
      WORKSPACE_NAVIGATION_IDS.AMC_OPERATIONS,
    );

    expect(definition).toMatchObject({
      id: WORKSPACE_NAVIGATION_IDS.AMC_OPERATIONS,
      label: 'AMC Operations',
      status: WORKSPACE_NAVIGATION_STATUSES.ACTIVE_LIVE,
      activeLive: true,
      futureOnly: false,
    });
    expect(sectionIds(definition.sections)).toEqual([
      'procurement',
      'vendors',
      'clients',
      'analytics',
      'system',
    ]);
    expect(sectionLabels(definition.sections)).toEqual([
      'Procurement',
      'Vendors',
      'Client Services',
      'Analytics',
      'System',
    ]);
    expect(sectionNavIds(definition)).toEqual([
      'dashboard',
      'orders',
      'calendar',
      'vendors',
      'clients.primary',
      'client_requests',
      'settings',
    ]);
    expect(sectionNavIds(definition)).not.toContain('assignments');
    expect(sectionNavIds(definition)).not.toContain('relationships');
    expect(sectionNavIds(definition)).not.toContain('users');
    expect(definition.hiddenPrimaryNavEntryIds).toEqual([
      'assignments',
      'relationships',
      'users',
      'my_work',
    ]);
  });

  it('returns safe empty definitions for unknown workspaces', () => {
    const definition = getWorkspaceNavigationDefinition('unknown_workspace');

    expect(definition).toMatchObject({
      id: 'unknown_workspace',
      status: WORKSPACE_NAVIGATION_STATUSES.SAFE_EMPTY,
      activeLive: false,
      futureOnly: false,
    });
    expect(getWorkspaceNavigationSections('unknown_workspace')).toEqual([]);
    expect(getWorkspaceNavigationMobileOrder('unknown_workspace')).toEqual([]);
    expect(getWorkspaceNavigationLabelOverrides('unknown_workspace')).toEqual({});
  });

  it('defines future Vendor and Client placeholders without making them active live navigation', () => {
    const vendor = getWorkspaceNavigationDefinition(WORKSPACE_NAVIGATION_IDS.VENDOR_WORKSPACE);
    const client = getWorkspaceNavigationDefinition(WORKSPACE_NAVIGATION_IDS.CLIENT_WORKSPACE);

    expect(vendor).toMatchObject({
      status: WORKSPACE_NAVIGATION_STATUSES.FUTURE_PLACEHOLDER,
      activeLive: false,
      futureOnly: true,
    });
    expect(sectionIds(vendor.sections)).toEqual([
      'work',
      'documents',
      'financials',
      'profile',
    ]);
    expect(vendor.futurePlaceholderNavEntryIds).toEqual([
      'vendor.available_work',
      'vendor.my_bids',
      'vendor.assigned_orders',
      'vendor.documents',
      'vendor.invoices',
      'vendor.profile',
      'vendor.coverage',
      'vendor.contacts',
      'vendor.compliance',
    ]);

    expect(client).toMatchObject({
      status: WORKSPACE_NAVIGATION_STATUSES.FUTURE_PLACEHOLDER,
      activeLive: false,
      futureOnly: true,
    });
    expect(sectionIds(client.sections)).toEqual([
      'orders',
      'documents',
      'messages',
      'billing',
      'profile',
    ]);
    expect(client.futurePlaceholderNavEntryIds).toEqual([
      'client.orders',
      'client.documents',
      'client.messages',
      'client.billing',
      'client.profile',
    ]);
  });

  it('exposes mobile order and label override accessors for runtime wiring later', () => {
    expect(getWorkspaceNavigationMobileOrder(WORKSPACE_NAVIGATION_IDS.AMC_OPERATIONS)).toEqual([
      'dashboard',
      'orders',
      'calendar',
      'vendors',
      'clients.primary',
      'client_requests',
      'settings',
    ]);
    expect(getWorkspaceNavigationLabelOverrides(WORKSPACE_NAVIGATION_IDS.AMC_OPERATIONS)).toEqual(
      {},
    );
  });

  it('returns frozen definitions and nested arrays', () => {
    const definition = getWorkspaceNavigationDefinition(
      WORKSPACE_NAVIGATION_IDS.INTERNAL_OPERATIONS,
    );

    expect(Object.isFrozen(definition)).toBe(true);
    expect(Object.isFrozen(definition.sections)).toBe(true);
    expect(Object.isFrozen(definition.mobileOrder)).toBe(true);
    expect(Object.isFrozen(definition.labelOverrides)).toBe(true);
    expect(Object.isFrozen(definition.hiddenPrimaryNavEntryIds)).toBe(true);
    expect(Object.isFrozen(definition.futurePlaceholderNavEntryIds)).toBe(true);
    definition.sections.forEach((section) => {
      expect(Object.isFrozen(section)).toBe(true);
      expect(Object.isFrozen(section.navEntryIds)).toBe(true);
      expect(Object.isFrozen(section.notes)).toBe(true);
    });
  });
});
