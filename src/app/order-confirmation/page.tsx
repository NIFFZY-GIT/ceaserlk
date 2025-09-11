"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Download, Loader2, Package, Truck, CreditCard } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface OrderItem {
  id: number;
  name: string;
  sizeName: string;
  colorName: string;
  imageUrl: string;
  quantity: number;
  price: number;
}

interface Order {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  zipCode: string;
  country: string;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
  items: OrderItem[];
}

export default function OrderConfirmationPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setError('Order ID not found');
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}`);
        if (!response.ok) {
          throw new Error('Order not found');
        }
        const data = await response.json();
        setOrder(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load order');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  const downloadInvoice = async () => {
    if (!orderId) return;
    
    setDownloadingInvoice(true);
    try {
      const response = await fetch(`/api/orders/${orderId}/invoice`, {
        method: 'GET',
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate invoice');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `invoice-${orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Invoice download failed:', err);
      alert('Failed to download invoice. Please try again.');
    } finally {
      setDownloadingInvoice(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container px-6 py-16 mx-auto text-center">
        <div className="max-w-md mx-auto">
          <h1 className="text-3xl font-bold text-gray-900">Order Not Found</h1>
          <p className="mt-4 text-gray-600">{error || 'The order you&apos;re looking for doesn&apos;t exist.'}</p>
          <Link 
            href="/shop" 
            className="inline-block px-6 py-3 mt-6 text-white rounded-md bg-primary hover:bg-primary/90"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'processing':
        return <Package className="w-6 h-6 text-blue-500" />;
      case 'shipped':
        return <Truck className="w-6 h-6 text-yellow-500" />;
      default:
        return <CreditCard className="w-6 h-6 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'text-green-600 bg-green-100';
      case 'processing':
        return 'text-blue-600 bg-blue-100';
      case 'shipped':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container px-6 py-16 mx-auto">
        {/* Header */}
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
            <h1 className="mt-4 text-4xl font-bold text-gray-900">Order Confirmed!</h1>
            <p className="mt-2 text-lg text-gray-600">
              Thank you for your order. We&apos;ll send you a confirmation email shortly.
            </p>
          </div>

          {/* Order Details */}
          <div className="grid grid-cols-1 gap-8 mt-12 lg:grid-cols-3">
            {/* Order Summary */}
            <div className="lg:col-span-2">
              <div className="p-6 bg-white rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Order Details</h2>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(order.status)}
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">Order Number</h3>
                    <p className="text-gray-600">#{order.id}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Order Date</h3>
                    <p className="text-gray-600">{new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Payment Method</h3>
                    <p className="text-gray-600 capitalize">{order.paymentMethod.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Total Amount</h3>
                    <p className="text-lg font-bold text-primary">LKR {order.total.toFixed(2)}</p>
                  </div>
                </div>

                {/* Order Items */}
                <div>
                  <h3 className="mb-4 text-lg font-semibold text-gray-900">Items Ordered</h3>
                  <div className="space-y-4">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                        <div className="relative w-16 h-16 overflow-hidden rounded-md">
                          <Image 
                            src={item.imageUrl} 
                            alt={item.name} 
                            fill 
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{item.name}</h4>
                          <p className="text-sm text-gray-600">
                            {item.sizeName} / {item.colorName}
                          </p>
                          <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            LKR {(item.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Shipping Address */}
              <div className="p-6 bg-white rounded-lg shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">Shipping Address</h3>
                <div className="space-y-1 text-gray-600">
                  <p className="font-medium">{order.firstName} {order.lastName}</p>
                  <p>{order.address}</p>
                  <p>{order.city}, {order.zipCode}</p>
                  <p>{order.country}</p>
                  <p>{order.phone}</p>
                </div>
              </div>

              {/* Order Total */}
              <div className="p-6 bg-white rounded-lg shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">Order Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span>LKR {order.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping</span>
                    <span>LKR {order.shipping.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax</span>
                    <span>LKR {order.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-semibold">Total</span>
                    <span className="font-semibold">LKR {order.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={downloadInvoice}
                  disabled={downloadingInvoice}
                  className="flex items-center justify-center w-full gap-2 px-4 py-3 text-white transition-colors rounded-md bg-primary hover:bg-primary/90 disabled:opacity-50"
                >
                  {downloadingInvoice ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {downloadingInvoice ? 'Generating...' : 'Download Invoice'}
                </button>
                
                <Link
                  href="/shop"
                  className="block w-full px-4 py-3 text-center text-gray-700 transition-colors border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
