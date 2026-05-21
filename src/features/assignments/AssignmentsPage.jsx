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
        eyebrow="Company Work"
        title="Assignments"
        subtitle="Assignment-native packets and lifecycle actions for company-to-company work."
      />
      <div className="grid gap-4 xl:grid-cols-2">
        {canReadAssigned && <AssignedAssignmentInbox />}
        {canReadOwner && <OwnerAssignmentManagement />}
      </div>
    </div>
  );
}

export { ASSIGNMENT_NAV_PERMISSIONS };
