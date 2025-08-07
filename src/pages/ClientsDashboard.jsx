import React, { useEffect, useState } from 'react';
import supabase from '@/lib/supabaseClient';
import ClientCard from '@/components/clients/ClientCard';
import ClientFilters from '@/components/clients/ClientFilters';
import { Link } from 'react-router-dom';

export default function ClientsDashboard() {
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedClientId, setSelectedClientId] = useState(null);
  const [selectedClientType, setSelectedClientType] = useState(null);

  useEffect(() => {
    const fetchClients = async () => {
      setLoading(true);

      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*');

      if (clientError) {
        setError(clientError.message);
        setLoading(false);
        return;
      }

      const enrichedClients = [];

      for (const client of clientData) {
        let clientIdsToFetch = [client.id];

        if (client.client_type === 'AMC') {
          const { data: children } = await supabase
            .from('clients')
            .select('id')
            .eq('parent_id', client.id);

          if (children) {
            clientIdsToFetch = children.map(c => c.id);
          }
        }

        const { data: orders, error: orderError } = await supabase
          .from('orders')
          .select('base_fee, created_at, status')
          .in('client_id', clientIdsToFetch);

        const totalOrders = orders?.length || 0;
        const activeOrders = orders?.filter(o =>
          ['In Progress', 'Needs Review'].includes(o.status)
        ).length || 0;

        const avgFee = totalOrders > 0
          ? orders.reduce((sum, o) => sum + (o.base_fee || 0), 0) / totalOrders
          : 0;

        const lastOrderDate = totalOrders > 0
          ? orders.map(o => new Date(o.created_at)).sort((a, b) => b - a)[0].toISOString()
          : null;

        enrichedClients.push({
          ...client,
          totalOrders,
          activeOrders,
          avgFee,
          lastOrderDate
        });
      }

      setClients(enrichedClients);
      setLoading(false);
    };

    fetchClients();
  }, []);

  useEffect(() => {
    if (!selectedClientId) {
      setFilteredClients(clients);
      return;
    }

    // If AMC, show AMC + all its lenders
    if (selectedClientType === 'AMC') {
      const selectedAMC = clients.find(c => c.id === selectedClientId);
      const children = clients.filter(c => c.parent_id === selectedClientId);
      setFilteredClients([selectedAMC, ...children]);
    } else {
      // Lender or Private
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










