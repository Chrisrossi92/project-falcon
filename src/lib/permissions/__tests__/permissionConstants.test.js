import { describe, expect, it } from 'vitest';

import { ALL_PERMISSION_KEYS, PERMISSIONS } from '../constants.js';

const vendorPermissionEntries = Object.freeze({
  VENDORS_READ: 'vendors.read',
  VENDORS_CREATE: 'vendors.create',
  VENDORS_UPDATE: 'vendors.update',
  VENDORS_CONTACTS_MANAGE: 'vendors.contacts.manage',
  VENDORS_SERVICE_AREAS_MANAGE: 'vendors.service_areas.manage',
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
});
