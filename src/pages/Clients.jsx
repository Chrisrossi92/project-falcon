import React, { useEffect, useState } from "react";
import supabase from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { useSession } from '@/lib/hooks/useSession';
import ClientsTable from "@/components/clients/ClientsTable";

const Clients = () => {
  const { user } = useSession();
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isDrawerOpen, setDrawerOpen] = useState(false);

  const refreshClients = async () => {
  const { data, error } = await supabase
    .from("clients")
    .select("id, name")
    .order("name");

  if (!error) {
    console.log("Client IDs after refresh:", data.map(d => d.id));
    setClients([...data]);
  } else {
    console.error("Failed to refresh clients:", error.message);
    setClients([]);
  }
};

const handleClientDeleted = () => {
  console.log("🔄 Client deleted — refreshing...");
  setSelectedClient(null);
  setDrawerOpen(false);
  setTimeout(() => {
    refreshClients();
  }, 300); // small delay to allow Supabase to settle
};


  useEffect(() => {
  refreshClients().then(() => setLoading(false));
}, []);


  if (!user) return <p className="p-4">Loading user profile...</p>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Clients</h1>
        {user.role === "admin" && (
          <button
            onClick={() => navigate("/clients/new")}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + Add Client
          </button>
        )}
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : clients.length === 0 ? (
        <p className="text-gray-600">No clients found.</p>
      ) : (
        <ClientsTable
  key={clients.map(c => c.id).join('-')} // 🔁 forces re-render on client ID changes
  clients={clients}
  onClientClick={(client) => {
    setSelectedClient(client);
    setDrawerOpen(true);
  }}
/>

      )}
    {isDrawerOpen && selectedClient && (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
    <div className="bg-white w-[700px] h-full shadow-lg">
      <ClientDrawerContent
        data={selectedClient}
        onClose={() => setDrawerOpen(false)}
        onClientDeleted={() => {
          setDrawerOpen(false);
          setSelectedClient(null);
          refreshClients();
        }}
      />
    </div>
  </div>
)}
</div>
    
  );
};

export default Clients;





