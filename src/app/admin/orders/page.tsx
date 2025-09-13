import OrderTable from './_components/OrderTable';

// Define the shape of the order data for the list
export interface OrderSummary {
  id: string;
  created_at: string;
  full_name: string;
  total_amount: string;
  status: 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  item_count: string;
}

async function getOrders(): Promise<OrderSummary[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/orders`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch orders');
  return res.json();
}

export default async function AdminOrdersPage() {
  const orders = await getOrders();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
      <div className="p-6 bg-white rounded-lg shadow-md">
        <OrderTable orders={orders} />
      </div>
    </div>
  );
}