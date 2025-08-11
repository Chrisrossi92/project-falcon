// src/components/orders/OrderForm.jsx

import React from "react";
import { Button } from "@/components/ui/button";
import FormCard from "@/components/ui/FormCard";
import OrderInfoFields from "@/components/orders/OrderInfoFields";
import  useOrderForm  from "@/lib/hooks/useOrderForm";

export default function OrderForm({
  order,
  setOrder,
  mode = "edit",
  isAdmin = false,
  onDeleteClick, // callback from parent
}) {
  const {
    clients,
    appraisers,
    clientId,
    manualClient,
    isCustomClient,
    reviewDueDate,
    setReviewDueDate,
    editedData,
    handleChange,
    handleClientChange,
    handleCustomClientNameChange,
    handleAppraiserSelect,
    handleSave,
    canEdit,
    role,
  } = useOrderForm({ order, setOrder });

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSave();
  };

  return (
    <form onSubmit={handleSubmit}>
      <FormCard>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <OrderInfoFields
            clients={clients}
            appraisers={appraisers}
            clientId={clientId}
            manualClient={manualClient}
            isCustomClient={isCustomClient}
            reviewDueDate={reviewDueDate}
            setReviewDueDate={setReviewDueDate}
            editedData={editedData}
            handleChange={handleChange}
            handleClientChange={handleClientChange}
            handleCustomClientNameChange={handleCustomClientNameChange}
            handleAppraiserSelect={handleAppraiserSelect}
            canEdit={canEdit}
          />
        </div>

        <div className="mt-6 flex justify-end space-x-4">
          {isAdmin && (
            <Button
              type="button"
              variant="destructive"
              onClick={onDeleteClick}
            >
              Delete Order
            </Button>
          )}

          {mode === "edit" && canEdit && (
            <Button type="submit" className="bg-blue-600 text-white">
              Save Changes
            </Button>
          )}

          {mode === "new" && (
            <Button type="submit" className="bg-green-600 text-white">
              Create Order
            </Button>
          )}
        </div>
      </FormCard>
    </form>
  );
}


