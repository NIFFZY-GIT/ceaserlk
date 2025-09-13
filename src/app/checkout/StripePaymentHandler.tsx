"use client";

import { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Loader2 } from 'lucide-react';
import { Cart } from '@/context/CartContext';

interface StripePaymentHandlerProps {
  cart: Cart;
  onPaymentSuccess: (paymentIntentId: string) => Promise<void>;
  shippingDetails: {
    email: string; firstName: string; lastName: string; phone: string;
    address: string; city: string; postalCode: string;
  };
}

export default function StripePaymentHandler({ cart, shippingDetails }: Omit<StripePaymentHandlerProps, 'onPaymentSuccess'>) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    const allFieldsFilled = Object.values(shippingDetails).every(detail => detail.trim() !== '');
    if (!allFieldsFilled) {
      setErrorMessage("Please fill out all contact and shipping details.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setErrorMessage(submitError.message || "An error occurred. Please check your card details.");
      setIsLoading(false);
      return;
    }

    const res = await fetch('/api/checkout/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: cart.totalAmount, cart: cart, shippingDetails: shippingDetails }),
    });
    const { clientSecret, error: intentError } = await res.json();

    if (intentError) {
      setErrorMessage(intentError);
      setIsLoading(false);
      return;
    }

    // --- THIS IS THE KEY CHANGE ---
    // We now let Stripe handle the redirect automatically.
    const { error } = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: {
        return_url: `${window.location.origin}/order-confirmation`,
      },
    });

    // This code will only run if an immediate error occurs.
    // If successful, the user is redirected by Stripe.
    if (error) {
      setErrorMessage(error.message || "An unexpected error occurred.");
    }
    
    // The button remains loading because a redirect is expected.
    // If no redirect happens, the error message above will show.
    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <div className="mt-8">
        <button
          type="submit"
          disabled={isLoading || !stripe || !elements}
          className="flex items-center justify-center w-full px-6 py-4 text-base font-bold text-white bg-black border border-transparent rounded-lg shadow-sm hover:bg-gray-800 disabled:bg-gray-400"
        >
          {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : `Pay LKR ${cart.totalAmount.toFixed(2)}`}
        </button>
      </div>
      {errorMessage && <div className="mt-4 text-sm text-center text-red-600">{errorMessage}</div>}
    </form>
  );
}