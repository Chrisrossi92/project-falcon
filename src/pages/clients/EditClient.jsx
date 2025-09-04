// src/pages/EditClient.jsx
import React from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useClient } from "@/lib/hooks/useClients";
import ClientForm from "@/components/clients/ClientForm";
import { updateClient } from "@/lib/services/clientsService";

export default function EditClient() {
  const { clientId } = useParams();
  const nav = useNavigate();
  const { data: client, loading, error } = useClient(clientId);

  async function handleSubmit(patch) {
    try {
      const row = await updateClient(clientId, patch);
      toast.success("Client updated");
      nav(`/clients/${row.id}`, { replace: true });
    } catch (e) {
      toast.error(e?.message || "Failed to update client");
    }
  }

  if (loading) return <div className="p-3 text-sm text-gray-600">Loading client…</div>;
  if (error) return <div className="p-3 text-sm text-red-700 bg-red-50 border rounded">Error: {error.message}</div>;
  if (!client) return <div className="p-3 text-sm text-amber-800 bg-amber-50 border rounded">Client not found.</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Edit Client</h1>
        <Link className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50" to={`/clients/${client.id}`}>
          Cancel
        </Link>
      </div>
      <div className="bg-white border rounded-xl p-4">
        <ClientForm initial={client} onSubmit={handleSubmit} submitLabel="Save Changes" />
      </div>
    </div>
  );
}





