import { DollarSign, Package, ShoppingCart } from 'lucide-react';
import React from 'react';

// Type definitions for dashboard data
interface DashboardOrder {
  id: string;
  customer: string;
  date: string;
  amount: string;
  status: string;
}

interface DashboardData {
  totalRevenue: number;
  totalSales: number;
  totalCustomers: number;
  totalStock: number;
  totalProducts: number;
  totalVariants: number;
  recentOrders: DashboardOrder[];
}

// Reusable Stat Card Component
const StatCard = ({ title, value, icon: Icon, change }: { title: string; value: string | number; icon: React.ElementType; change?: string }) => (
  <div className="p-6 bg-white rounded-lg shadow-md">
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-gray-500">{title}</span>
      <Icon className="w-6 h-6 text-gray-400" />
    </div>
    <div className="mt-2">
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {change && <p className="mt-1 text-sm text-green-500">{change}</p>}
    </div>
  </div>
);

async function getDashboardData(): Promise<DashboardData> {
  // This fetch now works because process.env.NEXT_PUBLIC_APP_URL is defined
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/dashboard/stats`, {
    cache: 'no-store', // Ensure data is always fresh
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Failed to fetch dashboard data:", res.status, errorText);
    throw new Error('Failed to fetch dashboard data');
  }
  return res.json();
}


export default async function DashboardPage() {
  const data = await getDashboardData();
  const { totalRevenue, totalStock, totalProducts, totalVariants, recentOrders } = data;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
      
      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Revenue" value={`$${Number(totalRevenue).toLocaleString()}`} icon={DollarSign} />
        <StatCard title="Total Products" value={totalProducts} icon={Package} />
        <StatCard title="Total Variants" value={totalVariants} icon={ShoppingCart} />
        <StatCard title="Stock Available" value={totalStock} icon={Package} />
      </div>
      
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Recent Orders Table */}
        <div className="p-6 bg-white rounded-lg shadow-md lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Recent Orders</h2>
          {recentOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-2 font-medium text-gray-500">Order ID</th>
                    <th className="px-4 py-2 font-medium text-gray-500">Customer</th>
                    <th className="px-4 py-2 font-medium text-gray-500">Date</th>
                    <th className="px-4 py-2 font-medium text-gray-500">Amount</th>
                    <th className="px-4 py-2 font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order: DashboardOrder) => (
                    <tr key={order.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-primary">{order.id}</td>
                      <td className="px-4 py-3">{order.customer}</td>
                      <td className="px-4 py-3 text-gray-600">{order.date}</td>
                      <td className="px-4 py-3 font-semibold">{order.amount}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          order.status === 'Shipped' ? 'bg-blue-100 text-blue-800' : 
                          order.status === 'Processing' ? 'bg-yellow-100 text-yellow-800' : 
                          order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 rounded-md bg-gray-50">
              <p className="text-gray-500">No recent orders found.</p>
            </div>
          )}
        </div>
        
        {/* Sales Chart Placeholder */}
        <div className="p-6 bg-white rounded-lg shadow-md">
           <h2 className="mb-4 text-lg font-semibold text-gray-900">Sales Overview</h2>
           <div className="flex items-center justify-center h-64 bg-gray-100 rounded-md">
             <p className="text-gray-500">[Chart component would go here]</p>
           </div>
        </div>
      </div>
    </div>
  );
}