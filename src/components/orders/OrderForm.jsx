import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "@/lib/supabaseClient";
import useOrderForm from "@/lib/hooks/useOrderForm";
import { toast } from "react-hot-toast";
import { setReviewRoute } from "@/lib/services/ordersService";
import { useSession } from "@/lib/hooks/useSession";

export default function OrderForm({ initialOrder, mode = "create" }) {
  const navigate = useNavigate();
  const { user } = useSession();
  const role = String(user?.role || "").toLowerCase();
  const isAdminOrMike =
    role === "admin" || role === "owner" || role === "manager" || (user?.email || "").toLowerCase().includes("mike");

  const { order, handleChange, saveOrder, saving } = useOrderForm(initialOrder);
  const [users, setUsers] = useState([]);
  const [appraisers, setAppraisers] = useState([]);
  const [clients, setClients] = useState([]);

  // Review settings
  const [requireReview, setRequireReview] = useState(true); // default to true
  const [rev1, setRev1] = useState(""); // step 1 reviewer id (Pam default)
  const [rev2, setRev2] = useState(""); // step 2 reviewer id (Mike default)

  // Load select options
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [{ data: usersData }, { data: clis }] = await Promise.all([
        supabase.from("users").select("id, display_name, name, email, role").order("display_name", { ascending: true }),
        supabase.from("clients").select("id, name").order("name", { ascending: true }),
      ]);

      if (cancelled) return;
      const listUsers = usersData || [];
      setUsers(listUsers);
      setAppraisers(listUsers.filter((u) => String(u.role || "").toLowerCase() === "appraiser"));
      setClients(clis || []);

      // Defaults for reviewers (Pam/Mike if present)
      const pam = listUsers.find((u) => /^pam/i.test(u.display_name || u.name || ""));
      const mike = listUsers.find((u) => /^mike/i.test(u.display_name || u.name || ""));
      if (pam && !rev1) setRev1(pam.id);
      if (mike && !rev2) setRev2(mike.id);
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
      // 1) Save the basic order
      const saved = await saveOrder(); // (existing hook) — logs via rpc_log_event

      // 2) If review is required and admin/mike configured reviewers, save route JSON
      if (isAdminOrMike && requireReview) {
        const steps = [];
        if (rev1) steps.push({ reviewer_id: rev1, position: 1, required: true, fallback_ids: [] });
        if (rev2) steps.push({ reviewer_id: rev2, position: 2, required: true, fallback_ids: [] });
        if (steps.length) {
          await setReviewRoute(saved.id, { policy: "sequential", steps, template: "Order Setup" });
        }
      }

      toast.success(mode === "create" ? "Order created" : "Order saved");
      navigate("/orders");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save order");
    }
  };

  const renderUserOptionLabel = (u) => u.display_name || u.name || u.email;

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
                handleChange("site_visit_at", e.target.value ? new Date(e.target.value).toISOString() : null)
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
                handleChange("review_due_at", e.target.value ? new Date(e.target.value).toISOString() : null)
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
                handleChange("final_due_at", e.target.value ? new Date(e.target.value).toISOString() : null)
              }
            />
          </div>
        </div>
      </section>

      {/* Review settings (Admin/Mike) */}
      {isAdminOrMike && (
        <section className="bg-white rounded-2xl shadow p-4">
          <h2 className="text-lg font-semibold mb-2">Review Settings</h2>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={requireReview} onChange={(e) => setRequireReview(e.target.checked)} />
            Require review for this order
          </label>

          {requireReview && (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Level 1 Reviewer</label>
                <select
                  className="mt-1 w-full border rounded-md px-3 py-2"
                  value={rev1}
                  onChange={(e) => setRev1(e.target.value)}
                >
                  <option value="">— Select —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {renderUserOptionLabel(u)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Typically Pam (or Kady if Pam is OOO)</p>
              </div>
              <div>
                <label className="text-sm font-medium">Level 2 Reviewer</label>
                <select
                  className="mt-1 w-full border rounded-md px-3 py-2"
                  value={rev2}
                  onChange={(e) => setRev2(e.target.value)}
                >
                  <option value="">— Select —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {renderUserOptionLabel(u)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Typically Mike (or Abby)</p>
              </div>
            </div>
          )}
        </section>
      )}

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















