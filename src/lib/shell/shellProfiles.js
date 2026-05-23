import { SHELL_PROFILE_AUTHORITY, SHELL_PROFILE_IDS } from './resolveShellProfile.js';

export const SHELL_PROFILE_STATUSES = Object.freeze({
  ACTIVE: 'active',
  INTERNAL: 'internal',
  FUTURE: 'future',
  FALLBACK: 'fallback',
});

const freezeArray = (items = []) => Object.freeze([...items]);

const freezeProfile = (profile) =>
  Object.freeze({
    ...profile,
    navigationVocabularyNotes: freezeArray(profile.navigationVocabularyNotes),
    preferredActionLanguage: freezeArray(profile.preferredActionLanguage),
  });

export const shellProfileMetadataEntries = Object.freeze([
  freezeProfile({
    id: SHELL_PROFILE_IDS.OPERATIONS,
    displayLabel: 'Operations',
    shortLabel: 'Operations',
    primaryDailyQuestion: 'What needs attention across the business?',
    defaultWorkspaceLabel: 'Operations Dashboard',
    navigationVocabularyNotes: [
      'Use Operations, Active Orders, Review Queue, Due Soon, Team Access, and Owner Setup.',
      'Keep setup and compliance support secondary to daily operational triage.',
    ],
    dashboardTitle: 'Operations Dashboard',
    emptyStateTone: 'Calm operational exceptions, distinguishing no urgent work from no access.',
    notificationTone: 'Sparse exception-oriented alerts and digest-friendly supervised work.',
    preferredActionLanguage: [
      'Open order',
      'Assign work',
      'Reassign',
      'Resolve blocker',
      'Manage team access',
    ],
    status: SHELL_PROFILE_STATUSES.ACTIVE,
    priority: 10,
    metadataAuthority: SHELL_PROFILE_AUTHORITY.PRESENTATION_ONLY,
  }),
  freezeProfile({
    id: SHELL_PROFILE_IDS.MY_WORK,
    displayLabel: 'My Work',
    shortLabel: 'Assigned Work',
    primaryDailyQuestion: 'What do I need to finish?',
    defaultWorkspaceLabel: 'My Work',
    navigationVocabularyNotes: [
      'Use My Work, My Assigned Orders, Needs Revisions, Due Soon, Site Visits, Files, and Notes.',
      'Avoid owner/admin setup language and packet terminology for internal assigned work.',
    ],
    dashboardTitle: 'My Work',
    emptyStateTone: 'Clear and non-punitive assigned-work status.',
    notificationTone: 'Direct action-needed alerts for revisions, due dates, and assigned files.',
    preferredActionLanguage: [
      'Continue work',
      'Open assigned order',
      'Add note',
      'Upload file',
      'Submit to review',
      'Resubmit to review',
    ],
    status: SHELL_PROFILE_STATUSES.ACTIVE,
    priority: 20,
    metadataAuthority: SHELL_PROFILE_AUTHORITY.PRESENTATION_ONLY,
  }),
  freezeProfile({
    id: SHELL_PROFILE_IDS.REVIEW_QUEUE,
    displayLabel: 'Review Queue',
    shortLabel: 'Review',
    primaryDailyQuestion: 'What needs my review decision?',
    defaultWorkspaceLabel: 'Review Queue',
    navigationVocabularyNotes: [
      'Use Review Queue, In Review, Submitted Work, Needs Revisions, and Revision History.',
      'Keep review decisions central and avoid broad owner/admin operations language.',
    ],
    dashboardTitle: 'Review Workbench',
    emptyStateTone: 'Decision-centered review status with no broad order-inventory implication.',
    notificationTone: 'Review assignment, resubmission, revision-loop, and due-pressure alerts.',
    preferredActionLanguage: [
      'Open review',
      'Request revisions',
      'Clear review',
      'Mark ready for client',
      'Add review note',
      'View revision history',
    ],
    status: SHELL_PROFILE_STATUSES.ACTIVE,
    priority: 30,
    metadataAuthority: SHELL_PROFILE_AUTHORITY.PRESENTATION_ONLY,
  }),
  freezeProfile({
    id: SHELL_PROFILE_IDS.RECEIVED_WORK,
    displayLabel: 'Received Work',
    shortLabel: 'Work Requests',
    primaryDailyQuestion: 'What was assigned to me?',
    defaultWorkspaceLabel: 'Received Work',
    navigationVocabularyNotes: [
      'Use Received Work, Work Requests, Offers, Active Work, Submitted Work, and Owner Review.',
      'Keep packet language internal or owner/admin scoped; recipient copy should lead with work.',
    ],
    dashboardTitle: 'Received Work',
    emptyStateTone: 'Scoped work-native status that avoids canonical order fallback language.',
    notificationTone: 'New work request, expiring offer, due-date, owner review, and correction alerts.',
    preferredActionLanguage: [
      'View request',
      'Accept offer',
      'Decline offer',
      'Continue work',
      'Submit work',
      'Respond to correction',
    ],
    status: SHELL_PROFILE_STATUSES.ACTIVE,
    priority: 40,
    metadataAuthority: SHELL_PROFILE_AUTHORITY.PRESENTATION_ONLY,
  }),
  freezeProfile({
    id: SHELL_PROFILE_IDS.REQUESTS,
    displayLabel: 'Requests',
    shortLabel: 'Client Requests',
    primaryDailyQuestion: 'What requests need my attention?',
    defaultWorkspaceLabel: 'Requests',
    navigationVocabularyNotes: [
      'Use Requests, Action Needed, Documents, Reports, Messages, and Completed Requests.',
      'Keep client navigation limited to client-safe request, status, document, report, and message language.',
    ],
    dashboardTitle: 'Client Requests',
    emptyStateTone: 'Client-safe status with simple action-needed and availability language.',
    notificationTone: 'Sparse client-safe milestones for action needed, documents, reports, and messages.',
    preferredActionLanguage: [
      'Open request',
      'Submit request',
      'Upload document',
      'View status',
      'Download report',
      'Reply to message',
    ],
    status: SHELL_PROFILE_STATUSES.FUTURE,
    priority: 50,
    metadataAuthority: SHELL_PROFILE_AUTHORITY.PRESENTATION_ONLY,
  }),
  freezeProfile({
    id: SHELL_PROFILE_IDS.UNAVAILABLE,
    displayLabel: 'Access unavailable',
    shortLabel: 'Unavailable',
    primaryDailyQuestion: 'What workspace is available for this user?',
    defaultWorkspaceLabel: 'Workspace unavailable',
    navigationVocabularyNotes: [
      'Show no hidden surfaces or future modules.',
      'Use non-leaky access language instead of permission keys or backend terminology.',
    ],
    dashboardTitle: 'Workspace unavailable',
    emptyStateTone: 'Non-leaky fallback that avoids hidden-record implications.',
    notificationTone: 'No operational notifications from this fallback profile.',
    preferredActionLanguage: ['Choose company', 'Contact an administrator'],
    status: SHELL_PROFILE_STATUSES.FALLBACK,
    priority: 900,
    metadataAuthority: SHELL_PROFILE_AUTHORITY.PRESENTATION_ONLY,
  }),
  freezeProfile({
    id: SHELL_PROFILE_IDS.COMPANY_REQUIRED,
    displayLabel: 'Company required',
    shortLabel: 'Choose Company',
    primaryDailyQuestion: 'Which company should this workspace use?',
    defaultWorkspaceLabel: 'Choose Company',
    navigationVocabularyNotes: [
      'Prompt for current-company resolution before role-native shell presentation.',
      'Do not render role-specific navigation until a company is selected.',
    ],
    dashboardTitle: 'Choose Company',
    emptyStateTone: 'Plain current-company requirement with no permission detail.',
    notificationTone: 'No operational notifications until company context exists.',
    preferredActionLanguage: ['Choose company', 'Refresh workspace'],
    status: SHELL_PROFILE_STATUSES.FALLBACK,
    priority: 910,
    metadataAuthority: SHELL_PROFILE_AUTHORITY.PRESENTATION_ONLY,
  }),
  freezeProfile({
    id: SHELL_PROFILE_IDS.MEMBERSHIP_INACTIVE,
    displayLabel: 'Membership inactive',
    shortLabel: 'Inactive',
    primaryDailyQuestion: 'Is this company membership active?',
    defaultWorkspaceLabel: 'Membership inactive',
    navigationVocabularyNotes: [
      'Do not render operational navigation for inactive membership.',
      'Use membership availability language instead of permission or RLS terminology.',
    ],
    dashboardTitle: 'Membership inactive',
    emptyStateTone: 'Non-leaky membership-state explanation.',
    notificationTone: 'No operational notifications while membership is inactive.',
    preferredActionLanguage: ['Contact an administrator', 'Choose another company'],
    status: SHELL_PROFILE_STATUSES.FALLBACK,
    priority: 920,
    metadataAuthority: SHELL_PROFILE_AUTHORITY.PRESENTATION_ONLY,
  }),
  freezeProfile({
    id: SHELL_PROFILE_IDS.PROFILE_AMBIGUOUS,
    displayLabel: 'Workspace selection needed',
    shortLabel: 'Choose Workspace',
    primaryDailyQuestion: 'Which workspace should be primary?',
    defaultWorkspaceLabel: 'Choose Workspace',
    navigationVocabularyNotes: [
      'Use only when deterministic shell selection lacks enough evidence.',
      'Do not imply access to unavailable routes or actions.',
    ],
    dashboardTitle: 'Choose Workspace',
    emptyStateTone: 'Clear choice-needed copy without exposing permission internals.',
    notificationTone: 'No profile-specific notification emphasis until a workspace is resolved.',
    preferredActionLanguage: ['Choose workspace', 'Review access'],
    status: SHELL_PROFILE_STATUSES.FALLBACK,
    priority: 930,
    metadataAuthority: SHELL_PROFILE_AUTHORITY.PRESENTATION_ONLY,
  }),
  freezeProfile({
    id: SHELL_PROFILE_IDS.MODULE_UNAVAILABLE,
    displayLabel: 'Workspace unavailable',
    shortLabel: 'Unavailable',
    primaryDailyQuestion: 'Is this workspace enabled for the current company?',
    defaultWorkspaceLabel: 'Workspace unavailable',
    navigationVocabularyNotes: [
      'Use only for authoritative disabled module/product-mode states.',
      'Avoid disabled future-module clutter in normal navigation.',
    ],
    dashboardTitle: 'Workspace unavailable',
    emptyStateTone: 'Module-unavailable copy only where that context is safe and relevant.',
    notificationTone: 'No operational notifications for unavailable modules.',
    preferredActionLanguage: ['Return to available workspaces', 'Review setup'],
    status: SHELL_PROFILE_STATUSES.FALLBACK,
    priority: 940,
    metadataAuthority: SHELL_PROFILE_AUTHORITY.PRESENTATION_ONLY,
  }),
]);

export const shellProfileMetadataById = Object.freeze(
  Object.fromEntries(shellProfileMetadataEntries.map((profile) => [profile.id, profile])),
);

export const SHELL_PROFILE_METADATA_IDS = Object.freeze(
  shellProfileMetadataEntries.map((profile) => profile.id),
);

export function getShellProfileMetadata(profileId) {
  return shellProfileMetadataById[profileId] ?? null;
}

export default shellProfileMetadataEntries;
