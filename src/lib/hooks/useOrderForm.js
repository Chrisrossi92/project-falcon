import { useState, useEffect } from "react"
import  supabase  from "@/lib/supabaseClient"
import logOrderEvent from "@/lib/utils/logOrderEvent"
import { useUser } from "@supabase/auth-helpers-react"

export default function useOrderForm(initialOrder) {
  const [order, setOrder] = useState(initialOrder)
  const [originalOrder, setOriginalOrder] = useState(initialOrder)
  const [saving, setSaving] = useState(false)
  const user = useUser()

  useEffect(() => {
    setOrder(initialOrder)
    setOriginalOrder(initialOrder)
  }, [initialOrder])

  const handleChange = (field, value) => {
    setOrder((prev) => ({ ...prev, [field]: value }))
  }

  const saveOrder = async () => {
    if (!user || !user.id || !order?.id) return

    setSaving(true)
    const updates = { ...order, updated_at: new Date().toISOString() }

    const { data, error } = await supabase
      .from("orders")
      .update(updates)
      .eq("id", order.id)
      .select()
      .single()

    if (error) {
      console.error("Failed to save order:", error)
      setSaving(false)
      return
    }

    await logFieldChanges(user.id, originalOrder, updates)
    setOriginalOrder(data)
    setSaving(false)
  }

  const logFieldChanges = async (userId, oldOrder, newOrder) => {
    const changes = []

    if (oldOrder.fee !== newOrder.fee) {
      changes.push({
        action: "fee_updated",
        message: `Fee changed to $${newOrder.fee}`,
      })
    }

    if (oldOrder.branch !== newOrder.branch) {
      changes.push({
        action: "branch_changed",
        message: `Branch changed to ${newOrder.branch}`,
      })
    }

    if (oldOrder.appraiser_id !== newOrder.appraiser_id) {
      changes.push({
        action: "assigned",
        message: `Assigned to appraiser ${newOrder.appraiser_id}`,
      })
    }

    if (oldOrder.due_date !== newOrder.due_date) {
      changes.push({
        action: "due_date_updated",
        message: `Due date changed to ${newOrder.due_date}`,
      })
    }

    const promises = changes.map((change) =>
      logOrderEvent({
        user_id: userId,
        order_id: newOrder.id,
        role: "admin", // or infer from session
        action: change.action,
        message: change.message,
      })
    )

    await Promise.all(promises)
  }

  return {
    order,
    handleChange,
    saveOrder,
    saving,
  }
}




