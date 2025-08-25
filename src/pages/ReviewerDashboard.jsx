import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useOrders } from "@/lib/hooks/useOrders";
import {
  claimReview,
  approveReview,
  requestChanges,
  reassignReview,
  assignNextReviewer,
} from "@/lib/services/ordersService";
import { Link } from "react-router-dom";
import { useSession } from "@/lib/hooks/useSession";
import ReviewModal from "@/components/review/ReviewModal";
import supabase from "@/lib/supabaseClient";

const IN_QUEUE = new Set(["in_review", "ready_to_send", "revisions"]);

export default function ReviewerDashboard() {
  const { data: orders, loading, error, refetch } = useOrders();
  const { user } = useSession();
  const uid = user?.id || null;
  const role = String(user?.role || "").toLowerCase();
  const isAdminOrMike =
    role === "admin" || role === "owner" || role === "manager" || (user?.email || "").toLowerCase().includes("mike");

  // Prefetch IDs for Admin quick actions (Pam/Mike/Abby/Kady)
  const [ids, setIds] = useState({ pam: null, mike: null, abby: null, kady: null });
  useEffect(() => {
    if (!isAdminOrMike) return;
    (async () => {
      async function lookup(prefix) {
        const { data, error } = await supabase
          .from("users")
          .select("id, display_name, name, email")
          .ilike("display_name", `${prefix}%`)
          .order("display_name", { ascending: true })
          .limit(1);
        return !error && data?.length ? data[0].id : null;
      }
      const [pam, mike, abby, kady] = await Promise.all([lookup("pam"), lookup("mike"), lookup("abby"), lookup("kady")]);
      setIds({ pam, mike, abby, kady });
    })();
  }, [isAdminOrMike]);

  const queue = useMemo(
    () => (orders || []).filter((o) => IN_QUEUE.has(String(o.status || "").toLowerCase())),
    [orders]
  );

  // Modal state per row (open a single modal for whichever orderId)
  const [modalOrderId, setModalOrderId] = useState(null);
  const closeModal = () => setModalOrderId(null);

  // Reviewer actions
  async function doClaim(id) {
    try {
      await claimReview(id);
      toast.success("Claimed");
      refetch();
    } catch (e) {
      console.error(e);
      toast.error("Failed to claim");
    }
  }

  async function doApprove(id) {
    try {
      await approveReview(id);
      toast.success("Approved");
      refetch();
    } catch (e) {
      console.error(e);
      toast.error("Failed to approve");
    }
  }

  async function doRequestChanges(id) {
    try {
      const msg = prompt("Briefly describe the requested changes:");
      await requestChanges(id, msg || "changes requested");
      toast.success("Changes requested");
      refetch();
    } catch (e) {
      console.error(e);
      toast.error("Failed to request changes");
    }
  }

  // Admin/Mike quick routing
  async function sendTo(orderId, targetId, label) {
    if (!isAdminOrMike) return;
    if (!targetId) {
      toast.error(`No user found for ${label}`);
      return;
    }
    try {
      await reassignReview(orderId, targetId, `send to ${label}`);
      toast.success(`Sent to ${label}`);
      refetch();
    } catch (e) {
      console.error(e);
      toast.error(`Failed to send to ${label}`);
    }
  }

  async function assignNext(orderId) {
    try {
      await assignNextReviewer(orderId);
      toast.success("Assigned next reviewer");
      refetch();
    } catch (e) {
      console.error(e);
      toast.error("Failed to assign next reviewer");
    }
  }

  if (error) return <div className="p-6 text-red-600">Error: {error.message}</div>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-xl font-semibold mb-4">Reviewer Queue</h1>
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Order #</th>
              <th className="px-3 py-2 text-left">Client</th>
              <th className="px-3 py-2 text-left">Address</th>
              <th className="px-3 py-2 text-left">Appraiser</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Review Due</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {!loading && queue.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-gray-500" colSpan={7}>
                  Nothing in the review queue.
                </td>
              </tr>
            ) : null}

            {queue.map((o) => {
              const current = (o.current_reviewer_id || "").toString();
              const canClaim = !current || current === uid;
              const canActReviewer = current === uid;
              const canActAdmin = isAdminOrMike;

              return (
                <tr key={o.id} className="align-middle">
                  <td className="px-3 py-2">{o.order_number ?? o.id.slice(0, 8)}</td>
                  <td className="px-3 py-2">{o.client?.name ?? o.client_name ?? o.manual_client ?? "—"}</td>
                  <td className="px-3 py-2">
                    {o.property_address || o.address || "—"}
                    {o.city ? `, ${o.city}` : ""} {o.state || ""} {o.postal_code || ""}
                  </td>
                  <td className="px-3 py-2">{o.appraiser?.display_name || o.appraiser_name || "—"}</td>
                  <td className="px-3 py-2">{(o.status || "in_review").replaceAll("_", " ")}</td>
                  <td className="px-3 py-2">{o.review_due_at ? new Date(o.review_due_at).toLocaleString() : "—"}</td>

                  <td className="px-3 py-2">
                    {/* Common link */}
                    <Link className="text-blue-600 hover:underline text-sm mr-2" to={`/orders/${o.id}`}>
                      Details
                    </Link>

                    {/* Reviewer actions */}
                    {canClaim && (
                      <button className="text-sm rounded border px-2 py-1 mr-1" onClick={() => doClaim(o.id)}>
                        Claim
                      </button>
                    )}
                    {canActReviewer && (
                      <>
                        <button className="text-sm rounded border px-2 py-1 mr-1" onClick={() => doApprove(o.id)}>
                          Approve
                        </button>
                        <button className="text-sm rounded border px-2 py-1 mr-1" onClick={() => doRequestChanges(o.id)}>
                          Request Changes
                        </button>
                      </>
                    )}

                    {/* Admin/Mike quick actions */}
                    {canActAdmin && (
                      <div className="mt-2 flex flex-wrap gap-1 text-xs">
                        <span className="text-gray-400 pr-1">Admin:</span>
                        <button className="rounded border px-2 py-0.5" onClick={() => setModalOpenFor(o.id, setModalOrderId)}>
                          Edit Route…
                        </button>
                        <button className="rounded border px-2 py-0.5" onClick={() => sendTo(o.id, ids.pam, "Pam")}>
                          → Pam
                        </button>
                        <button className="rounded border px-2 py-0.5" onClick={() => sendTo(o.id, ids.mike, "Mike")}>
                          → Mike
                        </button>
                        <button className="rounded border px-2 py-0.5" onClick={() => sendTo(o.id, ids.abby, "Abby")}>
                          → Abby
                        </button>
                        <button className="rounded border px-2 py-0.5" onClick={() => sendTo(o.id, ids.kady, "Kady")}>
                          → Kady
                        </button>
                        <button className="rounded border px-2 py-0.5" onClick={() => assignNext(o.id)}>
                          Assign Next
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}

            {loading ? (
              <tr>
                <td className="px-3 py-4 text-gray-500" colSpan={7}>
                  Loading…
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Per-row route editor (Admin/Mike only) */}
      {isAdminOrMike && modalOrderId && (
        <ReviewModal
          open={!!modalOrderId}
          onOpenChange={(v) => !v && setModalOrderId(null)}
          orderId={modalOrderId}
          initial={[]}
        />
      )}
    </div>
  );
}

/** Helper to open ReviewModal from inline button */
function setModalOpenFor(orderId, setModalOrderId) {
  setModalOrderId(orderId);
}





