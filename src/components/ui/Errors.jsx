// src/components/ui/Errors.jsx
import React from "react";

export function ErrorState({ message = "Something went wrong." }) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {message}
    </div>
  );
}
