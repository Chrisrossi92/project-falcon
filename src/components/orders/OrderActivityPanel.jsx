import React, { useEffect, useState } from "react";
import { useSession } from "@/lib/hooks/useSession";
import supabase from "@/lib/supabaseClient";
import clsx from "clsx";

export default function OrderActivityPanel({ orderId }) {
  const { user } = useSession();
  const [entries, setEntries] = useState([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    const fetchLog = async () => {
      const { data, error } = await supabase
        .from("activity_log")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });

      if (!error) setEntries(data);
    };

    fetchLog();
  }, [orderId]);

  const handleSubmit = async () => {
    if (!input.trim()) return;

    const { error } = await supabase.from("activity_log").insert({
      order_id: orderId,
      user_id: user.id,
      type: "message",
      message: input.trim(),
    });

    if (!error) {
      setEntries([...entries, {
        id: Math.random(), // fake ID for now
        order_id: orderId,
        user_id: user.id,
        type: "message",
        message: input.trim(),
        created_at: new Date().toISOString(),
      }]);
      setInput("");
    }
  };

  return (
    <div className="flex flex-col h-[400px] border rounded-xl p-4 bg-gray-50 shadow-sm">
      <div className="flex-1 overflow-y-auto space-y-2 pr-2">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className={clsx("max-w-[70%] px-3 py-2 rounded-md", {
              "bg-blue-100 ml-auto text-right": entry.user_id === user.id,
              "bg-gray-200 mr-auto text-left": entry.user_id !== user.id,
              "text-gray-500 text-xs text-center bg-transparent": entry.type === "event",
            })}
          >
            {entry.type === "message" ? entry.message : `• ${entry.message}`}
            <div className="text-[10px] mt-1 text-gray-400">
              {new Date(entry.created_at).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center">
        <input
          type="text"
          className="flex-1 border rounded-l px-3 py-2 text-sm"
          placeholder="Add a message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded-r text-sm"
          onClick={handleSubmit}
        >
          Send
        </button>
      </div>
    </div>
  );
}
