import { OPERATIONAL_QUEUE_DEFINITIONS } from "./queueDefinitions";
import { evaluateOrderQueues } from "./queueEvaluator";

const URGENCY_PRIORITY = Object.freeze({
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
});

export function summarizeOperationalQueues(orders = [], options = {}) {
  const summariesById = new Map(
    OPERATIONAL_QUEUE_DEFINITIONS.map((definition) => [
      definition.id,
      {
        id: definition.id,
        label: definition.label,
        urgency: definition.urgency,
        description: definition.description,
        count: 0,
        orders: [],
      },
    ])
  );

  for (const order of orders || []) {
    const queueIds = evaluateOrderQueues(order, options);

    for (const queueId of queueIds) {
      const summary = summariesById.get(queueId);
      if (!summary) continue;

      summary.count += 1;
      summary.orders.push(order);
    }
  }

  return OPERATIONAL_QUEUE_DEFINITIONS.map((definition) => summariesById.get(definition.id));
}

function getUrgencyPriority(urgency) {
  return URGENCY_PRIORITY[String(urgency || "").toLowerCase()] ?? 0;
}

export function getTopOperationalQueues(summaries = [], limit = 4) {
  return [...(summaries || [])]
    .filter((summary) => Number(summary?.count || 0) > 0)
    .sort((a, b) => {
      const urgencyDelta = getUrgencyPriority(b?.urgency) - getUrgencyPriority(a?.urgency);
      if (urgencyDelta) return urgencyDelta;

      const countDelta = Number(b?.count || 0) - Number(a?.count || 0);
      if (countDelta) return countDelta;

      return String(a?.label || "").localeCompare(String(b?.label || ""));
    })
    .slice(0, limit);
}

export function getQueueSummaryById(summaries = [], queueId) {
  return summaries.find((summary) => summary?.id === queueId) ?? null;
}
