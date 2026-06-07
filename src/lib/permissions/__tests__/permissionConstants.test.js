import { describe, expect, it } from 'vitest';

import { ALL_PERMISSION_KEYS, PERMISSIONS } from '../constants.js';

const vendorPermissionEntries = Object.freeze({
  VENDORS_READ: 'vendors.read',
  VENDORS_CREATE: 'vendors.create',
  VENDORS_UPDATE: 'vendors.update',
  VENDORS_CONTACTS_MANAGE: 'vendors.contacts.manage',
  VENDORS_SERVICE_AREAS_MANAGE: 'vendors.service_areas.manage',
});

const bidRequestPermissionEntries = Object.freeze({
  BID_REQUESTS_READ: 'bid_requests.read',
  BID_REQUESTS_CREATE: 'bid_requests.create',
  BID_REQUESTS_UPDATE: 'bid_requests.update',
  BID_REQUESTS_SELECT: 'bid_requests.select',
});

const vendorWorkspacePermissionEntries = Object.freeze({
  VENDOR_WORKSPACE_VIEW: 'vendor_workspace.view',
  VENDOR_BIDS_READ: 'vendor_bids.read',
  VENDOR_BIDS_RESPOND: 'vendor_bids.respond',
  VENDOR_ASSIGNMENTS_READ: 'vendor_assignments.read',
  VENDOR_ASSIGNMENTS_RESPOND: 'vendor_assignments.respond',
  VENDOR_ASSIGNMENTS_PROGRESS: 'vendor_assignments.progress',
  VENDOR_DOCUMENTS_READ: 'vendor_documents.read',
  VENDOR_DOCUMENTS_UPLOAD: 'vendor_documents.upload',
  VENDOR_PROFILE_READ: 'vendor_profile.read',
  VENDOR_PROFILE_UPDATE: 'vendor_profile.update',
  VENDOR_PAYMENTS_READ: 'vendor_payments.read',
  VENDOR_INVOICES_SUBMIT: 'vendor_invoices.submit',
});

const clientPortalPermissionEntries = Object.freeze({
  CLIENT_PORTAL_DASHBOARD_VIEW: 'client_portal.dashboard.view',
  CLIENT_PORTAL_ORDERS_READ: 'client_portal.orders.read',
  CLIENT_PORTAL_ORDERS_CREATE: 'client_portal.orders.create',
  CLIENT_PORTAL_REPORTS_READ: 'client_portal.reports.read',
  CLIENT_PORTAL_ORDER_REQUESTS_READ: 'client_portal.order_requests.read',
  CLIENT_PORTAL_ORDER_REQUESTS_MANAGE: 'client_portal.order_requests.manage',
});

describe('permission constants', () => {
  it('exposes the AMC MVP vendor permission keys', () => {
    expect(PERMISSIONS).toMatchObject(vendorPermissionEntries);
  });

  it('includes the AMC MVP vendor permissions in the all-permission key list', () => {
    expect(ALL_PERMISSION_KEYS).toEqual(
      expect.arrayContaining(Object.values(vendorPermissionEntries)),
    );
  });

  it('exposes the AMC bid request permission keys', () => {
    expect(PERMISSIONS).toMatchObject(bidRequestPermissionEntries);
  });

  it('includes the AMC bid request permissions in the all-permission key list', () => {
    expect(ALL_PERMISSION_KEYS).toEqual(
      expect.arrayContaining(Object.values(bidRequestPermissionEntries)),
    );
  });

  it('exposes the future Vendor Workspace permission keys', () => {
    expect(PERMISSIONS).toMatchObject(vendorWorkspacePermissionEntries);
  });

  it('includes the future Vendor Workspace permissions in the all-permission key list', () => {
    expect(ALL_PERMISSION_KEYS).toEqual(
      expect.arrayContaining(Object.values(vendorWorkspacePermissionEntries)),
    );
  });

  it('exposes the Client Portal MVP permission keys', () => {
    expect(PERMISSIONS).toMatchObject(clientPortalPermissionEntries);
  });

  it('includes the Client Portal MVP permissions in the all-permission key list', () => {
    expect(ALL_PERMISSION_KEYS).toEqual(
      expect.arrayContaining(Object.values(clientPortalPermissionEntries)),
    );
  });
});
