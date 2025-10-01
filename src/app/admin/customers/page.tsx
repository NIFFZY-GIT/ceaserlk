import CustomerTable from './_components/CustomerTable';
import type { CustomerData } from './_components/CustomerTable';
import { resolveServerBaseUrl, serializeRequestCookies } from '@/lib/server-urls';

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