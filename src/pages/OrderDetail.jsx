import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useSession } from "@/lib/hooks/useSession";
import supabase from "@/lib/supabaseClient";

import OrderActivityPanel from "@/components/orders/OrderActivityPanel";
import ReviewModal from "@/components/review/ReviewModal";

import {
  updateOrderStatus,
  updateOrderDates,
  fetchOrderById,
  setReviewRoute,
  assignNextReviewer,
  reassignReview,
  approveReview,
  requestChanges,
} from "@/lib/services/ordersService";

import {
  fromLocalInputValue,
  toLocalInputValue,
} from "@/lib/utils/formatDate";

const STATUSES = [
  "new","assigned","in_progress","site_visit_done","in_review",
  "ready_to_send","sent_to_client","revisions","complete",
];

function dtToLocalInput(iso) {
  return toLocalInputValue(iso);
}

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSession();
  const role = String(user?.role || "").toLowerCase();
  const isAdminOrMike = role === "admin" || role === "owner" || role === "manager" ||
    (user?.email || "").toLowerCase().includes("mike");

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Quick-Action helpers
  const [modalOpen, setModalOpen] = useState(false);

  // Cache common reviewer IDs by display name prefix
  const [reviewerIds, setReviewerIds] = useState({ pam: null, mike: null, abby: null, kady: null });

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchOrderById(id);
      setOrder(data || null);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  // Prefetch IDs for Quick Actions (Pam, Mike, Abby, Kady)
  useEffect(() => {
    if (!isAdminOrMike) return;
    (async () => {
      const wanted = [
        { key: "pam", q: "pam" },
        { key: "mike", q: "mike" },
        { key: "abby", q: "abby" },
        { key: "kady", q: "kady" },
      ];
      const next = { pam: null, mike: null, abby: null, kady: null };
      for (const w of wanted) {
        const { data, error } = await supabase
          .from("users")
          .select("id, display_name, name, email")
          .ilike("display_name", `${w.q}%`)
          .order("display_name", { ascending: true })
          .limit(1);
        if (!error && data?.length) next[w.key] = data[0].id;
      }
      setReviewerIds(next);
    })();
  }, [isAdminOrMike]);

  // --- Save handlers --------------------------------------------------------

  async function saveDates(patch) {
    setSaving(true);
    try {
      await updateOrderDates(id, {
        siteVisit: patch.site_visit_at ?? null,
        reviewDue: patch.review_due_at ?? null,
        finalDue: patch.final_due_at ?? null,
      });
      toast.success("Saved");
      fetchOrder();
    } catch (e) {
      console.error(e);
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onStatusChange(next) {
    if (!next || next === order?.status) return;
    try {
      setSaving(true);
      await updateOrderStatus(id, next);
      toast.success(`Status → ${next.replaceAll("_", " ")}`);
      fetchOrder();
    } catch (e) {
      console.error(e);
      toast.error("Failed to update status");
    } finally {
      setSaving(false);
    }
  }

  // --- Quick Actions (Admin/Mike only) -------------------------------------

  // Send directly to a specific reviewer
  async function sendTo(reviewerId, label) {
    if (!isAdminOrMike) return;
    if (!reviewerId) {
      toast.error(`No user found for ${label}`);
      return;
    }
    try {
      setSaving(true);
      // Ensure status is in_review
      if ((order?.status || "").toLowerCase() !== "in_review") {
        await updateOrderStatus(id, "in_review");
      }
      await reassignReview(id, reviewerId, `send to ${label}`);
      toast.success(`Sent to ${label}`);
      fetchOrder();
    } catch (e) {
      console.error(e);
      toast.error(`Failed to send to ${label}`);
    } finally {
      setSaving(false);
    }
  }

  // Default route builder if none exists (Pam -> Mike with fallbacks)
  const buildDefaultRoute = useCallback(() => {
    const steps = [];
    if (reviewerIds.pam) steps.push({ reviewer_id: reviewerIds.pam, position: 1, required: true, fallback_ids: reviewerIds.kady ? [reviewerIds.kady] : [] });
    if (reviewerIds.mike) steps.push({ reviewer_id: reviewerIds.mike, position: 2, required: true, fallback_ids: reviewerIds.abby ? [reviewerIds.abby] : [] });
    return { policy: "sequential", steps, template: "Falcon Default" };
  }, [reviewerIds]);

  async function skipPam() {
    if (!isAdminOrMike) return;
    try {
      setSaving(true);
      const route = order?.review_route && order.review_route.steps?.length ? order.review_route : buildDefaultRoute();
      const pamId = reviewerIds.pam;
      const nextRoute = {
        ...route,
        steps: (route.steps || []).filter((s) => s.reviewer_id !== pamId).map((s, i) => ({ ...s, position: i + 1 })),
        template: "Skip Pam",
      };
      await setReviewRoute(id, nextRoute);
      await assignNextReviewer(id);
      toast.success("Skipped Pam for this order");
      fetchOrder();
    } catch (e) {
      console.error(e);
      toast.error("Could not skip Pam");
    } finally {
      setSaving(false);
    }
  }

  async function skipMike() {
    if (!isAdminOrMike) return;
    try {
      setSaving(true);
      const route = order?.review_route && order.review_route.steps?.length ? order.review_route : buildDefaultRoute();
      const mikeId = reviewerIds.mike;
      const nextRoute = {
        ...route,
        steps: (route.steps || []).filter((s) => s.reviewer_id !== mikeId).map((s, i) => ({ ...s, position: i + 1 })),
        template: "Skip Mike (finalize after first reviewer)",
      };
      await setReviewRoute(id, nextRoute);
      await assignNextReviewer(id);
      toast.success("Skipped Mike for this order");
      fetchOrder();
    } catch (e) {
      console.error(e);
      toast.error("Could not skip Mike");
    } finally {
      setSaving(false);
    }
  }

  async function approveAndFinalize() {
    if (!isAdminOrMike) return;
    try {
      setSaving(true);
      await updateOrderStatus(id, "ready_to_send");
      toast.success("Final approved → ready to send");
      fetchOrder();
    } catch (e) {
      console.error(e);
      toast.error("Failed to finalize");
    } finally {
      setSaving(false);
    }
  }

  // Reviewer-only helpers (optional shortcuts)
  async function reviewerApprove() {
    try {
      setSaving(true);
      await approveReview(id);
      fetchOrder();
    } catch (e) {
      console.error(e);
      toast.error("Approve failed");
    } finally {
      setSaving(false);
    }
  }
  async function reviewerRequestChanges() {
    try {
      const msg = prompt("Brief reason for requested changes:");
      setSaving(true);
      await requestChanges(id, msg || "changes requested");
      fetchOrder();
    } catch (e) {
      console.error(e);
      toast.error("Request failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6">Loading…</div>;
  if (!order) return <div className="p-6">Order not found.</div>;

  const canReviewerAct = order.current_reviewer_id && order.current_reviewer_id === user?.id;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Order {order.order_number ?? id.slice(0, 8)}</h1>
          <div className="text-sm text-gray-500">{order.client?.name ?? order.manual_client ?? "—"}</div>
        </div>
        <button className="px-3 py-2 rounded-lg border" onClick={() => navigate(-1)}>Back</button>
      </div>

      {/* Quick Actions (Admin/Mike only) */}
      {isAdminOrMike && (
        <section className="bg-white rounded-2xl shadow p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Review Routing</h2>
            <div className="text-xs text-gray-500">
              Route: {order.review_route?.template || "Pam → Mike (Default)"}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="px-3 py-1.5 rounded border" onClick={() => setModalOpen(true)} disabled={saving}>
              Edit Route…
            </button>

            <span className="mx-2 text-gray-300">|</span>

            <button className="px-3 py-1.5 rounded border" onClick={() => sendTo(reviewerIds.pam, "Pam")} disabled={saving}>
              Send to Pam
            </button>
            <button className="px-3 py-1.5 rounded border" onClick={() => sendTo(reviewerIds.mike, "Mike")} disabled={saving}>
              Send to Mike
            </button>
            <button className="px-3 py-1.5 rounded border" onClick={() => sendTo(reviewerIds.abby, "Abby")} disabled={saving}>
              Send to Abby
            </button>
            <button className="px-3 py-1.5 rounded border" onClick={() => sendTo(reviewerIds.kady, "Kady")} disabled={saving}>
              Send to Kady
            </button>

            <span className="mx-2 text-gray-300">|</span>

            <button className="px-3 py-1.5 rounded border" onClick={skipPam} disabled={saving}>
              Skip Pam (this order)
            </button>
            <button className="px-3 py-1.5 rounded border" onClick={skipMike} disabled={saving}>
              Skip Mike (finalize after first reviewer)
            </button>

            <span className="mx-2 text-gray-300">|</span>

            <button className="px-3 py-1.5 rounded border bg-black text-white" onClick={approveAndFinalize} disabled={saving}>
              Approve & Finalize
            </button>
          </div>
        </section>
      )}

      {/* Summary */}
      <section className="bg-white rounded-2xl shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-gray-500 mb-1">Status</div>
            <select
              className="border rounded-md px-2 py-2 text-sm w-full"
              value={order.status || "new"}
              onChange={(e) => onStatusChange(e.target.value)}
              disabled={saving}
            >
              {STATUSES.map((s) => <option key={s} value={s}>{s.replaceAll("_"," ")}</option>)}
            </select>
          </div>

          <div className="md:col-span-3">
            <div className="text-xs text-gray-500 mb-1">Address</div>
            <div className="text-sm">
              {order.property_address || order.address || "—"}
              {order.city ? `, ${order.city}` : ""} {order.state || ""} {order.postal_code || ""}
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">Appraiser</div>
            <div className="text-sm">{order.appraiser?.display_name || order.appraiser?.name || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Client</div>
            <div className="text-sm">{order.client?.name || order.manual_client || "—"}</div>
          </div>
        </div>
      </section>

      {/* Dates */}
      <section className="bg-white rounded-2xl shadow p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Dates</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-gray-500 mb-1">Site Visit</div>
            <input
              type="datetime-local"
              className="w-full border rounded-md px-2 py-2 text-sm"
              defaultValue={dtToLocalInput(order.site_visit_at)}
              onBlur={(e) => saveDates({ site_visit_at: fromLocalInputValue(e.target.value) })}
              disabled={saving}
            />
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Review Due</div>
            <input
              type="datetime-local"
              className="w-full border rounded-md px-2 py-2 text-sm"
              defaultValue={dtToLocalInput(order.review_due_at)}
              onBlur={(e) => saveDates({ review_due_at: fromLocalInputValue(e.target.value) })}
              disabled={saving}
            />
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Final Due</div>
            <input
              type="datetime-local"
              className="w-full border rounded-md px-2 py-2 text-sm"
              defaultValue={dtToLocalInput(order.final_due_at)}
              onBlur={(e) => saveDates({ final_due_at: fromLocalInputValue(e.target.value) })}
              disabled={saving}
            />
          </div>
        </div>
      </section>

      {/* Reviewer shortcuts (for assigned reviewer) */}
      {canReviewerAct && (
        <section className="bg-white rounded-2xl shadow p-4">
          <h2 className="text-lg font-semibold mb-2">My Review Actions</h2>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 rounded border" onClick={reviewerApprove} disabled={saving}>
              Approve (advance)
            </button>
            <button className="px-3 py-1.5 rounded border" onClick={reviewerRequestChanges} disabled={saving}>
              Request Changes
            </button>
          </div>
        </section>
      )}

      {/* Activity */}
      <section className="bg-white rounded-2xl shadow p-4">
        <h2 className="text-lg font-semibold mb-3">Activity</h2>
        <OrderActivityPanel orderId={id} />
      </section>

      {/* Route editor modal (Admin/Mike only) */}
      {isAdminOrMike && (
        <ReviewModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          orderId={id}
          initial={Array.isArray(order?.review_route?.steps) ? order.review_route.steps.map(s => ({
            reviewer_id: s.reviewer_id,
            name: "",
            position: s.position,
            required: s.required !== false,
          })) : []}
        />
      )}
    </div>
  );
}











