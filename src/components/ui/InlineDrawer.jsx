import React from "react";

export default function InlineDrawer({ isOpen, children }) {
  if (!isOpen) return null;

  return (
    <div className="bg-gray-50 p-4 border border-t-0 border-gray-200 rounded-b-xl">
      {children}
    </div>
  );
}



