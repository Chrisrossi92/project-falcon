// Row.jsx
import React from "react";
import { LABEL, EVENT_ICON, formatWhen, displayNameFrom, formatActivity } from "./utils";
import { TypeBadge, UserBadge } from "./Badges";

// Treat notes as "user"; everything else as "system" (adjust if you add more types)
const SYSTEM_TYPES = new Set([
  "order_created",
  "status_changed",
  "dates_updated",
  "assignee_changed",
  "fee_changed",
]);

export default function Row({ item }) {
  const when = formatWhen(item?.created_at);
  const et = item?.event_type || "";
  const label = LABEL[et] || et || "Event";

  const displayName = displayNameFrom(
    item?.created_by_name,
    item?.created_by_email,
    item?.created_by
  );

  let body = formatActivity(item);
  if (!body) {
    return null; // skip empty/robotic entries
  }

  const Icon = EVENT_ICON[et] || EVENT_ICON.order_created;
  const isSystem = SYSTEM_TYPES.has(et);

  return (
    <div className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500">
            <Icon size={16} />
          </div>

          <div className="min-w-0 text-sm">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="font-semibold text-slate-900">{label}</div>

              {/* Exactly one badge: System OR User */}
              {isSystem ? (
                <TypeBadge type="system" />
              ) : (
                <UserBadge nameOrId={displayName} email={item?.created_by_email} />
              )}
            </div>

            {body ? (
              <div className="mt-1.5 whitespace-pre-wrap text-sm leading-5 text-slate-700">
                {body}
              </div>
            ) : null}

            <time className="mt-2 block text-[11px] text-slate-500" dateTime={item?.created_at || undefined}>
              {when}
            </time>
          </div>
        </div>
      </div>
    </div>
  );
}
