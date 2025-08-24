import React from "react";
import { toast } from "react-hot-toast";
import { useOrders } from "@/lib/hooks/useOrders";
import { updateOrderStatus } from "@/lib/services/ordersService";
import { Link } from "react-router-dom";

const IN_QUEUE = new Set(["in_review", "ready_to_send", "revisions"]);

export default function ReviewerDashboard() {
  const { data: orders, loading, error, refetch } = useOrders();
  const queue = (orders || []).filter((o) => IN_QUEUE.has((o.status || "").toLowerCase()));

  async function setStatus(id, next) {
    try {
      await updateOrderStatus(id, next);
      toast.success(`Status → ${next.replaceAll("_", " ")}`);
      refetch();
    } catch (e) {
      console.error(e);
      toast.error("Failed to update");
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
              <tr><td className="px-3 py-4 text-gray-500" colSpan={7}>Nothing in the review queue.</td></tr>
            ) : null}

            {queue.map((o) => (
              <tr key={o.id} className="align-middle">
                <td className="px-3 py-2">{o.order_number ?? o.id.slice(0,8)}</td>
                <td className="px-3 py-2">{o.client?.name ?? o.client_name ?? o.manual_client ?? "—"}</td>
                <td className="px-3 py-2">{o.property_address || o.address || "—"}</td>
                <td className="px-3 py-2">{o.appraiser?.display_name || o.appraiser_name || "—"}</td>
                <td className="px-3 py-2">{(o.status || "new").replaceAll("_"," ")}</td>
                <td className="px-3 py-2">
                  {o.review_due_at ? new Date(o.review_due_at).toLocaleString() : "—"}
                </td>
                <td className="px-3 py-2 space-x-2">
                  <Link className="text-blue-600 hover:underline text-sm" to={`/orders/${o.id}`}>Details</Link>
                  <button className="text-sm rounded border px-2 py-1" onClick={() => setStatus(o.id, "ready_to_send")}>Approve</button>
                  <button className="text-sm rounded border px-2 py-1" onClick={() => setStatus(o.id, "revisions")}>Request Changes</button>
                </td>
              </tr>
            ))}

            {loading ? (
              <tr><td className="px-3 py-4 text-gray-500" colSpan={7}>Loading…</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}



