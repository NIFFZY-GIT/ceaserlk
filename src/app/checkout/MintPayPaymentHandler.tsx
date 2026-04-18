"use client";

import { useState } from 'react';
import { AlertCircle, CreditCard, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { Cart } from '@/context/CartContext';

interface MintPayPaymentHandlerProps {
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
  guestId?: string | null;
}

export default function MintPayPaymentHandler({ cart, shippingDetails, useFreeDelivery, guestId }: MintPayPaymentHandlerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const totalShipping = useFreeDelivery ? 0 : (cart.totalShipping || 0);
  const totalAmount = (cart.subtotal || 0) + totalShipping;
  const installmentAmount = totalAmount / 3;

  const validateDetails = () => {
    const required = ['email', 'firstName', 'lastName', 'phone', 'address', 'city'];
    for (const field of required) {
      if (!shippingDetails[field as keyof typeof shippingDetails]?.trim()) {
        return `Please fill out your ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}.`;
      }
    }
    return null;
  };

  const submitGatewayForm = (gatewayUrl: string, purchaseId: string) => {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = gatewayUrl;

    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'purchase_id';
    input.value = purchaseId;
    form.appendChild(input);

    document.body.appendChild(form);
    form.submit();
  };

  const handleMintPayRedirect = async () => {
    const validationError = validateDetails();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/checkout/mintpay/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart, shippingDetails, useFreeDelivery, guestId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to initialize MintPay payment.');
      }

      const data = await response.json();
      if (!data?.gatewayUrl || !data?.purchaseId) {
        throw new Error('MintPay gateway payload is incomplete.');
      }

      submitGatewayForm(data.gatewayUrl, data.purchaseId);
    } catch (error) {
      console.error('MintPay payment initialization error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to continue with MintPay right now.');
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="p-3 sm:p-4 border border-emerald-500/30 rounded-lg sm:rounded-xl bg-emerald-500/5">
        <div className="flex items-start gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 rounded-md sm:rounded-lg bg-emerald-500/15 flex-shrink-0">
            <Image
              src="/assets/mintpay/mintlogo.png"
              alt="MintPay"
              width={64}
              height={20}
              className="h-4 sm:h-5 w-auto object-contain"
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm sm:text-base font-semibold text-emerald-300 mb-1">MintPay</p>
            <p className="text-[10px] sm:text-xs text-gray-400">Buy Now, Pay Later — 0% interest</p>
            <p className="text-[10px] sm:text-sm text-gray-300 mt-1">
              Rs. {installmentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} x 3 months
            </p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-start gap-2 p-2.5 sm:p-3 border border-red-500/30 rounded-lg bg-red-500/10">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs sm:text-sm font-medium text-red-400">Error</p>
            <p className="text-[10px] sm:text-xs text-red-300">{errorMessage}</p>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleMintPayRedirect}
        disabled={isLoading}
        className="flex items-center justify-center w-full gap-2 px-4 py-2.5 sm:py-3 text-sm sm:text-base font-bold text-brand-black transition-all bg-emerald-400 rounded-lg sm:rounded-xl hover:bg-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
            <span className="text-xs sm:text-sm">Redirecting...</span>
          </>
        ) : (
          <>
            <Image
              src="/assets/mintpay/mintlogo.png"
              alt="MintPay"
              width={80}
              height={20}
              className="h-4 sm:h-5 w-auto object-contain"
            />
            <span>Continue with MintPay</span>
          </>
        )}
      </button>

      <p className="text-[10px] sm:text-xs text-center text-gray-500">
        You will be redirected securely to MintPay to complete your payment.
      </p>
    </div>
  );
}
