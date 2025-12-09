// src/components/clients/ClientDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import supabase from "@/lib/supabaseClient";
import ClientForm from "@/components/clients/ClientForm";
import { updateClient } from "@/lib/services/clientsService";

/* ============================== helpers ============================== */

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "—");

const money0 = (n) =>
  typeof n === "number"
    ? n.toLocaleString(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      })
    : "—";

const statusChipClasses = (status) => {
  const s = (status || "").toUpperCase();
  if (s === "ACTIVE")
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s === "INACTIVE" || s === "INACTIVE CLIENT")
    return "bg-gray-50 text-gray-600 border-gray-200";
  if (s === "ON HOLD")
    return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
};

/* ============================== main ============================== */

export default function ClientDetail() {
  const { clientId } = useParams();
  const nav = useNavigate();

  const numericId = Number(clientId);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [client, setClient] = useState(null);
  const [amc, setAmc] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [orders, setOrders] = useState([]);

  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!clientId || Number.isNaN(numericId)) {
      setErr("Invalid client id");
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        // 1) load client, KPIs, and orders in parallel
        const clientPromise = supabase
          .from("clients")
          .select("*")
          .eq("id", numericId)
          .single();

        const kpiPromise = supabase
          .from("v_client_kpis")
          .select("*")
          .eq("client_id", numericId)
          .maybeSingle();

        const ordersPromise = supabase
          .from("v_orders_frontend_v3")
          .select(
            "id, order_number, status, address, city, state, zip, fee_amount, created_at, review_due_at, final_due_at, due_date"
          )
          .eq("client_id", numericId)
          .order("created_at", { ascending: false })
          .limit(100);

        const [
          { data: clientRow, error: clientErr },
          { data: kpiRow, error: kpiErr },
          { data: orderRows, error: ordersErr },
        ] = await Promise.all([clientPromise, kpiPromise, ordersPromise]);

        if (clientErr) throw clientErr;
        if (kpiErr) throw kpiErr;
        if (ordersErr) throw ordersErr;

        if (cancelled) return;

        if (!clientRow) {
          setClient(null);
          setErr("Client not found");
          setLoading(false);
          return;
        }

        setClient(clientRow);
        setKpis(kpiRow || null);
        setOrders(orderRows || []);

        // 2) If this client is tied to an AMC, load that AMC
        const category =
          (clientRow.category ||
            clientRow.client_type ||
            clientRow.type ||
            "client"
          ).toLowerCase();

        if (category !== "amc" && clientRow.amc_id) {
          try {
            const { data: amcRow, error: amcErr } = await supabase
              .from("clients")
              .select("id, name, category")
              .eq("id", clientRow.amc_id)
              .single();
            if (!amcErr) setAmc(amcRow || null);
          } catch {
            /* non-blocking */
          }
        } else {
          setAmc(null);
        }
      } catch (e) {
        console.error("Failed to load client detail", e);
        if (!cancelled)
          setErr(e?.message || "Failed to load client details");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clientId, numericId]);

  const stats = useMemo(() => {
    if (!orders || orders.length === 0) {
      return {
        totalOrders: kpis?.total_orders ?? 0,
        activeOrders: 0,
        completedOrders: 0,
        totalFees: 0,
        lastOrderDate: kpis?.last_order_date || null,
        avgFee: kpis?.avg_total_fee ?? null,
      };
    }

    let totalFees = 0;
    let completed = 0;
    let lastDate = null;

    for (const o of orders) {
      const fee = Number(o.fee_amount ?? 0);
      if (!Number.isNaN(fee)) totalFees += fee;
      if ((o.status || "").toUpperCase() === "COMPLETE") completed += 1;

      const candidate =
        o.final_due_at ||
        o.due_date ||
        o.review_due_at ||
        o.created_at ||
        null;
      if (candidate) {
        const ts = new Date(candidate).getTime();
        if (!lastDate || ts > lastDate) lastDate = ts;
      }
    }

    const totalOrders = orders.length;
    const activeOrders = totalOrders - completed;
    const avgFee =
      totalOrders > 0 ? Math.round(totalFees / totalOrders) : null;

    return {
      totalOrders,
      activeOrders,
      completedOrders: completed,
      totalFees,
      lastOrderDate: lastDate ? new Date(lastDate).toISOString() : null,
      avgFee,
    };
  }, [orders, kpis]);

  async function handleUpdateClient(patch) {
    if (!client) return;
    try {
      const row = await updateClient(client.id, patch);
      setClient(row);
      setEditing(false);
      toast.success("Client updated");
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "Failed to update client");
    }
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="text-sm text-gray-600">Loading client…</div>
      </div>
    );
  }

  if (err && !client) {
    return (
      <div className="p-4 md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Client</h1>
          <Link
            to="/clients"
            className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Back to clients
          </Link>
        </div>
        <div className="text-sm text-rose-600">{err}</div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-4 md:p-6">
        <div className="text-sm text-gray-600">Client not found.</div>
      </div>
    );
  }

  const category =
    client.category || client.client_type || client.type || "client";
  const statusLabel = (client.status || "ACTIVE").toUpperCase();

  const activeOrders = stats.activeOrders ?? 0;
  const completedOrders = stats.completedOrders ?? 0;
  const anyOrders = orders && orders.length > 0;

  const activeList = (orders || []).filter(
    (o) => (o.status || "").toUpperCase() !== "COMPLETE"
  );
  const completedList = (orders || []).filter(
    (o) => (o.status || "").toUpperCase() === "COMPLETE"
  );

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-xl font-semibold text-gray-900">
              {client.name || "Untitled client"}
            </h1>
            <span
              className={
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium " +
                statusChipClasses(statusLabel)
              }
            >
              {statusLabel}
            </span>
          </div>

          <div className="mt-1 text-xs text-gray-500 flex flex-wrap items-center gap-2">
            <span className="capitalize">{category}</span>
            {amc && (
              <>
                <span>•</span>
                <span>
                  Under AMC:{" "}
                  <Link
                    to={`/clients/${amc.id}`}
                    className="text-blue-600 underline-offset-2 hover:underline"
                  >
                    {amc.name}
                  </Link>
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            {editing ? "Cancel" : "Edit Client"}
          </button>
          <button
            type="button"
            onClick={() => nav("/clients")}
            className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Back to Clients
          </button>
        </div>
      </div>

      {/* Content grid */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)]">
        {/* Left column: details + orders */}
        <div className="space-y-4">
          {/* Client details / edit form */}
          <div className="rounded-xl border bg-white p-4">
            {editing ? (
              <ClientForm
                initial={client}
                onSubmit={handleUpdateClient}
                submitLabel="Save Changes"
              />
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-gray-500">
                    Primary Contact
                  </span>
                  <span className="text-gray-900">
                    {client.primary_contact_name ||
                      client.contact_name_1 ||
                      "—"}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-gray-500">
                    Primary Phone
                  </span>
                  <span className="text-gray-900">
                    {client.primary_contact_phone ||
                      client.contact_phone_1 ||
                      "—"}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-gray-500">
                    Email
                  </span>
                  <span className="text-gray-900">
                    {client.email || client.contact_email || "—"}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-gray-500">
                    Notes
                  </span>
                  <span className="text-gray-900">
                    {client.notes || client.internal_notes || "—"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Orders list */}
          <div className="rounded-xl border bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">
                Orders
              </h2>
              {anyOrders && (
                <span className="text-xs text-gray-500">
                  {stats.totalOrders} total • {activeOrders} active •{" "}
                  {completedOrders} completed
                </span>
              )}
            </div>

            {!anyOrders ? (
              <div className="text-sm text-gray-600">
                No orders yet for this client.
              </div>
            ) : (
              <div className="space-y-4">
                {activeList.length > 0 && (
                  <div>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      Active
                    </div>
                    <OrdersTable rows={activeList} />
                  </div>
                )}

                {completedList.length > 0 && (
                  <div>
                    <div className="mb-1 mt-3 text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Completed
                    </div>
                    <OrdersTable rows={completedList} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right column: KPIs */}
        <div className="space-y-4">
          <div className="rounded-xl border bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">
              Client KPIs
            </h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-gray-500">Total Orders</div>
                <div className="mt-1 text-lg font-semibold text-gray-900">
                  {stats.totalOrders}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-gray-500">Active Orders</div>
                <div className="mt-1 text-lg font-semibold text-gray-900">
                  {activeOrders}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-gray-500">Completed</div>
                <div className="mt-1 text-lg font-semibold text-gray-900">
                  {completedOrders}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-gray-500">Avg Fee</div>
                <div className="mt-1 text-lg font-semibold text-gray-900">
                  {money0(stats.avgFee ?? kpis?.avg_total_fee ?? null)}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-gray-500">Total Fees</div>
                <div className="mt-1 text-lg font-semibold text-gray-900">
                  {money0(stats.totalFees)}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-gray-500">Last Order</div>
                <div className="mt-1 text-lg font-semibold text-gray-900">
                  {fmtDate(
                    stats.lastOrderDate || kpis?.last_order_date || null
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Placeholder for future stuff */}
          <div className="rounded-xl border bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold text-gray-900">
              Relationship Notes
            </h2>
            <p className="text-xs text-gray-500">
              In the future we can use this space for things like average
              turn-time, preferred products, special instructions, or
              profitability by year.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================== subcomponents ============================== */

function OrdersTable({ rows }) {
  if (!rows || rows.length === 0) return null;

  return (
    <div className="-mx-3 overflow-x-auto">
      <table className="min-w-full border-collapse text-xs">
        <thead>
          <tr className="border-b bg-slate-50 text-[11px] uppercase tracking-wide text-gray-500">
            <th className="px-3 py-2 text-left">Order #</th>
            <th className="px-3 py-2 text-left">Property</th>
            <th className="px-3 py-2 text-left">Status</th>
            <th className="px-3 py-2 text-left">Due</th>
            <th className="px-3 py-2 text-right">Fee</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => {
            const due =
              o.final_due_at || o.due_date || o.review_due_at || o.created_at;
            return (
              <tr
                key={o.id}
                className="border-b last:border-0 hover:bg-slate-50/70"
              >
                <td className="px-3 py-1.5 font-mono text-[11px]">
                  {o.order_number || "—"}
                </td>
                <td className="px-3 py-1.5">
                  <div className="line-clamp-2 max-w-xs text-[11px] text-gray-800">
                    {o.address
                      ? `${o.address}, ${o.city || ""} ${o.state || ""}`
                      : "—"}
                  </div>
                </td>
                <td className="px-3 py-1.5 text-[11px]">
                  {(o.status || "").toUpperCase()}
                </td>
                <td className="px-3 py-1.5 text-[11px]">
                  {fmtDate(due)}
                </td>
                <td className="px-3 py-1.5 text-right text-[11px]">
                  {money0(o.fee_amount ?? 0)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}


