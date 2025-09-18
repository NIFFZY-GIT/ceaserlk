"use client";

import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { Loader2, ArrowLeft, CreditCard, Shield, CheckCircle2, Sparkles } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import StripePaymentHandler from './StripePaymentHandler';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function CheckoutPage() {
  const { cart, loading: cartLoading, cartCount } = useCart();

  const [shippingDetails, setShippingDetails] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'Sri Lanka'
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShippingDetails({ ...shippingDetails, [e.target.name]: e.target.value });
  };

  if (cartLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-brand-black">
        <div className="relative">
          <div className="absolute inset-0 w-16 h-16 border-4 rounded-full border-primary/20 animate-pulse"></div>
          <Loader2 className="w-16 h-16 animate-spin text-primary" />
        </div>
        <p className="mt-6 text-lg font-medium tracking-wide text-gray-300">Preparing your checkout...</p>
      </div>
    );
  }

  if (!cart || cartCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center bg-brand-black">
        <div className="p-12 border border-gray-800 bg-gray-900/30 rounded-3xl backdrop-blur-sm">
          <div className="flex items-center justify-center w-24 h-24 mx-auto mb-6 rounded-full bg-gray-800/50">
            <span className="text-4xl">🛒</span>
          </div>
          <h1 className="mb-4 text-3xl font-bold tracking-wide text-brand-white">Your cart is empty</h1>
          <p className="max-w-md mb-8 text-gray-400">Looks like you haven&apos;t added anything to your cart yet. Let&apos;s change that!</p>
          <Link 
            href="/shop" 
            className="inline-flex items-center gap-3 px-8 py-4 font-bold tracking-wider uppercase transition-all duration-300 bg-gradient-to-r from-primary to-accent text-brand-black rounded-2xl hover:scale-105 hover:-translate-y-1 hover:shadow-xl"
          >
            Continue Shopping
            <Sparkles className="w-5 h-5" />
          </Link>
        </div>
      </div>
    );
  }

  const options = {
    mode: 'payment' as const,
    amount: Math.round(cart.totalAmount * 100),
    currency: 'lkr',
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-brand-black text-brand-white">
      {/* Ambient Background */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-primary/5 via-transparent to-accent/5"></div>
      <div className="absolute top-0 right-0 rounded-full pointer-events-none w-96 h-96 bg-primary/10 blur-3xl"></div>
      <div className="absolute bottom-0 left-0 rounded-full pointer-events-none w-96 h-96 bg-accent/10 blur-3xl"></div>
      
      {/* Navigation */}
      <div className="relative z-10 border-b border-gray-800/50 bg-brand-black/80 backdrop-blur-xl">
        <div className="container px-4 py-6 mx-auto">
          <Link 
            href="/shop" 
            className="inline-flex items-center gap-3 text-sm text-gray-400 transition-all duration-300 hover:text-primary group hover:gap-4"
          >
            <div className="p-2 transition-all duration-300 rounded-full bg-gray-800/50 group-hover:bg-primary/10">
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            </div>
            <span className="font-medium">Back to Shop</span>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="container relative z-10 px-4 py-12 mx-auto md:py-20">
        {/* Page Title */}
        <div className="mb-16 text-center">
          <div className="inline-flex items-center gap-3 px-4 py-2 mb-6 border border-gray-800 rounded-full bg-gray-900/50 backdrop-blur-sm">
            <Shield className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium tracking-wide text-gray-300">SSL SECURED CHECKOUT</span>
          </div>
          <h1 className="mb-6 text-4xl font-black tracking-wider text-transparent uppercase md:text-6xl bg-gradient-to-r from-brand-white via-gray-200 to-brand-white bg-clip-text">
            Secure Checkout
          </h1>
          <div className="relative w-32 h-2 mx-auto rounded-full bg-gradient-to-r from-primary via-accent to-primary">
            <div className="absolute inset-0 rounded-full opacity-50 bg-gradient-to-r from-primary via-accent to-primary blur-sm"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-12 mx-auto xl:grid-cols-3 max-w-7xl">
          {/* Forms Section */}
          <div className="space-y-8 xl:col-span-2">
            {/* Contact Information */}
            <div className="relative group">
              <div className="absolute inset-0 transition-all duration-700 opacity-0 bg-gradient-to-r from-primary/20 via-accent/10 to-primary/20 rounded-3xl blur-xl group-hover:opacity-100"></div>
              <div className="relative p-8 border shadow-2xl border-gray-800/50 bg-gray-900/30 rounded-3xl md:p-10 backdrop-blur-xl">
                <div className="flex items-center gap-6 mb-8">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-2xl blur-sm"></div>
                    <div className="relative flex items-center justify-center w-16 h-16 text-xl font-black shadow-lg rounded-2xl bg-gradient-to-r from-primary to-accent text-brand-black">
                      1
                    </div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-wider text-transparent uppercase md:text-3xl bg-gradient-to-r from-brand-white to-gray-300 bg-clip-text">
                      Contact & Shipping
                    </h2>
                    <p className="mt-1 text-sm text-gray-400">Secure delivery information</p>
                  </div>
                </div>

                <div className="space-y-8">
                  {/* Email */}
                  <div className="relative">
                    <label htmlFor="email" className="block mb-3 text-sm font-semibold tracking-wide text-gray-300">
                      EMAIL ADDRESS
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      onChange={handleInputChange}
                      placeholder="you@example.com"
                      required
                      className="w-full px-6 py-4 placeholder-gray-500 transition-all duration-300 border-2 border-gray-700/50 rounded-2xl bg-gray-800/30 text-brand-white focus:ring-4 focus:ring-primary/20 focus:border-primary hover:border-gray-600 backdrop-blur-sm"
                    />
                  </div>

                  {/* Phone */}
                  <div className="relative">
                    <label htmlFor="phone" className="block mb-3 text-sm font-semibold tracking-wide text-gray-300">
                      MOBILE NUMBER
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-6 py-4 text-sm font-medium text-gray-300 border-2 border-r-0 border-gray-700/50 rounded-l-2xl bg-gray-800/30 backdrop-blur-sm">
                        🇱🇰 +94
                      </span>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        onChange={handleInputChange}
                        placeholder="71 234 5678"
                        required
                        className="w-full px-6 py-4 placeholder-gray-500 transition-all duration-300 border-2 border-gray-700/50 rounded-r-2xl bg-gray-800/30 text-brand-white focus:ring-4 focus:ring-primary/20 focus:border-primary hover:border-gray-600 backdrop-blur-sm"
                      />
                    </div>
                  </div>

                  {/* Full Name */}
                  <div className="relative">
                    <label className="block mb-3 text-sm font-semibold tracking-wide text-gray-300">
                      FULL NAME
                    </label>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <input
                        type="text"
                        name="firstName"
                        onChange={handleInputChange}
                        placeholder="First name"
                        required
                        className="w-full px-6 py-4 placeholder-gray-500 transition-all duration-300 border-2 border-gray-700/50 rounded-2xl bg-gray-800/30 text-brand-white focus:ring-4 focus:ring-primary/20 focus:border-primary hover:border-gray-600 backdrop-blur-sm"
                      />
                      <input
                        type="text"
                        name="lastName"
                        onChange={handleInputChange}
                        placeholder="Last name"
                        required
                        className="w-full px-6 py-4 placeholder-gray-500 transition-all duration-300 border-2 border-gray-700/50 rounded-2xl bg-gray-800/30 text-brand-white focus:ring-4 focus:ring-primary/20 focus:border-primary hover:border-gray-600 backdrop-blur-sm"
                      />
                    </div>
                  </div>

                  {/* Shipping Address */}
                  <div className="relative pt-8 border-t border-gray-700/50">
                    <div className="absolute top-0 w-8 h-1 transform -translate-x-1/2 -translate-y-1/2 rounded-full left-1/2 bg-gradient-to-r from-primary to-accent"></div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 border rounded-xl bg-primary/10 border-primary/20">
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="text-xl font-bold tracking-wide text-gray-200">SHIPPING ADDRESS</h3>
                    </div>
                    
                    <div className="space-y-6">
                      <input
                        type="text"
                        name="address"
                        onChange={handleInputChange}
                        placeholder="Street Address"
                        required
                        className="w-full px-6 py-4 placeholder-gray-500 transition-all duration-300 border-2 border-gray-700/50 rounded-2xl bg-gray-800/30 text-brand-white focus:ring-4 focus:ring-primary/20 focus:border-primary hover:border-gray-600 backdrop-blur-sm"
                      />
                      
                      <input
                        type="text"
                        name="city"
                        onChange={handleInputChange}
                        placeholder="City"
                        required
                        className="w-full px-6 py-4 placeholder-gray-500 transition-all duration-300 border-2 border-gray-700/50 rounded-2xl bg-gray-800/30 text-brand-white focus:ring-4 focus:ring-primary/20 focus:border-primary hover:border-gray-600 backdrop-blur-sm"
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="relative">
                          <input
                            type="text"
                            name="country"
                            value="Sri Lanka"
                            readOnly
                            className="w-full px-6 py-4 text-gray-400 border-2 cursor-not-allowed border-gray-600/50 rounded-2xl bg-gray-700/30 backdrop-blur-sm"
                          />
                          <div className="absolute top-4 right-4">
                            <span className="text-lg">🇱🇰</span>
                          </div>
                        </div>
                        <input
                          type="text"
                          name="postalCode"
                          onChange={handleInputChange}
                          placeholder="Postal Code"
                          required
                          className="w-full px-6 py-4 placeholder-gray-500 transition-all duration-300 border-2 border-gray-700/50 rounded-2xl bg-gray-800/30 text-brand-white focus:ring-4 focus:ring-primary/20 focus:border-primary hover:border-gray-600 backdrop-blur-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Section */}
            <div className="relative group">
              <div className="absolute inset-0 transition-all duration-700 opacity-0 bg-gradient-to-r from-accent/20 via-primary/10 to-accent/20 rounded-3xl blur-xl group-hover:opacity-100"></div>
              <div className="relative p-8 border shadow-2xl border-gray-800/50 bg-gray-900/30 rounded-3xl md:p-10 backdrop-blur-xl">
                <div className="flex items-center gap-6 mb-8">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-accent to-primary rounded-2xl blur-sm"></div>
                    <div className="relative flex items-center justify-center w-16 h-16 text-xl font-black shadow-lg rounded-2xl bg-gradient-to-r from-accent to-primary text-brand-black">
                      2
                    </div>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-black tracking-wider text-transparent uppercase md:text-3xl bg-gradient-to-r from-brand-white to-gray-300 bg-clip-text">
                      Payment Details
                    </h2>
                    <p className="mt-1 text-sm text-gray-400">Secure payment processing</p>
                  </div>
                  <div className="p-3 border rounded-2xl bg-primary/10 border-primary/20">
                    <CreditCard className="w-8 h-8 text-primary" />
                  </div>
                </div>

                <Elements stripe={stripePromise} options={options}>
                  <StripePaymentHandler cart={cart} shippingDetails={shippingDetails} />
                </Elements>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="xl:col-span-1">
            <div className="relative group">
              <div className="absolute inset-0 transition-all duration-700 opacity-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 rounded-3xl blur-xl group-hover:opacity-100"></div>
              <div className="sticky p-8 border shadow-2xl border-gray-800/50 bg-gray-900/40 rounded-3xl md:p-10 backdrop-blur-xl top-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-black tracking-wider text-transparent uppercase bg-gradient-to-r from-brand-white to-gray-300 bg-clip-text">
                      Your Order
                    </h2>
                    <p className="mt-1 text-sm text-gray-400">{cart.items.length} items</p>
                  </div>
                  <div className="p-3 border rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 border-primary/20">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                </div>

                {/* Order Items */}
                <div className="mb-8 space-y-4 overflow-y-auto max-h-80">
                  {cart.items.map(item => (
                    <div key={item.id} className="relative group/item">
                      <div className="relative flex items-center gap-4 p-4 transition-all duration-300 border border-gray-700/50 bg-gray-800/20 rounded-2xl hover:bg-gray-800/40 backdrop-blur-sm">
                        <div className="relative flex-shrink-0 w-16 h-16 overflow-hidden transition-all duration-300 border-2 rounded-xl border-gray-600/50 group-hover/item:border-primary/50">
                          <Image
                            src={item.sku.variant.thumbnail_url || ''}
                            alt={item.sku.variant.product.name}
                            fill
                            className="object-cover transition-transform duration-300 group-hover/item:scale-105"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold truncate transition-colors duration-300 text-brand-white group-hover/item:text-primary">
                            {item.sku.variant.product.name}
                          </p>
                          <p className="text-sm font-medium text-gray-400">
                            {item.sku.size} / {item.sku.variant.color_name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="px-2 py-1 text-xs font-bold border rounded-full text-primary bg-primary/10 border-primary/20">
                              Qty: {item.quantity}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black transition-colors duration-300 text-brand-white group-hover/item:text-primary">
                            LKR {(parseFloat(item.sku.variant.price) * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Totals */}
                <div className="relative">
                  <div className="absolute top-0 w-12 h-1 transform -translate-x-1/2 -translate-y-1/2 rounded-full left-1/2 bg-gradient-to-r from-primary to-accent"></div>
                  <div className="pt-8 space-y-4 border-t border-gray-700/50">
                    <div className="flex justify-between text-gray-300 transition-colors duration-300 hover:text-brand-white">
                      <span className="font-medium">Subtotal</span>
                      <span className="font-bold">LKR {(cart.subtotal || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-300 transition-colors duration-300 hover:text-brand-white">
                      <span className="font-medium">Shipping</span>
                      <span className="font-bold">
                        {cart.totalShipping > 0 ? (
                          `LKR ${cart.totalShipping.toFixed(2)}`
                        ) : (
                          <span className="px-4 py-2 text-sm font-black transition-all duration-300 border-2 rounded-full shadow-lg text-primary bg-gradient-to-r from-primary/20 to-accent/10 border-primary/30">
                            FREE SHIPPING ✨
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  
                  <div className="relative pt-6 mt-6 border-t-2 border-primary/30">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-accent to-primary rounded-full"></div>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-black tracking-wide text-brand-white">TOTAL</span>
                      <div className="text-right">
                        <span className="text-3xl font-black tracking-wide text-transparent bg-gradient-to-r from-primary to-accent bg-clip-text">
                          LKR {cart.totalAmount.toFixed(2)}
                        </span>
                        <p className="mt-1 text-xs text-gray-400">All taxes included</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}