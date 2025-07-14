import React from 'react';

const DashboardCard = ({ title, children, className = '' }) => (
  <div className={`bg-white p-6 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-[1.01] transition-all duration-300 ${className}`}>
    {title && <h2 className="text-xl font-medium mb-4 text-gray-700">{title}</h2>}
    {children}
  </div>
);

export default DashboardCard;
