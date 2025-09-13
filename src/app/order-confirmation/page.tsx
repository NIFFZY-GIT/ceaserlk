"use client";

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, Loader2, Download } from 'lucide-react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext'; // To clear the cart

export default function OrderConfirmationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { fetchCart } = useCart(); // Get the function to refresh/clear cart state

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  const handleDownloadInvoice = async () => {
    if (!orderId) return;
    
    try {
      const response = await fetch(`/api/orders/${orderId}/invoice`);
      if (!response.ok) {
        throw new Error('Failed to download invoice');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading invoice:', error);
      alert('Failed to download invoice. Please try again.');
    }
  };

  useEffect(() => {
    const orderIdParam = searchParams.get('orderId');
    const paymentIntent = searchParams.get('payment_intent');

    if (orderIdParam) {
      // Scenario A: We were redirected by our own code after a successful order creation.
      // The order is already in our DB.
      setOrderId(orderIdParam);
      setStatus('success');
      fetchCart(); // This will fetch a new, empty cart, effectively clearing the old one.
    } else if (paymentIntent) {
      // Scenario B: We were redirected back from Stripe after 3D Secure.
      // We need to verify the payment and create the order now.
      const verifyPaymentAndCreateOrder = async () => {
        try {
          const res = await fetch(`/api/checkout/verify-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentIntentId: paymentIntent }),
          });

          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || "Failed to verify payment and create order.");
          }
          
          const { orderId: newOrderId } = await res.json();
          setOrderId(newOrderId);
          setStatus('success');
          fetchCart(); // Clear the cart
          // Optional: update the URL to be clean
          router.replace(`/order-confirmation?orderId=${newOrderId}`);

        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
          setErrorMessage(errorMessage);
          setStatus('error');
        }
      };
      verifyPaymentAndCreateOrder();
    } else {
      // No orderId or paymentIntent, this is an invalid state.
      setErrorMessage("No order information found.");
      setStatus('error');
    }
  }, [searchParams, router, fetchCart]);

  if (status === 'loading') {
    return <div className="flex flex-col items-center justify-center min-h-screen text-center"><Loader2 className="w-12 h-12 animate-spin text-primary" /><p className="mt-4">Verifying your order...</p></div>;
  }
  
  if (status === 'error') {
    return <div className="flex flex-col items-center justify-center min-h-screen text-center"><h1 className="text-2xl font-bold text-red-600">Order Error</h1><p className="mt-2 text-gray-600">{errorMessage}</p><Link href="/shop" className="mt-6 text-primary hover:underline">Return to Shop</Link></div>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center bg-gray-50">
      <CheckCircle className="w-24 h-24 text-green-500" />
      <h1 className="mt-6 text-3xl font-bold text-gray-900">Thank you for your order!</h1>
      <p className="mt-2 text-lg text-gray-600">Your payment was successful and your order is being processed.</p>
      <p className="mt-1 text-sm text-gray-500">Order ID: {orderId}</p>
      <p className="mt-2 text-sm text-gray-500">A confirmation email with your invoice has been sent to your email address.</p>
      
      <div className="flex flex-col gap-4 mt-8 sm:flex-row">
        <button 
          onClick={handleDownloadInvoice}
          className="flex items-center gap-2 px-6 py-3 font-semibold text-gray-700 transition-colors bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <Download className="w-4 h-4" />
          Download Invoice
        </button>
        
        <Link href="/shop" className="px-6 py-3 font-semibold text-white transition-colors bg-black rounded-md hover:bg-gray-800">
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}