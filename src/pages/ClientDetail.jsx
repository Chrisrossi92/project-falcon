// src/pages/ClientDetail.jsx
import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useClient } from "@/lib/hooks/useClients";
import { deleteClient } from "@/lib/services/clientsService";
import { useRole } from "@/lib/hooks/useRole";

function Field({ label, value }) {
  return (
    <div className="grid grid-cols-3 gap-3 py-2 border-b last:border-0">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="col-span-2 text-sm text-gray-900">
        {value ?? <span className="text-gray-400">—</span>}
      </div>
    </div>
  );
}

export default function ClientDetail() {
  const { clientId } = useParams();
  const nav = useNavigate();
  const { isAdmin } = useRole() || {};
  const { data: client, loading, error } = useClient(clientId);

  async function onDelete() {
    if (!client) return;
    if (!confirm(`Delete client "${client.name}"? This cannot be undone.`)) return;
    try {
      await deleteClient(client.id);
      toast.success("Client deleted");
      nav("/clients", { replace: true });
    } catch (e) {
      toast.error(e?.message || "Failed to delete");
    }
  }

  if (loading) {
    return <div className="p-3 text-sm text-gray-600">Loading client…</div>;
  }
  if (error) {
    return (
      <div className="p-3 text-sm text-red-700 bg-red-50 border rounded">
        Failed to load client: {error.message}
      </div>
    );
  }
  if (!client) {
    return (
      <div className="p-3 text-sm text-amber-800 bg-amber-50 border rounded">
        Client not found or you don’t have access.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{client.name || "Client"}</h1>
          <p className="text-sm text-gray-500">{client.status || "—"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50" to="/clients">
            Back
          </Link>
          {isAdmin && (
            <>
              <Link
                className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50"
                to={`/clients/edit/${client.id}`}
              >
                Edit
              </Link>
              <button className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50" onClick={onDelete}>
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <Field label="Contact Name" value={client.contact_name} />
        <Field label="Contact Email" value={client.contact_email} />
        <Field label="Phone" value={client.phone} />
        <Field label="Status" value={client.status} />
        <Field label="Notes" value={client.notes} />
      </div>
    </div>
  );
}


