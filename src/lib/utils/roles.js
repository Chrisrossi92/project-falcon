// src/lib/utils/roles.js

/**
 * Given a row from public.users, returns normalized role + capability flags.
 */
export function getCapabilities(user) {
  const baseRole = (user?.role || "appraiser").toLowerCase();

  const isOwner = baseRole === "owner";
  const isAdmin = baseRole === "admin" || isOwner;
  const isReviewer = baseRole === "reviewer";
  const isAppraiser = baseRole === "appraiser";

  return {
    role: baseRole,
    isOwner,
    isAdmin,
    isReviewer,
    isAppraiser,
  };
}
