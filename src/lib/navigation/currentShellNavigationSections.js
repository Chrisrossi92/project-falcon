import {
  SHELL_NAVIGATION_GROUP_STATUSES,
  getShellNavigationGroups,
} from './shellNavigationGroups.js';
import { applyShellNavigationLabels } from './shellNavigationLabels.js';
import { getWorkspaceNavigationSections } from './workspaceNavigationDefinitions.js';
import { OPERATIONS_MODES, normalizeOperationsMode } from '../operations/operationsMode.js';
import { SHELL_PROFILE_IDS } from '../shell/resolveShellProfile.js';

export const SHELL_NAVIGATION_UNGROUPED_SECTION_ID = 'other_visible_links';

const freezeArray = (items = []) => Object.freeze([...items]);

const freezeSection = (section) =>
  Object.freeze({
    ...section,
    links: freezeArray(section.links),
  });

const resolveOperationsMode = (options = {}) =>
  normalizeOperationsMode(
    typeof options === 'string' ? options : options.operationsMode,
  );

const flatSection = (links, operationsMode) =>
  freezeSection({
    id: 'current_primary_nav',
    label: null,
    grouped: false,
    operationsMode,
    links,
  });

const amcOperationsSections = (links, operationsMode) => {
  const visibleLinksById = new Map(links.map((link) => [link.id, link]));
  const groupedLinkIds = new Set();
  const groups = getWorkspaceNavigationSections(operationsMode);

  const sections = groups.flatMap((group) => {
    const groupLinks = group.navEntryIds.flatMap((navEntryId) => {
      const link = visibleLinksById.get(navEntryId);

      if (!link) return [];

      groupedLinkIds.add(navEntryId);
      return [applyShellNavigationLabels(link, SHELL_PROFILE_IDS.OPERATIONS, operationsMode)];
    });

    if (groupLinks.length === 0) return [];

    return [
      freezeSection({
        id: group.id,
        label: group.label,
        grouped: true,
        operationsMode,
        links: groupLinks,
      }),
    ];
  });

  const ungroupedLinks = links
    .filter((link) => !groupedLinkIds.has(link.id))
    .map((link) => applyShellNavigationLabels(link, SHELL_PROFILE_IDS.OPERATIONS, operationsMode));

  if (ungroupedLinks.length > 0) {
    sections.push(
      freezeSection({
        id: SHELL_NAVIGATION_UNGROUPED_SECTION_ID,
        label: 'More',
        grouped: true,
        operationsMode,
        links: ungroupedLinks,
      }),
    );
  }

  return freezeArray(sections.length > 0 ? sections : [flatSection(links, operationsMode)]);
};

export function getCurrentShellNavigationSections(visibleLinks = [], profileId, options = {}) {
  const links = Array.isArray(visibleLinks) ? visibleLinks : [];
  const operationsMode = resolveOperationsMode(options);

  if (operationsMode === OPERATIONS_MODES.AMC_OPERATIONS && profileId === SHELL_PROFILE_IDS.OPERATIONS) {
    return amcOperationsSections(links, operationsMode);
  }

  const profileGroups = getShellNavigationGroups(profileId);

  if (!profileGroups || profileGroups.status !== SHELL_NAVIGATION_GROUP_STATUSES.ACTIVE) {
    return freezeArray([flatSection(links, operationsMode)]);
  }

  const visibleLinksById = new Map(links.map((link) => [link.id, link]));
  const groupedLinkIds = new Set();
  const sections = profileGroups.groups.flatMap((group) => {
    const groupLinks = group.navEntryIds.flatMap((navEntryId) => {
      const link = visibleLinksById.get(navEntryId);

      if (!link) {
        return [];
      }

      groupedLinkIds.add(navEntryId);
      return [applyShellNavigationLabels(link, profileId)];
    });

    if (groupLinks.length === 0) {
      return [];
    }

    return [
      freezeSection({
        id: group.id,
        label: group.label,
        grouped: true,
        operationsMode,
        links: groupLinks,
      }),
    ];
  });

  const ungroupedLinks = links
    .filter((link) => !groupedLinkIds.has(link.id))
    .map((link) => applyShellNavigationLabels(link, profileId));

  if (ungroupedLinks.length > 0) {
    sections.push(
      freezeSection({
        id: SHELL_NAVIGATION_UNGROUPED_SECTION_ID,
        label: 'More',
        grouped: true,
        operationsMode,
        links: ungroupedLinks,
      }),
    );
  }

  return freezeArray(sections.length > 0 ? sections : [flatSection(links, operationsMode)]);
}
