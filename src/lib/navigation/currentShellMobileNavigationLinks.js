import {
  SHELL_NAVIGATION_GROUP_STATUSES,
  getShellNavigationGroups,
} from './shellNavigationGroups.js';
import { applyShellNavigationLabels } from './shellNavigationLabels.js';
import { normalizeOperationsMode } from '../operations/operationsMode.js';

const freezeArray = (items = []) => Object.freeze([...items]);

const resolveOperationsMode = (options = {}) =>
  normalizeOperationsMode(
    typeof options === 'string' ? options : options.operationsMode,
  );

const withOperationsMode = (link, operationsMode) =>
  Object.freeze({
    ...link,
    operationsMode,
  });

export function getCurrentShellMobileNavigationLinks(visibleLinks = [], profileId, options = {}) {
  const links = Array.isArray(visibleLinks) ? visibleLinks : [];
  const operationsMode = resolveOperationsMode(options);
  const profileGroups = getShellNavigationGroups(profileId);

  if (!profileGroups || profileGroups.status !== SHELL_NAVIGATION_GROUP_STATUSES.ACTIVE) {
    return freezeArray(links.map((link) => withOperationsMode(link, operationsMode)));
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
      return [withOperationsMode(applyShellNavigationLabels(link, profileId), operationsMode)];
    }),
  );

  const remainingLinks = links
    .filter((link) => !orderedLinkIds.has(link.id))
    .map((link) => withOperationsMode(applyShellNavigationLabels(link, profileId), operationsMode));

  return freezeArray([...prioritizedLinks, ...remainingLinks]);
}
