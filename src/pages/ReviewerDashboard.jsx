import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shell } from "@/components/layout/shell";
import { useAuth } from "@/lib/hooks/useAuth";
import ReviewModal from "@/components/review/ReviewModal";

const ReviewerDashboard = () => {
  const { user } = useAuth();
  const [assignedReviews, setAssignedReviews] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [openReviewModal, setOpenReviewModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshReviews = async () => {
    if (!user?.id) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("review_flow")
      .select("*, orders(*), assigned_by_user:assigned_by(name)")
      .eq("assigned_to", user.id)
      .not("status", "in", ["complete", "approved"]) // hide completed or fully approved
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching assigned reviews:", error);
      setAssignedReviews([]);
    } else {
      setAssignedReviews(data);
    }

    setLoading(false);
  };

  useEffect(() => {
    refreshReviews();
  }, [user]);

  const handleOpenReview = (order) => {
    setSelectedOrder(order);
    setOpenReviewModal(true);
  };

  const handleCloseReview = () => {
    setSelectedOrder(null);
    setOpenReviewModal(false);
  };

  return (
    <Shell title="Reviewer Dashboard">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome, Reviewer</h1>
        <p className="text-muted-foreground">
          Below are the appraisal reports currently assigned to you for review.
        </p>
      </div>

      <Card className="p-4">
        {loading ? (
          <p>Loading...</p>
        ) : assignedReviews.length === 0 ? (
          <p>No active reviews assigned to you.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left py-2 px-3">Order #</th>
                  <th className="text-left py-2 px-3">Address</th>
                  <th className="text-left py-2 px-3">Assigned By</th>
                  <th className="text-left py-2 px-3">Status</th>
                  <th className="text-left py-2 px-3">Created</th>
                  <th className="text-left py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignedReviews.map((flow) => (
                  <tr key={flow.id} className="border-t">
                    <td className="py-2 px-3">{flow.order_id}</td>
                    <td className="py-2 px-3">
                      {flow.orders?.property_address || "N/A"}
                    </td>
                    <td className="py-2 px-3">
                      {flow.assigned_by_user?.name || "Unknown"}
                    </td>
                    <td className="py-2 px-3 capitalize">{flow.status}</td>
                    <td className="py-2 px-3">
                      {new Date(flow.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2 px-3">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenReview(flow.orders)}
                      >
                        Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selectedOrder && (
        <ReviewModal
          open={openReviewModal}
          onClose={handleCloseReview}
          order={selectedOrder}
          refreshOrders={refreshReviews}
        />
      )}
    </Shell>
  );
};

export default ReviewerDashboard;


