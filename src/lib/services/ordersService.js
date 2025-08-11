import  supabase from "@/lib/supabaseClient"
import logOrderEvent from "@/lib/utils/logOrderEvent"

// CREATE new order
export async function createOrderWithLogs({ order, user }) {
  const { data, error } = await supabase
    .from("orders")
    .insert(order)
    .select()
    .single()

  if (error) throw error

  await logOrderEvent({
    user_id: user.id,
    order_id: data.id,
    action: "order_created",
    role: "admin",
    message: "Order created"
  })

  return data
}

// UPDATE order status
export async function updateOrderStatus({ orderId, newStatus, user }) {
  const { data, error } = await supabase
    .from("orders")
    .update({ status: newStatus })
    .eq("id", orderId)
    .select()
    .single()

  if (error) throw error

  await logOrderEvent({
    user_id: user.id,
    order_id: orderId,
    action: "status_changed",
    role: "admin",
    message: `Status changed to ${newStatus}`
  })

  return data
}

// ASSIGN appraiser
export async function assignAppraiser({ orderId, appraiserId, user }) {
  const { data, error } = await supabase
    .from("orders")
    .update({ appraiser_id: appraiserId })
    .eq("id", orderId)
    .select()
    .single()

  if (error) throw error

  await logOrderEvent({
    user_id: user.id,
    order_id: orderId,
    action: "assigned",
    role: "admin",
    message: `Assigned to appraiser ${appraiserId}`
  })

  return data
}

