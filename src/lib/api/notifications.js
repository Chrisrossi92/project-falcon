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
  const { error } = await supabase.rpc("rpc_notification_create", {
    patch: {
      user_id,
      order_id,
      type,
      message,
    },
  });

  if (error) throw new Error(error.message);
};
