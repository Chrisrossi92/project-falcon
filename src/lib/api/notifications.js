import supabase from "@/lib/supabaseClient";

/**
 * Sends a notification to a user.
 * @param {Object} params
 * @param {string} params.user_id - The user to notify
 * @param {number} params.order_id - The associated order
 * @param {string} params.type - Notification type, e.g. 'review_assigned'
 * @param {string} params.message - Message to display
 */
export const sendNotification = async ({ user_id, order_id, type, message }) => {
  const { error } = await supabase.from("notifications").insert([
    {
      user_id,
      order_id,
      type,
      message,
      read: false,
    },
  ]);

  if (error) throw new Error(error.message);
};
