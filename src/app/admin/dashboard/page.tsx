import { DollarSign, ShoppingBag, Users, AlertCircle } from 'lucide-react';
import SalesChart from './_components/SalesChart';
import Link from 'next/link';
import { resolveServerBaseUrl, serializeRequestCookies } from '@/lib/server-urls';

// Define types for the data we'll fetch
interface DashboardData {
  kpis: { totalRevenue: string; totalSales: string; newCustomers: string; };
  salesData: { date: string; revenue: number; }[];
  recentOrders: { id: string; full_name: string; total_amount: string; status: string; }[];
  lowStockItems: { name: string; color_name: string; size: string; stock_quantity: number; }[];
}

// --- 2. UPDATE THE DATA FETCHING FUNCTION ---
async function getDashboardData(): Promise<DashboardData | null> {
  try {
  const baseUrl = await resolveServerBaseUrl();
    const serializedCookies = await serializeRequestCookies();

    const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
      cache: 'no-store',
      headers: {
        ...(serializedCookies ? { cookie: serializedCookies } : {}),
        'Accept': 'application/json',
      },
      credentials: 'include',
    });

    if (!res.ok) {
        // Log the actual error from the API for better debugging
        const errorBody = await res.json();
        console.error("API Error Response:", errorBody);
        throw new Error('Failed to fetch dashboard data');
    }
    return res.json();
  } catch (error) {
    console.error(error);
    return null; // Return null on error
  }
}

// Reusable Stat Card Component
const StatCard = ({ title, value, icon: Icon }: { title: string; value: string; icon: React.ElementType }) => (
    <div className="p-6 bg-white rounded-lg shadow-md">
        <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">{title}</span>
            <Icon className="w-6 h-6 text-gray-400" />
        </div>
        <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
    </div>
);

export default async function DashboardPage() {
  const data = await getDashboardData();

  if (!data) {
    return (
        <div className="flex items-center justify-center h-full">
            <div className="p-6 text-center bg-white rounded-lg shadow-md">
                <AlertCircle className="w-12 h-12 mx-auto text-red-500" />
                <h2 className="mt-4 text-xl font-semibold">Could Not Load Dashboard</h2>
                <p className="mt-2 text-gray-500">There was an error fetching the dashboard data. Please try again later.</p>
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Total Revenue" value={`LKR ${Number(data.kpis.totalRevenue).toLocaleString()}`} icon={DollarSign} />
        <StatCard title="Total Sales" value={data.kpis.totalSales} icon={ShoppingBag} />
        <StatCard title="New Customers (30d)" value={data.kpis.newCustomers} icon={Users} />
      </div>
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Sales Chart */}
        <div className="p-6 bg-white rounded-lg shadow-md lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Sales Overview (Last 30 Days)</h2>
          <SalesChart data={data.salesData} />
        </div>

        {/* Recent Orders */}
        <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Recent Orders</h2>
            <div className="space-y-4">
                {data.recentOrders.length > 0 ? data.recentOrders.map(order => (
                    <div key={order.id} className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-gray-800">{order.full_name}</p>
                            <p className="text-sm text-gray-500">LKR {Number(order.total_amount).toFixed(2)}</p>
                        </div>
                        <Link href={`/admin/orders/${order.id}`} className="px-3 py-1 text-xs font-semibold border rounded-full text-primary border-primary hover:bg-primary/10">
                            View
                        </Link>
                    </div>
                )) : <p className="text-sm text-gray-500">No recent orders.</p>}
            </div>
        </div>
      </div>
      
      {/* Low Stock Items */}
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Low Stock Items</h2>
        {data.lowStockItems.length > 0 ? (
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b"><th className="px-4 py-2">Product</th><th className="px-4 py-2">Variant</th><th className="px-4 py-2 text-right">Stock Left</th></tr>
                    </thead>
                    <tbody>
                        {data.lowStockItems.map((item, index) => (
                            <tr key={index} className="border-b">
                                <td className="px-4 py-3 font-medium">{item.name}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">{item.color_name} - {item.size}</td>
                                <td className="px-4 py-3 font-bold text-right text-red-500">{item.stock_quantity}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        ) : <p className="text-sm text-gray-500">No items are low on stock. Well done!</p>}
      </div>
    </div>
  );
}