import { Archive, Check, Pause, Play, X } from "lucide-react";
import { useMemo, useState } from "react";

import { useEffectivePermissions } from "@/lib/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/permissions/constants";
import {
  acceptRelationship,
  archiveRelationship,
  declineRelationship,
  reactivateRelationship,
  suspendRelationship,
} from "../api";
import RelationshipActionConfirmModal from "./RelationshipActionConfirmModal";

function ActionButton({ children, icon: Icon, variant = "secondary", disabled, onClick }) {
  const classes = {
    primary: "border-slate-950 bg-slate-950 text-white hover:bg-slate-800",
    secondary: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    danger: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
  };
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${classes[variant]}`}
    >
      {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
      {children}
    </button>
  );
}

export default function RelationshipLifecycleActions({ relationship, direction, onChanged, onError }) {
  const { hasPermission } = useEffectivePermissions();
  const [pendingAction, setPendingAction] = useState(null);

  const actionConfigs = useMemo(() => {
    if (!relationship || relationship.status === "archived") return [];

    const canApprove = hasPermission(PERMISSIONS.RELATIONSHIPS_APPROVE);
    const canSuspend = hasPermission(PERMISSIONS.RELATIONSHIPS_SUSPEND);
    const canArchive = hasPermission(PERMISSIONS.RELATIONSHIPS_ARCHIVE);
    const status = relationship.status;
    const configs = [];

    if (status === "invited" && direction === "incoming" && canApprove) {
      configs.push(
        {
          key: "accept",
          icon: Check,
          title: "Accept relationship invitation",
          description: "Accept this incoming company relationship invitation. This will not grant order, client, assignment, or activity visibility.",
          confirmLabel: "Accept",
          successLabel: "Relationship accepted.",
          run: (notes) => acceptRelationship(relationship.id, { notes }),
        },
        {
          key: "decline",
          icon: X,
          variant: "danger",
          title: "Decline relationship invitation",
          description: "Decline this incoming company relationship invitation. The source company may send a new invitation later if policy allows it.",
          confirmLabel: "Decline",
          successLabel: "Relationship declined.",
          run: (notes) => declineRelationship(relationship.id, notes),
        }
      );
    }

    if (status === "active" && canSuspend) {
      configs.push({
        key: "suspend",
        icon: Pause,
        variant: "danger",
        title: "Suspend relationship",
        description: "Suspend this company relationship. Relationship status still does not grant or remove operational visibility; assignment packets remain the scoped work boundary.",
        confirmLabel: "Suspend",
        successLabel: "Relationship suspended.",
        run: (notes) => suspendRelationship(relationship.id, notes),
      });
    }

    if (status === "suspended" && canSuspend) {
      configs.push({
        key: "reactivate",
        icon: Play,
        title: "Reactivate relationship",
        description: "Reactivate this suspended company relationship. This restores relationship lifecycle state only, not order or client visibility.",
        confirmLabel: "Reactivate",
        successLabel: "Relationship reactivated.",
        run: (notes) => reactivateRelationship(relationship.id, notes),
      });
    }

    if (["active", "suspended", "declined", "expired"].includes(status) && direction === "outgoing" && canArchive) {
      configs.push({
        key: "archive",
        icon: Archive,
        variant: "danger",
        title: "Archive relationship",
        description: "Archive this outgoing company relationship. Archived relationships are terminal and cannot be reactivated.",
        confirmLabel: "Archive",
        successLabel: "Relationship archived.",
        run: (notes) => archiveRelationship(relationship.id, notes),
      });
    }

    return configs;
  }, [direction, hasPermission, relationship]);

  if (!relationship || relationship.status === "archived" || !actionConfigs.length) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {actionConfigs.map((action) => (
          <ActionButton
            key={action.key}
            icon={action.icon}
            variant={action.variant || "secondary"}
            onClick={() => setPendingAction(action)}
          >
            {action.confirmLabel}
          </ActionButton>
        ))}
      </div>
      <RelationshipActionConfirmModal
        open={Boolean(pendingAction)}
        action={pendingAction}
        onClose={() => setPendingAction(null)}
        onConfirm={async (notes) => {
          try {
            await pendingAction.run(notes);
            setPendingAction(null);
            onChanged?.(pendingAction.successLabel);
          } catch (error) {
            onError?.(error);
            throw error;
          }
        }}
      />
    </>
  );
}
