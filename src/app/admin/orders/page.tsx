"use client";

import { useState, useEffect, useMemo } from 'react';
import { CircleDollarSign, ListChecks, ShoppingCart, Trash2, Undo2 } from 'lucide-react';
import OrderTable from './_components/OrderTable';

// Define the shape of the order data for the list
export interface OrderSummary {
  id: string;
  created_at: string;
  full_name: string;
  total_amount: string;
  status: 'PENDING' | 'PAID' | 'PROCESSING' | 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
  item_count: string;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const numberFormatter = useMemo(() => new Intl.NumberFormat('en-US'), []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/orders`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error('Failed to fetch orders');
      }
      const data = await res.json();
      setOrders(data);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllOrders = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ALL ${orders.length} orders? This action cannot be undone and will permanently delete all order data and order items.`
    );
    
    if (!confirmed) return;

    // Double confirmation for such a destructive action
    const doubleConfirmed = window.confirm(
      "This is your final warning! Are you absolutely certain you want to delete ALL orders? Type 'DELETE ALL' in your mind and click OK to proceed."
    );
    
    if (!doubleConfirmed) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/admin/orders`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete all orders');
      }

      const result = await response.json();
      alert(`Successfully deleted ${result.deletedOrdersCount} orders and ${result.deletedItemsCount} order items.`);
      
      // Refresh the orders list
      await fetchOrders();
    } catch (error) {
      console.error('Error deleting all orders:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to delete all orders: ${errorMessage}`);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-4 border-4 border-gray-300 rounded-full border-t-primary animate-spin"></div>
          <p className="text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
        <div className="p-6 bg-red-50 border border-red-300 rounded-lg">
          <p className="text-red-600">Error loading orders: {error}</p>
          <button 
            onClick={fetchOrders}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
        {orders.length > 0 && (
          <button
            onClick={handleDeleteAllOrders}
            disabled={isDeleting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            title="Delete all orders"
          >
            <Trash2 size={16} />
            {isDeleting ? 'Deleting...' : `Delete All Orders (${orders.length})`}
          </button>
        )}
      </div>
      <OrdersSummary orders={orders} formatter={numberFormatter} />
      <div className="rounded-lg bg-white p-4 shadow-md sm:p-6">
        <OrderTable orders={orders} onOrderDeleted={fetchOrders} />
      </div>
    </div>
  );
}

type OrdersSummaryProps = {
  orders: OrderSummary[];
  formatter: Intl.NumberFormat;
};

const OrdersSummary = ({ orders, formatter }: OrdersSummaryProps) => {
  if (!orders.length) {
    return null;
  }

  const pendingCount = orders.filter((order) => order.status === 'PENDING').length;
  const fulfilledStatuses: OrderSummary['status'][] = ['PAID', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED'];
  const fulfilledCount = orders.filter((order) => fulfilledStatuses.includes(order.status)).length;
  const cancelledCount = orders.filter((order) => ['CANCELLED', 'REFUNDED'].includes(order.status)).length;
  const revenueTotal = orders.reduce((sum, order) => sum + Number(order.total_amount ?? 0), 0);

  const stats = [
    {
      name: 'Total orders',
      value: formatter.format(orders.length),
      icon: ShoppingCart,
      accent: 'from-primary/10 via-primary/5 to-white text-primary',
    },
    {
      name: 'Pending',
      value: formatter.format(pendingCount),
      icon: Undo2,
      accent: 'from-amber-100 via-amber-50 to-white text-amber-700',
    },
    {
      name: 'Fulfilled / Processing',
      value: formatter.format(fulfilledCount),
      icon: ListChecks,
      accent: 'from-emerald-100 via-emerald-50 to-white text-emerald-700',
    },
    {
      name: 'Cancelled / Refunded',
      value: formatter.format(cancelledCount),
      icon: Trash2,
      accent: 'from-rose-100 via-rose-50 to-white text-rose-700',
    },
    {
      name: 'Revenue',
      value: `LKR ${formatter.format(revenueTotal)}`,
      icon: CircleDollarSign,
      accent: 'from-slate-200 via-slate-100 to-white text-slate-700',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
      {stats.map(({ name, value, icon: Icon, accent }) => (
        <div
          key={name}
          className={`rounded-2xl border border-white/60 bg-gradient-to-br ${accent} p-4 shadow-sm backdrop-blur transition hover:shadow-md`}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/70">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{name}</p>
              <p className="text-base font-semibold text-slate-900">{value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};