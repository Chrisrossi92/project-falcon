import {
  SHELL_NAVIGATION_GROUP_STATUSES,
  getShellNavigationGroups,
} from './shellNavigationGroups.js';
import { applyShellNavigationLabels } from './shellNavigationLabels.js';

const freezeArray = (items = []) => Object.freeze([...items]);

export function getCurrentShellMobileNavigationLinks(visibleLinks = [], profileId) {
  const links = Array.isArray(visibleLinks) ? visibleLinks : [];
  const profileGroups = getShellNavigationGroups(profileId);

  if (!profileGroups || profileGroups.status !== SHELL_NAVIGATION_GROUP_STATUSES.ACTIVE) {
    return freezeArray(links);
  }

  const visibleLinksById = new Map(links.map((link) => [link.id, link]));
  const orderedLinkIds = new Set();
  const prioritizedLinks = profileGroups.groups.flatMap((group) =>
    group.navEntryIds.flatMap((navEntryId) => {
      const link = visibleLinksById.get(navEntryId);

      if (!link || orderedLinkIds.has(navEntryId)) {
        return [];
      }

      orderedLinkIds.add(navEntryId);
      return [applyShellNavigationLabels(link, profileId)];
    }),
  );

  const remainingLinks = links
    .filter((link) => !orderedLinkIds.has(link.id))
    .map((link) => applyShellNavigationLabels(link, profileId));

  return freezeArray([...prioritizedLinks, ...remainingLinks]);
}
