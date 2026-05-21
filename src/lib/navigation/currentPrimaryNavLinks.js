import {
  CURRENT_NAV_SURFACES,
  getCurrentLiveNavigationEntry,
} from './currentNavigationRegistry.js';
import { PERMISSIONS } from '../permissions/constants.js';

export const CURRENT_PRIMARY_NAV_LINK_IDS = Object.freeze([
  'orders',
  'assignments',
  'relationships',
  'calendar',
  'clients.primary',
  'users',
]);

const REQUIRED_ENTRY_IDS = new Set(CURRENT_PRIMARY_NAV_LINK_IDS);

const freezeArray = (items = []) => Object.freeze([...items]);

const requireCurrentPrimaryEntry = (entryId) => {
  const entry = getCurrentLiveNavigationEntry(entryId);

  if (!entry) {
    throw new Error(`Missing current live navigation entry for ${entryId}.`);
  }

  if (!entry.surfaces.includes(CURRENT_NAV_SURFACES.DESKTOP)) {
    throw new Error(`${entryId} is not a current desktop primary navigation entry.`);
  }

  return entry;
};

const bool = (value) => value === true;

const resolveClientsPath = (entry, permissions) => {
  if (bool(permissions.canReadAllClients)) {
    return entry.pathByPermission?.[PERMISSIONS.CLIENTS_READ_ALL] ?? entry.path;
  }

  if (bool(permissions.canReadAssignedClients)) {
    return entry.pathByPermission?.[PERMISSIONS.CLIENTS_READ_ASSIGNED] ?? entry.path;
  }

  return null;
};

const primaryLink = (entry, path = entry.path) =>
  Object.freeze({
    id: entry.id,
    label: entry.label,
    path,
    routeGate: entry.routeGate,
    visibilityGate: entry.visibilityGate,
    sourceSurface: CURRENT_NAV_SURFACES.DESKTOP,
  });

const shouldShowEntry = (entryId, permissions) => {
  switch (entryId) {
    case 'orders':
    case 'calendar':
      return true;
    case 'assignments':
      return bool(permissions.canReadAssignments);
    case 'relationships':
      return bool(permissions.canReadRelationships);
    case 'clients.primary':
      return bool(permissions.canReadAllClients) || bool(permissions.canReadAssignedClients);
    case 'users':
      return bool(permissions.canReadUsers);
    default:
      return false;
  }
};

const resolvePrimaryPath = (entry, permissions) => {
  if (entry.id === 'clients.primary') {
    return resolveClientsPath(entry, permissions);
  }

  return entry.path;
};

export const getCurrentPrimaryNavLinks = (permissions = {}) => {
  const links = CURRENT_PRIMARY_NAV_LINK_IDS.flatMap((entryId) => {
    if (!REQUIRED_ENTRY_IDS.has(entryId) || !shouldShowEntry(entryId, permissions)) {
      return [];
    }

    const entry = requireCurrentPrimaryEntry(entryId);
    const path = resolvePrimaryPath(entry, permissions);

    if (!path) {
      return [];
    }

    return [primaryLink(entry, path)];
  });

  return freezeArray(links);
};
