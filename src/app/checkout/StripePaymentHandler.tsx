"use client";

import { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Loader2, Lock, CreditCard, CheckCircle } from 'lucide-react';

interface StripePaymentHandlerProps {
  totalAmount: number;
  onPaymentSuccess: (paymentIntentId: string) => Promise<void>;
  shippingDetails: { email: string; address: string; city: string; postalCode: string; };
}

export default function StripePaymentHandler({ 
  totalAmount, 
  onPaymentSuccess, 
  shippingDetails 
}: StripePaymentHandlerProps) {
  const stripe = useStripe();
  const elements = useElements();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    // Basic validation for shipping form
    if (!shippingDetails.email || !shippingDetails.address || !shippingDetails.city || !shippingDetails.postalCode) {
      setErrorMessage("Please fill out all shipping and contact details.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setErrorMessage(submitError.message || "An error occurred submitting your details.");
      setIsLoading(false);
      return;
    }

    // Create Payment Intent on the server
    const res = await fetch('/api/checkout/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: totalAmount }),
    });
    const { clientSecret, error: intentError } = await res.json();
    if (intentError) {
      setErrorMessage(intentError);
      setIsLoading(false);
      return;
    }

    // Confirm the payment
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: {
        receipt_email: shippingDetails.email,
      },
      redirect: 'if_required',
    });

    if (error) {
      setErrorMessage(error.message || "An unexpected error occurred during payment.");
      setIsLoading(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      // Payment succeeded! 
      setIsSuccess(true);
      await onPaymentSuccess(paymentIntent.id);
      // The parent component will now handle order creation and redirection.
    } else {
      setErrorMessage("Payment was not successful. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Payment Success State */}
      {isSuccess && (
        <div className="text-center py-8">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Payment Successful!</h3>
          <p className="text-gray-600">Redirecting to order confirmation...</p>
        </div>
      )}

      {/* Payment Form */}
      {!isSuccess && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Payment Element Container */}
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Payment Details</h3>
            </div>
            <div className="space-y-4">
              <PaymentElement />
            </div>
          </div>

          {/* Security Notice */}
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-green-50 p-3 rounded-xl">
            <Lock className="w-4 h-4 text-green-600" />
            <span>Your payment information is encrypted and secure</span>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="text-sm text-red-600">
                <strong>Payment Error:</strong> {errorMessage}
              </div>
            </div>
          )}

          {/* Pay Button */}
          <button
            type="submit"
            disabled={isLoading || !stripe || !elements}
            className={`
              w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-200
              ${isLoading || !stripe || !elements
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-black text-white hover:bg-gray-800 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl'
              }
            `}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Processing Payment...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <Lock className="w-5 h-5" />
                <span>Complete Payment • LKR {totalAmount.toFixed(2)}</span>
              </div>
            )}
          </button>

          {/* Payment Methods Info */}
          <div className="text-center text-sm text-gray-500 space-y-2">
            <p>Powered by Stripe - Industry-leading security</p>
            <div className="flex justify-center gap-4 text-xs">
              <span>• 256-bit SSL encryption</span>
              <span>• PCI DSS compliant</span>
              <span>• Fraud protection</span>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}