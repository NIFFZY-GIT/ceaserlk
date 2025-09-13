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
    return <div className="py-12 text-center text-gray-500"><p>No customers found.</p></div>;
  }

  return (
    <div className="overflow-x-auto">
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
              <td className="px-4 py-3 text-gray-600">
                {new Date(customer.created_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-center text-gray-600">{customer.order_count}</td>
              <td className="px-4 py-3 font-semibold text-right text-gray-800">
                LKR {Number(customer.total_spent).toFixed(2)}
              </td>
              <td className="px-4 py-3">
                <Link 
                  href={`/admin/customers/${customer.id}`} 
                  className="inline-flex items-center p-2 text-gray-500 rounded-md hover:bg-gray-100 hover:text-primary"
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
  );
}