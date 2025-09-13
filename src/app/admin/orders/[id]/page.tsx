"use client";

import { useState, useEffect } from 'react';
import { notFound } from 'next/navigation';
import { Loader2, ArrowLeft, Check, Package, Truck, Home, XCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

// --- (Type definitions are correct and remain the same) ---
interface OrderItem { id: string; product_name: string; variant_color: string; variant_size: string; price_paid: string; quantity: number; }
type OrderStatus = 'PENDING' | 'PAID' | 'PROCESSING' | 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
interface FullOrder { id: string; created_at: string; status: OrderStatus; full_name: string; customer_email: string; phone_number: string; shipping_address_line1: string; shipping_city: string; shipping_postal_code: string; subtotal: string; shipping_cost: string; total_amount: string; items: OrderItem[]; }

const statusFlow: OrderStatus[] = ['PAID', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED'];
const statusIcons = { PAID: Package, PROCESSING: Package, PACKED: Package, SHIPPED: Truck, DELIVERED: Home, CANCELLED: XCircle, REFUNDED: RefreshCw, PENDING: Loader2 };

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  // --- THIS IS THE KEY CHANGE ---
  // Destructure 'id' from 'params' immediately to create a stable variable.
  const { id } = params;
  // --- END OF CHANGE ---

  const [order, setOrder] = useState<FullOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState<OrderStatus | ''>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    async function fetchOrder() {
      try {
        const res = await fetch(`/api/admin/orders/${id}`); // Use the stable 'id' variable
        if (res.status === 404) notFound();
        if (!res.ok) throw new Error("Failed to fetch order");
        const data: FullOrder = await res.json();
        setOrder(data);
        setNewStatus(data.status);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [id]); // Use the stable 'id' variable in the dependency array

  const handleStatusUpdate = async () => {
    if (!newStatus || newStatus === order?.status) return;
    setIsUpdating(true);
    setUpdateMessage(null);
    try {
        const res = await fetch(`/api/admin/orders/${id}`, { // Use the stable 'id' variable
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) throw new Error("Failed to update status");
        const updatedOrder = await res.json();
        setOrder(updatedOrder);
        setUpdateMessage({ type: 'success', text: 'Status updated successfully!' });
    } catch (error) {
        setUpdateMessage({ type: 'error', text: 'Failed to update status.' });
    } finally {
        setIsUpdating(false);
        setTimeout(() => setUpdateMessage(null), 3000);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!order) return <div className="text-center">Order not found. <Link href="/admin/orders" className="text-primary hover:underline">Go back</Link></div>;

  const currentStatusIndex = statusFlow.indexOf(order.status);
  const isFulfilled = currentStatusIndex >= 0;

  return (
    <div className="space-y-8">
      <Link href="/admin/orders" className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"><ArrowLeft size={16}/> Back to All Orders</Link>
      <div className="p-6 bg-white rounded-lg shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
            <div><h1 className="text-2xl font-bold text-gray-900">Order #{order.id.split('-')[0].toUpperCase()}</h1><p className="text-sm text-gray-500">Placed on {new Date(order.created_at).toLocaleString()}</p></div>
            <div className="flex items-center gap-2"><span className="font-semibold">Status:</span><span className={`px-3 py-1 text-sm font-semibold rounded-full ${order.status === 'CANCELLED' || order.status === 'REFUNDED' ? 'bg-red-100 text-red-800' : 'bg-black text-white'}`}>{order.status}</span></div>
        </div>
        {isFulfilled && (
            <div className="pt-8 mt-8 border-t"><div className="relative flex justify-between"><div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 transform -translate-y-1/2"><div className="absolute top-0 left-0 h-full transition-all duration-500 bg-black" style={{ width: `${(currentStatusIndex / (statusFlow.length - 1)) * 100}%` }}></div></div>{statusFlow.map((status, index) => { const Icon = statusIcons[status]; const isCompleted = index <= currentStatusIndex; return (<div key={status} className="relative z-10 flex flex-col items-center flex-1"><div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isCompleted ? 'bg-black border-black text-white' : 'bg-gray-50 border-gray-300 text-gray-400'}`}>{index < currentStatusIndex ? <Check/> : <Icon size={20}/>}</div><p className={`mt-2 text-xs font-semibold text-center ${isCompleted ? 'text-black' : 'text-gray-400'}`}>{status}</p></div>)})}</div></div>
        )}
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <div className="p-6 bg-white rounded-lg shadow-md"><h2 className="mb-4 text-xl font-semibold">Customer</h2><div className="space-y-1 text-sm"><p className="font-medium text-gray-900">{order.full_name}</p><a href={`mailto:${order.customer_email}`} className="text-primary hover:underline">{order.customer_email}</a><p className="text-gray-600">{order.phone_number}</p></div></div>
          <div className="p-6 bg-white rounded-lg shadow-md"><h2 className="mb-4 text-xl font-semibold">Shipping Address</h2><address className="text-sm not-italic text-gray-600">{order.shipping_address_line1}<br/>{order.shipping_city}, {order.shipping_postal_code}</address></div>
          <div className="p-6 bg-white rounded-lg shadow-md"><h2 className="mb-4 text-xl font-semibold">Update Status</h2><select value={newStatus} onChange={e => setNewStatus(e.target.value as FullOrder['status'])} className="w-full border-gray-300 rounded-md shadow-sm"><option value="PAID">Paid</option><option value="PROCESSING">Processing</option><option value="PACKED">Packed</option><option value="SHIPPED">Shipped</option><option value="DELIVERED">Delivered</option><option value="CANCELLED">Cancelled</option><option value="REFUNDED">Refunded</option></select><button onClick={handleStatusUpdate} disabled={isUpdating || newStatus === order.status} className="w-full px-4 py-2 mt-4 font-semibold text-white transition-colors rounded-md bg-primary hover:bg-primary-dark disabled:bg-gray-400 disabled:cursor-not-allowed">{isUpdating ? <Loader2 className="mx-auto animate-spin"/> : 'Save Changes'}</button>{updateMessage && <p className={`mt-2 text-sm text-center ${updateMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{updateMessage.text}</p>}</div>
        </div>
        <div className="p-6 bg-white rounded-lg shadow-md lg:col-span-2">
          <h2 className="mb-4 text-xl font-semibold">Order Items ({order.items.length})</h2>
          <div className="space-y-4">{order.items.map((item: OrderItem) => (<div key={item.id} className="flex justify-between p-4 border rounded-md"><div><p className="font-semibold text-gray-900">{item.product_name}</p><p className="text-sm text-gray-500">{item.variant_size} / {item.variant_color}</p><p className="text-sm text-gray-500">{item.quantity} x LKR {Number(item.price_paid).toFixed(2)}</p></div><p className="font-semibold text-gray-900">LKR {(Number(item.price_paid) * item.quantity).toFixed(2)}</p></div>))}</div>
          <div className="pt-6 mt-6 border-t"><div className="space-y-2 text-sm"><div className="flex justify-between"><span>Subtotal</span><span className="font-medium text-gray-700">LKR {Number(order.subtotal).toFixed(2)}</span></div><div className="flex justify-between"><span>Shipping</span><span className="font-medium text-gray-700">LKR {Number(order.shipping_cost).toFixed(2)}</span></div></div><div className="flex justify-between pt-4 mt-4 text-lg font-bold border-t"><span>Total Paid</span><span>LKR {Number(order.total_amount).toFixed(2)}</span></div></div>
        </div>
      </div>
    </div>
  );
}