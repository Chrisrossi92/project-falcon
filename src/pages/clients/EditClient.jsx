// src/pages/EditClient.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import ClientForm from "@/components/clients/ClientForm";
import {
  getClientManagementDetail,
  updateClientManagementClient,
} from "@/features/clients/clientManagementApi";

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

export default function EditClient() {
  const { clientId } = useParams();
  const nav = useNavigate();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const row = await getClientManagementDetail(clientId);
        if (!cancelled) setClient(row);
      } catch (e) {
        if (!cancelled) {
          setClient(null);
          setError(e);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  async function handleSubmit(patch) {
    try {
      const row = await updateClientManagementClient(clientId, patch);
      toast.success("Client updated");
      nav(`/clients/${row.id}`, { replace: true });
    } catch (e) {
      toast.error(clientUpdateErrorMessage(e));
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



