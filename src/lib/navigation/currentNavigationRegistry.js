import { PERMISSIONS } from '../permissions/constants.js';

export const CURRENT_NAV_REGISTRY_KIND = 'current_live_navigation_registry';

export const CURRENT_NAV_AUTHORITY = Object.freeze({
  DESCRIPTIVE_ONLY: 'descriptive_only_permissions_remain_authority',
});

export const CURRENT_NAV_ENTRY_STATUS = Object.freeze({
  ACTIVE_LIVE: 'active_live',
  ACTIVE_ROUTE_ONLY: 'active_route_only',
  DIAGNOSTIC_ROUTE_ONLY: 'diagnostic_route_only',
});

export const CURRENT_NAV_SURFACES = Object.freeze({
  AVATAR_MENU: 'avatar_menu',
  BRAND: 'brand',
  COMMAND: 'command',
  DESKTOP: 'desktop',
  DIAGNOSTIC: 'diagnostic',
  MOBILE: 'mobile',
  ROUTE: 'route',
  SETTINGS: 'settings',
});

export const CURRENT_NAV_GATE_TYPES = Object.freeze({
  AUTHENTICATED: 'authenticated',
  ANY_PERMISSION: 'any_permission',
  NONE: 'none',
  PERMISSION: 'permission',
  REDIRECT_ONLY: 'redirect_only',
});

const freezeArray = (items = []) => Object.freeze([...items]);

const gate = (type, permissions = []) =>
  Object.freeze({
    type,
    permissions: freezeArray(permissions),
  });

const noGate = gate(CURRENT_NAV_GATE_TYPES.NONE);
const authenticatedGate = gate(CURRENT_NAV_GATE_TYPES.AUTHENTICATED);
const redirectOnlyGate = gate(CURRENT_NAV_GATE_TYPES.REDIRECT_ONLY);

const freezeSurfaceVisibilityGates = (surfaceVisibilityGates = {}) =>
  Object.freeze(
    Object.fromEntries(
      Object.entries(surfaceVisibilityGates).map(([surface, surfaceGate]) => [
        surface,
        surfaceGate,
      ]),
    ),
  );

const freezeSurfaceLabels = (surfaceLabels = {}) =>
  Object.freeze(Object.fromEntries(Object.entries(surfaceLabels)));

const commandMetadata = (definition) => {
  if (!definition) return null;

  return Object.freeze({
    id: definition.id,
    label: definition.label,
    hint: definition.hint ?? '',
    path: definition.path,
    gate: definition.gate ?? noGate,
    notes: freezeArray(definition.notes),
  });
};

const createEntry = (definition) =>
  Object.freeze({
    ...definition,
    activeLive: definition.activeLive ?? true,
    futureOnly: false,
    productModeAware: false,
    metadataAuthority: CURRENT_NAV_AUTHORITY.DESCRIPTIVE_ONLY,
    status: definition.status ?? CURRENT_NAV_ENTRY_STATUS.ACTIVE_LIVE,
    surfaces: freezeArray(definition.surfaces),
    visibilityGate: definition.visibilityGate ?? noGate,
    routeGate: definition.routeGate ?? authenticatedGate,
    surfaceVisibilityGates: freezeSurfaceVisibilityGates(definition.surfaceVisibilityGates),
    surfaceLabels: freezeSurfaceLabels(definition.surfaceLabels),
    command: commandMetadata(definition.command),
    notes: freezeArray(definition.notes),
  });

export const currentLiveNavigationEntries = freezeArray([
  createEntry({
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    order: 10,
    surfaces: [CURRENT_NAV_SURFACES.BRAND, CURRENT_NAV_SURFACES.ROUTE],
    visibilityGate: authenticatedGate,
    routeGate: authenticatedGate,
    notes: [
      'Brand link routes to /dashboard and displays Falcon Operations copy in TopNav.',
      'DashboardGate chooses the order dashboard, assignment dashboard, or unavailable state at runtime.',
    ],
  }),

  createEntry({
    id: 'my_work',
    label: 'My Work',
    path: '/my-work',
    order: 11,
    surfaces: [
      CURRENT_NAV_SURFACES.DESKTOP,
      CURRENT_NAV_SURFACES.MOBILE,
      CURRENT_NAV_SURFACES.ROUTE,
    ],
    visibilityGate: gate(CURRENT_NAV_GATE_TYPES.PERMISSION, [PERMISSIONS.ORDERS_READ_ASSIGNED]),
    routeGate: gate(CURRENT_NAV_GATE_TYPES.ANY_PERMISSION, [
      PERMISSIONS.ORDERS_READ_ALL,
      PERMISSIONS.ORDERS_READ_ASSIGNED,
    ]),
    notes: [
      'Dedicated staff appraiser execution surface introduced after the dashboard-fed My Work preview.',
      'TopNav exposes this link only for the resolved my_work shell profile; route guard remains order-read based.',
    ],
  }),

  createEntry({
    id: 'orders',
    label: 'Orders',
    path: '/orders',
    order: 20,
    surfaces: [
      CURRENT_NAV_SURFACES.DESKTOP,
      CURRENT_NAV_SURFACES.MOBILE,
      CURRENT_NAV_SURFACES.COMMAND,
      CURRENT_NAV_SURFACES.ROUTE,
    ],
    visibilityGate: noGate,
    routeGate: gate(CURRENT_NAV_GATE_TYPES.ANY_PERMISSION, [
      PERMISSIONS.ORDERS_READ_ALL,
      PERMISSIONS.ORDERS_READ_ASSIGNED,
    ]),
    command: {
      id: 'orders',
      label: 'Go to Orders',
      hint: 'g o',
      path: '/orders',
      gate: gate(CURRENT_NAV_GATE_TYPES.PERMISSION, [PERMISSIONS.NAVIGATION_ORDERS_VIEW]),
      notes: ['Command palette also allows free-text order search when this permission is present.'],
    },
    notes: [
      'TopNav currently renders Orders in the authenticated shell without a nav visibility permission check.',
      'Route guards remain the authority for order access.',
    ],
  }),

  createEntry({
    id: 'orders.new',
    label: 'New Order',
    path: '/orders/new',
    order: 21,
    surfaces: [CURRENT_NAV_SURFACES.ROUTE],
    visibilityGate: gate(CURRENT_NAV_GATE_TYPES.PERMISSION, [PERMISSIONS.ORDERS_CREATE]),
    routeGate: gate(CURRENT_NAV_GATE_TYPES.PERMISSION, [PERMISSIONS.ORDERS_CREATE]),
    status: CURRENT_NAV_ENTRY_STATUS.ACTIVE_ROUTE_ONLY,
    notes: ['Current route-only order creation surface.'],
  }),

  createEntry({
    id: 'orders.detail',
    label: 'Order Detail',
    path: '/orders/:id',
    order: 22,
    surfaces: [CURRENT_NAV_SURFACES.ROUTE],
    routeGate: gate(CURRENT_NAV_GATE_TYPES.ANY_PERMISSION, [
      PERMISSIONS.ORDERS_READ_ALL,
      PERMISSIONS.ORDERS_READ_ASSIGNED,
    ]),
    status: CURRENT_NAV_ENTRY_STATUS.ACTIVE_ROUTE_ONLY,
    notes: ['Current canonical order detail route.'],
  }),

  createEntry({
    id: 'orders.edit',
    label: 'Edit Order',
    path: '/orders/:id/edit',
    order: 23,
    surfaces: [CURRENT_NAV_SURFACES.ROUTE],
    routeGate: gate(CURRENT_NAV_GATE_TYPES.PERMISSION, [PERMISSIONS.ORDERS_UPDATE_ALL]),
    status: CURRENT_NAV_ENTRY_STATUS.ACTIVE_ROUTE_ONLY,
    notes: ['Current route-only order edit surface.'],
  }),

  createEntry({
    id: 'assignments',
    label: 'Assignments',
    path: '/assignments',
    order: 30,
    surfaces: [
      CURRENT_NAV_SURFACES.DESKTOP,
      CURRENT_NAV_SURFACES.MOBILE,
      CURRENT_NAV_SURFACES.COMMAND,
      CURRENT_NAV_SURFACES.ROUTE,
    ],
    visibilityGate: gate(CURRENT_NAV_GATE_TYPES.ANY_PERMISSION, [
      PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED,
      PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_OWNER,
    ]),
    routeGate: gate(CURRENT_NAV_GATE_TYPES.ANY_PERMISSION, [
      PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED,
      PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_OWNER,
    ]),
    command: {
      id: 'assignments',
      label: 'Go to Assignments',
      hint: 'g a',
      path: '/assignments',
      gate: gate(CURRENT_NAV_GATE_TYPES.ANY_PERMISSION, [
        PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED,
        PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_OWNER,
      ]),
    },
    notes: [
      'Assignment navigation is assignment-packet native and does not imply canonical order access.',
    ],
  }),

  createEntry({
    id: 'assignments.detail',
    label: 'Assignment Packet',
    path: '/assignments/:assignmentId',
    order: 31,
    surfaces: [CURRENT_NAV_SURFACES.ROUTE],
    routeGate: gate(CURRENT_NAV_GATE_TYPES.ANY_PERMISSION, [
      PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED,
      PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_OWNER,
    ]),
    status: CURRENT_NAV_ENTRY_STATUS.ACTIVE_ROUTE_ONLY,
    notes: ['Assignment packet detail route links from assignment-native surfaces only.'],
  }),

  createEntry({
    id: 'relationships',
    label: 'Relationships',
    path: '/relationships',
    order: 40,
    surfaces: [
      CURRENT_NAV_SURFACES.DESKTOP,
      CURRENT_NAV_SURFACES.MOBILE,
      CURRENT_NAV_SURFACES.COMMAND,
      CURRENT_NAV_SURFACES.ROUTE,
    ],
    visibilityGate: gate(CURRENT_NAV_GATE_TYPES.PERMISSION, [PERMISSIONS.RELATIONSHIPS_READ]),
    routeGate: gate(CURRENT_NAV_GATE_TYPES.PERMISSION, [PERMISSIONS.RELATIONSHIPS_READ]),
    command: {
      id: 'relationships',
      label: 'Go to Relationships',
      hint: 'g r',
      path: '/relationships',
      gate: gate(CURRENT_NAV_GATE_TYPES.PERMISSION, [PERMISSIONS.RELATIONSHIPS_READ]),
    },
    notes: ['Relationship route, nav, and command visibility require relationships.read.'],
  }),

  createEntry({
    id: 'relationships.detail',
    label: 'Relationship Detail',
    path: '/relationships/:relationshipId',
    order: 41,
    surfaces: [CURRENT_NAV_SURFACES.ROUTE],
    routeGate: gate(CURRENT_NAV_GATE_TYPES.PERMISSION, [PERMISSIONS.RELATIONSHIPS_READ]),
    status: CURRENT_NAV_ENTRY_STATUS.ACTIVE_ROUTE_ONLY,
    notes: ['Relationship detail uses the same page and permission gate as the relationship index.'],
  }),

  createEntry({
    id: 'vendors',
    label: 'Vendors',
    path: '/vendors',
    order: 45,
    surfaces: [
      CURRENT_NAV_SURFACES.DESKTOP,
      CURRENT_NAV_SURFACES.MOBILE,
      CURRENT_NAV_SURFACES.ROUTE,
    ],
    visibilityGate: gate(CURRENT_NAV_GATE_TYPES.PERMISSION, [PERMISSIONS.VENDORS_READ]),
    routeGate: gate(CURRENT_NAV_GATE_TYPES.PERMISSION, [PERMISSIONS.VENDORS_READ]),
    notes: [
      'AMC Operations read-only Vendor Directory surface gated by vendors.read.',
      'Vendor Directory wraps vendor language and does not expose raw relationship management UX.',
    ],
  }),

  createEntry({
    id: 'vendors.detail',
    label: 'Vendor Profile',
    path: '/vendors/:vendorProfileId',
    order: 46,
    surfaces: [CURRENT_NAV_SURFACES.ROUTE],
    routeGate: gate(CURRENT_NAV_GATE_TYPES.PERMISSION, [PERMISSIONS.VENDORS_READ]),
    status: CURRENT_NAV_ENTRY_STATUS.ACTIVE_ROUTE_ONLY,
    notes: ['Read-only Vendor Profile detail route linked from the Vendor Directory.'],
  }),

  createEntry({
    id: 'calendar',
    label: 'Calendar',
    path: '/calendar',
    order: 50,
    surfaces: [
      CURRENT_NAV_SURFACES.DESKTOP,
      CURRENT_NAV_SURFACES.MOBILE,
      CURRENT_NAV_SURFACES.COMMAND,
      CURRENT_NAV_SURFACES.ROUTE,
    ],
    visibilityGate: noGate,
    routeGate: gate(CURRENT_NAV_GATE_TYPES.ANY_PERMISSION, [
      PERMISSIONS.NAVIGATION_ORDERS_VIEW,
      PERMISSIONS.ORDERS_READ_ALL,
      PERMISSIONS.ORDERS_READ_ASSIGNED,
    ]),
    command: {
      id: 'calendar',
      label: 'Go to Calendar',
      hint: 'g c',
      path: '/calendar',
      gate: noGate,
    },
    notes: [
      'TopNav and command palette expose Calendar without a command-level permission check.',
      'The route guard remains the authority for calendar access.',
    ],
  }),

  createEntry({
    id: 'clients.primary',
    label: 'Clients',
    path: '/clients',
    pathByPermission: Object.freeze({
      [PERMISSIONS.CLIENTS_READ_ALL]: '/clients',
      [PERMISSIONS.CLIENTS_READ_ASSIGNED]: '/clients/cards',
    }),
    order: 60,
    surfaces: [
      CURRENT_NAV_SURFACES.DESKTOP,
      CURRENT_NAV_SURFACES.MOBILE,
      CURRENT_NAV_SURFACES.COMMAND,
    ],
    visibilityGate: gate(CURRENT_NAV_GATE_TYPES.ANY_PERMISSION, [
      PERMISSIONS.CLIENTS_READ_ALL,
      PERMISSIONS.CLIENTS_READ_ASSIGNED,
    ]),
    routeGate: gate(CURRENT_NAV_GATE_TYPES.ANY_PERMISSION, [
      PERMISSIONS.CLIENTS_READ_ALL,
      PERMISSIONS.CLIENTS_READ_ASSIGNED,
    ]),
    command: {
      id: 'clients',
      label: 'Go to Clients',
      hint: 'g l',
      path: 'dynamic:clientsPath',
      gate: gate(CURRENT_NAV_GATE_TYPES.PERMISSION, [PERMISSIONS.NAVIGATION_CLIENTS_VIEW]),
    },
    notes: [
      'TopNav resolves Clients to /clients for clients.read.all and /clients/cards for assigned-only client readers.',
      'CommandPalette receives the same dynamic clientsPath from TopNav.',
    ],
  }),

  createEntry({
    id: 'clients.index',
    label: 'Clients',
    path: '/clients',
    order: 61,
    surfaces: [CURRENT_NAV_SURFACES.ROUTE],
    routeGate: gate(CURRENT_NAV_GATE_TYPES.PERMISSION, [PERMISSIONS.CLIENTS_READ_ALL]),
    status: CURRENT_NAV_ENTRY_STATUS.ACTIVE_ROUTE_ONLY,
    notes: ['Broad client management dashboard route.'],
  }),

  createEntry({
    id: 'clients.cards',
    label: 'Client Cards',
    path: '/clients/cards',
    order: 62,
    surfaces: [CURRENT_NAV_SURFACES.ROUTE],
    routeGate: gate(CURRENT_NAV_GATE_TYPES.ANY_PERMISSION, [
      PERMISSIONS.CLIENTS_READ_ALL,
      PERMISSIONS.CLIENTS_READ_ASSIGNED,
    ]),
    status: CURRENT_NAV_ENTRY_STATUS.ACTIVE_ROUTE_ONLY,
    notes: ['Assigned-safe client cards route.'],
  }),

  createEntry({
    id: 'clients.new',
    label: 'New Client',
    path: '/clients/new',
    order: 63,
    surfaces: [CURRENT_NAV_SURFACES.ROUTE],
    routeGate: gate(CURRENT_NAV_GATE_TYPES.PERMISSION, [PERMISSIONS.CLIENTS_CREATE]),
    status: CURRENT_NAV_ENTRY_STATUS.ACTIVE_ROUTE_ONLY,
    notes: ['Route-only client creation surface.'],
  }),

  createEntry({
    id: 'clients.profile',
    label: 'Client Profile',
    path: '/clients/profile/:clientId',
    order: 64,
    surfaces: [CURRENT_NAV_SURFACES.ROUTE],
    routeGate: gate(CURRENT_NAV_GATE_TYPES.PERMISSION, [PERMISSIONS.CLIENTS_READ_ALL]),
    status: CURRENT_NAV_ENTRY_STATUS.ACTIVE_ROUTE_ONLY,
    notes: ['Broad client profile route.'],
  }),

  createEntry({
    id: 'clients.edit',
    label: 'Edit Client',
    path: '/clients/edit/:clientId',
    order: 65,
    surfaces: [CURRENT_NAV_SURFACES.ROUTE],
    routeGate: gate(CURRENT_NAV_GATE_TYPES.PERMISSION, [PERMISSIONS.CLIENTS_UPDATE_ALL]),
    status: CURRENT_NAV_ENTRY_STATUS.ACTIVE_ROUTE_ONLY,
    notes: ['Route-only client edit surface.'],
  }),

  createEntry({
    id: 'clients.detail',
    label: 'Client Detail',
    path: '/clients/:id',
    order: 66,
    surfaces: [CURRENT_NAV_SURFACES.ROUTE],
    routeGate: gate(CURRENT_NAV_GATE_TYPES.ANY_PERMISSION, [
      PERMISSIONS.CLIENTS_READ_ALL,
      PERMISSIONS.CLIENTS_READ_ASSIGNED,
    ]),
    status: CURRENT_NAV_ENTRY_STATUS.ACTIVE_ROUTE_ONLY,
    notes: ['Role-aware client detail route.'],
  }),

  createEntry({
    id: 'users',
    label: 'Users',
    path: '/users',
    order: 70,
    surfaces: [
      CURRENT_NAV_SURFACES.DESKTOP,
      CURRENT_NAV_SURFACES.MOBILE,
      CURRENT_NAV_SURFACES.COMMAND,
      CURRENT_NAV_SURFACES.ROUTE,
    ],
    visibilityGate: gate(CURRENT_NAV_GATE_TYPES.PERMISSION, [PERMISSIONS.USERS_READ]),
    routeGate: gate(CURRENT_NAV_GATE_TYPES.PERMISSION, [PERMISSIONS.USERS_READ]),
    command: {
      id: 'users',
      label: 'Open Users',
      hint: 'g u',
      path: '/users',
      gate: gate(CURRENT_NAV_GATE_TYPES.ANY_PERMISSION, [
        PERMISSIONS.USERS_READ,
        PERMISSIONS.NAVIGATION_USERS_VIEW,
      ]),
    },
    notes: ['The /users route hosts company user and staff directory views.'],
  }),

  createEntry({
    id: 'users.redirects',
    label: 'Users Legacy Redirects',
    path: '/users/:userId | /users/new | /users/view/:userId',
    order: 71,
    surfaces: [CURRENT_NAV_SURFACES.ROUTE],
    visibilityGate: redirectOnlyGate,
    routeGate: redirectOnlyGate,
    status: CURRENT_NAV_ENTRY_STATUS.ACTIVE_ROUTE_ONLY,
    notes: [
      '/users/:userId and /users/new redirect to /users; /users/view/:userId redirects to /settings.',
    ],
  }),

  createEntry({
    id: 'activity',
    label: 'Activity',
    path: '/activity',
    order: 80,
    surfaces: [CURRENT_NAV_SURFACES.ROUTE],
    routeGate: gate(CURRENT_NAV_GATE_TYPES.ANY_PERMISSION, [
      PERMISSIONS.ACTIVITY_READ_ALL,
      PERMISSIONS.ACTIVITY_READ_ASSIGNED,
    ]),
    status: CURRENT_NAV_ENTRY_STATUS.ACTIVE_ROUTE_ONLY,
    notes: ['Activity remains a route-only operational surface.'],
  }),

  createEntry({
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    order: 90,
    surfaces: [
      CURRENT_NAV_SURFACES.AVATAR_MENU,
      CURRENT_NAV_SURFACES.MOBILE,
      CURRENT_NAV_SURFACES.COMMAND,
      CURRENT_NAV_SURFACES.SETTINGS,
      CURRENT_NAV_SURFACES.ROUTE,
    ],
    visibilityGate: gate(CURRENT_NAV_GATE_TYPES.PERMISSION, [PERMISSIONS.SETTINGS_VIEW]),
    routeGate: gate(CURRENT_NAV_GATE_TYPES.PERMISSION, [PERMISSIONS.SETTINGS_VIEW]),
    surfaceVisibilityGates: {
      [CURRENT_NAV_SURFACES.AVATAR_MENU]: authenticatedGate,
      [CURRENT_NAV_SURFACES.MOBILE]: gate(CURRENT_NAV_GATE_TYPES.PERMISSION, [
        PERMISSIONS.SETTINGS_VIEW,
      ]),
      [CURRENT_NAV_SURFACES.COMMAND]: gate(CURRENT_NAV_GATE_TYPES.ANY_PERMISSION, [
        PERMISSIONS.SETTINGS_VIEW,
        PERMISSIONS.NAVIGATION_SETTINGS_VIEW,
      ]),
    },
    surfaceLabels: {
      [CURRENT_NAV_SURFACES.AVATAR_MENU]: 'Account settings',
      [CURRENT_NAV_SURFACES.MOBILE]: 'Settings',
      [CURRENT_NAV_SURFACES.COMMAND]: 'Open Account Settings',
    },
    command: {
      id: 'settings',
      label: 'Open Account Settings',
      hint: ',',
      path: '/settings',
      gate: gate(CURRENT_NAV_GATE_TYPES.ANY_PERMISSION, [
        PERMISSIONS.SETTINGS_VIEW,
        PERMISSIONS.NAVIGATION_SETTINGS_VIEW,
      ]),
    },
    notes: [
      'Avatar menu copy is Account settings, while mobile nav copy remains Settings and command copy is Open Account Settings.',
      'The /settings route remains settings.view gated.',
    ],
  }),

  createEntry({
    id: 'settings.notifications',
    label: 'Notification Settings',
    path: '/settings/notifications',
    order: 91,
    surfaces: [
      CURRENT_NAV_SURFACES.COMMAND,
      CURRENT_NAV_SURFACES.SETTINGS,
      CURRENT_NAV_SURFACES.ROUTE,
    ],
    visibilityGate: gate(CURRENT_NAV_GATE_TYPES.PERMISSION, [
      PERMISSIONS.NOTIFICATIONS_PREFERENCES_MANAGE_OWN,
    ]),
    routeGate: gate(CURRENT_NAV_GATE_TYPES.PERMISSION, [
      PERMISSIONS.NOTIFICATIONS_PREFERENCES_MANAGE_OWN,
    ]),
    surfaceLabels: {
      [CURRENT_NAV_SURFACES.SETTINGS]: 'Notification Settings →',
      [CURRENT_NAV_SURFACES.COMMAND]: 'Open Notification Settings',
    },
    command: {
      id: 'notif',
      label: 'Open Notification Settings',
      path: '/settings/notifications',
      gate: gate(CURRENT_NAV_GATE_TYPES.PERMISSION, [
        PERMISSIONS.NOTIFICATIONS_PREFERENCES_MANAGE_OWN,
      ]),
    },
    notes: ['Notification Settings is currently exposed through command palette and route access.'],
  }),

  createEntry({
    id: 'settings.ownerSetup',
    label: 'Owner Setup',
    path: '/settings/owner-setup',
    order: 92,
    surfaces: [
      CURRENT_NAV_SURFACES.SETTINGS,
      CURRENT_NAV_SURFACES.ROUTE,
    ],
    visibilityGate: gate(CURRENT_NAV_GATE_TYPES.PERMISSION, [PERMISSIONS.SETTINGS_VIEW]),
    routeGate: gate(CURRENT_NAV_GATE_TYPES.PERMISSION, [PERMISSIONS.SETTINGS_VIEW]),
    surfaceLabels: {
      [CURRENT_NAV_SURFACES.SETTINGS]: 'Owner Setup →',
    },
    notes: [
      'Owner Setup is a settings utility link only; the route remains settings.view gated.',
      'Setup readiness is diagnostic guidance only and does not authorize access.',
    ],
  }),

  createEntry({
    id: 'settings.productMetadataDiagnostics',
    label: 'Product Metadata Diagnostics',
    path: '/settings/product-metadata-diagnostics',
    order: 93,
    surfaces: [
      CURRENT_NAV_SURFACES.DIAGNOSTIC,
      CURRENT_NAV_SURFACES.SETTINGS,
      CURRENT_NAV_SURFACES.ROUTE,
    ],
    visibilityGate: gate(CURRENT_NAV_GATE_TYPES.PERMISSION, [PERMISSIONS.SETTINGS_VIEW]),
    routeGate: gate(CURRENT_NAV_GATE_TYPES.PERMISSION, [PERMISSIONS.SETTINGS_VIEW]),
    status: CURRENT_NAV_ENTRY_STATUS.DIAGNOSTIC_ROUTE_ONLY,
    diagnostic: true,
    notes: [
      'Diagnostics route is active but not part of primary TopNav or command palette.',
      'The route is for metadata inspection only and must not authorize product-mode behavior.',
    ],
  }),
]);

export const currentLiveNavigationEntriesById = Object.freeze(
  Object.fromEntries(currentLiveNavigationEntries.map((entry) => [entry.id, entry])),
);

export const getCurrentLiveNavigationEntry = (entryId) =>
  currentLiveNavigationEntriesById[entryId] ?? null;

export const getCurrentLiveNavigationEntriesBySurface = (surface) =>
  freezeArray(currentLiveNavigationEntries.filter((entry) => entry.surfaces.includes(surface)));
