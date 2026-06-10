const ASSIGNMENT_OFFERED_STATUSES = new Set(["offered"]);
const ASSIGNED_STATUSES = new Set(["accepted", "in_progress", "submitted"]);
const OPEN_REQUEST_STATUSES = new Set(["draft", "sent", "partially_responded"]);
const CANCELLED_REQUEST_STATUSES = new Set(["cancelled"]);
const EXPIRED_REQUEST_STATUSES = new Set(["expired"]);
const RESPONSE_RECIPIENT_STATUSES = new Set(["responded", "selected", "not_selected"]);

const STATUS_CONFIG = {
  not_sent_for_bid: {
    label: "Not sent for bid",
    tone: "neutral",
  },
  out_for_bid: {
    label: "Out for bid",
    tone: "info",
  },
  bids_received: {
    label: "Bids received",
    tone: "info",
  },
  bid_selected: {
    label: "Bid selected",
    tone: "success",
  },
  assignment_offered: {
    label: "Assignment offered",
    tone: "warning",
  },
  assigned: {
    label: "Assigned",
    tone: "success",
  },
  no_bids_expired: {
    label: "No bids / expired",
    tone: "warning",
  },
  cancelled: {
    label: "Cancelled",
    tone: "muted",
  },
};

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function getCreatedAtTime(request = {}) {
  const value = request.created_at || request.updated_at || request.response_due_at || "";
  const time = Date.parse(value);
  return Number.isNaN(time) ? 0 : time;
}

function getRequests(bidRequests) {
  return Array.isArray(bidRequests)
    ? bidRequests.filter((request) => request && typeof request === "object")
    : [];
}

function getRecipients(request = {}) {
  return Array.isArray(request.recipients)
    ? request.recipients.filter((recipient) => recipient && typeof recipient === "object")
    : [];
}

function getResponse(recipient = {}) {
  return recipient.response && typeof recipient.response === "object" ? recipient.response : null;
}

function getNumeric(value) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function getAssignmentNumeric(assignment, ...keys) {
  if (!assignment || typeof assignment !== "object") return null;
  for (const key of keys) {
    const value = getNumeric(assignment[key]);
    if (value !== null) return value;
  }
  return null;
}

function getAssignmentDate(assignment, ...keys) {
  if (!assignment || typeof assignment !== "object") return null;
  for (const key of keys) {
    const value = getDateValue(assignment[key]);
    if (value) return value;
  }
  return null;
}

function getDateValue(value) {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : String(value);
}

function compareDateValues(a, b) {
  if (!a) return b || null;
  if (!b) return a;
  return Date.parse(b) < Date.parse(a) ? b : a;
}

function isRespondedRecipient(recipient = {}) {
  const status = normalizeStatus(recipient.status);
  const response = getResponse(recipient);
  return RESPONSE_RECIPIENT_STATUSES.has(status) || Boolean(response);
}

function isSelectedRecipient(recipient = {}) {
  const status = normalizeStatus(recipient.status);
  const response = getResponse(recipient);
  return status === "selected" || Boolean(response?.selected_at);
}

function getVendorName(recipient = {}) {
  return (
    recipient.vendor_company_name ||
    recipient.vendor_name ||
    recipient.company_name ||
    recipient.vendor_profile_name ||
    null
  );
}

function getMostRelevantRequest(requests) {
  if (!requests.length) return null;

  const selectedRequest = requests.find((request) => getRecipients(request).some(isSelectedRecipient));
  if (selectedRequest) return selectedRequest;

  const openRequests = requests.filter((request) => OPEN_REQUEST_STATUSES.has(normalizeStatus(request.status)));
  if (openRequests.length) {
    return openRequests.sort((a, b) => getCreatedAtTime(b) - getCreatedAtTime(a))[0];
  }

  return [...requests].sort((a, b) => getCreatedAtTime(b) - getCreatedAtTime(a))[0];
}

function buildResult(status, summary) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.not_sent_for_bid;
  return {
    status,
    label: config.label,
    contactedCount: summary.contactedCount,
    respondedCount: summary.respondedCount,
    selectedVendorName: summary.selectedVendorName,
    selectedFee: summary.selectedFee,
    selectedCurrency: summary.selectedCurrency,
    selectedTurnTimeDays: summary.selectedTurnTimeDays,
    selectedProposedDueAt: summary.selectedProposedDueAt,
    lowestFee: summary.lowestFee,
    fastestTurnTimeDays: summary.fastestTurnTimeDays,
    earliestProposedDueAt: summary.earliestProposedDueAt,
    responseDueAt: summary.responseDueAt,
    clientDueAt: summary.clientDueAt,
    assignmentStatus: summary.assignmentStatus,
    tone: config.tone,
  };
}

export function deriveOrderBidStatus({ bidRequests, activeVendorAssignment } = {}) {
  const requests = getRequests(bidRequests);
  const allRecipients = requests.flatMap(getRecipients);
  const respondedRecipients = allRecipients.filter(isRespondedRecipient);
  const selectedRecipient = allRecipients.find(isSelectedRecipient) || null;
  const selectedResponse = selectedRecipient ? getResponse(selectedRecipient) : null;
  const relevantRequest = getMostRelevantRequest(requests);
  const assignmentStatus = normalizeStatus(activeVendorAssignment?.status) || null;
  const assignmentFee = getAssignmentNumeric(
    activeVendorAssignment,
    "accepted_fee_amount",
    "fee_amount",
  );
  const assignmentTurnTimeDays = getAssignmentNumeric(
    activeVendorAssignment,
    "accepted_turn_time_days",
    "turn_time_days",
  );
  const assignmentDueAt = getAssignmentDate(
    activeVendorAssignment,
    "accepted_vendor_due_at",
    "proposed_due_at",
    "due_at",
  );

  let lowestFee = null;
  let fastestTurnTimeDays = null;
  let earliestProposedDueAt = null;

  for (const recipient of allRecipients) {
    const response = getResponse(recipient);
    if (!response) continue;

    const fee = getNumeric(response.fee_amount);
    if (fee !== null && (lowestFee === null || fee < lowestFee)) {
      lowestFee = fee;
    }

    const turnTimeDays = getNumeric(response.turn_time_days);
    if (turnTimeDays !== null && (fastestTurnTimeDays === null || turnTimeDays < fastestTurnTimeDays)) {
      fastestTurnTimeDays = turnTimeDays;
    }

    earliestProposedDueAt = compareDateValues(
      earliestProposedDueAt,
      getDateValue(response.proposed_due_at),
    );
  }

  const selectedFee = getNumeric(selectedResponse?.fee_amount) ?? assignmentFee;
  const selectedTurnTimeDays = getNumeric(selectedResponse?.turn_time_days) ?? assignmentTurnTimeDays;
  const selectedProposedDueAt = getDateValue(selectedResponse?.proposed_due_at) ?? assignmentDueAt;

  const summary = {
    contactedCount: allRecipients.length,
    respondedCount: respondedRecipients.length,
    selectedVendorName:
      (selectedRecipient ? getVendorName(selectedRecipient) : null) ||
      activeVendorAssignment?.assigned_company_name ||
      null,
    selectedFee,
    selectedCurrency: selectedResponse?.currency || activeVendorAssignment?.accepted_fee_currency || null,
    selectedTurnTimeDays,
    selectedProposedDueAt,
    lowestFee,
    fastestTurnTimeDays,
    earliestProposedDueAt,
    responseDueAt: relevantRequest?.response_due_at || null,
    clientDueAt: relevantRequest?.client_due_at || null,
    assignmentStatus,
  };

  if (ASSIGNMENT_OFFERED_STATUSES.has(assignmentStatus)) {
    return buildResult("assignment_offered", summary);
  }

  if (ASSIGNED_STATUSES.has(assignmentStatus)) {
    return buildResult("assigned", summary);
  }

  if (selectedRecipient && selectedResponse) {
    return buildResult("bid_selected", summary);
  }

  if (!requests.length) {
    return buildResult("not_sent_for_bid", summary);
  }

  const openRequests = requests.filter((request) => OPEN_REQUEST_STATUSES.has(normalizeStatus(request.status)));
  if (openRequests.length) {
    return buildResult(respondedRecipients.length > 0 ? "bids_received" : "out_for_bid", summary);
  }

  const hasResponses = respondedRecipients.length > 0;
  if (hasResponses) {
    return buildResult("bids_received", summary);
  }

  const allCancelled = requests.every((request) => CANCELLED_REQUEST_STATUSES.has(normalizeStatus(request.status)));
  if (allCancelled) {
    return buildResult("cancelled", summary);
  }

  const hasExpired = requests.some((request) => EXPIRED_REQUEST_STATUSES.has(normalizeStatus(request.status)));
  if (hasExpired) {
    return buildResult("no_bids_expired", summary);
  }

  return buildResult("not_sent_for_bid", summary);
}
