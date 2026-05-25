export const SHELL_WORK_MODE_CUES = Object.freeze({
  operations: {
    label: "Operations Command",
    context: "Owner/admin oversight",
    sectionId: "operations",
  },
  my_work: {
    label: "My Work",
    context: "Appraiser workflow",
    sectionId: "work",
  },
  review_queue: {
    label: "Review Queue",
    context: "Reviewer workflow",
    sectionId: "review_work",
  },
  received_work: {
    label: "Received Work",
    context: "Assignment workflow",
    sectionId: "received_work",
  },
});

export function getShellWorkModeCue(shellProfilePresentation) {
  const profileId = shellProfilePresentation?.profileId ?? shellProfilePresentation?.id;
  const profile = shellProfilePresentation?.profile;
  const explicitCue = SHELL_WORK_MODE_CUES[profileId];
  const useProfileMetadata = profile?.status === "active";

  return {
    profileId,
    label:
      explicitCue?.label ??
      (useProfileMetadata ? profile?.defaultWorkspaceLabel ?? profile?.displayLabel : null) ??
      "Operations Console",
    context:
      explicitCue?.context ??
      (useProfileMetadata ? profile?.primaryDailyQuestion : null) ??
      "Operational workspace",
    sectionId: explicitCue?.sectionId ?? null,
  };
}
