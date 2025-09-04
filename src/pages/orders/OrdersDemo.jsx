import OrdersTable from '../../features/orders/OrdersTable';

export default function OrdersDemoPage(){
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Orders (from view)</h1>
      <OrdersTable />
      <p className="text-sm text-gray-500 mt-4">
        Data source: v_orders_list_with_last_activity (sorted by priority then due_date)
      </p>
    </div>
  );
}
