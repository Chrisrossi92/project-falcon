// Row.jsx
import React from "react";
import { LABEL, EVENT_ICON, formatWhen, formatActivity, resolveActivityActor } from "./utils";
import { TypeBadge } from "./Badges";

// Treat notes as "user"; everything else as "system" (adjust if you add more types)
const SYSTEM_TYPES = new Set([
  "order_created",
  "status_changed",
  "dates_updated",
  "assignee_changed",
  "fee_changed",
]);

const HUMAN_TYPES = new Set([
  "note",
  "note_added",
  "sent_to_review",
  "sent_back_to_appraiser",
]);

function isHumanCommunication(eventType) {
  return HUMAN_TYPES.has(eventType) || !SYSTEM_TYPES.has(eventType);
}

export default function Row({ item }) {
  const when = formatWhen(item?.created_at);
  const et = item?.event_type || "";
  const label = LABEL[et] || et || "Event";

  const actor = resolveActivityActor(item);

  let body = formatActivity(item);
  if (!body) {
    return null; // skip empty/robotic entries
  }

  const Icon = EVENT_ICON[et] || EVENT_ICON.order_created;
  const isSystem = SYSTEM_TYPES.has(et);
  const isHuman = isHumanCommunication(et);

  if (isHuman) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700">
            {actor.initials}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <div className="text-sm font-semibold text-slate-950">{actor.fullName}</div>
              <div className="text-[11px] font-medium text-slate-400">{label}</div>
              <time className="text-[11px] text-slate-400" dateTime={item?.created_at || undefined}>
                {when}
              </time>
            </div>

            <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">
              {body}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200/80 bg-white/80 px-3 py-2 shadow-[0_1px_1px_rgba(15,23,42,0.03)]">
      <div className="flex items-start gap-2.5">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-400">
            <Icon size={16} />
          </div>

          <div className="min-w-0 flex-1 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-semibold text-slate-800">{label}</div>
              {!isSystem && <TypeBadge type="user" />}
              <time className="text-[11px] text-slate-400" dateTime={item?.created_at || undefined}>
                {when}
              </time>
            </div>

            <div className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">
              {body}
            </div>

            {!actor.isGeneric && (
              <div className="mt-1 text-[11px] text-slate-400">Actor: {actor.shortName}</div>
            )}
          </div>
      </div>
    </div>
  );
}
