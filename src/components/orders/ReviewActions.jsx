import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import logOrderEvent from "@/lib/utils/logOrderEvent"
import { useUser } from "@supabase/auth-helpers-react"

export default function ReviewActions({ order }) {
  const [loading, setLoading] = useState(false)
  const user = useUser()

  const handleDecision = async (decision) => {
    if (!user || !user.id || !order?.id) return
    setLoading(true)

    const updatedStatus = decision === "approve" ? "Completed" : "Needs Revisions"

    const { error } = await supabase
      .from("orders")
      .update({ status: updatedStatus })
      .eq("id", order.id)

    if (error) {
      console.error("Review status update failed:", error)
      setLoading(false)
      return
    }

    await logOrderEvent({
      user_id: user.id,
      order_id: order.id,
      role: "reviewer",
      action: decision === "approve" ? "review_approved" : "review_rejected",
      message: decision === "approve"
        ? "Review approved"
        : "Revisions requested"
    })

    setLoading(false)
  }

  return (
    <div className="flex gap-2">
      <button onClick={() => handleDecision("approve")} disabled={loading}>
        Approve
      </button>
      <button onClick={() => handleDecision("reject")} disabled={loading}>
        Request Revisions
      </button>
    </div>
  )
}
