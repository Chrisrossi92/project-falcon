export const WORKSPACE_SWITCH_INVALIDATION_EVENT = "falcon:workspace-switch-invalidated";

export const WORKSPACE_SCOPED_STORAGE_PREFIXES = Object.freeze([
  "falcon.orders.",
  "falcon.orderFilters.",
  "falcon.orderSearch.",
  "falcon.vendors.",
  "falcon.clients.",
  "falcon.assignments.",
  "falcon.procurement.",
  "falcon.payments.",
  "falcon.dashboard.",
  "falcon.notifications.",
  "falcon.search.",
  "falcon.recent.",
]);

export const WORKSPACE_SCOPED_STORAGE_KEYS = Object.freeze([
  "falcon.orders.filters",
  "falcon.orders.search",
  "falcon.orders.recent",
  "falcon.vendors.cache",
  "falcon.clients.cache",
  "falcon.assignments.cache",
  "falcon.procurement.cache",
  "falcon.payments.cache",
  "falcon.dashboard.summary",
  "falcon.notifications.cache",
  "falcon.search.recent",
]);

export const WORKSPACE_SCOPED_CACHE_SCOPES = Object.freeze([
  "orders",
  "vendors",
  "clients",
  "assignments",
  "procurement",
  "payments",
  "dashboard",
  "notifications",
  "search",
  "recent",
]);

function safeStorage(storageName) {
  if (typeof window === "undefined") return null;

  try {
    return window[storageName] ?? null;
  } catch {
    return null;
  }
}

function keyIsWorkspaceScoped(key) {
  return (
    WORKSPACE_SCOPED_STORAGE_KEYS.includes(key) ||
    WORKSPACE_SCOPED_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))
  );
}

function clearWorkspaceStorage(storage) {
  if (!storage) return [];

  const removedKeys = [];

  try {
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(Boolean);
    keys.forEach((key) => {
      if (!keyIsWorkspaceScoped(key)) return;
      storage.removeItem(key);
      removedKeys.push(key);
    });
  } catch {
    return removedKeys;
  }

  return removedKeys;
}

function dispatchWorkspaceSwitchInvalidation(detail) {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") return;

  try {
    window.dispatchEvent(new window.CustomEvent(WORKSPACE_SWITCH_INVALIDATION_EVENT, { detail }));
  } catch {
    // Older or restricted runtimes may not expose CustomEvent.
  }
}

export function resetWorkspaceSwitchState({ fromMode, toMode } = {}) {
  const localStorageKeys = clearWorkspaceStorage(safeStorage("localStorage"));
  const sessionStorageKeys = clearWorkspaceStorage(safeStorage("sessionStorage"));
  const detail = {
    fromMode: fromMode || null,
    toMode: toMode || null,
    scopes: WORKSPACE_SCOPED_CACHE_SCOPES,
    clearedStorageKeys: {
      localStorage: localStorageKeys,
      sessionStorage: sessionStorageKeys,
    },
  };

  dispatchWorkspaceSwitchInvalidation(detail);

  return detail;
}
