// src/components/ActiveOrdersList.jsx
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const ActiveOrdersList = ({ orders = [], selectedOrderId = null }) => {
  const navigate = useNavigate();

  const activeOrders = orders?.filter((o) => o.status !== 'Completed') || [];

  // Refs for each order card
  const orderRefs = useRef({});

  // Scroll and highlight when selectedOrderId changes
  const lastHighlightedRef = useRef(null);

useEffect(() => {
  if (selectedOrderId && orderRefs.current[selectedOrderId]) {
    const newEl = orderRefs.current[selectedOrderId];

    // Remove ring from previous
    if (lastHighlightedRef.current && lastHighlightedRef.current !== newEl) {
      lastHighlightedRef.current.classList.remove('ring-4', 'ring-blue-400');
    }

    // Scroll to and highlight new one
    newEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    newEl.classList.add('ring-4', 'ring-blue-400');

    lastHighlightedRef.current = newEl;

    const timeout = setTimeout(() => {
      newEl.classList.remove('ring-4', 'ring-blue-400');
      if (lastHighlightedRef.current === newEl) {
        lastHighlightedRef.current = null;
      }
    }, 2000);

    return () => clearTimeout(timeout);
  }
}, [selectedOrderId]);

  return (
    <div>
      {activeOrders.length === 0 ? (
        <p className="text-gray-400 italic">No active orders.</p>
      ) : (
        activeOrders.map((order) => (
          <div
            key={order.id}
            ref={(el) => (orderRefs.current[order.id] = el)}
            onClick={() => navigate(`/order-detail/${order.id}`)}
            className="border p-4 rounded-xl mb-3 bg-gray-50 hover:bg-blue-50 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
          >
            <p className="font-semibold text-gray-800 text-lg">{order.address}</p>
            <p className="text-sm text-gray-500">Due: {order.due_date}</p>
          </div>
        ))
      )}
    </div>
  );
};

export default ActiveOrdersList;

