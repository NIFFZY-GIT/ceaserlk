import {
  DollarSign,
  ShoppingBag,
  Users,
  AlertCircle,
  Clock3,
  Ban,
  Warehouse,
  CreditCard,
  PackageSearch,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import SalesChart from './_components/SalesChart';
import Link from 'next/link';
import { resolveServerBaseUrl, serializeRequestCookies } from '@/lib/server-urls';

interface DashboardData {
  kpis: {
    totalRevenue: number;
    totalSales: number;
    newCustomers: number;
    averageOrderValue: number;
  };
  trends: {
    revenueGrowth: number | null;
    salesGrowth: number | null;
    customerGrowth: number | null;
    aovGrowth: number | null;
  };
  salesData: { date: string; revenue: number; orders: number }[];
  recentOrders: {
    id: string;
    full_name: string;
    total_amount: string;
    status: string;
    payment_method?: string | null;
  }[];
  statusBreakdown: { status: string; count: number; revenue: number }[];
  paymentBreakdown: { method: string; count: number; revenue: number }[];
  topProducts: { productName: string; units: number; revenue: number }[];
  lowStockItems: { name: string; color_name: string; size: string; stock_quantity: number; }[];
  alerts: { pendingOrders: number; cancelledLast7d: number; outOfStockCount: number };
}

interface DashboardFetchResult {
  data: DashboardData | null;
  errorMessage: string | null;
}

async function getDashboardData(): Promise<DashboardFetchResult> {
  try {
    const baseUrl = await resolveServerBaseUrl();
    const serializedCookies = await serializeRequestCookies();

    // Helper to fetch dashboard data
    const fetchDashboard = async () => {
      const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
        cache: 'no-store',
        headers: {
          ...(serializedCookies ? { cookie: serializedCookies } : {}),
          'Accept': 'application/json',
        },
        credentials: 'include',
      });
      return res;
    };

    let res = await fetchDashboard();

    // If unauthorized, try to refresh token and retry once
    if (res.status === 401 || res.status === 403) {
      const refreshRes = await fetch(`${baseUrl}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          ...(serializedCookies ? { cookie: serializedCookies } : {}),
          'Content-Type': 'application/json',
        },
      });
      if (refreshRes.ok) {
        // Try fetching dashboard again after refresh
        res = await fetchDashboard();
      } else {
        return {
          data: null,
          errorMessage: 'Your admin session is expired. Please log in again.',
        };
      }
    }

    if (!res.ok) {
      // Parse error payload defensively (API may return empty/non-JSON body).
      let message = `Dashboard API request failed with status ${res.status}.`;
      try {
        const text = await res.text();
        if (text) {
          try {
            const parsed = JSON.parse(text) as { error?: string; message?: string };
            message = parsed.error || parsed.message || message;
          } catch {
            message = text;
          }
        }
      } catch {
        // Keep fallback message.
      }

      if (res.status === 401 || res.status === 403) {
        message = 'Admin authorization failed. Please log in with an admin account.';
      }

      return {
        data: null,
        errorMessage: message,
      };
    }

    return {
      data: await res.json(),
      errorMessage: null,
    };
  } catch (error) {
    void error;
    return {
      data: null,
      errorMessage: 'Unable to load dashboard data due to a network or server issue.',
    };
  }
}

const formatCurrency = (value: number) => `LKR ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const formatPaymentMethod = (method: string) => {
  const normalized = method.trim().toUpperCase();
  if (normalized === 'PAYHERE') return 'PayHere';
  if (normalized === 'KOKO') return 'Koko BNPL';
  if (normalized === 'MINTPAY') return 'MintPay BNPL';
  if (normalized === 'COD') return 'Cash On Delivery';
  return normalized.replace(/_/g, ' ');
};

const getStatusClasses = (status: string) => {
  const normalized = status.toUpperCase();
  if (normalized === 'PAID' || normalized === 'DELIVERED') return 'bg-emerald-100 text-emerald-700';
  if (normalized === 'PENDING' || normalized === 'PROCESSING' || normalized === 'PACKED' || normalized === 'SHIPPED') {
    return 'bg-amber-100 text-amber-700';
  }
  if (normalized === 'CANCELLED' || normalized === 'REFUNDED') return 'bg-red-100 text-red-700';
  return 'bg-slate-100 text-slate-700';
};

const GrowthChip = ({ value }: { value: number | null }) => {
  if (value === null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
        <Minus className="h-3 w-3" />
        New baseline
      </span>
    );
  }

  if (value > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
        <TrendingUp className="h-3 w-3" />
        {value.toFixed(1)}%
      </span>
    );
  }

  if (value < 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
        <TrendingDown className="h-3 w-3" />
        {Math.abs(value).toFixed(1)}%
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
      <Minus className="h-3 w-3" />
      0.0%
    </span>
  );
};

const StatCard = ({
  title,
  value,
  icon: Icon,
  growth,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  growth: number | null;
}) => (
  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
        <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      </div>
      <span className="rounded-lg bg-slate-100 p-2 text-slate-600">
        <Icon className="h-5 w-5" />
      </span>
    </div>
    <div className="mt-3">
      <GrowthChip value={growth} />
      <p className="mt-1 text-xs text-slate-500">Compared to previous 30 days</p>
    </div>
  </div>
);

export default async function DashboardPage() {
  const { data, errorMessage } = await getDashboardData();

  if (!data) {
    return (
        <div className="flex items-center justify-center h-full">
            <div className="p-6 text-center bg-white rounded-lg shadow-md">
                <AlertCircle className="w-12 h-12 mx-auto text-red-500" />
                <h2 className="mt-4 text-xl font-semibold">Could Not Load Dashboard</h2>
                <p className="mt-2 text-gray-500">{errorMessage || 'There was an error fetching the dashboard data. Please try again later.'}</p>
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Deep performance view for the last 30 days.</p>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Revenue (30d)" value={formatCurrency(data.kpis.totalRevenue)} icon={DollarSign} growth={data.trends.revenueGrowth} />
        <StatCard title="Sales (30d)" value={data.kpis.totalSales.toLocaleString()} icon={ShoppingBag} growth={data.trends.salesGrowth} />
        <StatCard title="New Customers" value={data.kpis.newCustomers.toLocaleString()} icon={Users} growth={data.trends.customerGrowth} />
        <StatCard title="Average Order Value" value={formatCurrency(data.kpis.averageOrderValue)} icon={CreditCard} growth={data.trends.aovGrowth} />
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-amber-800">Pending Orders</p>
            <Clock3 className="h-4 w-4 text-amber-700" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-900">{data.alerts.pendingOrders}</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-red-800">Cancelled (7d)</p>
            <Ban className="h-4 w-4 text-red-700" />
          </div>
          <p className="mt-2 text-2xl font-bold text-red-900">{data.alerts.cancelledLast7d}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">Out Of Stock SKUs</p>
            <Warehouse className="h-4 w-4 text-slate-700" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{data.alerts.outOfStockCount}</p>
        </div>
      </div>
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Sales Chart */}
        <div className="p-6 bg-white rounded-lg shadow-md lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Revenue Trend (Last 30 Days)</h2>
          <SalesChart data={data.salesData} />
        </div>

        {/* Payment Mix */}
        <div className="p-6 bg-white rounded-lg shadow-md">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Payment Mix (30d)</h2>
          <div className="space-y-3">
            {data.paymentBreakdown.length > 0 ? data.paymentBreakdown.map((payment) => {
              const totalCount = data.paymentBreakdown.reduce((sum, current) => sum + current.count, 0);
              const share = totalCount > 0 ? (payment.count / totalCount) * 100 : 0;

              return (
                <div key={payment.method}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <p className="font-medium text-slate-700">{formatPaymentMethod(payment.method)}</p>
                    <p className="text-slate-500">{payment.count} orders</p>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full bg-primary" style={{ width: `${share}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{formatCurrency(payment.revenue)} ({share.toFixed(1)}%)</p>
                </div>
              );
            }) : <p className="text-sm text-slate-500">No payment data available.</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Order Status Breakdown (30d)</h2>
          <div className="space-y-3">
            {data.statusBreakdown.length > 0 ? data.statusBreakdown.map((row) => (
              <div key={row.status} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                <div>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${getStatusClasses(row.status)}`}>
                    {row.status}
                  </span>
                  <p className="mt-1 text-xs text-slate-500">{formatCurrency(row.revenue)}</p>
                </div>
                <p className="text-lg font-bold text-slate-900">{row.count}</p>
              </div>
            )) : <p className="text-sm text-slate-500">No status data available.</p>}
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Top Products (30d)</h2>
          <div className="space-y-3">
            {data.topProducts.length > 0 ? data.topProducts.map((product) => (
              <div key={product.productName} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-800">{product.productName}</p>
                  <p className="text-xs text-slate-500">{product.units} units</p>
                </div>
                <p className="text-sm font-semibold text-slate-900">{formatCurrency(product.revenue)}</p>
              </div>
            )) : (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <PackageSearch className="h-4 w-4" />
                No product sales data available.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="p-6 bg-white rounded-lg shadow-md">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Recent Orders</h2>
          <div className="space-y-3">
            {data.recentOrders.length > 0 ? data.recentOrders.map(order => (
              <div key={order.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                <div>
                  <p className="font-medium text-gray-800">{order.full_name}</p>
                  <p className="text-xs text-gray-500">
                    {formatCurrency(Number(order.total_amount))} • {formatPaymentMethod(order.payment_method || 'UNKNOWN')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${getStatusClasses(order.status)}`}>
                    {order.status}
                  </span>
                  <Link href={`/admin/orders/${order.id}`} className="px-3 py-1 text-xs font-semibold border rounded-full text-primary border-primary hover:bg-primary/10">
                    View
                  </Link>
                </div>
              </div>
            )) : <p className="text-sm text-gray-500">No recent orders.</p>}
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
    </div>
  );
}