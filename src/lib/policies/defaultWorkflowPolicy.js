// Current single-company platform defaults.
// Future company policy layer should override through company-aware policy resolution.

export const DEFAULT_RELEASE_AUTHORITY = Object.freeze({
  ADMIN_OR_OWNER: "admin_or_owner",
});

export const DEFAULT_CANONICAL_WORKFLOW_TRANSITION_KEYS = Object.freeze([
  "submit_to_review",
  "request_revisions",
  "approve_review",
  "request_final_approval",
  "ready_for_client",
  "complete",
]);

export const DEFAULT_WORKFLOW_POLICY = Object.freeze({
  reviewRequired: true,
  finalApprovalRequired: false,
  releaseAuthority: DEFAULT_RELEASE_AUTHORITY.ADMIN_OR_OWNER,
  reopenAllowed: false,
  governedBySmartActions: true,
  directLifecycleStatusMutationAllowed: false,
  canonicalTransitionKeys: DEFAULT_CANONICAL_WORKFLOW_TRANSITION_KEYS,
  revisionHandling: Object.freeze({
    reviewerRequestsRevisions: true,
    appraiserResubmitsToReview: true,
    revisionNoteRequired: false,
  }),
});

export function getDefaultWorkflowPolicy() {
  return DEFAULT_WORKFLOW_POLICY;
}
