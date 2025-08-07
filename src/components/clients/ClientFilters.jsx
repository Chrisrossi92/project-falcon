import React from 'react';
import Select from 'react-select';

export default function ClientFilters({
  clients,
  selectedClient,
  onClientSelect,
}) {
  // Build searchable options
  const options = clients.map((client) => {
    const labelParts = [client.name];
    if (client.contact_name_1) labelParts.push(client.contact_name_1);
    if (client.contact_email_1) labelParts.push(client.contact_email_1);

    return {
      value: client.id,
      label: labelParts.join(' – '),
      type: client.client_type,
    };
  });

  return (
    <div className="flex flex-wrap items-center gap-4 mb-6">
      <div className="w-full sm:w-[24rem]">
        <Select
          options={options}
          value={options.find(opt => opt.value === selectedClient) || null}
          onChange={(selected) => {
            onClientSelect(selected?.value || null, selected?.type || null);
          }}
          placeholder="Search by client, contact name, or email..."
          isClearable
        />
      </div>
    </div>
  );
}


