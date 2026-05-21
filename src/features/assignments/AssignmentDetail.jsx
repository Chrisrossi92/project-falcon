import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { useEffectivePermissions } from "@/lib/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { getAssignedOfferPacket, getAssignedWorkPacket, getOwnerAssignmentPacket } from "./api";
import AssignedOfferPacket from "./AssignedOfferPacket";
import AssignedWorkPacket from "./AssignedWorkPacket";
import { BackLink, DeniedState, ErrorState, LoadingState } from "./AssignmentPrimitives";
import OwnerAssignmentPacket from "./OwnerAssignmentPacket";

async function tryPacket(loader) {
  try {
    return { packet: await loader(), error: null };
  } catch (error) {
    return { packet: null, error };
  }
}

export default function AssignmentDetail() {
  const { assignmentId } = useParams();
  const permissions = useEffectivePermissions();
  const canReadOwner = permissions.hasPermission(PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_OWNER);
  const canReadAssigned = permissions.hasPermission(PERMISSIONS.ORDER_COMPANY_ASSIGNMENTS_READ_ASSIGNED);
  const [resolved, setResolved] = useState({ kind: "", packet: null });
  const [diagnostics, setDiagnostics] = useState([]);
  const [loading, setLoading] = useState(true);
  const permissionState = useMemo(
    () => ({ loading: permissions.loading, canReadOwner, canReadAssigned }),
    [permissions.loading, canReadOwner, canReadAssigned]
  );

  const load = useCallback(async () => {
    if (!assignmentId || permissionState.loading) return;
    setLoading(true);
    const failures = [];

    if (permissionState.canReadOwner) {
      const { packet: ownerPacket, error } = await tryPacket(() => getOwnerAssignmentPacket(assignmentId));
      if (error) failures.push({ packet: "owner", code: error.code, message: error.message });
      if (ownerPacket) {
        setResolved({ kind: "owner", packet: ownerPacket });
        setDiagnostics(failures);
        setLoading(false);
        return;
      }
    }

    if (permissionState.canReadAssigned) {
      const { packet: offerPacket, error: offerError } = await tryPacket(() => getAssignedOfferPacket(assignmentId));
      if (offerError) failures.push({ packet: "offer", code: offerError.code, message: offerError.message });
      if (offerPacket) {
        setResolved({ kind: "offer", packet: offerPacket });
        setDiagnostics(failures);
        setLoading(false);
        return;
      }

      const { packet: workPacket, error: workError } = await tryPacket(() => getAssignedWorkPacket(assignmentId));
      if (workError) failures.push({ packet: "work", code: workError.code, message: workError.message });
      if (workPacket) {
        setResolved({ kind: "work", packet: workPacket });
        setDiagnostics(failures);
        setLoading(false);
        return;
      }
    }

    if (failures.length > 0) {
      console.debug("Assignment packet resolution failed", failures.map((failure) => ({
        packet: failure.packet,
        code: failure.code || "unknown",
      })));
    }
    setDiagnostics(failures);
    setResolved({ kind: "denied", packet: null });
    setLoading(false);
  }, [assignmentId, permissionState]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || permissions.loading) {
    return <LoadingState message="Resolving assignment packet..." />;
  }

  return (
    <div className="space-y-4">
      <BackLink />
      {resolved.kind === "owner" && <OwnerAssignmentPacket packet={resolved.packet} onChanged={load} />}
      {resolved.kind === "offer" && <AssignedOfferPacket packet={resolved.packet} onChanged={load} />}
      {resolved.kind === "work" && <AssignedWorkPacket packet={resolved.packet} onChanged={load} />}
      {resolved.kind === "denied" && (
        diagnostics.length > 0 ? (
          <ErrorState
            title="Assignment packet unavailable"
            message="Falcon could not resolve this assignment packet for your current company role. No order fallback was attempted."
            onRetry={load}
          />
        ) : (
          <DeniedState />
        )
      )}
    </div>
  );
}
