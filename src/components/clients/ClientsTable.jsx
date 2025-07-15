// src/components/clients/ClientsTable.jsx
import { useState } from "react";
import TableDrawer from "@/components/TableDrawer";
import ClientDrawerContent from '@/components/clients/ClientDrawerContent';

export default function ClientsTable({ clients }) {
  const [selectedClientId, setSelectedClientId] = useState(null);

  const handleRowClick = (clientId) => {
    setSelectedClientId(clientId === selectedClientId ? null : clientId);
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm text-gray-700">
        <thead className="bg-gray-100 text-gray-800 uppercase text-xs">
          <tr>
            <th className="px-4 py-2">Client ID</th>
            <th className="px-4 py-2">Name</th>
            <th className="px-4 py-2">Contact</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <>
              <tr
                key={client.id}
                onClick={() => handleRowClick(client.id)}
                className="cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <td className="px-4 py-2 font-medium">{client.id}</td>
                <td className="px-4 py-2">{client.name}</td>
                <td className="px-4 py-2">{client.contact_name_1 || "—"}</td>
              </tr>

              {selectedClientId === client.id && (
                <tr key={`drawer-${client.id}`}>
                  <td colSpan={3} className="bg-gray-50 border-t">
                    <TableDrawer
                      isOpen={true}
                      onClose={() => setSelectedClientId(null)}
                      data={client}
                      type="client"
                    >
                      <ClientDrawerContent data={client} />
                    </TableDrawer>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
