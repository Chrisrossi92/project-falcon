// src/components/clients/ClientDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import supabase from "@/lib/supabaseClient";
import ClientForm from "@/components/clients/ClientForm";
import MergeClientsDialog from "@/components/clients/MergeClientsDialog";
import { getClient, listClientOrders, updateClient } from "@/lib/services/clientsService";

/* ============================== helpers ============================== */
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "—");
const money0 = (n) =>
  typeof n === "number"
    ? n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    : "—";

// unify fee fields across views
const pickFee = (row) => {
  for (const k of ["fee_total", "fee_amount", "fee", "total_fee", "client_fee", "report_fee"]) {
    if (typeof row?.[k] === "number") return row[k];
  }
  return null;
};

// unify date fields across views
const pickDate = (row) =>
  row?.date_ordered || row?.created_at || row?.order_date || row?.assigned_at || null;

const prettyCategory = (cat) => {
  const c = (cat || "").trim().toLowerCase();
  if (!c) return "";
  return c === "amc" ? "AMC" : c[0].toUpperCase() + c.slice(1);
};
const prettyWord = (s) => (s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : "");

function Badge({ children, tone = "slate" }) {
  const map = {
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
    blue: "bg-blue-100 text-blue-700 ring-blue-200",
    green: "bg-green-100 text-green-700 ring-green-200",
    amber: "bg-amber-100 text-amber-700 ring-amber-200",
    violet: "bg-violet-100 text-violet-700 ring-violet-200",
    rose: "bg-rose-100 text-rose-700 ring-rose-200",
    zinc: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ring-1 ${map[tone] || map.slate}`}>
      {children}
    </span>
  );
}

function SectionHeader({ title, right }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <div className="flex items-center gap-2">{right}</div>
    </div>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
      {sub ? <div className="text-xs text-gray-500 mt-1">{sub}</div> : null}
    </div>
  );
}

const categoryTone = (cat) => {
  switch ((cat || "").toLowerCase()) {
    case "amc":
      return "violet";
    case "lender":
      return "blue";
    case "client":
      return "green";
    default:
      return "zinc";
  }
};

/* ============================== component ============================== */
export default function ClientDetail() {
  const { id } = useParams();
  const idNum = Number(id);
  const navigate = useNavigate();

  const [client, setClient] = useState(null);
  const [amc, setAmc] = useState(null);       // when current client is tied to an AMC
  const [lenders, setLenders] = useState([]); // when current client IS an AMC
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        // 1) load client
        const c = await getClient(idNum);
        if (cancelled) return;
        setClient(c || null);

        const category = (c?.category || c?.client_type || c?.type || "client").toLowerCase();

        // 2) if this is a lender/client tied to an AMC, load that AMC for the header link
        if (category !== "amc" && c?.amc_id) {
          try {
            const { data, error } = await supabase
              .from("clients")
              .select("id,name,category")
              .eq("id", c.amc_id)
              .single();
            if (!error) setAmc(data || null);
          } catch {
            /* non-blocking */
          }
        } else {
          setAmc(null);
        }

        // 3) load orders (and lenders if AMC)
        if (category === "amc") {
          // 3a) lenders tied to this AMC
          const { data: lenderRows, error: lErr } = await supabase
            .from("clients")
            .select("id,name,category,status")
            .eq("amc_id", idNum)
            .order("name", { ascending: true });
          if (lErr) throw lErr;
          if (cancelled) return;
          setLenders(lenderRows || []);

          // 3b) orders for AMC + all lenders (aggregate)
          const ids = [idNum, ...((lenderRows || []).map((r) => Number(r.id)).filter((n) => Number.isFinite(n)))];

          let odata = [];
          if (ids.length) {
            const { data: ords, error: oErr } = await supabase
              .from("v_orders_frontend")
              .select("*")
              .in("client_id", ids)
              .limit(200);
            if (oErr) throw oErr;

            odata = (ords || [])
              .map((o) => ({ ...o, fee_total: pickFee(o), __when: pickDate(o) }))
              .sort((a, b) => new Date(b.__when || 0) - new Date(a.__when || 0));
          }
          if (cancelled) return;
          setOrders(odata);
        } else {
          // Non-AMC → just this client's orders
          const { rows } = await listClientOrders(idNum, { page: 0, pageSize: 50 });
          if (cancelled) return;
          const normalized = (rows || []).map((o) => ({ ...o, fee_total: pickFee(o) }));
          setOrders(normalized);
        }
      } catch (e) {
        if (!cancelled) setErr(e?.message || "Failed to load client");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [idNum]);

  const totals = useMemo(() => {
    if (!orders?.length) return { count: 0, fees: 0, last: null };
    let fees = 0;
    let last = null;
    for (const o of orders) {
      if (typeof o?.fee_total === "number") fees += o.fee_total;
      const d = pickDate(o);
      if (d && (!last || new Date(d) > new Date(last))) last = d;
    }
    return { count: orders.length, fees, last };
  }, [orders]);

  async function handleUpdate(payload) {
    try {
      // Coerce amc_id to number to match bigint column
      const patch = {
        ...payload,
        amc_id:
          payload?.amc_id == null
            ? null
            : typeof payload.amc_id === "string"
            ? Number(payload.amc_id)
            : payload.amc_id,
      };
      const updated = await updateClient(idNum, patch);
      setClient((c) => ({ ...(c || {}), ...(updated || patch) }));
      toast.success("Client updated");
      setEditing(false);
    } catch (e) {
      toast.error(e?.message || "Update failed");
    }
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="text-sm text-gray-600">Loading client…</div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="p-4">
        <div className="text-sm text-rose-600">Error: {err}</div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-4">
        <div className="text-sm text-gray-600">Client not found.</div>
      </div>
    );
  }

  const category = client.category || client.client_type || client.type || "client";

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-xl font-semibold text-gray-900">{client.name || "Untitled Client"}</h1>
            <Badge tone={categoryTone(category)}>{(category || "").toUpperCase()}</Badge>
            {client.status && <Badge tone="slate">{(client.status || "").toUpperCase()}</Badge>}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {(client.contact_name_1 || client.contact_name || client.primary_contact) ? (
              <span>{client.contact_name_1 || client.contact_name || client.primary_contact}</span>
            ) : (
              <span>—</span>
            )}
            {(client.contact_email_1 || client.contact_email || client.email) ? (
              <>
                <span className="mx-1">•</span>
                <a className="underline" href={`mailto:${client.contact_email_1 || client.contact_email || client.email}`}>
                  {client.contact_email_1 || client.contact_email || client.email}
                </a>
              </>
            ) : null}
            {(client.contact_phone_1 || client.phone) ? (
              <>
                <span className="mx-1">•</span>
                <a className="underline" href={`tel:${client.contact_phone_1 || client.phone}`}>
                  {client.contact_phone_1 || client.phone}
                </a>
              </>
            ) : null}
          </div>
          {/* Managing AMC (only when this row is not an AMC and amc_id is set) */}
          {category.toLowerCase() !== "amc" && client.amc_id && (
            <div className="mt-1 text-xs text-gray-600">
              Managing AMC:{" "}
              <Link className="underline" to={`/clients/${client.amc_id}`}>
                {amc?.name || "Open AMC"}
              </Link>
              {amc?.category && (
                <span className="ml-2 align-middle">
                  <Badge tone={categoryTone(amc.category)}>{amc.category.toUpperCase()}</Badge>
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50" onClick={() => setMergeOpen(true)}>
            Merge
          </button>
          <button className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50" onClick={() => setEditing((e) => !e)}>
            {editing ? "Cancel" : "Edit"}
          </button>
          <button className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50" onClick={() => navigate("/clients")}>
            Back
          </button>
        </div>
      </div>

      {/* Merge dialog */}
      <MergeClientsDialog
        open={mergeOpen}
        sourceClient={client}
        onClose={(res) => {
          setMergeOpen(false);
          if (res?.mergedIntoId) navigate(`/clients/${res.mergedIntoId}`);
        }}
      />

      {/* Edit form */}
      {editing && (
        <div className="mb-6 rounded-xl border bg-white p-4">
          <ClientForm initial={client} submitLabel="Save Changes" onSubmit={handleUpdate} />
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-6">
        <StatCard label="Total Orders" value={totals.count} />
        <StatCard label="Total Fees" value={money0(totals.fees)} />
        <StatCard label="Last Activity" value={fmtDate(totals.last)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Details (+ Lenders list if AMC) */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-xl border bg-white p-4">
            <SectionHeader title="Details" />
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Name</dt>
                <dd className="text-gray-800">{client.name || "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Category</dt>
                <dd className="text-gray-800">{prettyCategory(category) || "—"}</dd>
              </div>
              {(category.toLowerCase() !== "amc" && client.amc_id) ? (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Managing AMC</dt>
                  <dd className="text-gray-800">
                    <Link className="underline" to={`/clients/${client.amc_id}`}>
                      {amc?.name || "Open AMC"}
                    </Link>
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt className="text-gray-500">Primary Contact</dt>
                <dd className="text-gray-800">
                  {client.contact_name_1 || client.contact_name || client.primary_contact || "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Email</dt>
                <dd className="text-gray-800">
                  {client.contact_email_1 || client.contact_email || client.email || "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Phone</dt>
                <dd className="text-gray-800">{client.contact_phone_1 || client.phone || "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Status</dt>
                <dd className="text-gray-800">{prettyWord(client.status) || "—"}</dd>
              </div>
              {client.notes ? (
                <div>
                  <dt className="text-gray-500 mb-1">Notes</dt>
                  <dd className="text-gray-800 whitespace-pre-wrap">{client.notes}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          {/* When AMC, show managed lenders */}
          {String(category).toLowerCase() === "amc" && (
            <div className="rounded-xl border bg-white p-4">
              <SectionHeader title={`Managed Lenders (${lenders.length})`} />
              <div className="mt-3">
                {lenders.length ? (
                  <ul className="divide-y">
                    {lenders.map((l) => (
                      <li key={l.id} className="flex items-center justify-between py-2">
                        <div className="min-w-0">
                          <Link className="underline truncate" to={`/clients/${l.id}`}>
                            {l.name}
                          </Link>
                          <div className="text-xs text-gray-500">{(l.status || "active").toUpperCase()}</div>
                        </div>
                        <Badge tone={categoryTone("lender")}>LENDER</Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-gray-600">No lenders tied to this AMC.</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Orders (includes lenders when AMC) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border bg-white p-4">
            <SectionHeader
              title="Recent Orders"
              right={
                <Link className="text-sm underline" to={`/orders?client_id=${encodeURIComponent(id)}`}>
                  View all
                </Link>
              }
            />
            <div className="mt-3 overflow-x-auto">
              {orders?.length ? (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500">
                      <th className="px-2 py-2">Order #</th>
                      <th className="px-2 py-2">Client</th>
                      <th className="px-2 py-2">Address</th>
                      <th className="px-2 py-2">Property</th>
                      <th className="px-2 py-2">Appraiser</th>
                      <th className="px-2 py-2">Status</th>
                      <th className="px-2 py-2">Fee</th>
                      <th className="px-2 py-2">Created</th>
                    </tr>
                  </thead>
                  <tbody className="align-top">
                    {orders.map((o) => (
                      <tr key={o.id} className="border-t">
                        <td className="px-2 py-2">
                          <Link className="underline" to={`/orders/${o.id}`}>
                            {o.order_no || o.id}
                          </Link>
                        </td>
                        <td className="px-2 py-2">{o.client_name || "—"}</td>
                        <td className="px-2 py-2">
                          <div className="truncate max-w-[280px]">
                            {o.address_line1 || o.address || "—"}
                          </div>
                        </td>
                        <td className="px-2 py-2">{o.property_type || o.asset_type || "—"}</td>
                        <td className="px-2 py-2">{o.appraiser_name || o.assigned_to_name || "—"}</td>
                        <td className="px-2 py-2">
                          <Badge tone="slate">{(o.status || "unknown").toUpperCase()}</Badge>
                        </td>
                        <td className="px-2 py-2">{money0(o.fee_total)}</td>
                        <td className="px-2 py-2">{fmtDate(pickDate(o))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-sm text-gray-600">No recent orders.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


