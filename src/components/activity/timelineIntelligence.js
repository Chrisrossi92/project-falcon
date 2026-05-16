import { isHumanCommunicationEvent, isWorkflowEvent } from "./utils";

const MOMENT_WINDOW_MS = 90 * 1000;

function timestampMs(item) {
  const value = new Date(item?.created_at || "").getTime();
  return Number.isFinite(value) ? value : null;
}

function areCloseInTime(a, b) {
  const left = timestampMs(a);
  const right = timestampMs(b);
  if (left === null || right === null) return false;
  return Math.abs(right - left) <= MOMENT_WINDOW_MS;
}

function canGroupAsOperationalMoment(a, b) {
  const aType = a?.event_type || "";
  const bType = b?.event_type || "";
  const hasHumanNote =
    isHumanCommunicationEvent(aType) || isHumanCommunicationEvent(bType);
  const hasWorkflowEvent = isWorkflowEvent(aType) || isWorkflowEvent(bType);

  return hasHumanNote && hasWorkflowEvent && areCloseInTime(a, b);
}

function momentKey(items, index) {
  return items
    .map((item) => item?.id || `${item?.event_type || "event"}-${item?.created_at || index}`)
    .join("::");
}

// Timeline intelligence is render-only: raw activity rows remain intact.
export function buildTimelineNodes(items = []) {
  const nodes = [];

  for (let index = 0; index < items.length; index += 1) {
    const current = items[index];
    const next = items[index + 1];

    if (next && canGroupAsOperationalMoment(current, next)) {
      const groupItems = [current, next];
      nodes.push({
        type: "moment",
        key: `moment-${momentKey(groupItems, index)}`,
        items: groupItems,
      });
      index += 1;
      continue;
    }

    nodes.push({
      type: "single",
      key: current?.id || `${current?.event_type || "event"}-${current?.created_at || index}`,
      item: current,
    });
  }

  return nodes;
}
