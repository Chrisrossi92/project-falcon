import React, { useEffect, useState } from 'react';
import ClientCard from '@/components/clients/ClientCard';
import ClientFilters from '@/components/clients/ClientFilters';
import { Link } from 'react-router-dom';
import { fetchClientsWithMetrics } from '@/lib/services/clientsService';

export default function ClientsDashboard() {
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedClientId, setSelectedClientId] = useState(null);
  const [selectedClientType, setSelectedClientType] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const enriched = await fetchClientsWithMetrics();
        setClients(enriched);
        setError(null);
      } catch (e) {
        setError(e.message || 'Failed to load clients');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedClientId) {
      setFilteredClients(clients);
      return;
    }
    if (selectedClientType === 'AMC') {
      const selectedAMC = clients.find(c => c.id === selectedClientId);
      const children = clients.filter(c => c.parent_id === selectedClientId);
      setFilteredClients([selectedAMC, ...children].filter(Boolean));
    } else {
      const selected = clients.find(c => c.id === selectedClientId);
      setFilteredClients(selected ? [selected] : []);
    }
  }, [clients, selectedClientId, selectedClientType]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Clients Dashboard</h1>
        <Link
          to="/clients/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
        >
          + Add Client
        </Link>
      </div>

      <ClientFilters
        clients={clients}
        selectedClient={selectedClientId}
        onClientSelect={(id, type) => {
          setSelectedClientId(id);
          setSelectedClientType(type);
        }}
      />

      {loading && <p>Loading clients...</p>}
      {error && <p className="text-red-600">Error: {error}</p>}

      {!loading && filteredClients.length === 0 && (
        <p className="text-gray-600">No clients match your selection.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredClients.map(client => (
          <ClientCard key={client.id} client={client} />
        ))}
      </div>
    </div>
  );
}











