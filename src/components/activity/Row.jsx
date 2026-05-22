// Row.jsx
import {
  LABEL,
  EVENT_ICON,
  formatWhen,
  formatActivity,
  getActivityCategory,
  resolveActivityActor,
  colorForActivityActor,
  isHumanCommunicationEvent,
  isSystemEvent,
} from "./utils";

export default function Row({ item, grouped = false }) {
  const when = formatWhen(item?.created_at);
  const et = item?.event_type || "";
  const label = LABEL[et] || "Activity event";
  const category = getActivityCategory(et);

  const actor = resolveActivityActor(item);
  const actorColor = colorForActivityActor(actor);

  const body = formatActivity(item) || "Event recorded";

  const Icon = EVENT_ICON[et] || EVENT_ICON.order_created;
  const isSystem = isSystemEvent(et);
  const isHuman = isHumanCommunicationEvent(et) || !isSystem;
  const categoryChip = (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
        "tracking-wide",
        category.className,
      ].join(" ")}
    >
      {category.label}
    </span>
  );

  if (isHuman) {
    return (
      <div
        className={[
          "rounded-xl border p-3",
          category.rowClassName,
          grouped ? "shadow-none" : "shadow-sm",
        ].join(" ")}
      >
        <div className="flex items-start gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-semibold"
            style={actorColor}
          >
            {actor.initials}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <div className="text-sm font-semibold text-slate-950">{actor.fullName}</div>
              {categoryChip}
              <div className="text-[11px] font-semibold text-slate-600">{label}</div>
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
    <div
      className={[
        "rounded-lg border px-3 py-2",
        category.rowClassName,
        grouped ? "shadow-none" : "shadow-[0_1px_1px_rgba(15,23,42,0.03)]",
      ].join(" ")}
    >
      <div className="flex items-start gap-2.5">
        <div
          className={[
            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
            category.iconClassName,
          ].join(" ")}
        >
          <Icon size={16} />
        </div>

        <div className="min-w-0 flex-1 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-semibold text-slate-800">{label}</div>
            {categoryChip}
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
