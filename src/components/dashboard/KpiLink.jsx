// src/components/dashboard/KpiLink.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import Card from "@/components/ui/Card.jsx";

export default function KpiLink({ label, value, filter }) {
  const nav = useNavigate();
  const onClick = () => {
    // filter example: { status: "ready_to_send" } or { q: "Acme" }
    const params = new URLSearchParams();
    Object.entries(filter || {}).forEach(([k, v]) => {
      if (v != null && v !== "") params.set(k, String(v));
    });
    nav(`/orders?${params.toString()}`);
  };

  return (
    <div role="button" onClick={onClick} className="cursor-pointer">
      <Card>
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-2xl font-semibold">{value}</div>
      </Card>
    </div>
  );
}
