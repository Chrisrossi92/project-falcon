import  supabase  from "@/lib/supabaseClient";
import { logActivity } from "@/lib/logactivity";

/**
 * Handles review submission and activity logging
 */
export const submitReviewDecision = async ({
  order_id,
  reviewer_id,
  reviewer_role = "reviewer",
  new_status,
  comment,
}) => {
  // 1. Update order's review status
  const { error: updateError } = await supabase
    .from("orders")
    .update({
      review_status: new_status,
      reviewed_at: new Date(),
    })
    .eq("id", order_id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  // 2. Log the action in activity_log
  const action = `review_${new_status.toLowerCase().replace(" ", "_")}`; // e.g. review_approved
  const visible_to = ["admin", "reviewer", "appraiser"];

  await logActivity({
    user_id: reviewer_id,
    order_id,
    action,
    role: reviewer_role,
    visible_to,
    context: {
      comment,
    },
  });
};
