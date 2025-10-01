"use client";

import { Eye } from 'lucide-react';
import Link from 'next/link';

// --- Best practice: Define and export the type here ---
export interface CustomerData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
  order_count: string;
  total_spent: string;
}

// --- Fix: Use 'export default' for the component function ---
export default function CustomerTable({ customers }: { customers: CustomerData[] }) {
  if (!customers || customers.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        <p>No customers found.</p>
      </div>
    );
  }

  const formatCurrency = (value: string) => {
    const amount = Number(value);
    return Number.isFinite(amount) ? `LKR ${amount.toFixed(2)}` : 'N/A';
  };

  const formatDate = (value: string) => new Date(value).toLocaleDateString();
  const getInitials = (first: string, last: string) => {
    const firstInitial = first?.[0] ?? '';
    const lastInitial = last?.[0] ?? '';
    return `${firstInitial}${lastInitial}`.toUpperCase() || 'C';
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4 md:hidden">
        {customers.map((customer) => (
          <div
            key={customer.id}
            className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100/60 p-5 shadow-sm transition hover:border-slate-300 hover:shadow-lg"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
                {getInitials(customer.first_name, customer.last_name)}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {customer.first_name} {customer.last_name}
                    </h3>
                    <p className="text-sm text-slate-500">{customer.email}</p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700">
                    Joined {formatDate(customer.created_at)}
                  </span>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-400">Orders</dt>
                    <dd className="text-base font-semibold text-slate-900">{customer.order_count}</dd>
                  </div>
                  <div className="text-right">
                    <dt className="text-xs uppercase tracking-wide text-slate-400">Lifetime value</dt>
                    <dd className="text-base font-semibold text-primary">{formatCurrency(customer.total_spent)}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="mt-4">
              <Link
                href={`/admin/customers/${customer.id}`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <Eye size={16} />
                View details
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="px-4 py-3 font-medium text-gray-600">Email</th>
              <th className="px-4 py-3 font-medium text-gray-600">Joined</th>
              <th className="px-4 py-3 font-medium text-center text-gray-600">Orders</th>
              <th className="px-4 py-3 font-medium text-right text-gray-600">Lifetime Value</th>
              <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {customer.first_name} {customer.last_name}
                </td>
                <td className="px-4 py-3 text-gray-600">{customer.email}</td>
                <td className="px-4 py-3 text-gray-600">{formatDate(customer.created_at)}</td>
                <td className="px-4 py-3 text-center text-gray-600">{customer.order_count}</td>
                <td className="px-4 py-3 font-semibold text-right text-gray-800">
                  {formatCurrency(customer.total_spent)}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/customers/${customer.id}`}
                    className="inline-flex items-center rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-primary"
                    title="View Customer Details"
                  >
                    <Eye size={16} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}