import { describe, expect, it } from 'vitest';

import { SHELL_PROFILE_AUTHORITY, SHELL_PROFILE_IDS } from '../resolveShellProfile.js';
import {
  SHELL_PROFILE_METADATA_IDS,
  SHELL_PROFILE_STATUSES,
  getShellProfileMetadata,
  shellProfileMetadataById,
  shellProfileMetadataEntries,
} from '../shellProfiles.js';

const REQUIRED_FIELDS = Object.freeze([
  'id',
  'displayLabel',
  'shortLabel',
  'primaryDailyQuestion',
  'defaultWorkspaceLabel',
  'navigationVocabularyNotes',
  'dashboardTitle',
  'emptyStateTone',
  'notificationTone',
  'preferredActionLanguage',
  'status',
  'priority',
  'metadataAuthority',
]);

describe('shell profile metadata', () => {
  it('covers every shell profile id from the R1 resolver contract in stable order', () => {
    expect(SHELL_PROFILE_METADATA_IDS).toEqual([
      SHELL_PROFILE_IDS.OPERATIONS,
      SHELL_PROFILE_IDS.MY_WORK,
      SHELL_PROFILE_IDS.REVIEW_QUEUE,
      SHELL_PROFILE_IDS.RECEIVED_WORK,
      SHELL_PROFILE_IDS.REQUESTS,
      SHELL_PROFILE_IDS.UNAVAILABLE,
      SHELL_PROFILE_IDS.COMPANY_REQUIRED,
      SHELL_PROFILE_IDS.MEMBERSHIP_INACTIVE,
      SHELL_PROFILE_IDS.PROFILE_AMBIGUOUS,
      SHELL_PROFILE_IDS.MODULE_UNAVAILABLE,
    ]);

    expect(new Set(SHELL_PROFILE_METADATA_IDS).size).toBe(SHELL_PROFILE_METADATA_IDS.length);
  });

  it('keeps every metadata entry complete and presentation-only', () => {
    shellProfileMetadataEntries.forEach((profile) => {
      REQUIRED_FIELDS.forEach((field) => {
        expect(profile).toHaveProperty(field);
      });

      expect(profile.metadataAuthority).toBe(SHELL_PROFILE_AUTHORITY.PRESENTATION_ONLY);
      expect(typeof profile.displayLabel).toBe('string');
      expect(profile.displayLabel.length).toBeGreaterThan(0);
      expect(typeof profile.primaryDailyQuestion).toBe('string');
      expect(profile.primaryDailyQuestion.length).toBeGreaterThan(0);
      expect(Array.isArray(profile.navigationVocabularyNotes)).toBe(true);
      expect(profile.navigationVocabularyNotes.length).toBeGreaterThan(0);
      expect(Array.isArray(profile.preferredActionLanguage)).toBe(true);
      expect(profile.preferredActionLanguage.length).toBeGreaterThan(0);
      expect(Number.isInteger(profile.priority)).toBe(true);
    });
  });

  it('defines role-native labels for active operational profiles', () => {
    expect(getShellProfileMetadata(SHELL_PROFILE_IDS.OPERATIONS)).toMatchObject({
      displayLabel: 'Operations',
      defaultWorkspaceLabel: 'Operations Dashboard',
      dashboardTitle: 'Operations Dashboard',
      status: SHELL_PROFILE_STATUSES.ACTIVE,
    });
    expect(getShellProfileMetadata(SHELL_PROFILE_IDS.MY_WORK)).toMatchObject({
      displayLabel: 'My Work',
      shortLabel: 'Assigned Work',
      dashboardTitle: 'My Work',
      status: SHELL_PROFILE_STATUSES.ACTIVE,
    });
    expect(getShellProfileMetadata(SHELL_PROFILE_IDS.REVIEW_QUEUE)).toMatchObject({
      displayLabel: 'Review Queue',
      dashboardTitle: 'Review Workbench',
      status: SHELL_PROFILE_STATUSES.ACTIVE,
    });
    expect(getShellProfileMetadata(SHELL_PROFILE_IDS.RECEIVED_WORK)).toMatchObject({
      displayLabel: 'Received Work',
      shortLabel: 'Work Requests',
      dashboardTitle: 'Received Work',
      status: SHELL_PROFILE_STATUSES.ACTIVE,
    });
  });

  it('marks client requests as future-only metadata', () => {
    const requestsProfile = getShellProfileMetadata(SHELL_PROFILE_IDS.REQUESTS);

    expect(requestsProfile).toMatchObject({
      displayLabel: 'Requests',
      shortLabel: 'Client Requests',
      dashboardTitle: 'Client Requests',
      status: SHELL_PROFILE_STATUSES.FUTURE,
    });
    expect(JSON.stringify(requestsProfile)).not.toMatch(/packet|review queue|RLS|RPC/i);
  });

  it('marks unavailable and guardrail profiles as fallback metadata', () => {
    [
      SHELL_PROFILE_IDS.UNAVAILABLE,
      SHELL_PROFILE_IDS.COMPANY_REQUIRED,
      SHELL_PROFILE_IDS.MEMBERSHIP_INACTIVE,
      SHELL_PROFILE_IDS.PROFILE_AMBIGUOUS,
      SHELL_PROFILE_IDS.MODULE_UNAVAILABLE,
    ].forEach((profileId) => {
      expect(getShellProfileMetadata(profileId)).toMatchObject({
        status: SHELL_PROFILE_STATUSES.FALLBACK,
        metadataAuthority: SHELL_PROFILE_AUTHORITY.PRESENTATION_ONLY,
      });
    });
  });

  it('returns null for unknown profile ids instead of inventing metadata', () => {
    expect(getShellProfileMetadata('unknown_profile')).toBeNull();
    expect(shellProfileMetadataById.unknown_profile).toBeUndefined();
  });

  it('freezes metadata entries and nested vocabulary arrays', () => {
    const operations = getShellProfileMetadata(SHELL_PROFILE_IDS.OPERATIONS);

    expect(Object.isFrozen(shellProfileMetadataEntries)).toBe(true);
    expect(Object.isFrozen(shellProfileMetadataById)).toBe(true);
    expect(Object.isFrozen(operations)).toBe(true);
    expect(Object.isFrozen(operations.navigationVocabularyNotes)).toBe(true);
    expect(Object.isFrozen(operations.preferredActionLanguage)).toBe(true);
  });

  it('does not include route paths, permission keys, or component hints in passive metadata', () => {
    shellProfileMetadataEntries.forEach((profile) => {
      expect(profile).not.toHaveProperty('path');
      expect(profile).not.toHaveProperty('route');
      expect(profile).not.toHaveProperty('requiredPermission');
      expect(profile).not.toHaveProperty('component');
      expect(profile).not.toHaveProperty('componentHint');
    });
  });
});
