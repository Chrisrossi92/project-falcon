import {
  SHELL_NAVIGATION_GROUP_STATUSES,
  getShellNavigationGroups,
} from './shellNavigationGroups.js';
import { applyShellNavigationLabels } from './shellNavigationLabels.js';
import { getWorkspaceNavigationMobileOrder } from './workspaceNavigationDefinitions.js';
import { OPERATIONS_MODES, normalizeOperationsMode } from '../operations/operationsMode.js';
import { SHELL_PROFILE_IDS } from '../shell/resolveShellProfile.js';

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

const getAmcOperationsMobileLinks = (links, operationsMode) => {
  const mobileLinkIds = getWorkspaceNavigationMobileOrder(operationsMode);
  const visibleLinksById = new Map(links.map((link) => [link.id, link]));
  const orderedLinkIds = new Set();
  const prioritizedLinks = mobileLinkIds.flatMap((navEntryId) => {
    const link = visibleLinksById.get(navEntryId);

    if (!link) return [];

    orderedLinkIds.add(navEntryId);
    return [withOperationsMode(applyShellNavigationLabels(link, SHELL_PROFILE_IDS.OPERATIONS, operationsMode), operationsMode)];
  });

  const remainingLinks = links
    .filter((link) => !orderedLinkIds.has(link.id))
    .map((link) => withOperationsMode(applyShellNavigationLabels(link, SHELL_PROFILE_IDS.OPERATIONS, operationsMode), operationsMode));

  return freezeArray([...prioritizedLinks, ...remainingLinks]);
};

export function getCurrentShellMobileNavigationLinks(visibleLinks = [], profileId, options = {}) {
  const links = Array.isArray(visibleLinks) ? visibleLinks : [];
  const operationsMode = resolveOperationsMode(options);

  if (operationsMode === OPERATIONS_MODES.AMC_OPERATIONS && profileId === SHELL_PROFILE_IDS.OPERATIONS) {
    return getAmcOperationsMobileLinks(links, operationsMode);
  }

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
