"use client";

import Link from 'next/link';
import { Eye } from 'lucide-react';

// Define the shape of the order data for the list
export interface OrderSummary {
  id: string;
  created_at: string;
  full_name: string;
  total_amount: string;
  status: 'PENDING' | 'PAID' | 'PROCESSING' | 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
  item_count: string;
}

// --- THIS IS THE OBJECT TO UPDATE ---
const statusColors: { [key in OrderSummary['status']]: string } = {
  PAID: 'bg-blue-100 text-blue-800',
  PROCESSING: 'bg-purple-100 text-purple-800', // <-- ADD
  PACKED: 'bg-gray-100 text-gray-800',        // <-- ADD
  SHIPPED: 'bg-indigo-100 text-indigo-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-yellow-100 text-yellow-800',   // <-- ADD
  PENDING: 'bg-yellow-100 text-yellow-800',
};
// --- END OF UPDATE ---

export default function OrderTable({ orders }: { orders: OrderSummary[] }) {
  // --- DEBUGGING STEP ---
  // You can add this log to confirm data is arriving in the component
  // console.log("Orders received in table component:", orders);

  if (!orders || orders.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        <p>No orders found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        {/* --- TABLE HEADER --- */}
        <thead>
          <tr className="border-b">
            <th className="px-4 py-3 font-medium text-gray-500">Order ID</th>
            <th className="px-4 py-3 font-medium text-gray-500">Customer</th>
            <th className="px-4 py-3 font-medium text-gray-500">Date</th>
            <th className="px-4 py-3 font-medium text-gray-500">Total</th>
            <th className="px-4 py-3 font-medium text-gray-500">Status</th>
            <th className="px-4 py-3 font-medium text-center text-gray-500">Items</th>
            <th className="px-4 py-3 font-medium text-gray-500">Actions</th>
          </tr>
        </thead>
        {/* --- TABLE BODY WITH DATA MAPPING --- */}
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-b hover:bg-gray-50">
              <td className="px-4 py-3 font-mono text-sm text-gray-500">
                ...{order.id.slice(-12)}
              </td>
              <td className="px-4 py-3 font-medium text-gray-900">{order.full_name}</td>
              <td className="px-4 py-3 text-gray-600">
                {new Date(order.created_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 font-semibold">
                LKR {Number(order.total_amount).toFixed(2)}
              </td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[order.status]}`}>
                  {order.status}
                </span>
              </td>
              <td className="px-4 py-3 text-center text-gray-600">{order.item_count}</td>
              <td className="px-4 py-3">
                <Link 
                  href={`/admin/orders/${order.id}`} 
                  className="inline-flex items-center p-2 text-gray-500 rounded-md hover:bg-gray-100 hover:text-primary"
                  title="View Details"
                >
                  <Eye size={16} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}