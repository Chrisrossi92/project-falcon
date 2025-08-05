import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import  supabase  from "@/lib/supabaseClient";
import { logActivity } from "@/lib/logactivity";
import { sendNotification } from "@/lib/api/notifications";

const ReviewAssignmentModal = ({ open, onClose, order, currentUser, onAssigned }) => {
  const [reviewers, setReviewers] = useState([]);
  const [selectedReviewer, setSelectedReviewer] = useState("");
  const [sendToQueue, setSendToQueue] = useState(false);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchReviewers = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, role")
        .in("role", ["reviewer", "admin"]);

      if (error) console.error("Error fetching reviewers:", error);
      else setReviewers(data);
    };

    if (open) fetchReviewers();
  }, [open]);

  const handleAssign = async () => {
    if (!order || !currentUser) return;
    setSubmitting(true);

    const assigned_to = sendToQueue ? null : selectedReviewer;
    const stage = sendToQueue ? "queued" : "in_review";
    const status = sendToQueue ? "queued" : "in_review";

    try {
      // Insert into review_flow
      const { error: flowError } = await supabase.from("review_flow").insert([
        {
          order_id: order.id,
          assigned_to,
          assigned_by: currentUser.id,
          comment,
          status,
          type: "review",
        },
      ]);
      if (flowError) throw new Error(flowError.message);

      // Update order stage
      await supabase
        .from("orders")
        .update({ review_stage: stage })
        .eq("id", order.id);

      // Log activity
      await logActivity({
        user_id: currentUser.id,
        order_id: order.id,
        role: currentUser.role,
        action: "review_task_created",
        visible_to: ["admin", "reviewer"],
        context: { assigned_to, comment },
      });

      // Notify reviewer (if not queue)
      if (assigned_to) {
        await sendNotification({
          user_id: assigned_to,
          order_id: order.id,
          type: "review_assigned",
          message: `You've been assigned to review Order #${order.id}`,
        });
      }

      onAssigned?.();
      onClose();
    } catch (err) {
      console.error("Review assign error:", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send to Review</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Assign to Reviewer</label>
            <select
              disabled={sendToQueue}
              className="w-full border p-2 rounded-md"
              value={selectedReviewer}
              onChange={(e) => setSelectedReviewer(e.target.value)}
            >
              <option value="">Select a reviewer</option>
              {reviewers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.role})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={sendToQueue}
              onChange={() => {
                setSendToQueue(!sendToQueue);
                setSelectedReviewer("");
              }}
            />
            <label>Send to review queue instead</label>
          </div>

          <div>
            <label className="text-sm font-medium">Comment (optional)</label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Instructions or notes..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter className="pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={submitting || (!sendToQueue && !selectedReviewer)}
          >
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewAssignmentModal;
