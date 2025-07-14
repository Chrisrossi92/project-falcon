import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient'; // Adjust import if needed
import { logActivity } from '@/lib/logactivity';
import { useSession } from '@/lib/hooks/useSession';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ActivityLog/Badge'; // Assuming you have this; adjust path

const ReviewActions = ({ orderId, currentStatus, onStatusChange }) => {
  const { user } = useSession();
  const [loading, setLoading] = useState(false);

  if (user.role !== 'reviewer' || !['Needs Review', 'In Review'].includes(currentStatus)) {
    return null; // Hide if not applicable
  }

  const handleAction = async (newStatus, actionText) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      await logActivity({
        user_id: user.id,
        order_id: orderId,
        action: `${actionText} order`,
        role: user.role,
        visible_to: ['admin', 'appraiser', 'reviewer'],
        context: { status: newStatus }
      });

      onStatusChange(newStatus); // Callback to refresh parent
    } catch (err) {
      console.error('Review action failed:', err);
      // Add toast error here if using notifications
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-4 mt-4">
      <Button
        variant="outline"
        onClick={() => handleAction('Completed', 'Approved')}
        disabled={loading}
      >
        Approve
      </Button>
      <Button
        variant="destructive"
        onClick={() => handleAction('Needs Review', 'Rejected')}
        disabled={loading}
      >
        Reject
      </Button>
      {loading && <Badge type="inProgress">Processing...</Badge>}
    </div>
  );
};

export default ReviewActions;