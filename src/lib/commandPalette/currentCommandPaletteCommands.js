import {
  CURRENT_COMMAND_GATE_TYPES,
  CURRENT_COMMAND_STATUS,
  getCurrentLiveCommandEntry,
} from './currentCommandRegistry.js';
import { PERMISSIONS } from '../permissions/constants.js';

export const CURRENT_COMMAND_PALETTE_COMMAND_IDS = Object.freeze([
  'orders',
  'assignments',
  'relationships',
  'calendar',
  'clients',
  'users',
  'settings',
  'notif',
]);

export const CURRENT_COMMAND_PALETTE_LEGACY_FALLBACK_COMMAND_IDS = Object.freeze([
  'orders',
  'calendar',
  'clients',
  'users',
  'settings',
  'notif',
]);

const ORDER_SEARCH_FALLBACK_ID = 'orders.search';

const freezeArray = (items = []) => Object.freeze([...items]);
const bool = (value) => value === true;

const requireCurrentCommandEntry = (entryId) => {
  const entry = getCurrentLiveCommandEntry(entryId);

  if (!entry) {
    throw new Error(`Missing current live command entry for ${entryId}.`);
  }

  return entry;
};

const shouldUseLegacyFallback = (options = {}) =>
  bool(options.useLegacyItems) || bool(options.loading) || bool(options.error);

const permissionInputs = (options = {}) => options.permissions ?? options;

const canUseAnyPermission = (permissions, keys = []) =>
  keys.some((permissionKey) => bool(permissions[permissionKey]));

const isEntryAllowed = (entry, permissions) => {
  switch (entry.gate.type) {
    case CURRENT_COMMAND_GATE_TYPES.NONE:
      return true;
    case CURRENT_COMMAND_GATE_TYPES.PERMISSION:
      return bool(permissions[entry.gate.permissions[0]]);
    case CURRENT_COMMAND_GATE_TYPES.ANY_PERMISSION:
      return canUseAnyPermission(permissions, entry.gate.permissions);
    default:
      return false;
  }
};

const resolveEntryPath = (entry, options = {}) => {
  if (entry.id === 'clients') {
    return typeof options.clientsPath === 'string' && options.clientsPath
      ? options.clientsPath
      : '/clients';
  }

  return entry.path;
};

const commandDefinition = (entry, options = {}) =>
  Object.freeze({
    id: entry.id,
    label: entry.label,
    hint: entry.hint ?? '',
    to: resolveEntryPath(entry, options),
    gate: entry.gate,
    status: entry.status,
    metadataAuthority: entry.metadataAuthority,
  });

export const getCurrentCommandPaletteCommands = (options = {}) => {
  const legacyFallback = shouldUseLegacyFallback(options);
  const permissions = permissionInputs(options);
  const commandIds = legacyFallback
    ? CURRENT_COMMAND_PALETTE_LEGACY_FALLBACK_COMMAND_IDS
    : CURRENT_COMMAND_PALETTE_COMMAND_IDS;

  const commands = commandIds.flatMap((entryId) => {
    const entry = requireCurrentCommandEntry(entryId);

    if (!legacyFallback && !isEntryAllowed(entry, permissions)) {
      return [];
    }

    return [commandDefinition(entry, options)];
  });

  return freezeArray(commands);
};

export const getCurrentOrderSearchFallback = (options = {}) => {
  const entry = requireCurrentCommandEntry(ORDER_SEARCH_FALLBACK_ID);
  const legacyFallback = shouldUseLegacyFallback(options);
  const permissions = permissionInputs(options);
  const canSearchOrders =
    legacyFallback || bool(permissions[PERMISSIONS.NAVIGATION_ORDERS_VIEW]);

  return Object.freeze({
    id: entry.id,
    label: entry.label,
    routeTemplate: entry.path,
    gate: entry.gate,
    status: CURRENT_COMMAND_STATUS.FALLBACK_LIVE,
    metadataAuthority: entry.metadataAuthority,
    canSearchOrders,
    toSearchPath(query = '') {
      return `/orders?q=${encodeURIComponent(String(query).trim())}`;
    },
  });
};
