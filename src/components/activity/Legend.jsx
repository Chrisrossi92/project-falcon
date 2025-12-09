// Legend.jsx
import React from "react";
import { TypeBadge, UserBadge } from "./Badges";   // ✅ this line fixes it

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
    <div className={`mb-2 flex flex-wrap items-center gap-2 ${className}`}>
      {/* System toggle (disabled if a user is selected) */}
      <button
        type="button"
        onClick={!userActive ? onToggleSystem : undefined}
        disabled={userActive}
        className={`rounded-full border px-2.5 py-1 text-xs flex items-center gap-2 ${
          userActive
            ? "opacity-50 cursor-not-allowed border-gray-300 text-gray-400"
            : showSystem
            ? "bg-gray-50 border-gray-300 text-gray-700"
            : "border-gray-300 text-gray-500"
        }`}
        title={userActive ? "Disabled while filtering by user" : "Toggle System events"}
        aria-disabled={userActive}
      >
        <TypeBadge type="system" />
      </button>

      {/* Dynamic users (unchanged) */}
      {participants.map((p) => {
        const selected = activeUserKey === p.key;
        return (
          <button
            key={p.key}
            type="button"
            onClick={() => onToggleUser?.(p.key)}
            className={`rounded-full border px-0.5 py-0.5 text-xs transition ${
              selected ? "ring-2 ring-offset-1 ring-indigo-400" : "ring-0"
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
          className="ml-1 rounded-full border px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
          title="Show all"
        >
          All
        </button>
      )}
    </div>
  );
}


