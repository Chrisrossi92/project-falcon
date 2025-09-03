export default function OrdersTableHeader() {
  return (
    <thead className="text-xs text-muted-foreground border-b">
      <tr>
        <th className="text-left py-2 px-3 w-[112px]">Order #</th>
        <th className="text-left py-2 px-3">Client / Address</th>
        <th className="text-left py-2 px-3 w-[220px]">Quick edit</th>
        <th className="text-left py-2 px-3 w-[120px]">Due</th>
      </tr>
    </thead>
  );
}



