import React from 'react';

const Badge = ({ text, type = 'default' }) => {
  const colors = {
    default: 'bg-gray-200 text-gray-700',
    inProgress: 'bg-blue-100 text-blue-700',
    review: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-700',
  };

  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[type] || colors.default}`}>
      {text}
    </span>
  );
};

export default Badge;

