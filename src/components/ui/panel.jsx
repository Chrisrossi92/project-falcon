// src/components/ui/panel.jsx

import React from "react";

export const Panel = ({ children, className = "" }) => {
  return (
    <div className={`rounded-lg border p-4 shadow ${className}`}>
      {children}
    </div>
  );
};

