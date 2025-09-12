"use client";

import { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { Loader2, Lock, ShoppingBag, ArrowLeft, Check, CreditCard, Truck, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import StripePaymentHandler from './StripePaymentHandler';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// --- Main Page Component ---
export default function CheckoutPage() {
  const { cart, loading: cartLoading, cartCount } = useCart();
  const router = useRouter();

  const [shippingDetails, setShippingDetails] = useState({
    email: '', address: '', city: '', postalCode: '', country: 'Sri Lanka'
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isPaymentVisible, setIsPaymentVisible] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShippingDetails({ ...shippingDetails, [e.target.name]: e.target.value });
  };

  // This function is called by the Payment Handler on success
  const onPaymentSuccess = async (paymentIntentId: string) => {
    try {
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart, shippingDetails, paymentIntentId }),
      });
      if (!orderRes.ok) throw new Error("Failed to save order in our database.");
      
      const { orderId } = await orderRes.json();
      // Redirect to the order confirmation page
      router.push(`/order-confirmation?orderId=${orderId}`);
    } catch (error) {
      console.error('Order creation error:', error);
      setFormError("Payment succeeded, but we couldn't save your order. Please contact support with Payment ID: " + paymentIntentId);
    }
  };

  if (cartLoading) return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center">
        <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
        <p className="text-gray-600">Loading checkout...</p>
      </div>
    </div>
  );

  if (!cart || cartCount === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-md px-4 mx-auto text-center">
          <ShoppingBag className="w-16 h-16 mx-auto mb-6 text-gray-400" />
          <h1 className="mb-4 text-3xl font-bold text-gray-900">Your cart is empty</h1>
          <p className="mb-8 text-gray-600">Looks like you haven&apos;t added anything to your cart yet.</p>
          <Link 
            href="/shop" 
            className="inline-flex items-center gap-2 px-8 py-4 font-semibold text-white transition-colors bg-black rounded-xl hover:bg-gray-800"
          >
            <ArrowLeft className="w-5 h-5" />
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  // Options for Stripe Elements
  const options = {
    mode: 'payment' as const,
    amount: Math.round(cart.totalAmount * 100),
    currency: 'lkr',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="px-4 py-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link href="/shop" className="flex items-center gap-2 text-gray-600 transition-colors hover:text-gray-900">
              <ArrowLeft className="w-5 h-5" />
              <span>Continue Shopping</span>
            </Link>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-green-600" />
              <span className="text-sm text-gray-600">Secure Checkout</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-12 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {/* Page Title */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold text-gray-900">Checkout</h1>
          <p className="text-lg text-gray-600">Complete your order securely</p>
        </div>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          {/* Left Column - Forms */}
          <div className="space-y-8 lg:col-span-7">
            {/* Contact Information */}
            <div className="p-8 bg-white shadow-lg rounded-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-8 h-8 text-sm font-bold text-white bg-black rounded-full">1</div>
                <h2 className="text-xl font-bold text-gray-900">Contact Information</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <input 
                    type="email" 
                    id="email"
                    name="email" 
                    onChange={handleInputChange} 
                    placeholder="you@example.com" 
                    required 
                    className="w-full px-4 py-3 transition-colors border border-gray-300 shadow-sm rounded-xl focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="p-8 bg-white shadow-lg rounded-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-8 h-8 text-sm font-bold text-white bg-black rounded-full">2</div>
                <h2 className="text-xl font-bold text-gray-900">Shipping Address</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label htmlFor="address" className="block mb-2 text-sm font-medium text-gray-700">
                    Street Address
                  </label>
                  <input 
                    type="text" 
                    id="address"
                    name="address" 
                    onChange={handleInputChange} 
                    placeholder="123 Main Street" 
                    required 
                    className="w-full px-4 py-3 transition-colors border border-gray-300 shadow-sm rounded-xl focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="city" className="block mb-2 text-sm font-medium text-gray-700">
                    City
                  </label>
                  <input 
                    type="text" 
                    id="city"
                    name="city" 
                    onChange={handleInputChange} 
                    placeholder="Colombo" 
                    required 
                    className="w-full px-4 py-3 transition-colors border border-gray-300 shadow-sm rounded-xl focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="country" className="block mb-2 text-sm font-medium text-gray-700">
                      Country
                    </label>
                    <input 
                      type="text" 
                      id="country"
                      name="country" 
                      value="Sri Lanka" 
                      readOnly 
                      className="w-full px-4 py-3 text-gray-600 border border-gray-300 shadow-sm bg-gray-50 rounded-xl"
                    />
                  </div>
                  <div>
                    <label htmlFor="postalCode" className="block mb-2 text-sm font-medium text-gray-700">
                      Postal Code
                    </label>
                    <input 
                      type="text" 
                      id="postalCode"
                      name="postalCode" 
                      onChange={handleInputChange} 
                      placeholder="10100" 
                      required 
                      className="w-full px-4 py-3 transition-colors border border-gray-300 shadow-sm rounded-xl focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Order Summary & Payment */}
          <div className="space-y-8 lg:col-span-5">
            {/* Order Summary */}
            <div className="sticky p-8 bg-white shadow-lg rounded-2xl top-8">
              <div className="flex items-center gap-3 mb-6">
                <ShoppingBag className="w-6 h-6 text-gray-700" />
                <h2 className="text-xl font-bold text-gray-900">Order Summary</h2>
              </div>
              
              <div className="mb-6 space-y-4">
                {cart.items.map(item => (
                  <div key={item.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                    <div className="relative w-16 h-16 overflow-hidden bg-gray-200 rounded-lg">
                      <Image 
                        src={item.sku.variant.thumbnail_url || '/images/placeholder.jpg'} 
                        alt={item.sku.variant.product.name} 
                        fill 
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{item.sku.variant.product.name}</h3>
                      <p className="text-sm text-gray-500">
                        {item.sku.size} • {item.sku.variant.color_name}
                      </p>
                      <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">
                        LKR {(parseFloat(item.sku.variant.price) * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold">LKR {cart.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-semibold text-green-600">Free</span>
                </div>
                <div className="pt-2 mt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-gray-900">Total</span>
                    <span className="text-xl font-bold text-gray-900">LKR {cart.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="pt-6 mt-6 border-t">
                <div className="grid grid-cols-2 gap-4 mb-6 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Shield className="w-6 h-6 text-green-600" />
                    <span className="text-xs text-gray-600">Secure Payment</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <Truck className="w-6 h-6 text-blue-600" />
                    <span className="text-xs text-gray-600">Free Shipping</span>
                  </div>
                </div>

                {/* Proceed to Payment Button */}
                {!isPaymentVisible && (
                  <button
                    onClick={() => setIsPaymentVisible(true)}
                    className="flex items-center justify-center w-full gap-3 px-6 py-4 text-lg font-bold text-white transition-all duration-200 bg-black shadow-lg rounded-xl hover:bg-gray-800 hover:scale-[1.02] active:scale-[0.98] hover:shadow-xl"
                  >
                    <Lock className="w-5 h-5" />
                    <span>Proceed to Payment</span>
                    <ChevronDown className="w-5 h-5" />
                  </button>
                )}

                {/* Collapse Payment Button */}
                {isPaymentVisible && (
                  <button
                    onClick={() => setIsPaymentVisible(false)}
                    className="flex items-center justify-center w-full gap-2 px-4 py-2 text-sm text-gray-600 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <ChevronUp className="w-4 h-4" />
                    <span>Hide Payment</span>
                  </button>
                )}
              </div>
            </div>

            {/* Payment Section - Conditionally Rendered */}
            {isPaymentVisible && (
              <div className="p-8 bg-white shadow-lg rounded-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex items-center justify-center w-8 h-8 text-sm font-bold text-white bg-black rounded-full">3</div>
                  <h2 className="text-xl font-bold text-gray-900">Payment</h2>
                  <CreditCard className="w-6 h-6 text-gray-700" />
                </div>
                
                <Elements stripe={stripePromise} options={options}>
                  <StripePaymentHandler 
                    totalAmount={cart.totalAmount}
                    onPaymentSuccess={onPaymentSuccess} 
                    shippingDetails={shippingDetails}
                  />
                </Elements>
                {formError && (
                  <div className="p-4 mt-4 border border-red-200 bg-red-50 rounded-xl">
                    <p className="text-sm text-red-600">{formError}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}