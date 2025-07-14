// NewOrderFields.jsx
import ClientSelector from '@/components/clients/ClientSelector';

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
  handleCustomClientNameChange
}) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700">Address</label>
        <input type="text" name="address" value={formData.address || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Status</label>
        <select name="status" value={formData.status || 'In Progress'} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white">
          {['New', 'In Progress', 'Hold'].map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Appraiser</label>
        <select name="appraiser_id" value={formData.appraiser_id || ''} onChange={handleAppraiserSelect} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white">
          <option value="">Select Appraiser</option>
          {appraisers.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>

      <ClientSelector
        clients={clients}
        clientId={clientId}
        isCustomClient={isCustomClient}
        customClientName={manualClient}
        onClientChange={handleClientChange}
        onCustomNameChange={handleCustomClientNameChange}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700">Due Date</label>
        <input type="date" name="due_date" value={formData.due_date || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Site Visit Date</label>
        <input type="date" name="site_visit_date" value={formData.site_visit_date || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Property Type</label>
        <select name="property_type" value={formData.property_type || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white">
          <option value="">Select Type</option>
          {['Retail', 'Industrial', 'Office', 'Multifamily', 'Land', 'Other'].map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Report Type</label>
        <select name="report_type" value={formData.report_type || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white">
          <option value="">Select Type</option>
          {['Summary', 'Restricted', 'Complete'].map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700">Notes</label>
        <textarea name="notes" value={formData.notes || ''} onChange={handleChange} rows={3} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
      </div>
    </>
  );
}
