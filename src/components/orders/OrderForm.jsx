import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "@/lib/supabaseClient";
import useOrderForm from "@/lib/hooks/useOrderForm";
import { toast } from "react-hot-toast";

export default function OrderForm({ initialOrder, mode = "create" }) {
  const navigate = useNavigate();
  const { order, handleChange, saveOrder, saving } = useOrderForm(initialOrder);
  const [appraisers, setAppraisers] = useState([]);
  const [clients, setClients] = useState([]);

  // Load select options
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [{ data: users, error: uErr }, { data: clis, error: cErr }] = await Promise.all([
        supabase
          .from("users")
          .select("id, display_name, name, email, role")
          .order("display_name", { ascending: true }),
        supabase.from("clients").select("id, name").order("name", { ascending: true }),
      ]);
      if (uErr) console.error(uErr);
      if (cErr) console.error(cErr);
      if (cancelled) return;
      setAppraisers((users || []).filter((u) => String(u.role || "").toLowerCase() === "appraiser"));
      setClients(clis || []);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const statusOptions = useMemo(
    () => [
      "new",
      "assigned",
      "in_progress",
      "site_visit_done",
      "in_review",
      "ready_to_send",
      "sent_to_client",
      "revisions",
      "complete",
    ],
    []
  );

  const dtToLocalInput = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      const saved = await saveOrder(); // logs via rpc_log_event inside the hook
      toast.success(mode === "create" ? "Order created" : "Order saved");
      navigate("/orders"); // or `/orders/${saved.id}` if you have detail pages
    } catch (err) {
      console.error(err);
      toast.error("Failed to save order");
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Basic Info */}
      <section className="bg-white rounded-2xl shadow p-4">
        <h2 className="text-lg font-semibold mb-4">Basic Info</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium">Order #</label>
            <input
              className="mt-1 w-full border rounded-md px-3 py-2"
              value={order.order_number || ""}
              onChange={(e) => handleChange("order_number", e.target.value)}
              placeholder="2025xxxx"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Status</label>
            <select
              className="mt-1 w-full border rounded-md px-3 py-2"
              value={(order.status || "new").toLowerCase()}
              onChange={(e) => handleChange("status", e.target.value)}
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2" />

          <div className="md:col-span-2">
            <label className="text-sm font-medium">Property Address</label>
            <input
              className="mt-1 w-full border rounded-md px-3 py-2"
              value={order.property_address || order.address || ""}
              onChange={(e) => handleChange("property_address", e.target.value)}
              placeholder="123 Main St..."
            />
          </div>

          <div>
            <label className="text-sm font-medium">City</label>
            <input
              className="mt-1 w-full border rounded-md px-3 py-2"
              value={order.city || ""}
              onChange={(e) => handleChange("city", e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">State</label>
            <input
              className="mt-1 w-full border rounded-md px-3 py-2"
              value={order.state || ""}
              onChange={(e) => handleChange("state", e.target.value)}
              maxLength={2}
            />
          </div>

          <div>
            <label className="text-sm font-medium">ZIP</label>
            <input
              className="mt-1 w-full border rounded-md px-3 py-2"
              value={order.postal_code || ""}
              onChange={(e) => handleChange("postal_code", e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Assignment */}
      <section className="bg-white rounded-2xl shadow p-4">
        <h2 className="text-lg font-semibold mb-4">Assignment</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">Client</label>
            <select
              className="mt-1 w-full border rounded-md px-3 py-2"
              value={order.client_id || ""}
              onChange={(e) => handleChange("client_id", e.target.value || null)}
            >
              <option value="">— Choose client —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Or leave blank and use “Manual Client”.</p>
          </div>

          <div>
            <label className="text-sm font-medium">Manual Client</label>
            <input
              className="mt-1 w-full border rounded-md px-3 py-2"
              value={order.manual_client || ""}
              onChange={(e) => handleChange("manual_client", e.target.value)}
              placeholder="If not in list"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Appraiser</label>
            <select
              className="mt-1 w-full border rounded-md px-3 py-2"
              value={order.appraiser_id || ""}
              onChange={(e) => handleChange("appraiser_id", e.target.value || null)}
            >
              <option value="">— Choose appraiser —</option>
              {appraisers.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.display_name || a.name || a.email}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Dates */}
      <section className="bg-white rounded-2xl shadow p-4">
        <h2 className="text-lg font-semibold mb-4">Dates</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">Site Visit</label>
            <input
              type="datetime-local"
              className="mt-1 w-full border rounded-md px-3 py-2"
              value={dtToLocalInput(order.site_visit_at)}
              onChange={(e) =>
                handleChange(
                  "site_visit_at",
                  e.target.value ? new Date(e.target.value).toISOString() : null
                )
              }
            />
          </div>

          <div>
            <label className="text-sm font-medium">Review Due</label>
            <input
              type="datetime-local"
              className="mt-1 w-full border rounded-md px-3 py-2"
              value={dtToLocalInput(order.review_due_at)}
              onChange={(e) =>
                handleChange(
                  "review_due_at",
                  e.target.value ? new Date(e.target.value).toISOString() : null
                )
              }
            />
          </div>

          <div>
            <label className="text-sm font-medium">Final Due</label>
            <input
              type="datetime-local"
              className="mt-1 w-full border rounded-md px-3 py-2"
              value={dtToLocalInput(order.final_due_at)}
              onChange={(e) =>
                handleChange(
                  "final_due_at",
                  e.target.value ? new Date(e.target.value).toISOString() : null
                )
              }
            />
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          className="px-4 py-2 rounded-lg border"
          onClick={() => navigate(-1)}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-black text-white"
          disabled={saving}
        >
          {mode === "create" ? "Create Order" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}














