export function resolveOrderParticipants(order, {
  actorUserId = null,
  actorRole = null,
  event = null,
  status = order?.status ?? null,
} = {}) {
  const appraiserId = order?.appraiser_id || null;
  const reviewerId = order?.reviewer_id || null;

  let roleOnOrder = "other";
  if (actorUserId && actorUserId === appraiserId) {
    roleOnOrder = "appraiser";
  } else if (actorUserId && actorUserId === reviewerId) {
    roleOnOrder = "reviewer";
  }

  let recipients = [];
  if (roleOnOrder === "appraiser") {
    recipients = reviewerId ? [reviewerId] : [];
  } else if (roleOnOrder === "reviewer") {
    recipients = appraiserId ? [appraiserId] : [];
  } else {
    recipients = appraiserId ? [appraiserId] : [];
  }

  return {
    actor: {
      userId: actorUserId,
      roleOnOrder,
    },
    recipients,
    suppressUserIds: [actorUserId],
  };
}
