import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import CustomerDetailView from './_components/CustomerDetailView';

// Define the full nested types for the customer data
export interface CustomerOrder {
  id: string;
  status: string;
  total_amount: string;
  created_at: string;
}
export interface CustomerDetail {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  created_at: string;
  phone_number: string;
  orders: CustomerOrder[];
}

async function getCustomerDetails(id: string): Promise<CustomerDetail | null> {
  try {
    const requestHeaders = new Headers(await headers());
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/customers/${id}`, {
      cache: 'no-store',
      headers: requestHeaders,
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("Failed to fetch customer details");
    return res.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getCustomerDetails(id);

  if (!customer) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <CustomerDetailView customer={customer} />
    </div>
  );
}