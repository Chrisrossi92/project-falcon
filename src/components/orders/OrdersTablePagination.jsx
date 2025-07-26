// src/components/OrdersTablePagination.jsx

import React from "react";
import { Button } from "@/components/ui/button";

export default function OrdersTablePagination({ currentPage, totalPages, goToPage }) {
  return (
    <div className="flex justify-center items-center mt-4 gap-4">
      <Button
        onClick={() => goToPage(currentPage - 1)}
        disabled={currentPage === 1}
        variant="outline"
      >
        Prev
      </Button>
      <span className="text-sm text-gray-700">
        Page {currentPage} of {totalPages}
      </span>
      <Button
        onClick={() => goToPage(currentPage + 1)}
        disabled={currentPage === totalPages}
        variant="outline"
      >
        Next
      </Button>
    </div>
  );
}
