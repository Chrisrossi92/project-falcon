import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useSession } from "@/lib/hooks/useSession";
import { submitReviewDecision } from "@/lib/api/reviews";

const ReviewModal = ({ open, onClose, order, refreshOrders }) => {
  const { user } = useSession();
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (status) => {
    setSubmitting(true);
    try {
      await submitReviewDecision({
        order_id: order.id,
        reviewer_id: user.id,
        reviewer_role: user.role || "reviewer",
        new_status: status,
        comment: comments,
      });
      refreshOrders();
      onClose();
    } catch (error) {
      console.error("Error submitting review decision:", error);
    } finally {
      setSubmitting(false);
      setComments("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Review Order #{order.id}</DialogTitle>
          <DialogDescription>
            {order.propertyAddress || order.address} — {order.clientName || "Client"}<br />
            Appraiser: {order.appraiserName || "Unassigned"}<br />
            Due: {order.dueDate}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label htmlFor="comments" className="text-sm font-medium">
            Reviewer Comments
          </label>
          <Textarea
            id="comments"
            placeholder="Enter comments or required revisions..."
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={5}
          />
        </div>

        <DialogFooter className="pt-4 flex justify-between gap-2">
          <Button variant="destructive" onClick={() => handleSubmit("Rejected")} disabled={submitting}>
            Reject
          </Button>
          <Button variant="secondary" onClick={() => handleSubmit("Needs Edits")} disabled={submitting}>
            Request Edits
          </Button>
          <Button onClick={() => handleSubmit("Approved")} disabled={submitting}>
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewModal;

