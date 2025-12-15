"use client";

import { useState } from 'react';
import { Loader2, CreditCard, AlertCircle } from 'lucide-react';
import { Cart } from '@/context/CartContext';
import Script from 'next/script';

interface PayHerePaymentHandlerProps {
  cart: Cart;
  shippingDetails: {
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    address: string;
    city: string;
    postalCode: string;
  };
}

// PayHere SDK types
declare global {
  interface Window {
    payhere: {
      startPayment: (payment: PayHerePayment) => void;
      onCompleted: (orderId: string) => void;
      onDismissed: () => void;
      onError: (error: string) => void;
    };
  }
}

interface PayHerePayment {
  sandbox: boolean;
  merchant_id: string;
  return_url: string;
  cancel_url: string;
  notify_url: string;
  order_id: string;
  items: string;
  amount: string;
  currency: string;
  hash: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
}

export default function PayHerePaymentHandler({ cart, shippingDetails }: PayHerePaymentHandlerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);

  // Validate shipping details
  const validateDetails = () => {
    const required = ['email', 'firstName', 'lastName', 'phone', 'address', 'city'];
    for (const field of required) {
      if (!shippingDetails[field as keyof typeof shippingDetails]?.trim()) {
        return `Please fill out your ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`;
      }
    }
    return null;
  };

  const handlePayment = async () => {
    // Validate shipping details
    const validationError = validateDetails();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    if (!sdkLoaded) {
      setErrorMessage('Payment system is loading. Please try again.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Get payment data from our API
      const response = await fetch('/api/checkout/payhere/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart, shippingDetails }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to initiate payment');
      }

      const { paymentData } = await response.json();

      // Set up PayHere callbacks
      window.payhere.onCompleted = function onCompleted(orderId: string) {
        console.log("Payment completed. Order ID:", orderId);
        // Redirect to order confirmation
        window.location.href = `/order-confirmation?payhere_order=${orderId}`;
      };

      window.payhere.onDismissed = function onDismissed() {
        console.log("Payment dismissed");
        setIsLoading(false);
        setErrorMessage('Payment was cancelled. Please try again.');
      };

      window.payhere.onError = function onError(error: string) {
        console.error("Payment error:", error);
        setIsLoading(false);
        setErrorMessage('Payment failed. Please try again or use a different payment method.');
      };

      // Start PayHere payment
      window.payhere.startPayment(paymentData);

    } catch (error) {
      console.error('PayHere payment error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to initiate payment');
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* PayHere SDK Script */}
      <Script
        src="https://www.payhere.lk/lib/payhere.js"
        onLoad={() => setSdkLoaded(true)}
        onError={() => setErrorMessage('Failed to load payment system')}
      />

      {/* Payment Info */}
      <div className="p-4 border border-gray-700 rounded-xl bg-gray-900/50">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-500/20">
            <CreditCard className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">PayHere Secure Payment</h3>
            <p className="mt-1 text-sm text-gray-400">
              Pay securely with Visa, Mastercard, Amex, or local Sri Lankan payment methods including 
              bank transfers and mobile wallets.
            </p>
          </div>
        </div>
        
        {/* Payment methods logos */}
        <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-gray-700/50">
          <span className="text-xs text-gray-500">Accepted:</span>
          <div className="flex items-center gap-2">
            <div className="px-2 py-1 text-xs font-semibold text-white bg-blue-600 rounded">VISA</div>
            <div className="px-2 py-1 text-xs font-semibold text-white bg-red-600 rounded">Mastercard</div>
            <div className="px-2 py-1 text-xs font-semibold text-white bg-blue-800 rounded">AMEX</div>
            <div className="px-2 py-1 text-xs font-semibold text-gray-900 bg-yellow-400 rounded">FriMi</div>
            <div className="px-2 py-1 text-xs font-semibold text-white bg-green-600 rounded">Bank Transfer</div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="flex items-start gap-3 p-4 border border-red-500/30 rounded-xl bg-red-500/10">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-400">Payment Error</p>
            <p className="mt-1 text-sm text-red-300">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Pay Button */}
      <button
        type="button"
        onClick={handlePayment}
        disabled={isLoading || !sdkLoaded}
        className="flex items-center justify-center w-full gap-2 px-6 py-4 text-base font-bold text-white transition-all bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing...
          </>
        ) : !sdkLoaded ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading payment...
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5" />
            Pay LKR {cart.totalAmount.toFixed(2)} with PayHere
          </>
        )}
      </button>

      {/* Security notice */}
      <p className="text-xs text-center text-gray-500">
        🔒 Your payment is secured by PayHere. We never store your card details.
      </p>
    </div>
  );
}
