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
    <div className="rounded-md border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <div className="mt-0.5 opacity-70">
            <Icon size={16} />
          </div>

          <div className="text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-medium">{label}</div>

              {/* Exactly one badge: System OR User */}
              {isSystem ? (
                <TypeBadge type="system" />
              ) : (
                <UserBadge nameOrId={displayName} email={item?.created_by_email} />
              )}
            </div>

            {body ? (
              <div className="mt-1 whitespace-pre-wrap text-sm leading-5 text-slate-600">
                {body}
              </div>
            ) : null}

            <div className="mt-1 text-[11px] text-gray-500">At: {when}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
