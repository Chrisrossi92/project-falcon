function cleanName(value) {
  const text = String(value ?? "").trim();
  return text || "";
}

export function operationalUserName(user = {}, fallback = "") {
  return (
    cleanName(user?.full_name) ||
    cleanName(user?.name) ||
    cleanName(user?.display_name) ||
    cleanName(user?.email) ||
    cleanName(fallback)
  );
}

export function compactUserName(user = {}, fallback = "") {
  return (
    cleanName(user?.display_name) ||
    cleanName(user?.full_name) ||
    cleanName(user?.name) ||
    cleanName(user?.email) ||
    cleanName(fallback)
  );
}

export function buildOperationalUserNameMap(users = []) {
  const map = new Map();

  for (const user of Array.isArray(users) ? users : []) {
    const id = cleanName(user?.id || user?.user_id);
    if (!id) continue;

    const label = operationalUserName(user);
    if (label) map.set(id, label);
  }

  return map;
}

export function applyOperationalOrderUserNames(order = {}, userNameById = new Map()) {
  if (!order || typeof order !== "object") return order;

  const appraiserId = cleanName(order.appraiser_id || order.appraiserId || order.assigned_appraiser_id || order.assigned_to);
  const reviewerId = cleanName(order.reviewer_id || order.reviewerId || order.current_reviewer_id);
  const appraiserName = appraiserId ? userNameById.get(appraiserId) : "";
  const reviewerName = reviewerId ? userNameById.get(reviewerId) : "";
  const next = { ...order };

  if (appraiserName) {
    next.appraiser_name = appraiserName;
    next.assigned_appraiser_name = appraiserName;
    next.appraiserName = appraiserName;
  }

  if (reviewerName) {
    next.reviewer_name = reviewerName;
    next.reviewerName = reviewerName;
  }

  return next;
}

export function applyOperationalOrderUserNamesToRows(rows = [], users = []) {
  if (!Array.isArray(rows) || rows.length === 0) return Array.isArray(rows) ? rows : [];

  const userNameById = users instanceof Map ? users : buildOperationalUserNameMap(users);
  if (userNameById.size === 0) return rows;

  return rows.map((row) => applyOperationalOrderUserNames(row, userNameById));
}
