import { useEffect, useMemo, useRef, useState } from "react";
import {
  getCurrentCommandPaletteCommands,
  getCurrentOrderSearchFallback,
} from "@/lib/commandPalette/currentCommandPaletteCommands";
import { getCurrentShellCommandPaletteCommands } from "@/lib/commandPalette/currentShellCommandPaletteCommands";
import { useEffectivePermissions } from "@/lib/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { useShellProfile } from "@/lib/shell/useShellProfile";

const COMMAND_PERMISSION_KEYS = Object.freeze([
  PERMISSIONS.NAVIGATION_ORDERS_VIEW,
  PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED,
  PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_OWNER,
  PERMISSIONS.RELATIONSHIPS_READ,
  PERMISSIONS.NAVIGATION_CLIENTS_VIEW,
  PERMISSIONS.USERS_READ,
  PERMISSIONS.NAVIGATION_USERS_VIEW,
  PERMISSIONS.SETTINGS_VIEW,
  PERMISSIONS.NAVIGATION_SETTINGS_VIEW,
  PERMISSIONS.NOTIFICATIONS_PREFERENCES_MANAGE_OWN,
]);

export default function CommandPalette({ open, onClose, onNavigate, clientsPath = "/clients" }) {
  const [q, setQ]   = useState("");
  const [idx, setI] = useState(0);
  const inputRef    = useRef(null);
  const { loading, error, hasPermission } = useEffectivePermissions();
  const shellProfilePresentation = useShellProfile();

  const commandPermissions = useMemo(
    () =>
      Object.fromEntries(
        COMMAND_PERMISSION_KEYS.map((permissionKey) => [
          permissionKey,
          hasPermission(permissionKey),
        ]),
      ),
    [hasPermission],
  );

  const commands = useMemo(
    () =>
      getCurrentCommandPaletteCommands({
        clientsPath,
        error,
        loading,
        permissions: commandPermissions,
      }),
    [clientsPath, commandPermissions, error, loading],
  );
  const shellProfileId = !loading && !error
    ? shellProfilePresentation?.profileId ?? shellProfilePresentation?.id
    : null;
  const orderedCommands = useMemo(
    () => getCurrentShellCommandPaletteCommands(commands, shellProfileId),
    [commands, shellProfileId],
  );

  const orderSearchFallback = useMemo(
    () =>
      getCurrentOrderSearchFallback({
        error,
        loading,
        permissions: commandPermissions,
      }),
    [commandPermissions, error, loading],
  );

  const canUseAssignments = commands.some((command) => command.id === "assignments");
  const canUseRelationships = commands.some((command) => command.id === "relationships");

  // Filter first so effects can depend on it safely
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return orderedCommands;
    return commands.filter((it) => it.label.toLowerCase().includes(needle));
  }, [commands, orderedCommands, q]);

  const canSearchOrders = orderSearchFallback.canSearchOrders;

  // Reset & focus when opened
  useEffect(() => {
    if (open) {
      setQ("");
      setI(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Keyboard handling (Esc, arrows, Enter)
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (!open) return;
      if (e.key === "Escape") onClose?.();

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setI((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setI((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const item = filtered[idx];
        if (item) {
          onNavigate?.(item.to);
        } else if (q.trim() && canSearchOrders) {
          onNavigate?.(orderSearchFallback.toSearchPath(q));
        } else {
          onClose?.();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, idx, q, filtered, canSearchOrders, orderSearchFallback, onNavigate, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="mx-auto mt-24 w-full max-w-xl rounded-2xl border bg-white shadow-xl relative">
        <div className="px-3 py-2 border-b">
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search... (Orders${canUseAssignments ? ", Assignments" : ""}${canUseRelationships ? ", Relationships" : ""}, Clients, Team Access, Settings)`}
            className="w-full outline-none text-sm px-1.5 py-1.5"
          />
        </div>
        <ul className="max-h-72 overflow-auto py-2">
          {filtered.map((it, i) => (
            <li
              key={it.id}
              className={`px-3 py-2 cursor-pointer text-sm flex items-center justify-between ${
                i === idx ? "bg-gray-100" : "hover:bg-gray-50"
              }`}
              onMouseEnter={() => setI(i)}
              onClick={() => onNavigate?.(it.to)}
            >
              <span>{it.label}</span>
              {it.hint && (
                <span className="text-[10px] rounded border px-1 py-0.5 text-gray-400">{it.hint}</span>
              )}
            </li>
          ))}
          {filtered.length === 0 && canSearchOrders && (
            <li className="px-3 py-3 text-sm text-gray-500">
              Press Enter to search Orders for “{q}”
            </li>
          )}
          {filtered.length === 0 && !canSearchOrders && (
            <li className="px-3 py-3 text-sm text-gray-500">
              No available commands match “{q}”
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
