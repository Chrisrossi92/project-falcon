// src/components/ui/FormCard.jsx

import React from "react";
import { cn } from "@/lib/utils"; // if you're using a classnames helper

export default function FormCard({ title, children, className }) {
  return (
    <div className={cn("bg-white shadow-sm rounded-lg border p-6", className)}>
      {title && <h2 className="text-lg font-semibold mb-4">{title}</h2>}
      {children}
    </div>
  );
}
