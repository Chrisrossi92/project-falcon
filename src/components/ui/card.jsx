// card.jsx
import React from 'react';

export function Card({ children, className = "", ...props }) {
  return (
    <div
      className={`bg-white p-6 rounded-2xl shadow-xl transition-transform transform hover:scale-[1.01] hover:shadow-2xl ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "", ...props }) {
  return (
    <div className={`font-semibold text-lg mb-2 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardContent({ children, className = "", ...props }) {
  return (
    <div className={`mt-2 ${className}`} {...props}>
      {children}
    </div>
  );
}



