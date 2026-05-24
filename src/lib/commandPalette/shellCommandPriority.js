import { SHELL_PROFILE_AUTHORITY, SHELL_PROFILE_IDS } from '../shell/resolveShellProfile.js';
import { CURRENT_COMMAND_PALETTE_COMMAND_IDS } from './currentCommandPaletteCommands.js';

export const SHELL_COMMAND_PRIORITY_KIND = 'passive_shell_command_priority';

export const SHELL_COMMAND_PRIORITY_STATUSES = Object.freeze({
  ACTIVE: 'active',
  FALLBACK: 'fallback',
  FUTURE: 'future',
});

const freezeArray = (items = []) => Object.freeze([...items]);

const freezeGroup = (group) =>
  Object.freeze({
    ...group,
    commandIds: freezeArray(group.commandIds),
    notes: freezeArray(group.notes),
  });

const freezePriorityRecord = (record) =>
  Object.freeze({
    ...record,
    commandIds: freezeArray(record.commandIds),
    groups: freezeArray(record.groups.map(freezeGroup)),
    futureAliasNotes: freezeArray(record.futureAliasNotes),
    notes: freezeArray(record.notes),
  });

const currentCommandOrder = () => [...CURRENT_COMMAND_PALETTE_COMMAND_IDS];

const fallbackPriorityRecord = (profileId, label, notes = []) =>
  freezePriorityRecord({
    profileId,
    status: SHELL_COMMAND_PRIORITY_STATUSES.FALLBACK,
    futureOnly: false,
    label,
    metadataAuthority: SHELL_PROFILE_AUTHORITY.PRESENTATION_ONLY,
    commandIds: currentCommandOrder(),
    groups: [],
    futureAliasNotes: [],
    notes,
  });

export const shellCommandPriorityEntries = freezeArray([
  freezePriorityRecord({
    profileId: SHELL_PROFILE_IDS.OPERATIONS,
    status: SHELL_COMMAND_PRIORITY_STATUSES.ACTIVE,
    futureOnly: false,
    label: 'Operations command priority',
    metadataAuthority: SHELL_PROFILE_AUTHORITY.PRESENTATION_ONLY,
    commandIds: [
      'orders',
      'calendar',
      'assignments',
      'clients',
      'relationships',
      'users',
      'settings',
      'notif',
    ],
    groups: [
      {
        id: 'operations',
        label: 'Operations',
        commandIds: ['orders', 'calendar', 'assignments'],
        notes: ['Daily owner/admin command priority over active work and scheduling.'],
      },
      {
        id: 'management',
        label: 'Management',
        commandIds: ['clients', 'relationships', 'users'],
        notes: ['Client, relationship, and Team Access commands remain secondary.'],
      },
      {
        id: 'support',
        label: 'Support',
        commandIds: ['settings', 'notif'],
        notes: ['Account and notification settings remain support commands.'],
      },
    ],
    futureAliasNotes: [
      'Open Active Orders can later alias orders when the target remains authority-safe.',
      'Open Review Queue, Open Due Soon, and Open Unassigned Orders require explicit targets first.',
    ],
    notes: [
      'Operations priority keeps broad command access while moving daily operations first.',
    ],
  }),
  freezePriorityRecord({
    profileId: SHELL_PROFILE_IDS.MY_WORK,
    status: SHELL_COMMAND_PRIORITY_STATUSES.ACTIVE,
    futureOnly: false,
    label: 'My Work command priority',
    metadataAuthority: SHELL_PROFILE_AUTHORITY.PRESENTATION_ONLY,
    commandIds: [
      'orders',
      'calendar',
      'clients',
      'settings',
      'notif',
      'assignments',
      'relationships',
      'users',
    ],
    groups: [
      {
        id: 'work',
        label: 'Work',
        commandIds: ['orders', 'calendar', 'clients'],
        notes: ['Assigned internal work should prioritize order, schedule, and client context.'],
      },
      {
        id: 'support',
        label: 'Support',
        commandIds: ['settings', 'notif'],
        notes: ['Personal settings and notification settings remain support commands.'],
      },
      {
        id: 'secondary',
        label: 'Secondary',
        commandIds: ['assignments', 'relationships', 'users'],
        notes: ['Other permissioned destinations remain available after primary work commands.'],
      },
    ],
    futureAliasNotes: [
      'Open My Work and Open My Assigned Orders require approved profile-aware targets first.',
      'Open Needs Revisions and Open Due Soon require explicit route/filter targets first.',
    ],
    notes: [
      'My Work priority does not hide permissioned admin or assignment commands.',
    ],
  }),
  freezePriorityRecord({
    profileId: SHELL_PROFILE_IDS.REVIEW_QUEUE,
    status: SHELL_COMMAND_PRIORITY_STATUSES.ACTIVE,
    futureOnly: false,
    label: 'Review Queue command priority',
    metadataAuthority: SHELL_PROFILE_AUTHORITY.PRESENTATION_ONLY,
    commandIds: [
      'orders',
      'calendar',
      'clients',
      'settings',
      'notif',
      'assignments',
      'relationships',
      'users',
    ],
    groups: [
      {
        id: 'review_work',
        label: 'Review Work',
        commandIds: ['orders', 'calendar', 'clients'],
        notes: ['Review users should reach review-relevant order, schedule, and context first.'],
      },
      {
        id: 'support',
        label: 'Support',
        commandIds: ['settings', 'notif'],
        notes: ['Personal settings and notification settings remain support commands.'],
      },
      {
        id: 'secondary',
        label: 'Secondary',
        commandIds: ['assignments', 'relationships', 'users'],
        notes: ['Other permissioned destinations remain available after review work commands.'],
      },
    ],
    futureAliasNotes: [
      'Open Review Queue, Open In Review, and Open Resubmitted Work require approved targets first.',
      'Request Revisions and Clear Review require governed workflow action contracts first.',
    ],
    notes: [
      'Review Queue priority is not a new route, filter, or review action surface.',
    ],
  }),
  freezePriorityRecord({
    profileId: SHELL_PROFILE_IDS.RECEIVED_WORK,
    status: SHELL_COMMAND_PRIORITY_STATUSES.ACTIVE,
    futureOnly: false,
    label: 'Received Work command priority',
    metadataAuthority: SHELL_PROFILE_AUTHORITY.PRESENTATION_ONLY,
    commandIds: [
      'assignments',
      'settings',
      'notif',
      'orders',
      'calendar',
      'clients',
      'relationships',
      'users',
    ],
    groups: [
      {
        id: 'received_work',
        label: 'Received Work',
        commandIds: ['assignments'],
        notes: ['Assignment-recipient command priority starts with existing assignment access.'],
      },
      {
        id: 'account',
        label: 'Account',
        commandIds: ['settings', 'notif'],
        notes: ['Account and notification settings remain secondary when available.'],
      },
      {
        id: 'secondary',
        label: 'Secondary',
        commandIds: ['orders', 'calendar', 'clients', 'relationships', 'users'],
        notes: ['Other commands must appear only when already visible from existing permission inputs.'],
      },
    ],
    futureAliasNotes: [
      'Open Received Work can later alias assignments only in explicit received_work context.',
      'Open Offers, Open Active Work, and Open Submitted Work require explicit targets first.',
    ],
    notes: [
      'Received Work priority does not create canonical order, client, team, or owner setup access.',
    ],
  }),
  freezePriorityRecord({
    profileId: SHELL_PROFILE_IDS.REQUESTS,
    status: SHELL_COMMAND_PRIORITY_STATUSES.FUTURE,
    futureOnly: true,
    label: 'Future Requests command priority',
    metadataAuthority: SHELL_PROFILE_AUTHORITY.PRESENTATION_ONLY,
    commandIds: currentCommandOrder(),
    groups: [],
    futureAliasNotes: [
      'Open Requests, Open Documents, Open Reports, and Open Messages are blocked until Client Portal authority exists.',
    ],
    notes: [
      'Requests command priority is future-only and defines no live Client Portal command ids.',
    ],
  }),
  fallbackPriorityRecord(SHELL_PROFILE_IDS.UNAVAILABLE, 'Unavailable command priority', [
    'Unavailable profiles keep current command order and receive no role-specific command claims.',
  ]),
  fallbackPriorityRecord(SHELL_PROFILE_IDS.COMPANY_REQUIRED, 'Company-required command priority', [
    'Company-required profiles keep current command order until company context resolves.',
  ]),
  fallbackPriorityRecord(SHELL_PROFILE_IDS.MEMBERSHIP_INACTIVE, 'Inactive membership command priority', [
    'Inactive memberships keep current command order and receive no operational command claims.',
  ]),
  fallbackPriorityRecord(SHELL_PROFILE_IDS.PROFILE_AMBIGUOUS, 'Ambiguous profile command priority', [
    'Ambiguous profiles keep current command order until deterministic resolution exists.',
  ]),
  fallbackPriorityRecord(SHELL_PROFILE_IDS.MODULE_UNAVAILABLE, 'Unavailable module command priority', [
    'Unavailable module profiles keep current command order and expose no disabled future commands.',
  ]),
]);

export const shellCommandPriorityByProfileId = Object.freeze(
  Object.fromEntries(shellCommandPriorityEntries.map((entry) => [entry.profileId, entry])),
);

export const SHELL_COMMAND_PRIORITY_PROFILE_IDS = freezeArray(
  shellCommandPriorityEntries.map((entry) => entry.profileId),
);

export function getShellCommandPriority(profileId) {
  return shellCommandPriorityByProfileId[profileId] ?? null;
}
