// src/components/SummaryCard.jsx
import React from 'react';

const SummaryCard = ({ label, count, color, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-xl border-2 ${color} bg-white p-6 text-center shadow hover:shadow-md transition`}
    >
      <div className="text-xl font-bold">{count}</div>
      <div className="text-gray-600">{label}</div>
    </div>
  );
};

export default SummaryCard;

