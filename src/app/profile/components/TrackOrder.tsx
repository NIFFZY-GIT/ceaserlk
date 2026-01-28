'use client';

import { useState, FormEvent } from 'react';
import { Package, Truck, CheckCircle, Search, Loader2, XCircle, RefreshCw, Copy } from 'lucide-react';

type OrderStatus = 'PENDING' | 'PAID' | 'PROCESSING' | 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';

type TrackingResult = {
  orderId: string;
  status: OrderStatus;
  placedAt: string;
  deliveryId?: string | null;
  history: {
    date: string;
    status: string;
    location: string;
  }[];
};

const buildHistory = (status: OrderStatus, placedAtIso: string) => {
  const placedDate = new Date(placedAtIso).toLocaleString();
  const events: Array<{ key: OrderStatus | 'ORDER_PLACED'; label: string; location: string }> = [
    { key: 'ORDER_PLACED', label: 'Order Placed', location: 'Website' },
    { key: 'PAID', label: 'Payment Confirmed', location: 'CEASAR.lk' },
    { key: 'PROCESSING', label: 'Processing', location: 'Warehouse' },
    { key: 'PACKED', label: 'Packed', location: 'Warehouse' },
    { key: 'SHIPPED', label: 'Shipped', location: 'Courier' },
    { key: 'DELIVERED', label: 'Delivered', location: 'Destination' },
  ];

  const order: OrderStatus[] = ['PENDING', 'PAID', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
  const currentIndex = order.indexOf(status);

  if (status === 'CANCELLED') {
    return [
      { date: placedDate, status: 'Order Placed', location: 'Website' },
      { date: placedDate, status: 'Cancelled', location: 'CEASAR.lk' },
    ];
  }
  if (status === 'REFUNDED') {
    return [
      { date: placedDate, status: 'Order Placed', location: 'Website' },
      { date: placedDate, status: 'Refunded', location: 'CEASAR.lk' },
    ];
  }

  const flowStatuses: OrderStatus[] = ['PAID', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED'];
  const included = new Set<OrderStatus>();
  for (const s of flowStatuses) {
    included.add(s);
    if (s === status) break;
  }

  const history = events
    .filter((e) => e.key === 'ORDER_PLACED' || included.has(e.key as OrderStatus))
    .map((e) => ({ date: placedDate, status: e.label, location: e.location }));

  if (currentIndex === 0) {
    return [{ date: placedDate, status: 'Order Placed', location: 'Website' }];
  }

  return history;
};

export default function TrackOrder() {
  const [orderNumber, setOrderNumber] = useState('');
  const [trackingResult, setTrackingResult] = useState<TrackingResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!orderNumber) return;

    setIsLoading(true);
    setError(null);
    setTrackingResult(null);

    try {
      const res = await fetch('/api/orders/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: orderNumber.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Order not found. Please check the Order ID and try again.');
      }

      const order = data.order as { id: string; status: OrderStatus; created_at: string; delivery_id?: string | null };
      setTrackingResult({
        orderId: (data.order?.publicOrderId as string) || order.id,
        status: order.status,
        placedAt: order.created_at,
        deliveryId: order.delivery_id,
        history: buildHistory(order.status, order.created_at),
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: TrackingResult['status']) => {
    switch (status) {
      case 'SHIPPED':
        return <Truck className="w-8 h-8 text-primary" />;
      case 'DELIVERED':
        return <CheckCircle className="w-8 h-8 text-accent" />;
      case 'CANCELLED':
        return <XCircle className="w-8 h-8 text-accent" />;
      case 'REFUNDED':
        return <RefreshCw className="w-8 h-8 text-accent" />;
      default:
        return <Package className="w-8 h-8 text-primary" />;
    }
  };

  const getStatusColor = (status: TrackingResult['status']) => {
    switch (status) {
      case 'SHIPPED':
        return 'text-primary';
      case 'DELIVERED':
        return 'text-accent';
      case 'CANCELLED':
        return 'text-red-500';
      case 'REFUNDED':
        return 'text-orange-500';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-8">
      {/* Search Section */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-6 rounded-lg border border-gray-700">
        <h2 className="text-2xl font-bold text-gray-100 mb-4">Track Your Order</h2>
        <p className="text-gray-400 mb-6">Enter your order ID or order number to track your delivery status</p>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Enter Order ID (e.g., 00001 or UUID)"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !orderNumber.trim()}
            className="px-6 py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            {isLoading ? 'Searching...' : 'Track'}
          </button>
        </form>
      </div>

      {/* Live Delivery Tracking Section - Shows when tracking result exists and is shipped/delivered */}
      {trackingResult && (trackingResult.status === 'SHIPPED' || trackingResult.status === 'DELIVERED') && (
        <div className="bg-blue-500/10 border border-blue-500/30 p-6 rounded-lg">
          <div className="flex items-start gap-4">
            <Truck className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-300 mb-2">Live Delivery Tracking</h3>
              <p className="text-sm text-blue-200 mb-4">
                For real-time location tracking of your delivery, use our partner Koombiya Delivery.
              </p>
              {trackingResult.deliveryId && (
                <div className="p-3 mb-4 rounded-md bg-blue-900/30 border border-blue-600/40">
                  <p className="text-xs text-blue-200 mb-2">Your Delivery Tracking ID:</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono font-bold text-blue-200">{trackingResult.deliveryId}</p>
                    <button
                      onClick={() => navigator.clipboard.writeText(trackingResult.deliveryId || '')}
                      className="p-1.5 rounded hover:bg-blue-700/30 transition-colors text-blue-200 hover:text-blue-100"
                      title="Copy tracking ID"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-blue-300 mt-2">Use this code to track your delivery on Koombiya website</p>
                </div>
              )}
              <a
                href="https://koombiyodelivery.lk/track"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                <Truck className="w-4 h-4" />
                Track on Koombiya
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg flex gap-3">
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-400">Order Not Found</h3>
            <p className="text-sm text-red-300 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Tracking Results */}
      {trackingResult && (
        <div className="space-y-6">
          {/* Status Header */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-6 rounded-lg border border-gray-700">
            <div className="flex items-start gap-4">
              {getStatusIcon(trackingResult.status)}
              <div className="flex-1">
                <p className="text-sm text-gray-400 mb-1">Order ID</p>
                <h3 className="text-2xl font-bold text-gray-100 mb-2">{trackingResult.orderId}</h3>
                <p className={`font-semibold text-lg ${getStatusColor(trackingResult.status)}`}>
                  {trackingResult.status}
                </p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-100 mb-6">Delivery Timeline</h3>
            <div className="space-y-0">
              {trackingResult.history.map((event, index) => (
                <div key={index} className="flex gap-4 pb-6 last:pb-0">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 bg-primary rounded-full mt-2"></div>
                    {index < trackingResult.history.length - 1 && (
                      <div className="w-0.5 h-12 bg-gray-700 mt-2"></div>
                    )}
                  </div>
                  <div className="flex-1 pb-6">
                    <p className="font-semibold text-gray-100">{event.status}</p>
                    <p className="text-sm text-gray-500">{event.date}</p>
                    <p className="text-xs text-gray-600 mt-1">{event.location}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
