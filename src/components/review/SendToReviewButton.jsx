import { useState } from "react";
import { Button } from "@/components/ui/button";
import ReviewAssignmentModal from "@/components/review/ReviewAssignmentModal";


const SendToReviewButton = ({ order, currentUser, onAssignment }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Send to Review
      </Button>

      <ReviewAssignmentModal
        open={open}
        onClose={() => setOpen(false)}
        order={order}
        currentUser={currentUser}
        onAssigned={() => {
          setOpen(false);
          onAssignment?.();
        }}
      />
    </>
  );
};

export default SendToReviewButton;
