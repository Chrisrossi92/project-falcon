import { describe, expect, it } from 'vitest';

import { OPERATIONS_MODES } from '../../operations/operationsMode.js';
import { PERMISSIONS } from '../../permissions/constants.js';
import {
  CURRENT_DASHBOARD_AUTHORITY,
  CURRENT_DASHBOARD_REGISTRY_KIND,
} from '../currentDashboardRegistry.js';
import {
  CURRENT_DASHBOARD_RESOLUTION_STATES,
  getCurrentDashboardCapabilities,
  resolveCurrentDashboard,
} from '../currentDashboardResolution.js';

const conceptIds = (resolution) => resolution.conceptEntries.map((entry) => entry.id);

describe('current dashboard resolution helper', () => {
  it('resolves order-capable users to Staff/default order dashboard metadata', () => {
    const resolution = resolveCurrentDashboard({
      permissionKeys: [PERMISSIONS.NAVIGATION_ORDERS_VIEW],
    });

    expect(resolution).toMatchObject({
      id: 'current.dashboard.order',
      label: 'Staff / Default Order Dashboard',
      state: CURRENT_DASHBOARD_RESOLUTION_STATES.ORDER_DASHBOARD,
      componentHint: 'DashboardPage',
      registryKind: CURRENT_DASHBOARD_REGISTRY_KIND,
      metadataAuthority: CURRENT_DASHBOARD_AUTHORITY.DESCRIPTIVE_ONLY,
    });
    expect(conceptIds(resolution)).toEqual(
      expect.arrayContaining([
        'dashboard.order.active-attention',
        'dashboard.order.deadline-pressure',
        'dashboard.order.client-summary',
        'dashboard.order.review-qc',
        'dashboard.order.calendar-pressure',
        'dashboard.order.table',
      ]),
    );
    expect(conceptIds(resolution)).not.toEqual(
      expect.arrayContaining([
        'dashboard.assignment.assigned-work',
        'dashboard.assignment.owner-sent',
      ]),
    );
  });

  it('resolves assignment-only users to assignment dashboard metadata', () => {
    const resolution = resolveCurrentDashboard({
      permissionKeys: [PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED],
    });

    expect(resolution).toMatchObject({
      id: 'current.dashboard.assignment',
      label: 'Assignment Dashboard',
      state: CURRENT_DASHBOARD_RESOLUTION_STATES.ASSIGNMENT_DASHBOARD,
      componentHint: 'AssignmentDashboardPage',
    });
    expect(conceptIds(resolution)).toEqual(['dashboard.assignment.assigned-work']);
  });

  it('preserves owner sent-assignment dashboard widget concepts', () => {
    const resolution = resolveCurrentDashboard({
      permissionKeys: [PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_OWNER],
    });

    expect(resolution.state).toBe(CURRENT_DASHBOARD_RESOLUTION_STATES.ASSIGNMENT_DASHBOARD);
    expect(conceptIds(resolution)).toEqual(['dashboard.assignment.owner-sent']);
  });

  it('preserves mixed-user order dashboard priority', () => {
    const resolution = resolveCurrentDashboard({
      permissionKeys: [
        PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED,
        PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_OWNER,
        PERMISSIONS.ORDERS_READ_ASSIGNED,
      ],
    });

    expect(resolution.state).toBe(CURRENT_DASHBOARD_RESOLUTION_STATES.ORDER_DASHBOARD);
    expect(resolution.componentHint).toBe('DashboardPage');
    expect(conceptIds(resolution)).toEqual(
      expect.arrayContaining(['dashboard.order.active-attention']),
    );
    expect(conceptIds(resolution)).not.toEqual(
      expect.arrayContaining([
        'dashboard.assignment.assigned-work',
        'dashboard.assignment.owner-sent',
      ]),
    );
  });

  it('accepts operations mode without changing dashboard resolution', () => {
    const permissionKeys = [PERMISSIONS.NAVIGATION_ORDERS_VIEW];
    const internalResolution = resolveCurrentDashboard({
      operationsMode: OPERATIONS_MODES.INTERNAL_OPERATIONS,
      permissionKeys,
    });
    const amcResolution = resolveCurrentDashboard({
      operationsMode: OPERATIONS_MODES.AMC_OPERATIONS,
      permissionKeys,
    });

    expect(amcResolution.state).toBe(internalResolution.state);
    expect(amcResolution.componentHint).toBe(internalResolution.componentHint);
    expect(amcResolution.route).toBe('/dashboard');
    expect(amcResolution.operationsMode).toBe(OPERATIONS_MODES.AMC_OPERATIONS);
    expect(amcResolution.operationsModeLabel).toBe('AMC Operations');
    expect(conceptIds(amcResolution)).toEqual(conceptIds(internalResolution));
    expect(JSON.stringify(amcResolution)).not.toContain('/amc');
  });

  it('does not let operations mode alter permission capability output', () => {
    const permissionKeys = [
      PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_OWNER,
      PERMISSIONS.ORDERS_READ_ASSIGNED,
    ];
    const internalCapabilities = getCurrentDashboardCapabilities({
      operationsMode: OPERATIONS_MODES.INTERNAL_OPERATIONS,
      permissionKeys,
    });
    const amcCapabilities = getCurrentDashboardCapabilities({
      operationsMode: OPERATIONS_MODES.AMC_OPERATIONS,
      permissionKeys,
    });

    expect({
      canViewOrderDashboard: amcCapabilities.canViewOrderDashboard,
      canViewAssignmentDashboard: amcCapabilities.canViewAssignmentDashboard,
      canReadAssignedAssignments: amcCapabilities.canReadAssignedAssignments,
      canReadOwnerAssignments: amcCapabilities.canReadOwnerAssignments,
      permissionKeys: amcCapabilities.permissionKeys,
    }).toEqual({
      canViewOrderDashboard: internalCapabilities.canViewOrderDashboard,
      canViewAssignmentDashboard: internalCapabilities.canViewAssignmentDashboard,
      canReadAssignedAssignments: internalCapabilities.canReadAssignedAssignments,
      canReadOwnerAssignments: internalCapabilities.canReadOwnerAssignments,
      permissionKeys: internalCapabilities.permissionKeys,
    });
  });

  it('resolves users with no dashboard capability to unavailable state metadata', () => {
    const resolution = resolveCurrentDashboard({
      permissionKeys: [PERMISSIONS.CLIENTS_READ_ALL],
    });

    expect(resolution).toMatchObject({
      id: 'current.dashboard.unavailable',
      label: 'Dashboard unavailable',
      state: CURRENT_DASHBOARD_RESOLUTION_STATES.UNAVAILABLE,
      componentHint: 'AssignmentState',
      conceptEntries: [],
    });
    expect(resolution.message).toBe(
      'Dashboard access requires order read permission or assignment packet read permission for the current company.',
    );
  });

  it('keeps Vendor and Client future dashboard shells out of current resolution output', () => {
    const resolutions = [
      resolveCurrentDashboard([PERMISSIONS.NAVIGATION_ORDERS_VIEW]),
      resolveCurrentDashboard([PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED]),
      resolveCurrentDashboard([PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_OWNER]),
      resolveCurrentDashboard([]),
    ];

    resolutions.forEach((resolution) => {
      const serialized = JSON.stringify(resolution);
      expect(serialized).not.toContain('vendor-packet-dashboard');
      expect(serialized).not.toContain('client-status-dashboard');
      expect(serialized).not.toContain('Client Order Status Dashboard');
      expect(serialized).not.toContain('Vendor Packet Dashboard');
    });
  });

  it('uses current-live dashboard registry metadata only', () => {
    const resolution = resolveCurrentDashboard([PERMISSIONS.ORDERS_READ_ALL]);

    expect(resolution.registryKind).toBe(CURRENT_DASHBOARD_REGISTRY_KIND);
    expect(resolution.metadataAuthority).toBe(CURRENT_DASHBOARD_AUTHORITY.DESCRIPTIVE_ONLY);
    expect(resolution.gateEntry).toMatchObject({
      id: 'dashboard.gate',
      activeLive: true,
      productModeAware: false,
      metadataAuthority: CURRENT_DASHBOARD_AUTHORITY.DESCRIPTIVE_ONLY,
    });
    expect(resolution.conceptEntries.every((entry) => entry.activeLive === true)).toBe(true);
    expect(resolution.conceptEntries.every((entry) => entry.productModeAware === false)).toBe(
      true,
    );
  });

  it('fails safely for unknown or missing inputs', () => {
    expect(resolveCurrentDashboard()).toMatchObject({
      state: CURRENT_DASHBOARD_RESOLUTION_STATES.UNAVAILABLE,
      conceptEntries: [],
    });
    expect(resolveCurrentDashboard({ permissionKeys: null, loading: false })).toMatchObject({
      state: CURRENT_DASHBOARD_RESOLUTION_STATES.UNAVAILABLE,
      conceptEntries: [],
    });
    expect(resolveCurrentDashboard({ permissions: ['unknown.permission'] })).toMatchObject({
      state: CURRENT_DASHBOARD_RESOLUTION_STATES.UNAVAILABLE,
      conceptEntries: [],
    });
  });

  it('preserves loading fallback metadata without selecting a dashboard surface', () => {
    const resolution = resolveCurrentDashboard({
      loading: true,
      permissionKeys: [PERMISSIONS.NAVIGATION_ORDERS_VIEW],
    });

    expect(resolution).toMatchObject({
      id: 'current.dashboard.loading',
      label: 'Loading Dashboard',
      state: CURRENT_DASHBOARD_RESOLUTION_STATES.LOADING,
      componentHint: 'LoadingState',
      conceptEntries: [],
      message: 'Loading dashboard...',
    });
  });
});
