import CustomerTable from './_components/CustomerTable';
import type { CustomerData } from './_components/CustomerTable';
import { resolveServerBaseUrl, serializeRequestCookies } from '@/lib/server-urls';
import { CircleDollarSign, TrendingUp, Users, ShoppingCart } from 'lucide-react';

async function getCustomers(): Promise<CustomerData[]> {
  try {
    const baseUrl = await resolveServerBaseUrl();
    const serializedCookies = await serializeRequestCookies();

    const res = await fetch(`${baseUrl}/api/admin/customers`, {
      cache: 'no-store',
      headers: {
        ...(serializedCookies ? { cookie: serializedCookies } : {}),
        'Accept': 'application/json',
      },
      credentials: 'include',
    });

    if (!res.ok) {
      console.error("API Error:", await res.text());
      throw new Error('Failed to fetch customers');
    }
    return res.json();
  } catch (error) {
    console.error("getCustomers function error:", error);
    return [];
  }
}

export default async function AdminCustomersPage() {
  const customers = await getCustomers();
  const totalCustomers = customers.length;
  const totalOrders = customers.reduce((sum, customer) => sum + Number(customer.order_count ?? 0), 0);
  const lifetimeValue = customers.reduce((sum, customer) => sum + Number(customer.total_spent ?? 0), 0);
  const averageValue = totalCustomers ? lifetimeValue / totalCustomers : 0;
  const topCustomer = customers.reduce<CustomerData | null>((current, candidate) => {
    if (!candidate) return current;
    if (!current) return candidate;
    return Number(candidate.total_spent ?? 0) > Number(current.total_spent ?? 0) ? candidate : current;
  }, null);

  const formatter = new Intl.NumberFormat('en-US');
  const currencyFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
  const stats = [
    {
      name: 'Total customers',
      value: formatter.format(totalCustomers),
      icon: Users,
      accent: 'from-primary/10 via-primary/5 to-white text-primary',
    },
    {
      name: 'Lifetime orders',
      value: formatter.format(totalOrders),
      icon: ShoppingCart,
      accent: 'from-emerald-100 via-emerald-50 to-white text-emerald-700',
    },
    {
      name: 'Lifetime value',
      value: `LKR ${currencyFormatter.format(lifetimeValue)}`,
      icon: CircleDollarSign,
      accent: 'from-slate-200 via-slate-100 to-white text-slate-700',
    },
    {
      name: 'Avg. per customer',
      value: `LKR ${currencyFormatter.format(averageValue)}`,
      icon: TrendingUp,
      accent: 'from-amber-100 via-amber-50 to-white text-amber-700',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
      </div>
      {!!totalCustomers && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

          {topCustomer && (
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Top spender</p>
                <p className="text-lg font-semibold text-slate-900">
                  {topCustomer.first_name} {topCustomer.last_name}
                </p>
                <p className="text-sm text-slate-500">{topCustomer.email}</p>
              </div>
              <div className="text-right sm:text-left">
                <p className="text-xs uppercase tracking-wide text-slate-400">Lifetime value</p>
                <p className="text-xl font-semibold text-primary">
                  LKR {currencyFormatter.format(Number(topCustomer.total_spent ?? 0))}
                </p>
                <p className="text-xs text-slate-500">
                  Orders: {formatter.format(Number(topCustomer.order_count ?? 0))}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
      <div className="rounded-lg bg-white p-4 shadow-md sm:p-6">
        <CustomerTable customers={customers} />
      </div>
    </div>
  );
}