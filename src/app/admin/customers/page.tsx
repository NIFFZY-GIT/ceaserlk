import { headers } from 'next/headers'; // <-- Use 'headers' instead of 'cookies' for the fix
import CustomerTable from './_components/CustomerTable'; // <-- Fix: Default import (no curly braces)
import type { CustomerData } from './_components/CustomerTable'; // <-- Best practice: import type from component

async function getCustomers(): Promise<CustomerData[]> {
  try {
    // --- THIS IS THE FIX for the cookies() error ---
    // We get the headers from the incoming request and forward them.
    const requestHeaders = new Headers(await headers());

    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/customers`, {
      cache: 'no-store',
      headers: requestHeaders, // This forwards the auth cookie
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
      </div>
      <div className="p-6 bg-white rounded-lg shadow-md">
        <CustomerTable customers={customers} />
      </div>
    </div>
  );
}