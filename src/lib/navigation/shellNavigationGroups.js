import { SHELL_PROFILE_AUTHORITY, SHELL_PROFILE_IDS } from '../shell/resolveShellProfile.js';

export const SHELL_NAVIGATION_GROUPS_KIND = 'passive_shell_navigation_groups';

export const SHELL_NAVIGATION_GROUP_STATUSES = Object.freeze({
  ACTIVE: 'active',
  FALLBACK: 'fallback',
  FUTURE: 'future',
});

const freezeArray = (items = []) => Object.freeze([...items]);

const freezeGroup = (group) =>
  Object.freeze({
    ...group,
    navEntryIds: freezeArray(group.navEntryIds),
    notes: freezeArray(group.notes),
  });

const freezeProfileGroups = (profileGroups) =>
  Object.freeze({
    ...profileGroups,
    groups: freezeArray(profileGroups.groups.map(freezeGroup)),
    deemphasizedNavEntryIds: freezeArray(profileGroups.deemphasizedNavEntryIds),
    hiddenNavEntryIds: freezeArray(profileGroups.hiddenNavEntryIds),
    notes: freezeArray(profileGroups.notes),
  });

const fallbackProfileGroups = (profileId, label, notes = []) =>
  freezeProfileGroups({
    profileId,
    status: SHELL_NAVIGATION_GROUP_STATUSES.FALLBACK,
    futureOnly: false,
    metadataAuthority: SHELL_PROFILE_AUTHORITY.PRESENTATION_ONLY,
    groups: [
      {
        id: 'workspace_status',
        label,
        navEntryIds: ['dashboard', 'settings'],
        notes: [
          'Minimal fallback grouping for workspace recovery and account context only.',
        ],
      },
    ],
    deemphasizedNavEntryIds: [
      'orders',
      'assignments',
      'relationships',
      'calendar',
      'clients.primary',
      'users',
      'settings.ownerSetup',
      'settings.notifications',
      'settings.productMetadataDiagnostics',
    ],
    hiddenNavEntryIds: [],
    notes,
  });

export const shellNavigationGroupEntries = freezeArray([
  freezeProfileGroups({
    profileId: SHELL_PROFILE_IDS.OPERATIONS,
    status: SHELL_NAVIGATION_GROUP_STATUSES.ACTIVE,
    futureOnly: false,
    metadataAuthority: SHELL_PROFILE_AUTHORITY.PRESENTATION_ONLY,
    groups: [
      {
        id: 'operations',
        label: 'Operations',
        navEntryIds: ['dashboard', 'orders', 'calendar', 'assignments'],
        notes: [
          'Daily owner/admin triage over dashboard, active orders, scheduling, and assignment oversight.',
        ],
      },
      {
        id: 'management',
        label: 'Management',
        navEntryIds: ['clients.primary', 'relationships', 'users'],
        notes: [
          'Business relationship, client context, and Users surfaces remain secondary to daily triage.',
        ],
      },
      {
        id: 'setup_support',
        label: 'Setup / Support',
        navEntryIds: ['settings', 'settings.ownerSetup', 'settings.notifications'],
        notes: [
          'Account settings, owner setup guidance, and notification settings remain support utilities.',
        ],
      },
    ],
    deemphasizedNavEntryIds: ['settings.productMetadataDiagnostics'],
    hiddenNavEntryIds: [],
    notes: [
      'Operations keeps broad navigation but groups daily work separately from management and setup.',
    ],
  }),
  freezeProfileGroups({
    profileId: SHELL_PROFILE_IDS.MY_WORK,
    status: SHELL_NAVIGATION_GROUP_STATUSES.ACTIVE,
    futureOnly: false,
    metadataAuthority: SHELL_PROFILE_AUTHORITY.PRESENTATION_ONLY,
    groups: [
      {
        id: 'work',
        label: 'Work',
        navEntryIds: ['my_work', 'orders', 'calendar'],
        notes: [
          'Assigned internal work uses the dedicated My Work surface when visible, with Orders and Calendar nearby.',
        ],
      },
      {
        id: 'support',
        label: 'Support',
        navEntryIds: ['clients.primary', 'users', 'settings'],
        notes: [
          'Assigned-safe client context, read-only staff directory, and personal settings stay secondary when available.',
        ],
      },
    ],
    deemphasizedNavEntryIds: [
      'assignments',
      'relationships',
      'users',
      'settings.ownerSetup',
      'settings.notifications',
      'settings.productMetadataDiagnostics',
    ],
    hiddenNavEntryIds: [],
    notes: [
      'My Work grouping does not rename Orders to My Orders or hide permissioned admin routes as authority.',
    ],
  }),
  freezeProfileGroups({
    profileId: SHELL_PROFILE_IDS.REVIEW_QUEUE,
    status: SHELL_NAVIGATION_GROUP_STATUSES.ACTIVE,
    futureOnly: false,
    metadataAuthority: SHELL_PROFILE_AUTHORITY.PRESENTATION_ONLY,
    groups: [
      {
        id: 'review_work',
        label: 'Review Work',
        navEntryIds: ['dashboard', 'orders', 'calendar'],
        notes: [
          'Review work remains backed by the existing dashboard, Orders, and Calendar surfaces until dedicated routes exist.',
        ],
      },
      {
        id: 'support',
        label: 'Support',
        navEntryIds: ['clients.primary', 'settings'],
        notes: [
          'Client context and personal settings stay secondary when available.',
        ],
      },
    ],
    deemphasizedNavEntryIds: [
      'assignments',
      'relationships',
      'users',
      'settings.ownerSetup',
      'settings.notifications',
      'settings.productMetadataDiagnostics',
    ],
    hiddenNavEntryIds: [],
    notes: [
      'Review Queue grouping is not a new route, dashboard branch, or workflow-action surface.',
    ],
  }),
  freezeProfileGroups({
    profileId: SHELL_PROFILE_IDS.RECEIVED_WORK,
    status: SHELL_NAVIGATION_GROUP_STATUSES.ACTIVE,
    futureOnly: false,
    metadataAuthority: SHELL_PROFILE_AUTHORITY.PRESENTATION_ONLY,
    groups: [
      {
        id: 'received_work',
        label: 'Received Work',
        navEntryIds: ['dashboard', 'assignments'],
        notes: [
          'Assignment-only users remain on the existing dashboard and assignment surfaces.',
        ],
      },
      {
        id: 'account',
        label: 'Account',
        navEntryIds: ['settings'],
        notes: [
          'Account settings stay available only when existing permissions expose them.',
        ],
      },
    ],
    deemphasizedNavEntryIds: [
      'orders',
      'relationships',
      'calendar',
      'clients.primary',
      'users',
      'settings.ownerSetup',
      'settings.notifications',
      'settings.productMetadataDiagnostics',
    ],
    hiddenNavEntryIds: [],
    notes: [
      'Received Work grouping does not grant canonical order, client, team, or owner setup access.',
    ],
  }),
  freezeProfileGroups({
    profileId: SHELL_PROFILE_IDS.REQUESTS,
    status: SHELL_NAVIGATION_GROUP_STATUSES.FUTURE,
    futureOnly: true,
    metadataAuthority: SHELL_PROFILE_AUTHORITY.PRESENTATION_ONLY,
    groups: [],
    deemphasizedNavEntryIds: [
      'dashboard',
      'orders',
      'assignments',
      'relationships',
      'calendar',
      'clients.primary',
      'users',
      'settings',
      'settings.ownerSetup',
      'settings.notifications',
      'settings.productMetadataDiagnostics',
    ],
    hiddenNavEntryIds: [],
    notes: [
      'Client Requests navigation is future-only and defines no live route assumptions.',
    ],
  }),
  fallbackProfileGroups(SHELL_PROFILE_IDS.UNAVAILABLE, 'Workspace Status', [
    'Unavailable users should not receive profile-specific work navigation claims.',
  ]),
  fallbackProfileGroups(SHELL_PROFILE_IDS.COMPANY_REQUIRED, 'Choose Company', [
    'Company-required users should resolve company context before profile-specific navigation.',
  ]),
  fallbackProfileGroups(SHELL_PROFILE_IDS.MEMBERSHIP_INACTIVE, 'Membership Status', [
    'Inactive memberships should not receive operational navigation claims.',
  ]),
  fallbackProfileGroups(SHELL_PROFILE_IDS.PROFILE_AMBIGUOUS, 'Choose Workspace', [
    'Ambiguous profiles need deterministic resolution before profile-specific grouping.',
  ]),
  fallbackProfileGroups(SHELL_PROFILE_IDS.MODULE_UNAVAILABLE, 'Workspace Status', [
    'Unavailable module states should not expose disabled future module clutter.',
  ]),
]);

export const shellNavigationGroupsByProfileId = Object.freeze(
  Object.fromEntries(shellNavigationGroupEntries.map((entry) => [entry.profileId, entry])),
);

export const SHELL_NAVIGATION_GROUP_PROFILE_IDS = freezeArray(
  shellNavigationGroupEntries.map((entry) => entry.profileId),
);

export function getShellNavigationGroups(profileId) {
  return shellNavigationGroupsByProfileId[profileId] ?? null;
}

export default shellNavigationGroupEntries;
