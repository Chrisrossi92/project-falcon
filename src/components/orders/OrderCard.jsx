// src/components/OrderCard.jsx

import React from "react";
import { useNavigate } from "react-router-dom";
import Badge from '../Badge';
import { Card, CardHeader, CardContent } from "@/components/ui/Card";

export const OrderCard = ({ order }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/orders/${order.id}`);
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold">{order.property_address}</h3>
            <p className="text-sm text-gray-500">
              Due: {new Date(order.due_date).toLocaleDateString()}
            </p>
            <p className="text-sm text-gray-500">
              Status: <Badge variant="outline">{order.status}</Badge>
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Client:</p>
            <p className="text-sm font-medium">{order.client_name || "N/A"}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderCard;

