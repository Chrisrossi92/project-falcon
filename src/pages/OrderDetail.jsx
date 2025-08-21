// src/pages/OrderDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { LoadingState } from "@/components/ui/Loaders";
import { ErrorState } from "@/components/ui/Errors";

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useSession();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchOrder = async () => {
      setLoading(true);
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

      if (!mounted) return;

      if (error || !data) {
        console.error("Error fetching order:", error?.message);
        setErrorMsg("Order not found.");
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
    return () => {
      mounted = false;
    };
  }, [id]);

  const handleDelete = async () => {
    const { error } = await supabase.from("orders").delete().eq("id", order.id);
    if (error) {
      toast.error("Failed to delete order");
    } else {
      toast.success("Order deleted");
      navigate("/orders");
    }
  };

  if (loading) return <LoadingState label="Loading order…" />;
  if (errorMsg) return <ErrorState message={errorMsg} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Edit Order #{order.id}</h1>
        {isAdmin && (
          <Button variant="destructive" onClick={() => setDeleteConfirmOpen(true)}>
            Delete
          </Button>
        )}
      </div>

      <OrderForm initialOrder={order} />

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







