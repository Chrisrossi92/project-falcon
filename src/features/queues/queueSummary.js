import { OPERATIONAL_QUEUE_DEFINITIONS } from "./queueDefinitions";
import { assessOrderOperationalQueues } from "./orderAssessment";

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
        signalLabels: [],
        explanation: "",
      },
    ])
  );

  for (const order of orders || []) {
    const assessment = assessOrderOperationalQueues(order, options);

    for (const queueId of assessment.queueIds) {
      const summary = summariesById.get(queueId);
      if (!summary) continue;

      summary.count += 1;
      summary.orders.push(order);

      const signal = assessment.signals.find((item) => item.id === queueId);
      if (signal?.label && !summary.signalLabels.includes(signal.label)) {
        summary.signalLabels.push(signal.label);
      }
    }
  }

  return OPERATIONAL_QUEUE_DEFINITIONS.map((definition) => {
    const summary = summariesById.get(definition.id);
    const label = summary?.signalLabels?.[0] || "";
    const normalizedLabel = label
      ? label.replace(/\.$/, "").replace(/^./, (char) => char.toLowerCase())
      : "";

    return {
      ...summary,
      explanation: normalizedLabel ? `Showing orders where ${normalizedLabel}.` : "",
    };
  });
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
