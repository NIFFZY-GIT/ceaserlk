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
  useFreeDelivery?: boolean;
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

export default function PayHerePaymentHandler({ cart, shippingDetails, useFreeDelivery }: PayHerePaymentHandlerProps) {
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
        body: JSON.stringify({ cart, shippingDetails, useFreeDelivery }),
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
    <div className="space-y-3 sm:space-y-4">
      {/* PayHere SDK Script */}
      <Script
        src="https://www.payhere.lk/lib/payhere.js"
        onLoad={() => setSdkLoaded(true)}
        onError={() => setErrorMessage('Failed to load payment system')}
      />

      {/* Payment Info */}
      <div className="p-3 sm:p-4 border border-gray-700 rounded-lg sm:rounded-xl bg-gray-900/50">
        <div className="flex items-start gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 rounded-md sm:rounded-lg bg-blue-500/20 flex-shrink-0">
            <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-white">PayHere Secure Payment</h3>
            <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-sm text-gray-400">
              Visa, Mastercard, bank transfers & mobile wallets.
            </p>
          </div>
        </div>
        
        {/* Payment methods logos */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-3 pt-3 border-t border-gray-700/50">
          <span className="text-[10px] sm:text-xs text-gray-500">Accepted:</span>
          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
            <div className="px-1.5 py-0.5 text-[9px] sm:text-xs font-semibold text-white bg-blue-600 rounded">VISA</div>
            <div className="px-1.5 py-0.5 text-[9px] sm:text-xs font-semibold text-white bg-red-600 rounded">MC</div>
            <div className="px-1.5 py-0.5 text-[9px] sm:text-xs font-semibold text-white bg-blue-800 rounded">AMEX</div>
            <div className="px-1.5 py-0.5 text-[9px] sm:text-xs font-semibold text-gray-900 bg-yellow-400 rounded">FriMi</div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="flex items-start gap-2 p-2.5 sm:p-3 border border-red-500/30 rounded-lg bg-red-500/10">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs sm:text-sm font-medium text-red-400">Error</p>
            <p className="text-[10px] sm:text-xs text-red-300">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Pay Button */}
      <button
        type="button"
        onClick={handlePayment}
        disabled={isLoading || !sdkLoaded}
        className="flex items-center justify-center w-full gap-2 px-4 py-2.5 sm:py-3 text-sm sm:text-base font-bold text-white transition-all bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg sm:rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
            <span className="text-xs sm:text-sm">Processing...</span>
          </>
        ) : !sdkLoaded ? (
          <>
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
            <span className="text-xs sm:text-sm">Loading...</span>
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Pay LKR {cart.totalAmount.toLocaleString()}</span>
          </>
        )}
      </button>

      {/* Security notice */}
      <p className="text-[10px] sm:text-xs text-center text-gray-500">
        🔒 Secured by PayHere
      </p>
    </div>
  );
}
