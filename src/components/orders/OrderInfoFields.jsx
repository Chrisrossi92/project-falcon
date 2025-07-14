// OrderInfoFields.jsx
import ClientSelector from '@/components/clients/ClientSelector';
import { formatCurrency } from '@/lib/utils';

export default function OrderInfoFields({
  editedData,
  handleChange,
  handleAppraiserSelect,
  currentUserRole,
  appraisers,
  clients,
  isCustomClient,
  manualClient,
  clientId,
  handleClientChange,
  handleCustomClientNameChange,
  reviewDueDate,
  setReviewDueDate
}) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700">Order Number</label>
        <input type="text" value={editedData.id} disabled className="mt-1 block w-full bg-gray-100 border border-gray-300 rounded-md shadow-sm p-2" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Address</label>
        <input type="text" name="address" value={editedData.address || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Status</label>
        <select name="status" value={editedData.status || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white">
          <option value="">Select Status</option>
          {['New', 'In Progress', 'Inspected', 'In Review', 'Needs Revisions', 'Completed', 'Hold'].map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Appraiser</label>
        <select name="appraiser_id" value={editedData.appraiser_id || ''} onChange={handleAppraiserSelect} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white">
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
        <label className="block text-sm font-medium text-gray-700">Due Date (Client)</label>
        <input type="date" name="due_date" value={editedData.due_date || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Review Due Date</label>
        <input type="date" name="review_due_date" value={reviewDueDate} onChange={(e) => { setReviewDueDate(e.target.value); handleChange(e); }} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Site Visit Date</label>
        <input type="date" name="site_visit_date" value={editedData.site_visit_date || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Property Type</label>
        <select name="property_type" value={editedData.property_type || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white">
          <option value="">Select Type</option>
          {['Retail', 'Industrial', 'Office', 'Multifamily', 'Land', 'Other'].map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Report Type</label>
        <select name="report_type" value={editedData.report_type || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white">
          <option value="">Select Type</option>
          {['Summary', 'Restricted', 'Complete'].map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      {currentUserRole === 'admin' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700">Base Fee ($)</label>
            <input type="number" name="base_fee" value={editedData.base_fee || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-right" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Appraiser Split (%)</label>
            <input type="number" name="appraiser_split" value={editedData.appraiser_split || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-right" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Client Invoice #</label>
            <input type="number" name="client_invoice" value={editedData.client_invoice || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Paid Status</label>
            <select name="paid_status" value={editedData.paid_status || 'unpaid'} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white">
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">Appraiser Fee</label>
        <input type="text" value={formatCurrency(editedData.appraiser_fee || 0)} disabled className="mt-1 block w-full bg-gray-100 border border-gray-300 rounded-md shadow-sm p-2 text-right" />
      </div>

      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700">Notes</label>
        <textarea name="notes" value={editedData.notes || ''} onChange={handleChange} rows={4} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
      </div>
    </>
  );
}