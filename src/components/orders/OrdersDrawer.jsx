// src/components/orders/OrdersDrawer.jsx
import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import OrderDrawerContent from "@/components/orders/OrderDrawerContent";

export default function OrdersDrawer({ selectedOrder, onClose }) {
  return (
    <Dialog.Root open={!!selectedOrder} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content
          className="fixed bottom-0 left-0 right-0 max-h-[90vh] bg-white rounded-t-lg overflow-auto"
        >
          {selectedOrder && <OrderDrawerContent data={selectedOrder} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}



