import React, { useState } from "react";
import ReviewersModal from "@/components/review/ReviewersModal";

/**
 * Shim to preserve old imports/usages.
 * Props: { orderId, onClose }
 * Opens the new ReviewersModal (Admin/Mike-only editor).
 */
export default function ReviewAssignmentModal({ orderId, onClose }) {
  const [open, setOpen] = useState(true);
  return (
    <ReviewersModal
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) onClose?.();
      }}
      orderId={orderId}
      initial={[]}
    />
  );
}


