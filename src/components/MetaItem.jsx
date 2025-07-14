// components/MetaItem.jsx
import React from 'react';

const MetaItem = ({ label, value }) => {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-sm text-muted-foreground font-medium">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
};

export default MetaItem;
