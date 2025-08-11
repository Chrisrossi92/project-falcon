import React, { useEffect, useState } from "react";
import { getActivityLog, postActivityComment } from "@/lib/api/activities";
import { ScrollArea, Panel, Input, Button } from "@/components/ui";
import { formatDistanceToNow } from "date-fns";


export default function OrderActivityPanel({ orderId, user }) {
  const [log, setLog] = useState([]);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLog() {
      const res = await getActivityLog(orderId);
      if (res) setLog(res);
      setLoading(false);
    }
    fetchLog();
  }, [orderId]);

  async function handlePostComment() {
    if (!comment.trim()) return;
    const res = await postActivityComment(orderId, comment);
    if (res) {
      setLog((prev) => [...prev, res]);
      setComment("");
    }
  }

  return (
    <Panel title="Activity Log" className="h-[320px] flex flex-col">
      <ScrollArea className="flex-1 overflow-y-auto pr-2">
        <div className="space-y-2">
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : log.length === 0 ? (
            <p className="text-muted-foreground text-sm">No activity yet.</p>
          ) : (
            log.map((item) => (
              <div key={item.id} className="text-sm">
                <p className="font-medium">{item.user_name || "User"}:</p>
                <p className="text-muted-foreground">{item.message}</p>
                <p className="text-xs text-muted-foreground">{new Date(item.timestamp).toLocaleString()}</p>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Comment input */}
      <div className="border-t pt-2 mt-2 flex gap-2">
        <Input
          placeholder="Add a comment..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <Button onClick={handlePostComment} disabled={!comment.trim()}>
          Post
        </Button>
      </div>
    </Panel>
  );
}








