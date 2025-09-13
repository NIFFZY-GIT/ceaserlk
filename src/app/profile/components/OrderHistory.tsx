import React from 'react';
import OrderCard from '@/app/profile/components/OrderCard';
import type { Order } from '@/lib/types';
import Link from 'next/link';

interface OrderHistoryProps {
  orders: Order[];
}

const OrderHistory = ({ orders }: OrderHistoryProps) => {
  return (
    <div>
      <h1 className="pb-4 mb-6 text-2xl font-bold text-white border-b sm:text-3xl">
        Order History
      </h1>
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