import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import OrdersTable from '@/components/orders/OrdersTable';
import { Button } from '@/components/ui/button';
import supabase from '@/lib/supabaseClient';
import { useSession } from '@/lib/hooks/useSession'; // Import useSession for role and user

const Orders = () => {
  const { user, isAdmin, isAppraiser, isReviewer } = useSession(); // Get session details
  const location = useLocation();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]); // State for orders
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [appraiserFilter, setAppraiserFilter] = useState('');
  const [sortField, setSortField] = useState('id');
  const [sortAsc, setSortAsc] = useState(false);

  // Fetch orders based on role
  useEffect(() => {
    const fetchOrders = async () => {
      let query = supabase.from('orders').select('*'); // Add joins if needed: .select('*, users!appraiser_id(*), clients!client_id(*)')

      if (!isAdmin && !isReviewer) { // For appraisers, filter by their ID; adjust field if not 'appraiser_id'
        query = query.eq('appraiser_id', user.id);
      }

      const { data, error: fetchError } = await query;
      console.log('Fetching as admin?', isAdmin); // Debug
      console.log('User ID:', user?.id); // Debug
      console.log('Fetched raw data:', data); // Debug
      if (fetchError) {
        console.error('Orders fetch error:', fetchError);
        setError(fetchError.message);
      } else {
        setOrders(data || []);
      }
      setLoading(false);
    };
    fetchOrders();
  }, [isAdmin, isReviewer, user.id]);

  // Parse URL params on load
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setStatusFilter(params.get('status') || '');
    setAppraiserFilter(params.get('appraiser') || '');
  }, [location.search]);

  // Apply client-side filters and sort whenever orders or filters change
  useEffect(() => {
    let tempOrders = [...orders];

    // Apply status filter if set
    if (statusFilter) {
      tempOrders = tempOrders.filter(order => order.status === statusFilter);
    }

    // Apply appraiser filter if set (for admins/reviewers; appraisers already filtered)
    if (appraiserFilter && (isAdmin || isReviewer)) {
      tempOrders = tempOrders.filter(order => order.appraiser_id === appraiserFilter);
    }

    // Sort
    tempOrders.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    setFilteredOrders(tempOrders);
  }, [orders, statusFilter, appraiserFilter, sortField, sortAsc, isAdmin, isReviewer]);

  const handleClearFilter = () => {
    setStatusFilter('');
    setAppraiserFilter('');
    navigate('/orders'); // Clear URL params
  };

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  if (error) return <div>Error loading orders: {error}</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Orders</h1>
          <Button onClick={() => navigate('/orders/new')}>+ New Order</Button>
        
      </div>

      {/* Filters UI - add dropdowns for status/appraiser if not already */}
      {/* Example: <select value={statusFilter} onChange={(e) => setStatusFilter(e.value)}>...</select> */}
      {/* Update URL on change: navigate(`?status=${newVal}`) */}

      <Button variant="outline" onClick={handleClearFilter} className="mb-4">Clear Filters</Button>

      <OrdersTable
        orders={filteredOrders}
        loading={loading}
        sortField={sortField}
        sortAsc={sortAsc}
        onSortToggle={toggleSort} // Pass if table has sort headers
      />
    </div>
  );
};

export default Orders;









