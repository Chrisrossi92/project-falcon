import { useState } from "react"
import  supabase  from "@/lib/supabaseClient"
import logOrderEvent from "@/lib/utils/logOrderEvent"
import { useUser } from "@supabase/auth-helpers-react"

export default function ReviewAssignmentModal({ orderId, onClose }) {
  const [assignee, setAssignee] = useState("")
  const user = useUser()

  const handleAssign = async () => {
    if (!user || !user.id) return

    const { error } = await supabase
      .from("orders")
      .update({ reviewer_id: assignee })
      .eq("id", orderId)

    if (error) {
      console.error("Error assigning reviewer:", error)
      return
    }

    await logOrderEvent({
      user_id: user.id,
      order_id: orderId,
      action: "review_task_created",
      role: "admin",
      message: `Review task assigned to ${assignee}`,
    })

    onClose()
  }

  return (
    <div>
      <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
        {/* Reviewer options here */}
      </select>
      <button onClick={handleAssign}>Assign</button>
    </div>
  )
}

