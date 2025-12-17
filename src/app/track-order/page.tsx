"use client";

import { useState, FormEvent } from 'react';
import { Package, Truck, CheckCircle, Search, Loader2, XCircle, RefreshCw } from 'lucide-react';

type OrderStatus = 'PENDING' | 'PAID' | 'PROCESSING' | 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';

type TrackingResult = {
  orderId: string;
  status: OrderStatus;
  placedAt: string;
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
    { key: 'PAID', label: 'Payment Confirmed', location: 'Ceaser.lk' },
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
      { date: placedDate, status: 'Cancelled', location: 'Ceaser.lk' },
    ];
  }
  if (status === 'REFUNDED') {
    return [
      { date: placedDate, status: 'Order Placed', location: 'Website' },
      { date: placedDate, status: 'Refunded', location: 'Ceaser.lk' },
    ];
  }

  // For normal fulfillment flow, include everything up to current status (or at least Order Placed)
  const flowStatuses: OrderStatus[] = ['PAID', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED'];
  const included = new Set<OrderStatus>();
  for (const s of flowStatuses) {
    included.add(s);
    if (s === status) break;
  }

  const history = events
    .filter((e) => e.key === 'ORDER_PLACED' || included.has(e.key as OrderStatus))
    .map((e) => ({ date: placedDate, status: e.label, location: e.location }));

  // If status is PENDING, only show placed
  if (currentIndex === 0) {
    return [{ date: placedDate, status: 'Order Placed', location: 'Website' }];
  }

  return history;
};

const TrackOrderPage = () => {
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

      const order = data.order as { id: string; status: OrderStatus; created_at: string };
      setTrackingResult({
        orderId: (data.order?.publicOrderId as string) || order.id,
        status: order.status,
        placedAt: order.created_at,
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
      case 'PENDING':
      case 'PAID':
      case 'PROCESSING':
      case 'PACKED':
      default:
        return <Package className="w-8 h-8 text-primary" />;
    }
  };

  return (
    // THEME: Black background and white text, matching the Navbar
    <main className="min-h-screen bg-brand-black text-brand-white">
      <div className="container px-6 py-12 mx-auto md:py-24">
        <div className="max-w-3xl mx-auto text-center">
          {/* THEME: Uppercase, bold, tracking-wider for headings */}
          <h1 className="text-4xl font-bold tracking-wider uppercase md:text-5xl">
            Track Your Order
          </h1>
          <p className="mt-4 text-lg text-gray-300">
            Enter the Order ID you received in your confirmation email to see its current status.
          </p>
        </div>

        {/* --- Search Form --- */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col max-w-lg gap-4 mx-auto mt-12 md:flex-row"
        >
          <label htmlFor="orderNumber" className="sr-only">
            Order Number
          </label>
          <input
            id="orderNumber"
            type="text"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="e.g., 12345"
            // THEME: Dark input with gray border, green focus ring
            className="w-full px-5 py-3 text-white transition-all duration-300 bg-gray-900 border-2 border-gray-700 rounded-md shadow-sm focus:border-primary focus:ring-2 focus:ring-primary focus:outline-none"
            required
          />
          {/* THEME: Primary action button using the 'primary' green color */}
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center justify-center gap-2 px-8 py-3 text-sm font-bold tracking-wider uppercase transition-colors duration-300 rounded-md shadow-lg bg-primary text-brand-black hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Searching...</span>
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                <span>Track</span>
              </>
            )}
          </button>
        </form>

        {/* --- Results Section --- */}
        <div className="max-w-3xl mx-auto mt-12">
          {error && (
            // THEME: Error messages use the 'accent' red color
            <div className="p-4 text-center text-white border-2 rounded-md bg-accent/20 border-accent">
              <p className="font-semibold">{error}</p>
            </div>
          )}
          {trackingResult && (
            <div className="p-6 border-2 border-gray-700 rounded-lg shadow-xl md:p-8 bg-gray-900/50">
              <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
                <div>
                  <h2 className="text-2xl font-bold tracking-wider uppercase">Order #{trackingResult.orderId}</h2>
                  <p className={`mt-1 text-lg font-semibold ${trackingResult.status === 'CANCELLED' || trackingResult.status === 'REFUNDED' ? 'text-accent' : 'text-primary'}`}>
                    {trackingResult.status}
                  </p>
                  <p className="mt-1 text-sm text-gray-400">Placed on {new Date(trackingResult.placedAt).toLocaleString()}</p>
                </div>
                <div className="p-4 bg-gray-800 rounded-full">
                  {getStatusIcon(trackingResult.status)}
                </div>
              </div>
              <div className="w-full mt-6 border-t border-gray-700"></div>
              <div className="mt-6">
                <h3 className="mb-4 text-xl font-bold tracking-wide uppercase">Tracking History</h3>
                <ul className="space-y-4">
                  {trackingResult.history.slice().reverse().map((item, index) => (
                    <li key={index} className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-4 h-4 mt-1 rounded-full ${index === 0 ? 'bg-primary' : 'bg-gray-600'}`}></div>
                        {index < trackingResult.history.length - 1 && <div className="w-0.5 h-12 bg-gray-600"></div>}
                      </div>
                      <div>
                        <p className="font-semibold">{item.status}</p>
                        <p className="text-sm text-gray-400">{item.location} - {item.date}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default TrackOrderPage;