"use client";

import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
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

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
      <div className="flex items-center justify-center min-h-screen">
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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
        {orders.length > 0 && (
          <button
            onClick={handleDeleteAllOrders}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Delete all orders"
          >
            <Trash2 size={16} />
            {isDeleting ? 'Deleting...' : `Delete All Orders (${orders.length})`}
          </button>
        )}
      </div>
      <div className="p-6 bg-white rounded-lg shadow-md">
        <OrderTable orders={orders} onOrderDeleted={fetchOrders} />
      </div>
    </div>
  );
}