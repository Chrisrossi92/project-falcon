
import  supabase  from "@/lib/supabaseClient";

export const updateSiteVisitAt = async (orderId: number, newDateTime: string) => {
  const { data, error } = await supabase
    .from("orders")
    .update({ site_visit_at: newDateTime })
    .eq("id", orderId)
    .select();

  if (error) {
    console.error("Error updating site visit:", error);
    return null;
  }

  return data?.[0] || null;
};

export const fetchSiteVisitAt = async (orderId: number) => {
  const { data, error } = await supabase
    .from("orders")
    .select("site_visit_at")
    .eq("id", orderId)
    .single();

  if (error) {
    console.error("Error fetching site visit:", error);
    return null;
  }

  return data;
};
