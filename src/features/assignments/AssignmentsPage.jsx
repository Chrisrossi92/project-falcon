import {
  WorkspaceContextStrip,
  WorkspaceContextTile,
} from "@/components/workspace/WorkspaceContext";
import { useCanAny, useEffectivePermissions } from "@/lib/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { AssignmentState, LoadingState, PageHeader } from "./AssignmentPrimitives";
import AssignedAssignmentInbox from "./AssignedAssignmentInbox";
import OwnerAssignmentManagement from "./OwnerAssignmentManagement";

const ASSIGNMENT_NAV_PERMISSIONS = [
  PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED,
  PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_OWNER,
];

export default function AssignmentsPage() {
  const canViewAssignments = useCanAny(ASSIGNMENT_NAV_PERMISSIONS);
  const permissions = useEffectivePermissions();
  const canReadAssigned = permissions.hasPermission(PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED);
  const canReadOwner = permissions.hasPermission(PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_OWNER);
  const visibleLaneLabel = [
    canReadAssigned ? "Received work" : null,
    canReadOwner ? "Sent assignments" : null,
  ].filter(Boolean).join(" + ");
  const assignedOnly = canReadAssigned && !canReadOwner;

  if (canViewAssignments.loading || permissions.loading) {
    return <LoadingState message="Loading assignments..." />;
  }

  if (!canViewAssignments.allowed) {
    return (
      <AssignmentState
        title="Assignments unavailable"
        message="Assignments are not available for your current company role."
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Packet Coordination"
        title="Assignments Workspace"
        subtitle="Coordinate scoped assignment packets between companies without expanding order or client visibility."
      />
      <WorkspaceContextStrip
        ariaLabel="Assignments workspace context"
        className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-3"
      >
        <WorkspaceContextTile
          label="Work View"
          value={visibleLaneLabel || "Assignment packets"}
          className="rounded-md border-slate-100 bg-slate-50 shadow-none"
          labelClassName="text-[11px] tracking-[0.12em] text-slate-400"
          valueClassName="font-semibold text-slate-800"
        />
        <WorkspaceContextTile
          label="Access"
          value={assignedOnly ? "Assignment-scoped" : "Packet-scoped"}
          className="rounded-md border-slate-100 bg-slate-50 shadow-none"
          labelClassName="text-[11px] tracking-[0.12em] text-slate-400"
          valueClassName="font-semibold text-slate-800"
        />
        <WorkspaceContextTile
          label="Navigation"
          value={assignedOnly ? "Open received work only" : "Open packets only"}
          className="rounded-md border-slate-100 bg-slate-50 shadow-none"
          labelClassName="text-[11px] tracking-[0.12em] text-slate-400"
          valueClassName="font-semibold text-slate-800"
        />
      </WorkspaceContextStrip>
      <div className="grid gap-4 xl:grid-cols-2">
        {canReadAssigned && <AssignedAssignmentInbox />}
        {canReadOwner && <OwnerAssignmentManagement />}
      </div>
    </div>
  );
}

export { ASSIGNMENT_NAV_PERMISSIONS };
