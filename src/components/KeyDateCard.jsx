// components/KeyDateCard.jsx
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

const KeyDateCard = ({ label, date, icon }) => {
  return (
    <Card className="w-full mb-2">
      <CardContent className="flex items-center justify-between p-3">
        <div className="flex items-center space-x-2">
          {icon && <span className="text-lg">{icon}</span>}
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
        </div>
        <span className="text-sm text-foreground">{date}</span>
      </CardContent>
    </Card>
  );
};

export default KeyDateCard;
