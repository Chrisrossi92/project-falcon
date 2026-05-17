import {
  assessOrderOperationalQueues,
  orderHasOperationalQueue,
} from "./orderAssessment";

// Queues are derived operational intelligence. This evaluator intentionally uses
// pure deterministic rules so every queue result can be explained from order data.
export function evaluateOrderQueues(order, options = {}) {
  return assessOrderOperationalQueues(order, options).queueIds;
}

export function orderHasQueue(order, queueId) {
  return orderHasOperationalQueue(order, queueId);
}
