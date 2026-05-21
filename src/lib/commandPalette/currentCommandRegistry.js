import { PERMISSIONS } from '../permissions/constants.js';

export const CURRENT_COMMAND_REGISTRY_KIND = 'current_live_command_palette_registry';

export const CURRENT_COMMAND_AUTHORITY = Object.freeze({
  DESCRIPTIVE_ONLY: 'descriptive_only_permissions_remain_authority',
});

export const CURRENT_COMMAND_GATE_TYPES = Object.freeze({
  ANY_PERMISSION: 'any_permission',
  NONE: 'none',
  PERMISSION: 'permission',
});

export const CURRENT_COMMAND_STATUS = Object.freeze({
  ACTIVE_LIVE: 'active_live',
  FALLBACK_LIVE: 'fallback_live',
});

const freezeArray = (items = []) => Object.freeze([...items]);

const gate = (type, permissions = []) =>
  Object.freeze({
    type,
    permissions: freezeArray(permissions),
  });

const noGate = gate(CURRENT_COMMAND_GATE_TYPES.NONE);

const createEntry = (definition) =>
  Object.freeze({
    ...definition,
    activeLive: true,
    futureOnly: false,
    productModeAware: false,
    metadataAuthority: CURRENT_COMMAND_AUTHORITY.DESCRIPTIVE_ONLY,
    status: definition.status ?? CURRENT_COMMAND_STATUS.ACTIVE_LIVE,
    gate: definition.gate ?? noGate,
    tags: freezeArray(definition.tags),
    notes: freezeArray(definition.notes),
  });

export const currentLiveCommandEntries = freezeArray([
  createEntry({
    id: 'orders',
    label: 'Go to Orders',
    hint: 'g o',
    path: '/orders',
    shadowCommandId: 'open-orders',
    gate: gate(CURRENT_COMMAND_GATE_TYPES.PERMISSION, [PERMISSIONS.NAVIGATION_ORDERS_VIEW]),
    tags: ['orders', 'navigate'],
    notes: ['Current hardcoded command palette item.'],
  }),
  createEntry({
    id: 'orders.search',
    label: 'Search Orders',
    path: '/orders?q=:query',
    shadowCommandId: 'search-orders',
    gate: gate(CURRENT_COMMAND_GATE_TYPES.PERMISSION, [PERMISSIONS.NAVIGATION_ORDERS_VIEW]),
    status: CURRENT_COMMAND_STATUS.FALLBACK_LIVE,
    tags: ['orders', 'search'],
    notes: ['Current free-text fallback when no command matches and order navigation permission is present.'],
  }),
  createEntry({
    id: 'assignments',
    label: 'Go to Assignments',
    hint: 'g a',
    path: '/assignments',
    shadowCommandId: 'open-assignment-packets',
    gate: gate(CURRENT_COMMAND_GATE_TYPES.ANY_PERMISSION, [
      PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED,
      PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_OWNER,
    ]),
    tags: ['assignments', 'packets'],
    notes: ['Current command is only included after assignment read permissions resolve.'],
  }),
  createEntry({
    id: 'relationships',
    label: 'Go to Relationships',
    hint: 'g r',
    path: '/relationships',
    shadowCommandId: 'open-relationships',
    gate: gate(CURRENT_COMMAND_GATE_TYPES.PERMISSION, [PERMISSIONS.RELATIONSHIPS_READ]),
    tags: ['relationships', 'network'],
    notes: ['Current command is only included after relationships.read resolves.'],
  }),
  createEntry({
    id: 'calendar',
    label: 'Go to Calendar',
    hint: 'g c',
    path: '/calendar',
    shadowCommandId: 'open-calendar',
    gate: noGate,
    tags: ['calendar', 'navigate'],
    notes: ['Current command has no command-level permission gate; route guard remains authority.'],
  }),
  createEntry({
    id: 'clients',
    label: 'Go to Clients',
    hint: 'g l',
    path: 'dynamic:clientsPath',
    shadowCommandId: 'open-clients',
    gate: gate(CURRENT_COMMAND_GATE_TYPES.PERMISSION, [PERMISSIONS.NAVIGATION_CLIENTS_VIEW]),
    tags: ['clients', 'navigate'],
    notes: ['Current command path is supplied by TopNav as clientsPath.'],
  }),
  createEntry({
    id: 'users',
    label: 'Go to Users',
    hint: 'g u',
    path: '/users',
    shadowCommandId: 'open-team-access',
    gate: gate(CURRENT_COMMAND_GATE_TYPES.ANY_PERMISSION, [
      PERMISSIONS.USERS_READ,
      PERMISSIONS.NAVIGATION_USERS_VIEW,
    ]),
    tags: ['team', 'admin'],
    notes: ['Current command label is Users while the shadow concept is Team Access.'],
  }),
  createEntry({
    id: 'settings',
    label: 'Open Settings',
    hint: ',',
    path: '/settings',
    shadowCommandId: 'open-settings',
    gate: gate(CURRENT_COMMAND_GATE_TYPES.ANY_PERMISSION, [
      PERMISSIONS.SETTINGS_VIEW,
      PERMISSIONS.NAVIGATION_SETTINGS_VIEW,
    ]),
    tags: ['settings'],
    notes: ['Current hardcoded command palette item.'],
  }),
  createEntry({
    id: 'notif',
    label: 'Notification Settings',
    path: '/settings/notifications',
    shadowCommandId: 'open-notifications',
    gate: gate(CURRENT_COMMAND_GATE_TYPES.PERMISSION, [
      PERMISSIONS.NOTIFICATIONS_PREFERENCES_MANAGE_OWN,
    ]),
    tags: ['notifications', 'settings'],
    notes: ['Current command opens notification preferences, not a notification center.'],
  }),
]);

export const currentLiveCommandEntriesById = Object.freeze(
  Object.fromEntries(currentLiveCommandEntries.map((entry) => [entry.id, entry])),
);

export const getCurrentLiveCommandEntry = (entryId) =>
  currentLiveCommandEntriesById[entryId] ?? null;

export const getCurrentLiveShadowCommandIds = () =>
  freezeArray(currentLiveCommandEntries.map((entry) => entry.shadowCommandId).filter(Boolean));
