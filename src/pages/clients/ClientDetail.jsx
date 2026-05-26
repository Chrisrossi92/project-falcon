// src/components/clients/ClientDetail.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { WorkspaceContextTile } from "@/components/workspace/WorkspaceContext";
import { WorkspaceSection, WorkspaceSectionMeta } from "@/components/workspace/WorkspaceSection";
import {
  WorkspaceEmptyState,
  WorkspaceErrorState,
  WorkspaceLoadingState,
} from "@/components/workspace/WorkspaceState";
import supabase from "@/lib/supabaseClient";
import ClientForm from "@/components/clients/ClientForm";
import {
  getClientManagementDetail,
  updateClientManagementClient,
} from "@/features/clients/clientManagementApi";
import {
  createClientContact,
  listClientContacts,
  setClientContactStatus,
  setDefaultClientContact,
  updateClientContact,
} from "@/features/clients/clientContactsApi";
import { useCurrentUserAppContext } from "@/features/auth/useCurrentUserAppContext";
import { useCan } from "@/lib/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/permissions/constants";

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

const parseFee = (val) => {
  if (val == null) return null;
  if (typeof val === "number") return Number.isFinite(val) ? val : null;
  if (typeof val === "string") {
    const cleaned = val.replace(/[$,]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const formatCategoryLabel = (category) => {
  const value = String(category || "client").trim();
  if (!value) return "Client";
  if (value.toLowerCase() === "amc") return "AMC";
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
};

function clientUpdateErrorMessage(error) {
  const message = error?.message || "";
  if (message.includes("client_name_required")) return "Enter a client name.";
  if (message.includes("client_name_already_exists")) return "A client with this name already exists.";
  if (message.includes("invalid_amc")) return "Choose a valid AMC.";
  if (
    message.includes("permission")
    || message.includes("forbidden")
    || error?.code === "42501"
  ) {
    return "You do not have permission to update this client.";
  }
  return "Falcon could not update this client.";
}

function contactMutationErrorMessage(error) {
  const message = error?.message || "";
  if (message.includes("client_contact_name_required")) return "Enter a contact name.";
  if (message.includes("invalid_client_contact_status")) return "Choose a valid contact status.";
  if (
    message.includes("permission")
    || message.includes("forbidden")
    || error?.code === "42501"
  ) {
    return "You do not have permission to manage contacts for this client.";
  }
  return "Falcon could not update this contact.";
}

/* ============================== main ============================== */

export default function ClientDetail() {
  const params = useParams();
  const clientIdParam = params.clientId || params.id || null;
  const nav = useNavigate();
  const { context: appContext, loading: appContextLoading } = useCurrentUserAppContext();
  const publicUserId = appContext?.user_id || null;
  const isAdmin = Boolean(appContext?.is_owner || appContext?.is_admin_role);
  const isReviewer = !isAdmin && Boolean(appContext?.is_reviewer_role);
  const canUpdateAllClientsPermission = useCan(PERMISSIONS.CLIENTS_UPDATE_ALL);
  const canUpdateAllClients = canUpdateAllClientsPermission.allowed;

  const numericId = Number(clientIdParam);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [client, setClient] = useState(null);
  const [amc, setAmc] = useState(null);
  const [orders, setOrders] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsError, setContactsError] = useState(null);
  const [contactFormMode, setContactFormMode] = useState(null);
  const [editingContact, setEditingContact] = useState(null);

  const [editing, setEditing] = useState(false);

  const refreshContacts = useCallback(async (targetClientId = numericId) => {
    if (!targetClientId || Number.isNaN(targetClientId) || !Number.isFinite(targetClientId)) {
      setContacts([]);
      return;
    }

    try {
      setContactsLoading(true);
      setContactsError(null);
      const rows = await listClientContacts(targetClientId);
      setContacts(rows || []);
    } catch (e) {
      console.error("Failed to load client contacts", e);
      setContactsError(e?.message || "Failed to load contacts");
      setContacts([]);
    } finally {
      setContactsLoading(false);
    }
  }, [numericId]);

  useEffect(() => {
    if (appContextLoading) return;

    if (!clientIdParam || Number.isNaN(numericId) || !Number.isFinite(numericId)) {
      setErr("Invalid client id");
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const clientRow = await getClientManagementDetail(numericId);

        if (cancelled) return;

        if (!clientRow) {
          setClient(null);
          setErr("Client not found");
          setLoading(false);
          return;
        }

        const isAmcRelationship = String(clientRow.category || "").toLowerCase() === "amc";

        let ordersQuery = supabase
          .from("v_orders_frontend_v4")
          .select(
            "id, order_number, status, address, city, state, zip, fee_amount, base_fee, appraiser_fee, created_at, review_due_at, final_due_at, due_date, client_id, managing_amc_id"
          );

        ordersQuery = isAmcRelationship
          ? ordersQuery.eq("managing_amc_id", numericId)
          : ordersQuery.eq("client_id", numericId);

        if (!isAdmin) {
          if (!publicUserId) {
            ordersQuery = ordersQuery.is("id", null);
          } else if (isReviewer) {
            ordersQuery = ordersQuery.eq("reviewer_id", publicUserId);
          } else {
            ordersQuery = ordersQuery.eq("appraiser_id", publicUserId);
          }
        }

        const { data: orderRows, error: ordersErr } = await ordersQuery
          .order("created_at", { ascending: false })
          .limit(100);

        if (ordersErr) throw ordersErr;

        if (cancelled) return;

        setClient(clientRow);
        setOrders(orderRows || []);
        if (process.env.NODE_ENV === "development" && (orderRows || []).length) {
          console.debug("[ClientDetail orders sample]", orderRows[0]?.order_number, {
            fee_amount: orderRows[0]?.fee_amount,
            base_fee: orderRows[0]?.base_fee,
            appraiser_fee: orderRows[0]?.appraiser_fee,
          });
        }

        if ((clientRow.category || "").toLowerCase() !== "amc" && clientRow.amc_id) {
          setAmc({
            id: clientRow.amc_id,
            name: clientRow.amc_name,
            category: "amc",
          });
        } else {
          setAmc(null);
        }

        refreshContacts(numericId);
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
  }, [clientIdParam, numericId, isAdmin, isReviewer, publicUserId, appContextLoading, refreshContacts]);

  const stats = useMemo(() => {
    if (!orders || orders.length === 0) {
      return {
        totalOrders: client?.total_orders ?? 0,
        activeOrders: 0,
        completedOrders: 0,
        totalFees: 0,
        lastOrderDate: client?.last_order_date || null,
        avgFee: client?.avg_total_fee ?? null,
      };
    }

    let totalFees = 0;
    let completed = 0;
    let lastDate = null;

    for (const o of orders) {
      const fee = [o.fee_amount, o.base_fee, o.appraiser_fee].map(parseFee).find((v) => v != null);
      if (typeof fee === "number" && Number.isFinite(fee)) totalFees += fee;

      const status = (o.status || "").toLowerCase();
      if (status === "completed" || status === "complete") completed += 1;

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
  }, [orders, client]);

  async function handleUpdateClient(patch) {
    if (!client) return;
    if (!canUpdateAllClients) return;

    try {
      const row = await updateClientManagementClient(client.id, patch);
      setClient((prev) => ({ ...prev, ...row }));
      if ((row.category || "").toLowerCase() !== "amc" && row.amc_id) {
        setAmc({
          id: row.amc_id,
          name: row.amc_name,
          category: "amc",
        });
      } else {
        setAmc(null);
      }
      setEditing(false);
      toast.success("Client updated");
    } catch (e) {
      console.error(e);
      toast.error(clientUpdateErrorMessage(e));
    }
  }

  function handleAddContact() {
    setEditingContact(null);
    setContactFormMode("add");
  }

  function handleEditContact(contact) {
    setEditingContact(contact);
    setContactFormMode("edit");
  }

  function closeContactForm() {
    setContactFormMode(null);
    setEditingContact(null);
  }

  async function handleSaveContact(values) {
    if (!client || !canUpdateAllClients) return;

    try {
      if (contactFormMode === "edit" && editingContact) {
        await updateClientContact(editingContact.id, values);
        toast.success("Contact updated");
      } else {
        await createClientContact(client.id, values);
        toast.success("Contact added");
      }
      closeContactForm();
      await refreshContacts(client.id);
    } catch (e) {
      console.error(e);
      toast.error(contactMutationErrorMessage(e));
    }
  }

  async function handleSetContactStatus(contact, status) {
    if (!canUpdateAllClients) return;

    try {
      await setClientContactStatus(contact.id, status);
      toast.success(status === "active" ? "Contact reactivated" : "Contact deactivated");
      await refreshContacts(client.id);
    } catch (e) {
      console.error(e);
      toast.error(contactMutationErrorMessage(e));
    }
  }

  async function handleSetDefaultContact(contact) {
    if (!canUpdateAllClients) return;

    try {
      await setDefaultClientContact(contact.id);
      toast.success("Default contact updated");
      await refreshContacts(client.id);
    } catch (e) {
      console.error(e);
      toast.error(contactMutationErrorMessage(e));
    }
  }

  if (loading || appContextLoading) {
    return (
      <div className="p-4 md:p-6">
        <WorkspaceLoadingState message="Loading client relationship..." className="rounded-xl" />
      </div>
    );
  }

  if (err && !client) {
    return (
      <div className="p-4 md:p-6">
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Relationship Detail
            </div>
            <h1 className="mt-1 text-xl font-semibold text-slate-950">Client</h1>
          </div>
          <Link
            to="/clients"
            className="inline-flex items-center justify-center rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to clients
          </Link>
        </div>
        <WorkspaceErrorState message={err} />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-4 md:p-6">
        <WorkspaceEmptyState className="text-sm text-slate-600">
          Client not found.
        </WorkspaceEmptyState>
      </div>
    );
  }

  const category =
    client.category || client.client_type || client.type || "client";
  const categoryLabel = formatCategoryLabel(category);
  const statusLabel = (client.status || "ACTIVE").toUpperCase();

  const activeOrders = stats.activeOrders ?? 0;
  const completedOrders = stats.completedOrders ?? 0;
  const anyOrders = orders && orders.length > 0;
  const isAmcRelationship = String(category || "").toLowerCase() === "amc";
  const relatedOrdersTitle = isAmcRelationship ? "Managed Orders" : "Client Orders";
  const relatedOrdersDescription = isAmcRelationship
    ? "Orders visible to your current company role where this AMC is the management relationship."
    : "Orders visible to your current company role for this client.";
  const contextTitle = isAmcRelationship ? "Managed Order Context" : "Visible Order Context";

  const activeList = (orders || []).filter(
    (o) => (o.status || "").toUpperCase() !== "COMPLETE"
  );
  const completedList = (orders || []).filter(
    (o) => (o.status || "").toUpperCase() === "COMPLETE"
  );

  return (
    <div className="space-y-5 p-4 md:p-6">
      <header className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-4 shadow-sm md:px-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Relationship Detail
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="min-w-0 truncate text-2xl font-semibold tracking-tight text-slate-950">
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

            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span>{categoryLabel}</span>
              {amc && (
                <>
                  <span aria-hidden="true" className="text-slate-300">/</span>
                  <span>
                    Managed through{" "}
                    <Link
                      to={`/clients/${amc.id}`}
                      className="font-medium text-slate-800 underline decoration-dotted underline-offset-2 hover:text-slate-950"
                    >
                      {amc.name}
                    </Link>
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:min-w-[24rem]">
            <WorkspaceContextTile label="Visible orders" value={stats.totalOrders} />
            <WorkspaceContextTile label="Active orders" value={activeOrders} />
            <WorkspaceContextTile label="Last order" value={fmtDate(stats.lastOrderDate || null)} />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-end">
          {canUpdateAllClients && (
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="inline-flex items-center justify-center rounded-md border border-slate-900 bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800"
            >
              {editing ? "Cancel editing" : "Edit Client"}
            </button>
          )}
          <button
            type="button"
            onClick={() => nav("/clients")}
            className="inline-flex items-center justify-center rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to Clients
          </button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,0.95fr)]">
        <div className="space-y-4">
          <WorkspaceSection
            title="Client Contact"
            titleId="client-contact-heading"
            description="Primary contact fields currently stored on this client record."
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            {editing && canUpdateAllClients ? (
              <ClientForm
                initial={client}
                onSubmit={handleUpdateClient}
                submitLabel="Save Changes"
              />
            ) : (
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <DetailField
                  label="Primary Contact"
                  value={client.primary_contact_name || client.contact_name_1 || "—"}
                />
                <DetailField
                  label="Primary Phone"
                  value={client.primary_contact_phone || client.contact_phone_1 || "—"}
                />
                <DetailField
                  label="Email"
                  value={
                    client.contact_email_1 ||
                    client.email ||
                    client.contact_email ||
                    "—"
                  }
                />
                <DetailField
                  label="Notes"
                  value={client.notes || client.internal_notes || "—"}
                  className="sm:col-span-2"
                />
              </div>
            )}
          </WorkspaceSection>

          <ContactsSection
            contacts={contacts}
            loading={contactsLoading}
            error={contactsError}
            canManage={canUpdateAllClients}
            formMode={contactFormMode}
            editingContact={editingContact}
            onAdd={handleAddContact}
            onEdit={handleEditContact}
            onCancelForm={closeContactForm}
            onSave={handleSaveContact}
            onSetDefault={handleSetDefaultContact}
            onSetStatus={handleSetContactStatus}
          />

          <WorkspaceSection
            title={relatedOrdersTitle}
            titleId="client-orders-heading"
            description={relatedOrdersDescription}
            meta={
              anyOrders ? (
                <WorkspaceSectionMeta>
                  {stats.totalOrders} total / {activeOrders} active /{" "}
                  {completedOrders} completed
                </WorkspaceSectionMeta>
              ) : null
            }
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            headerClassName="mb-4 border-b border-slate-100 pb-3"
            headerContentClassName="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"
          >
            {!anyOrders ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
                No visible orders for this client.
              </div>
            ) : (
              <div className="space-y-5">
                {activeList.length > 0 && (
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      Active Orders
                    </div>
                    <OrdersTable rows={activeList} />
                  </div>
                )}

                {completedList.length > 0 && (
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Completed Orders
                    </div>
                    <OrdersTable rows={completedList} />
                  </div>
                )}
              </div>
            )}
          </WorkspaceSection>
        </div>

        <aside className="space-y-4">
          <WorkspaceSection
            title={contextTitle}
            titleId="client-context-heading"
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            headerClassName="mb-3"
          >
            <div className="grid grid-cols-2 gap-3 text-sm">
              <MetricTile label="Total Orders" value={stats.totalOrders} />
              <MetricTile label="Active Orders" value={activeOrders} />
              <MetricTile label="Completed" value={completedOrders} />
              <MetricTile label="Avg Fee" value={money0(stats.avgFee ?? null)} />
              <MetricTile label="Total Fees" value={money0(stats.totalFees)} />
              <MetricTile
                label="Last Order"
                value={fmtDate(stats.lastOrderDate || null)}
              />
            </div>
          </WorkspaceSection>

          <WorkspaceSection
            title="Relationship Notes"
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            headerClassName="mb-2"
          >
            <p className="text-sm leading-6 text-slate-500">
              Internal relationship context remains read-only here unless you
              use the existing edit flow for supported client fields.
            </p>
          </WorkspaceSection>
        </aside>
      </div>
    </div>
  );
}

/* ============================== subcomponents ============================== */

function ContactsSection({
  contacts,
  loading,
  error,
  canManage,
  formMode,
  editingContact,
  onAdd,
  onEdit,
  onCancelForm,
  onSave,
  onSetDefault,
  onSetStatus,
}) {
  const isFormOpen = Boolean(formMode);

  return (
    <WorkspaceSection
      title="Contacts"
      titleId="client-contacts-heading"
      description="Reusable relationship contacts for coordination with this client."
      meta={
        canManage ? (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Add Contact
          </button>
        ) : null
      }
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      headerClassName="mb-4 border-b border-slate-100 pb-3"
      headerContentClassName="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"
    >
      {error && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {error}
        </div>
      )}

      {isFormOpen && canManage && (
        <ContactForm
          key={editingContact?.id || "new-contact"}
          contact={editingContact}
          mode={formMode}
          onCancel={onCancelForm}
          onSave={onSave}
        />
      )}

      {loading ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
          Loading contacts...
        </div>
      ) : contacts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
          No saved contacts yet.
        </div>
      ) : (
        <div className="space-y-3">
          {contacts.map((contact) => (
            <ClientContactCard
              key={contact.id}
              contact={contact}
              canManage={canManage}
              onEdit={onEdit}
              onSetDefault={onSetDefault}
              onSetStatus={onSetStatus}
            />
          ))}
        </div>
      )}
    </WorkspaceSection>
  );
}

function ContactForm({ contact, mode, onCancel, onSave }) {
  const [values, setValues] = useState({
    name: contact?.name || "",
    title: contact?.title || "",
    email: contact?.email || "",
    phone: contact?.phone || "",
    notes: contact?.notes || "",
    is_default: contact?.is_default === true,
  });

  const submitLabel = mode === "edit" ? "Save Contact" : "Create Contact";

  function updateField(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSave({
      name: values.name.trim(),
      title: values.title.trim() || null,
      email: values.email.trim() || null,
      phone: values.phone.trim() || null,
      notes: values.notes.trim() || null,
      is_default: values.is_default,
    });
  }

  return (
    <form
      aria-label={mode === "edit" ? "edit contact form" : "add contact form"}
      onSubmit={handleSubmit}
      className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-medium text-slate-700">
          Name
          <input
            value={values.name}
            onChange={(event) => updateField("name", event.target.value)}
            required
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
          />
        </label>
        <label className="text-xs font-medium text-slate-700">
          Title / Role
          <input
            value={values.title}
            onChange={(event) => updateField("title", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
          />
        </label>
        <label className="text-xs font-medium text-slate-700">
          Email
          <input
            type="email"
            value={values.email}
            onChange={(event) => updateField("email", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
          />
        </label>
        <label className="text-xs font-medium text-slate-700">
          Phone
          <input
            value={values.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
          />
        </label>
        <label className="text-xs font-medium text-slate-700 sm:col-span-2">
          Notes
          <textarea
            value={values.notes}
            onChange={(event) => updateField("notes", event.target.value)}
            rows={2}
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
          />
        </label>
        <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
          <input
            type="checkbox"
            checked={values.is_default}
            onChange={(event) => updateField("is_default", event.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Default contact
        </label>
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-md border border-slate-900 bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function ClientContactCard({ contact, canManage, onEdit, onSetDefault, onSetStatus }) {
  const inactive = contact.status === "inactive";

  return (
    <article
      className={
        "rounded-lg border px-3 py-3 " +
        (inactive
          ? "border-slate-200 bg-slate-50 text-slate-500"
          : "border-slate-200 bg-white text-slate-900")
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-950">{contact.name}</h3>
            {contact.is_default && (
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                Default
              </span>
            )}
            {inactive && (
              <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Inactive
              </span>
            )}
          </div>
          {contact.title && (
            <div className="mt-0.5 text-xs font-medium text-slate-600">{contact.title}</div>
          )}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
            {contact.email && <span>{contact.email}</span>}
            {contact.phone && <span>{contact.phone}</span>}
          </div>
          {contact.notes && (
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{contact.notes}</p>
          )}
        </div>

        {canManage && (
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => onEdit(contact)}
              className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Edit Contact
            </button>
            {!contact.is_default && !inactive && (
              <button
                type="button"
                onClick={() => onSetDefault(contact)}
                className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Set Default
              </button>
            )}
            <button
              type="button"
              onClick={() => onSetStatus(contact, inactive ? "active" : "inactive")}
              className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              {inactive ? "Reactivate Contact" : "Deactivate Contact"}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

function DetailField({ label, value, className = "" }) {
  return (
    <div
      className={`rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 ${className}`}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 whitespace-pre-wrap text-sm text-slate-900">
        {value}
      </div>
    </div>
  );
}

function MetricTile({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-950">{value}</div>
    </div>
  );
}

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
            const fee = [o.fee_amount, o.base_fee, o.appraiser_fee]
              .map(parseFee)
              .find((v) => typeof v === "number");
            return (
              <tr
                key={o.id}
                className="border-b last:border-0 hover:bg-slate-50/70"
              >
                <td className="px-3 py-1.5 font-mono text-[11px]">
                  {o.id ? (
                    <Link
                      to={`/orders/${o.id}`}
                      className="text-blue-600 underline-offset-2 hover:underline"
                    >
                      {o.order_number || "—"}
                    </Link>
                  ) : (
                    o.order_number || "—"
                  )}
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
                  {fee ? money0(fee) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
