import { OPERATIONAL_QUEUE_DEFINITIONS } from "./queueDefinitions";
import { evaluateOrderQueues } from "./queueEvaluator";

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
