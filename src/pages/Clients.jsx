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

  useEffect(() => {
    const fetchClients = async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("name");

      if (error) setError("Failed to load clients.");
      else setClients(data);

      setLoading(false);
    };

    fetchClients();
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
        <ClientsTable clients={clients} />
      )}
    </div>
  );
};

export default Clients;





