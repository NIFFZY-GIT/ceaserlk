"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, Loader2, Package, Download, ShoppingBag, User, Sparkles, Gift, Mail } from 'lucide-react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';

function OrderConfirmationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { fetchCart } = useCart();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    const processOrder = async (id: string) => {
      setOrderId(id);
      setStatus('success');
      fetchCart(); // Clear the client-side cart

      // Fetch full order details
      try {
        const res = await fetch(`/api/admin/orders/${id}`);
        if (res.ok) {
          const orderData = await res.json();
          console.log('Order data fetched:', orderData);
        }
      } catch (e) { console.error("Could not fetch order details", e); }
    };
    
    const orderIdParam = searchParams.get('orderId');
    const paymentIntent = searchParams.get('payment_intent');

    if (orderIdParam) {
      processOrder(orderIdParam);
    } else if (paymentIntent) {
      const verifyPaymentAndCreateOrder = async () => {
        try {
          const res = await fetch(`/api/checkout/verify-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentIntentId: paymentIntent }),
          });
          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || "Failed to create order.");
          }
          const { orderId: newOrderId } = await res.json();
          router.replace(`/order-confirmation?orderId=${newOrderId}`);
          processOrder(newOrderId);
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
          setErrorMessage(errorMessage);
          setStatus('error');
        }
      };
      verifyPaymentAndCreateOrder();
    } else {
      setErrorMessage("No order information found.");
      setStatus('error');
    }
  }, [searchParams, router, fetchCart]);

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-md p-8 mx-4 text-center bg-white border border-gray-100 shadow-xl rounded-2xl">
          <div className="relative">
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping"></div>
              <div className="absolute rounded-full inset-2 bg-primary/40 animate-ping animation-delay-200"></div>
              <div className="absolute flex items-center justify-center rounded-full inset-4 bg-primary">
                <Package className="w-8 h-8 text-white animate-bounce" />
              </div>
            </div>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Processing Your Order</h2>
          <p className="mb-4 text-gray-600">Please wait while we verify your payment...</p>
          <div className="w-full h-2 mb-4 bg-gray-200 rounded-full">
            <div className="h-2 rounded-full bg-primary animate-pulse" style={{width: '60%'}}></div>
          </div>
          <p className="text-sm text-gray-500">This will only take a moment</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-md p-8 mx-4 text-center bg-white border border-gray-100 shadow-xl rounded-2xl">
          <div className="flex items-center justify-center w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Order Error</h2>
          <p className="mb-6 text-gray-600">{errorMessage}</p>
          <Link 
            href="/shop" 
            className="inline-flex items-center px-6 py-3 font-semibold text-white transition-all duration-200 transform shadow-lg bg-primary rounded-xl hover:bg-primary-dark hover:scale-105"
          >
            <ShoppingBag className="w-5 h-5 mr-2" />
            Return to Shop
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-12 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        {/* Success Animation Header */}
        <div className="mb-12 text-center">
          <div className="relative inline-block">
            <div className="relative w-32 h-32 mx-auto mb-8">
              <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping"></div>
              <div className="absolute rounded-full inset-4 bg-green-500/40 animate-ping animation-delay-300"></div>
              <div className="absolute flex items-center justify-center bg-green-500 rounded-full shadow-2xl inset-8">
                <CheckCircle className="w-16 h-16 text-white animate-bounce" />
              </div>
            </div>
            <div className="absolute -top-4 -right-4 animate-bounce animation-delay-500">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <div className="absolute -bottom-4 -left-4 animate-bounce animation-delay-700">
              <Gift className="w-8 h-8 text-primary" />
            </div>
          </div>
          
          <h1 className="mb-4 text-4xl font-bold text-gray-900 md:text-5xl animate-fade-in">
            Order Confirmed! 🎉
          </h1>
          <p className="mb-2 text-xl text-gray-600 animate-fade-in animation-delay-200">
            Thank you for shopping with us!
          </p>
          <div className="inline-flex items-center px-4 py-2 bg-white border border-gray-200 rounded-full shadow-md animate-fade-in animation-delay-400">
            <Mail className="w-5 h-5 mr-2 text-primary" />
            <span className="text-sm text-gray-600">Confirmation sent to your email</span>
          </div>
        </div>

        {/* Order Details Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-8 transform hover:scale-[1.02] transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="mb-1 text-2xl font-bold text-gray-900">Order Summary</h3>
              <p className="text-gray-500">We&apos;re preparing your items</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Order ID</p>
              <p className="px-3 py-1 font-mono text-lg font-bold text-gray-900 rounded-lg bg-gray-50">
                #{orderId}
              </p>
            </div>
          </div>

          {/* Status Timeline */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center w-12 h-12 mb-2 bg-green-500 rounded-full shadow-lg">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <p className="text-sm font-medium text-green-600">Confirmed</p>
            </div>
            <div className="flex-1 h-1 mx-4 rounded-full bg-gradient-to-r from-green-500 to-primary"></div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center w-12 h-12 mb-2 rounded-full shadow-lg bg-primary animate-pulse">
                <Package className="w-6 h-6 text-white" />
              </div>
              <p className="text-sm font-medium text-primary">Processing</p>
            </div>
            <div className="flex-1 h-1 mx-4 bg-gray-200 rounded-full"></div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center w-12 h-12 mb-2 bg-gray-200 rounded-full">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2h3z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-400">Shipping</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Link 
              href="/shop" 
              className="flex items-center justify-center px-6 py-4 font-semibold text-white transition-all duration-300 transform shadow-lg group bg-gradient-to-r from-gray-800 to-black rounded-xl hover:from-black hover:to-gray-800 hover:scale-105 hover:shadow-2xl"
            >
              <ShoppingBag className="w-5 h-5 mr-2 group-hover:animate-bounce" />
              Continue Shopping
            </Link>
            
            <button 
              onClick={() => {
                if (orderId) {
                  window.open(`/api/orders/${orderId}/invoice`, '_blank');
                }
              }}
              className="flex items-center justify-center px-6 py-4 font-semibold text-white transition-all duration-300 transform bg-red-600 shadow-lg group rounded-xl hover:from-red-600 hover:to-primary hover:scale-105 hover:shadow-2xl"
              disabled={!orderId}
            >
              <Download className="w-5 h-5 mr-2 group-hover:animate-bounce" />
              Download Invoice
            </button>
            
            <Link 
              href="/profile" 
              className="flex items-center justify-center px-6 py-4 font-semibold text-white transition-all duration-300 transform shadow-lg group bg-gradient-to-r from-gray-700 to-gray-600 rounded-xl hover:from-gray-600 hover:to-gray-700 hover:scale-105 hover:shadow-2xl"
            >
              <User className="w-5 h-5 mr-2 group-hover:animate-bounce" />
              Order History
            </Link>
          </div>
        </div>

        {/* Additional Info Card */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="p-6 transition-shadow duration-300 bg-white border border-gray-100 shadow-lg rounded-xl hover:shadow-xl">
            <h4 className="flex items-center mb-3 text-lg font-bold text-gray-900">
              <Package className="w-6 h-6 mr-2 text-primary" />
              What&apos;s Next?
            </h4>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-center">
                <div className="w-2 h-2 mr-3 bg-green-500 rounded-full"></div>
                Order confirmation email sent
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 mr-3 rounded-full bg-primary"></div>
                Processing begins within 24 hours
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 mr-3 bg-gray-500 rounded-full"></div>
                Shipping notification will follow
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 mr-3 bg-yellow-500 rounded-full"></div>
                Track your package anytime
              </li>
            </ul>
          </div>

          <div className="p-6 transition-shadow duration-300 border bg-gradient-to-br from-primary/5 to-green-500/5 rounded-xl border-primary/20 hover:shadow-xl">
            <h4 className="flex items-center mb-3 text-lg font-bold text-gray-900">
              <Sparkles className="w-6 h-6 mr-2 text-primary" />
              Special Offer
            </h4>
            <p className="mb-4 text-gray-600">
              Get 15% off your next order! Use code <strong className="text-primary">THANKYOU15</strong> at checkout.
            </p>
            <Link 
              href="/shop"
              className="inline-flex items-center px-4 py-2 font-medium text-white transition-colors duration-200 rounded-lg bg-primary hover:bg-primary-dark"
            >
              Shop Again
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Wrap the page in a Suspense boundary because it uses useSearchParams
export default function OrderConfirmationPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>}>
      <OrderConfirmationContent />
    </Suspense>
  )
}