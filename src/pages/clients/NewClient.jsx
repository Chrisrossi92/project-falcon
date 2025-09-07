// src/pages/NewClient.jsx
import React from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import ClientForm from "@/components/clients/ClientForm";
import { createClient } from "@/lib/services/clientsService";

export default function NewClient() {
  const nav = useNavigate();

  async function handleSubmit(patch) {
    try {
      const row = await createClient(patch);
      toast.success("Client created");
      nav(`/clients/${row.id}`, { replace: true });
    } catch (e) {
      toast.error(e?.message || "Failed to create client");
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">New Client</h1>
        <Link className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50" to="/clients">
          Cancel
        </Link>
      </div>
      <div className="bg-white border rounded-xl p-4">
        <ClientForm onSubmit={handleSubmit} submitLabel="Create Client" />
      </div>
    </div>
  );
}



