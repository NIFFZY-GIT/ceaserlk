import React from 'react';
import OrderCard from '@/app/profile/components/OrderCard';
import type { Order } from '@/lib/types';
import Link from 'next/link';

interface OrderHistoryProps {
  orders: Order[];
}

const OrderHistory = ({ orders }: OrderHistoryProps) => {
  // Calculate order statistics
  const totalOrders = orders.length;
  const totalSpent = orders.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0);
  const recentOrders = orders.filter(order => {
    const orderDate = new Date(order.createdAt);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return orderDate > thirtyDaysAgo;
  }).length;

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 pb-4 mb-6 border-b sm:flex-row sm:items-center">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">
          Order History
        </h1>
        {orders.length > 0 && (
          <div className="flex gap-4 text-sm text-gray-400">
            <span className="px-3 py-1 bg-gray-800 rounded-full">
              {totalOrders} Total Orders
            </span>
            <span className="px-3 py-1 bg-gray-800 rounded-full">
              LKR {totalSpent.toFixed(2)} Spent
            </span>
            {recentOrders > 0 && (
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary">
                {recentOrders} Recent
              </span>
            )}
          </div>
        )}
      </div>
      {orders && orders.length > 0 ? (
        <div className="space-y-6">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      ) : (
        <div className="px-4 py-12 text-center">
            <p className="text-gray-500">You haven&apos;t placed any orders yet.</p>
            <Link href="/" passHref>
                <button className="px-6 py-2 mt-4 font-semibold text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700">
                    Start Shopping
                </button>
            </Link>
        </div>
      )}
    </div>
  );
};

export default OrderHistory;