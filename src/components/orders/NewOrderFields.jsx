// components/orders/NewOrderFields.jsx
import ClientSelector from '@/components/clients/ClientSelector';
import AddressAutocomplete from '@/components/ui/AddressAutocomplete';

export default function NewOrderFields({
  formData,
  handleChange,
  handleAppraiserSelect,
  clients,
  appraisers,
  isCustomClient,
  manualClient,
  clientId,
  handleClientChange,
  handleCustomClientNameChange,
  setFormData
}) {
  return (
    <>
      {/* Auto-generated Order ID (display only) */}
      {formData.id && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Order ID</label>
          <input
            type="text"
            value={formData.id}
            readOnly
            className="mt-1 block w-full border border-gray-300 bg-gray-100 rounded-md shadow-sm p-2"
          />
        </div>
      )}

      {/* Client Selector */}
      <ClientSelector
        clients={clients}
        clientId={clientId}
        isCustomClient={isCustomClient}
        customClientName={manualClient}
        onClientChange={handleClientChange}
        onCustomNameChange={handleCustomClientNameChange}
      />

      {/* Address Autocomplete */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Property Address</label>
        <AddressAutocomplete
          onAddressSelect={(data) => {
            setFormData((prev) => ({
              ...prev,
              address: data.address,
              city: data.city,
              county: data.county,
              state: data.state,
              zip: data.zip,
            }));
          }}
        />
      </div>

      {/* Address Subfields */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Street Address</label>
        <input
          type="text"
          name="address"
          value={formData.address || ''}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">City</label>
        <input
          type="text"
          name="city"
          value={formData.city || ''}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">County</label>
        <input
          type="text"
          name="county"
          value={formData.county || ''}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">State</label>
        <input
          type="text"
          name="state"
          value={formData.state || ''}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Zip Code</label>
        <input
          type="text"
          name="zip"
          value={formData.zip || ''}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
        />
      </div>

      {/* Appraiser */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Appraiser</label>
        <select
          name="appraiser_id"
          value={formData.appraiser_id || ''}
          onChange={handleAppraiserSelect}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white"
        >
          <option value="">Select Appraiser</option>
          {appraisers.map((u) => (
            <option key={u.id} value={u.id}>{u.display_name || u.name || u.email}</option>
          ))}
        </select>
      </div>

      {/* Dates */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Due Date</label>
        <input
          type="date"
          name="due_date"
          value={formData.due_date || ''}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Site Visit Date</label>
        <input
          type="datetime-local"
          name="site_visit_at"
          value={formData.site_visit_date || ''}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
        />
      </div>

      {/* Report Metadata */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Property Type</label>
        <select
          name="property_type"
          value={formData.property_type || ''}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white"
        >
          <option value="">Select Type</option>
          {['Retail', 'Industrial', 'Office', 'Multifamily', 'Land', 'Other'].map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Report Type</label>
        <select
          name="report_type"
          value={formData.report_type || ''}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white"
        >
          <option value="">Select Type</option>
          {['Summary', 'Restricted', 'Complete'].map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Status</label>
        <select
          name="status"
          value={formData.status || 'In Progress'}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white"
        >
          {['New', 'In Progress', 'Hold'].map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>

      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700">Notes</label>
        <textarea
          name="notes"
          value={formData.notes || ''}
          onChange={handleChange}
          rows={3}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
        />
      </div>
    </>
  );
}

