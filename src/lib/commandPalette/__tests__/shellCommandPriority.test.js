import { describe, expect, it } from 'vitest';

import { SHELL_PROFILE_AUTHORITY, SHELL_PROFILE_IDS } from '../../shell/resolveShellProfile.js';
import { SHELL_PROFILE_METADATA_IDS } from '../../shell/shellProfiles.js';
import { CURRENT_COMMAND_PALETTE_COMMAND_IDS } from '../currentCommandPaletteCommands.js';
import { currentLiveCommandEntriesById } from '../currentCommandRegistry.js';
import {
  SHELL_COMMAND_PRIORITY_KIND,
  SHELL_COMMAND_PRIORITY_PROFILE_IDS,
  SHELL_COMMAND_PRIORITY_STATUSES,
  getShellCommandPriority,
  shellCommandPriorityEntries,
} from '../shellCommandPriority.js';

const allReferencedCommandIdsFor = (entry) => [
  ...entry.commandIds,
  ...entry.groups.flatMap((group) => group.commandIds),
];

describe('passive shell command priority', () => {
  it('identifies itself as passive presentation metadata', () => {
    expect(SHELL_COMMAND_PRIORITY_KIND).toBe('passive_shell_command_priority');

    shellCommandPriorityEntries.forEach((entry) => {
      expect(entry.metadataAuthority).toBe(SHELL_PROFILE_AUTHORITY.PRESENTATION_ONLY);
      expect(entry.permissionKeys).toBeUndefined();
      expect(entry.permissions).toBeUndefined();
      expect(entry.routeGate).toBeUndefined();
      expect(entry.visibilityGate).toBeUndefined();
      expect(entry.requiredPermission).toBeUndefined();
      expect(entry.requiredAnyPermissions).toBeUndefined();
      expect(entry.workflowAction).toBeUndefined();
      expect(entry.workflowActionId).toBeUndefined();
    });
  });

  it('covers every shell profile metadata id exactly once', () => {
    expect(SHELL_COMMAND_PRIORITY_PROFILE_IDS).toEqual(SHELL_PROFILE_METADATA_IDS);
    expect(new Set(SHELL_COMMAND_PRIORITY_PROFILE_IDS).size).toBe(
      SHELL_COMMAND_PRIORITY_PROFILE_IDS.length,
    );
  });

  it('references existing current command ids only', () => {
    shellCommandPriorityEntries.forEach((entry) => {
      allReferencedCommandIdsFor(entry).forEach((commandId) => {
        expect(currentLiveCommandEntriesById[commandId], commandId).toBeDefined();
        expect(CURRENT_COMMAND_PALETTE_COMMAND_IDS, commandId).toContain(commandId);
      });
    });
  });

  it('sets active profile command priorities without changing labels or availability', () => {
    expect(getShellCommandPriority(SHELL_PROFILE_IDS.OPERATIONS)).toMatchObject({
      status: SHELL_COMMAND_PRIORITY_STATUSES.ACTIVE,
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
    });

    expect(getShellCommandPriority(SHELL_PROFILE_IDS.MY_WORK)).toMatchObject({
      status: SHELL_COMMAND_PRIORITY_STATUSES.ACTIVE,
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
    });

    expect(getShellCommandPriority(SHELL_PROFILE_IDS.REVIEW_QUEUE)).toMatchObject({
      status: SHELL_COMMAND_PRIORITY_STATUSES.ACTIVE,
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
    });

    expect(getShellCommandPriority(SHELL_PROFILE_IDS.RECEIVED_WORK)).toMatchObject({
      status: SHELL_COMMAND_PRIORITY_STATUSES.ACTIVE,
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
    });
  });

  it('keeps fallback profiles on current command order', () => {
    [
      SHELL_PROFILE_IDS.UNAVAILABLE,
      SHELL_PROFILE_IDS.COMPANY_REQUIRED,
      SHELL_PROFILE_IDS.MEMBERSHIP_INACTIVE,
      SHELL_PROFILE_IDS.PROFILE_AMBIGUOUS,
      SHELL_PROFILE_IDS.MODULE_UNAVAILABLE,
    ].forEach((profileId) => {
      const priority = getShellCommandPriority(profileId);

      expect(priority.status).toBe(SHELL_COMMAND_PRIORITY_STATUSES.FALLBACK);
      expect(priority.commandIds).toEqual(CURRENT_COMMAND_PALETTE_COMMAND_IDS);
      expect(priority.groups).toEqual([]);
    });
  });

  it('keeps requests future-only without live Client Portal command assumptions', () => {
    const requestsPriority = getShellCommandPriority(SHELL_PROFILE_IDS.REQUESTS);
    const serialized = JSON.stringify(requestsPriority).toLowerCase();

    expect(requestsPriority).toMatchObject({
      status: SHELL_COMMAND_PRIORITY_STATUSES.FUTURE,
      futureOnly: true,
      commandIds: CURRENT_COMMAND_PALETTE_COMMAND_IDS,
      groups: [],
    });
    expect(serialized).not.toContain('client portal route');
    expect(serialized).not.toContain('/requests');
    expect(serialized).not.toContain('submit request');
    expect(allReferencedCommandIdsFor(requestsPriority)).not.toEqual(
      expect.arrayContaining(['requests', 'documents', 'reports', 'messages']),
    );
  });

  it('does not include workflow action commands or order-search fallback as visible priority ids', () => {
    const serialized = JSON.stringify(shellCommandPriorityEntries).toLowerCase();

    expect(allReferencedCommandIdsFor(getShellCommandPriority(SHELL_PROFILE_IDS.OPERATIONS))).not.toContain(
      'orders.search',
    );
    expect(serialized).not.toContain('submit-to-review');
    expect(serialized).not.toContain('resubmit-to-review');
    expect(serialized).not.toContain('request-revisions');
    expect(serialized).not.toContain('clear-review');
    expect(serialized).not.toContain('accept-offer');
    expect(serialized).not.toContain('decline-offer');
    expect(serialized).not.toContain('submit-work');
  });

  it('freezes entries, groups, arrays, and exported lookup results', () => {
    expect(Object.isFrozen(shellCommandPriorityEntries)).toBe(true);

    shellCommandPriorityEntries.forEach((entry) => {
      expect(Object.isFrozen(entry)).toBe(true);
      expect(Object.isFrozen(entry.commandIds)).toBe(true);
      expect(Object.isFrozen(entry.groups)).toBe(true);
      expect(Object.isFrozen(entry.futureAliasNotes)).toBe(true);
      expect(Object.isFrozen(entry.notes)).toBe(true);
      entry.groups.forEach((group) => {
        expect(Object.isFrozen(group)).toBe(true);
        expect(Object.isFrozen(group.commandIds)).toBe(true);
        expect(Object.isFrozen(group.notes)).toBe(true);
      });
    });
  });

  it('returns null for unknown profiles', () => {
    expect(getShellCommandPriority('unknown_profile')).toBeNull();
  });
});
