import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus } from "lucide-react";

import { useCan } from "@/lib/hooks/usePermissions";
import { useToast } from "@/lib/hooks/useToast";
import { PERMISSIONS } from "@/lib/permissions/constants";
import { listRelationships } from "./api";
import RelationshipDetailPanel from "./components/RelationshipDetailPanel";
import RelationshipList from "./components/RelationshipList";
import RelationshipTabs from "./components/RelationshipTabs";
import InviteRelationshipModal from "./components/InviteRelationshipModal";
import { RELATIONSHIP_STATUSES, relationshipDirection } from "./relationshipFormat";

export const RELATIONSHIP_NAV_PERMISSION = PERMISSIONS.RELATIONSHIPS_READ;

export default function RelationshipsPage() {
  const { relationshipId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const canInvite = useCan(PERMISSIONS.RELATIONSHIPS_INVITE);
  const [scope, setScope] = useState("outgoing");
  const [status, setStatus] = useState("");
  const [relationships, setRelationships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [directionMap, setDirectionMap] = useState({});

  const selectedRelationship = useMemo(
    () => relationships.find((relationship) => relationship.id === relationshipId) || null,
    [relationshipId, relationships]
  );
  const direction = relationshipId
    ? directionMap[relationshipId] || (selectedRelationship ? relationshipDirection(scope) : null)
    : null;

  const loadRelationships = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listRelationships({ scope, status: status || null });
      setRelationships(Array.isArray(rows) ? rows : []);
    } catch (loadError) {
      console.debug("Relationship list load failed", {
        code: loadError?.code,
        message: loadError?.message,
      });
      setRelationships([]);
      setError(loadError);
    } finally {
      setLoading(false);
    }
  }, [scope, status]);

  useEffect(() => {
    loadRelationships();
  }, [loadRelationships, refreshKey]);

  useEffect(() => {
    let active = true;
    async function classifySelectedRelationship() {
      if (!relationshipId) {
        setDirectionMap({});
        return;
      }

      try {
        const [incomingRows, outgoingRows] = await Promise.all([
          listRelationships({ scope: "incoming", status: null }),
          listRelationships({ scope: "outgoing", status: null }),
        ]);
        if (!active) return;
        const nextMap = {};
        for (const relationship of Array.isArray(incomingRows) ? incomingRows : []) {
          nextMap[relationship.id] = "incoming";
        }
        for (const relationship of Array.isArray(outgoingRows) ? outgoingRows : []) {
          nextMap[relationship.id] = "outgoing";
        }
        setDirectionMap(nextMap);
      } catch (classifyError) {
        console.debug("Relationship direction classification failed", {
          code: classifyError?.code,
          message: classifyError?.message,
        });
        if (active) setDirectionMap({});
      }
    }

    classifySelectedRelationship();
    return () => {
      active = false;
    };
  }, [relationshipId, refreshKey]);

  const handleScopeChange = (nextScope) => {
    setScope(nextScope);
    if (relationshipId) navigate("/relationships");
  };

  const handleChanged = (message) => {
    toast.success(message || "Relationship updated.");
    setRefreshKey((key) => key + 1);
  };

  const handleError = (actionError) => {
    console.debug("Relationship lifecycle action failed", {
      code: actionError?.code,
      message: actionError?.message,
    });
    toast.error("Relationship action failed for this company context.");
  };

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-4 px-3 py-4 sm:px-4">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Company Network</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Relationships</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Manage company relationship lifecycle records. Relationship records do not grant order, client, assignment, or activity visibility.
          </p>
        </div>
        {canInvite.allowed && (
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-950 bg-slate-950 px-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Invite
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <RelationshipTabs scope={scope} onChange={handleScopeChange} />
        <label className="flex items-center gap-2 text-sm">
          <span className="font-medium text-slate-500">Status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm"
          >
            {RELATIONSHIP_STATUSES.map((entry) => (
              <option key={entry.key || "any"} value={entry.key}>{entry.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(280px,420px)_1fr]">
        <RelationshipList
          relationships={relationships}
          selectedId={relationshipId}
          scope={scope}
          loading={loading}
          error={error}
          onRetry={loadRelationships}
        />
        <RelationshipDetailPanel
          relationshipId={relationshipId}
          relationship={selectedRelationship}
          direction={direction}
          refreshKey={refreshKey}
          onChanged={handleChanged}
          onError={handleError}
        />
      </div>

      <InviteRelationshipModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={(newRelationshipId) => {
          setInviteOpen(false);
          toast.success("Relationship invitation sent.");
          setRefreshKey((key) => key + 1);
          if (newRelationshipId) navigate(`/relationships/${newRelationshipId}`);
        }}
      />
    </main>
  );
}
