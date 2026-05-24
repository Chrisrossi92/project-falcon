import AssignedWorkDashboard from "@/features/assignments/components/AssignedWorkDashboard";
import OwnerSentAssignmentsDashboard from "@/features/assignments/components/OwnerSentAssignmentsDashboard";
import { AssignmentState, LoadingState, PageHeader } from "@/features/assignments/AssignmentPrimitives";
import { useEffectivePermissions } from "@/lib/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/permissions/constants";

export const ASSIGNMENT_DASHBOARD_PERMISSIONS = [
  PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED,
  PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_OWNER,
];

const RECEIVED_WORK_SUBTITLE =
  "Review work requests assigned to your company, track due dates and assignment status, and follow owner review after submission.";

const DEFAULT_ASSIGNMENT_DASHBOARD_PRESENTATION = Object.freeze({
  eyebrow: "Company Work",
  title: "Assignment Dashboard",
  subtitle: "Assignment-native work queues and sent-assignment attention without order dashboard access.",
});

function resolveAssignmentDashboardPresentation(shellProfilePresentation) {
  const profileId =
    shellProfilePresentation?.profileId ??
    shellProfilePresentation?.profile?.id ??
    shellProfilePresentation?.shellMetadata?.id;
  const isReceivedWork = profileId === "received_work";

  if (!isReceivedWork) {
    return DEFAULT_ASSIGNMENT_DASHBOARD_PRESENTATION;
  }

  return {
    eyebrow: "Assignment-scoped",
    title:
      shellProfilePresentation?.profile?.dashboardTitle ??
      shellProfilePresentation?.shellMetadata?.dashboardTitle ??
      "Received Work",
    subtitle: RECEIVED_WORK_SUBTITLE,
  };
}

export default function AssignmentDashboardPage({ shellProfilePresentation } = {}) {
  const permissions = useEffectivePermissions();
  const canReadAssigned = permissions.hasPermission(PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED);
  const canReadOwner = permissions.hasPermission(PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_OWNER);
  const presentation = resolveAssignmentDashboardPresentation(shellProfilePresentation);

  if (permissions.loading) {
    return <LoadingState message="Loading assignment dashboard..." />;
  }

  if (!canReadAssigned && !canReadOwner) {
    return (
      <AssignmentState
        title="Assignment dashboard unavailable"
        message="Assignment dashboard access is not available for your current company role."
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={presentation.eyebrow}
        title={presentation.title}
        subtitle={presentation.subtitle}
      />
      <div className="grid gap-4 xl:grid-cols-2">
        {canReadAssigned && <AssignedWorkDashboard />}
        {canReadOwner && <OwnerSentAssignmentsDashboard />}
      </div>
    </div>
  );
}
