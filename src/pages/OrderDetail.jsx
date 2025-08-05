// src/pages/OrderDetail.jsx

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import supabase from "@/lib/supabaseClient";
import OrderForm from "@/components/orders/OrderForm";
import { useSession } from "@/lib/hooks/useSession";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useSession();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          client:client_id ( name ),
          appraiser:appraiser_id ( name )
        `
        )
        .eq("id", id)
        .single();

      if (error || !data) {
        console.error("Error fetching order:", error?.message);
        setError("Order not found.");
        navigate("/orders");
      } else {
        const transformed = {
          ...data,
          client_name: data.client?.name || data.manual_client || "—",
          appraiser_name: data.appraiser?.name || data.manual_appraiser || "—",
        };
        setOrder(transformed);
      }

      setLoading(false);
    };

    fetchOrder();
  }, [id, navigate]);

  const handleDelete = async () => {
    const { error } = await supabase.from("orders").delete().eq("id", order.id);
    if (error) {
      toast.error("Failed to delete order");
    } else {
      toast.success("Order deleted");
      navigate("/orders");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-gray-500" />
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-red-600 font-medium">{error}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Edit Order #{order.id}</h1>

      <OrderForm
  order={order}
  setOrder={setOrder}
  mode="edit"
  isAdmin={isAdmin}
  onDeleteClick={() => setDeleteConfirmOpen(true)}
/>

     <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This will permanently delete Order #{order.id}. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}




