"use client";

import Link from 'next/link';
import { Eye, ShoppingCart, Trash2 } from 'lucide-react';

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

export default function OrderTable({ orders, onOrderDeleted }: { 
  orders: OrderSummary[]; 
  onOrderDeleted?: () => void;
}) {
  // --- DEBUGGING STEP ---
  // You can add this log to confirm data is arriving in the component
  // console.log("Orders received in table component:", orders);

  const handleDeleteOrder = async (orderId: string, customerName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the order for ${customerName}? This action cannot be undone.`
    );
    
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete order');
      }

      // If callback is provided, call it to refresh the list
      if (onOrderDeleted) {
        onOrderDeleted();
      } else {
        // Fallback to page refresh if no callback
        window.location.reload();
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Failed to delete order. Please try again.');
    }
  };

  if (!orders || orders.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        <p>No orders found.</p>
      </div>
    );
  }

  const formatTotal = (total: string) => {
    const value = Number(total);
    return Number.isFinite(value) ? `LKR ${value.toFixed(2)}` : 'N/A';
  };

  const formatDateTime = (value: string) => new Date(value).toLocaleString();

  return (
    <div className="space-y-6">
      <div className="space-y-4 md:hidden">
        {orders.map((order) => (
          <div
            key={order.id}
            className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100/60 p-5 shadow-sm transition hover:border-slate-300 hover:shadow-lg"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900/90 text-white">
                <ShoppingCart className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-wide text-slate-400">
                      ...{order.id.slice(-10)}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-slate-900">{order.full_name}</h3>
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      {formatDateTime(order.created_at)}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusColors[order.status]}`}
                  >
                    {order.status}
                  </span>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-400">Order total</dt>
                    <dd className="text-base font-semibold text-slate-900">{formatTotal(order.total_amount)}</dd>
                  </div>
                  <div className="text-right">
                    <dt className="text-xs uppercase tracking-wide text-slate-400">Items</dt>
                    <dd className="text-base font-semibold text-slate-900">{order.item_count}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Link
                href={`/admin/orders/${order.id}`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
              >
                <Eye size={16} />
                View order
              </Link>
              <button
                onClick={() => handleDeleteOrder(order.id, order.full_name)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 sm:w-auto"
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left">
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
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-sm text-gray-500">
                  ...{order.id.slice(-12)}
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">{order.full_name}</td>
                <td className="px-4 py-3 text-gray-600">{formatDateTime(order.created_at)}</td>
                <td className="px-4 py-3 font-semibold">
                  {formatTotal(order.total_amount)}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[order.status]}`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-gray-600">{order.item_count}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="inline-flex items-center p-2 text-gray-500 rounded-md hover:bg-gray-100 hover:text-primary"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </Link>
                    <button
                      onClick={() => handleDeleteOrder(order.id, order.full_name)}
                      className="inline-flex items-center p-2 text-gray-500 rounded-md hover:bg-red-100 hover:text-red-600"
                      title="Delete Order"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}