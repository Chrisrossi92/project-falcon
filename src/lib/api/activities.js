import  supabase  from "@/lib/supabaseClient";

// Fetch activity log for a specific order
export async function getActivityLog(orderId) {
  const { data, error } = await supabase
    .from("activity_log")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  if (error) throw new Error("Error fetching activity log");
  return data;
}

// Post a new activity comment to the log
export async function postActivityComment(orderId, comment, userId, role) {
  const { data, error } = await supabase.from("activity_log").insert([
    {
      order_id: orderId,
      content: comment,
      user_id: userId,
      role,
    },
  ]);

  if (error) throw new Error("Error posting comment");
  return data;
}


