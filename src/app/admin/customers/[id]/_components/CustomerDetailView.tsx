"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Crown, Loader2, User, Mail, Phone, Calendar, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { CustomerDetail, CustomerOrder } from '../page';

const statusColors: { [key: string]: string } = { PAID: 'bg-blue-100 text-blue-800', SHIPPED: 'bg-indigo-100 text-indigo-800', DELIVERED: 'bg-green-100 text-green-800', CANCELLED: 'bg-red-100 text-red-800', PENDING: 'bg-yellow-100 text-yellow-800', };

export default function CustomerDetailView({ customer }: { customer: CustomerDetail }) {
  const router = useRouter();
  const [currentRole, setCurrentRole] = useState(customer.role);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePromote = async () => {
    if (!window.confirm(`Are you sure you want to promote ${customer.first_name} ${customer.last_name} to an Admin? This action cannot be undone.`)) {
      return;
    }
    setIsUpdating(true);
    setError(null);
    try {
        const res = await fetch(`/api/admin/customers/${customer.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'ADMIN' }),
        });
        if (!res.ok) throw new Error("Failed to promote user.");
        const data = await res.json();
        setCurrentRole(data.role);
    } catch (err: any) {
        setError(err.message);
    } finally {
        setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-8">
      <Link href="/admin/customers" className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"><ArrowLeft size={16}/> Back to Customers</Link>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column: Profile & Actions */}
        <div className="space-y-6 lg:col-span-1">
          <div className="p-6 text-center bg-white rounded-lg shadow-md">
            <div className="relative inline-block">
              <div className="flex items-center justify-center w-24 h-24 mx-auto mb-4 text-3xl font-bold text-white bg-gray-700 rounded-full">{customer.first_name[0]}{customer.last_name[0]}</div>
              {currentRole === 'ADMIN' && <Crown className="absolute w-6 h-6 p-1 text-black bg-yellow-400 border-2 border-white rounded-full -bottom-1 -right-1" />}
            </div>
            <h2 className="text-2xl font-bold">{customer.first_name} {customer.last_name}</h2>
            <p className="text-sm text-gray-500">{currentRole}</p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h3 className="mb-4 text-lg font-semibold">Contact Information</h3>
            <div className="space-y-3 text-sm">
                <p className="flex items-center gap-3"><Mail size={14} className="text-gray-400"/> {customer.email}</p>
                <p className="flex items-center gap-3"><Phone size={14} className="text-gray-400"/> {customer.phone_number || 'Not provided'}</p>
                <p className="flex items-center gap-3"><Calendar size={14} className="text-gray-400"/> Joined {new Date(customer.created_at).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h3 className="mb-4 text-lg font-semibold">Admin Actions</h3>
            <button 
                onClick={handlePromote} 
                disabled={isUpdating || currentRole === 'ADMIN'}
                className="flex items-center justify-center w-full gap-2 px-4 py-2 text-sm font-medium text-white rounded-md bg-primary hover:bg-primary-dark disabled:bg-gray-400 disabled:cursor-not-allowed">
              {isUpdating ? <Loader2 className="animate-spin"/> : <Crown size={16} />}
              {currentRole === 'ADMIN' ? 'Already an Admin' : 'Promote to Admin'}
            </button>
            {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          </div>
        </div>

        {/* Right Column: Order History */}
        <div className="p-6 bg-white rounded-lg shadow-md lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
                <ShoppingBag className="w-6 h-6 text-gray-700" />
                <h2 className="text-xl font-semibold">Order History ({customer.orders.length})</h2>
            </div>
            {customer.orders.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead><tr className="border-b"><th className="px-4 py-2">Order ID</th><th className="px-4 py-2">Date</th><th className="px-4 py-2">Status</th><th className="px-4 py-2 text-right">Total</th></tr></thead>
                        <tbody>
                            {customer.orders.map((order: CustomerOrder) => (
                                <tr key={order.id} className="border-b hover:bg-gray-50">
                                    <td className="px-4 py-3"><Link href={`/admin/orders/${order.id}`} className="font-mono text-sm text-primary hover:underline">...{order.id.slice(-12)}</Link></td>
                                    <td className="px-4 py-3 text-sm">{new Date(order.created_at).toLocaleDateString()}</td>
                                    <td className="px-4 py-3"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[order.status]}`}>{order.status}</span></td>
                                    <td className="px-4 py-3 font-semibold text-right">LKR {Number(order.total_amount).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="py-8 text-sm text-center text-gray-500">This customer has not placed any orders yet.</p>
            )}
        </div>
      </div>
    </div>
  );
}