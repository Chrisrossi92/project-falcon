import { SHELL_PROFILE_IDS } from '../shell/resolveShellProfile.js';

const USERS_LABEL_BY_PROFILE = Object.freeze({
  [SHELL_PROFILE_IDS.OPERATIONS]: 'Users',
  [SHELL_PROFILE_IDS.MY_WORK]: 'Staff Directory',
  [SHELL_PROFILE_IDS.REVIEW_QUEUE]: 'Staff Directory',
});

export function resolveShellNavigationLabel(link = {}, profileId) {
  if (link.id === 'users') {
    return USERS_LABEL_BY_PROFILE[profileId] || link.label;
  }

  return link.label;
}

export function applyShellNavigationLabels(link = {}, profileId) {
  const label = resolveShellNavigationLabel(link, profileId);

  if (label === link.label) return link;

  return Object.freeze({
    ...link,
    label,
  });
}
