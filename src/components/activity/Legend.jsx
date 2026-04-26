// Legend.jsx
import React from "react";
import { TypeBadge, UserBadge } from "./Badges";

export default function Legend({
  className = "",
  participants = [],
  activeUserKey = null,
  onToggleUser,
  showSystem = true,
  onToggleSystem,
  onClear,
  userActive = false,
}) {
  return (
    <div className={`mb-2 flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-2 ${className}`}>
      <button
        type="button"
        onClick={!userActive ? onToggleSystem : undefined}
        disabled={userActive}
        className={`flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs transition ${
          userActive
            ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400 opacity-60"
            : showSystem
            ? "border-slate-300 bg-slate-50 text-slate-700"
            : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
        }`}
        title={userActive ? "Disabled while filtering by user" : "Toggle System events"}
        aria-disabled={userActive}
      >
        <TypeBadge type="system" />
      </button>

      {participants.map((p) => {
        const selected = activeUserKey === p.key;
        return (
          <button
            key={p.key}
            type="button"
            onClick={() => onToggleUser?.(p.key)}
            className={`rounded-full border px-0.5 py-0.5 text-xs transition hover:bg-slate-50 ${
              selected ? "border-indigo-300 ring-2 ring-indigo-300 ring-offset-1" : "border-slate-200"
            }`}
            title={`Show only ${p.name}`}
          >
            <UserBadge nameOrId={p.name} email={p.email} />
          </button>
        );
      })}

      {(activeUserKey || !showSystem) && (
        <button
          type="button"
          onClick={onClear}
          className="ml-1 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
          title="Show all"
        >
          All
        </button>
      )}
    </div>
  );
}

