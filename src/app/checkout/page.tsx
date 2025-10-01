"use client";

import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { Loader2, ArrowLeft, CreditCard, Shield, CheckCircle2, Sparkles, ShoppingBag, Truck } from 'lucide-react';
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

  const inputClass = 'w-full rounded-2xl border border-gray-700/50 bg-gray-900/25 px-5 py-4 text-base text-brand-white placeholder-gray-400 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30';
  const labelClass = 'text-base font-semibold text-gray-200';
  const helperTextClass = 'mt-2 text-sm text-gray-400';
  const sectionCardClass = 'relative overflow-hidden rounded-3xl border border-gray-700/50 bg-gradient-to-br from-gray-950 via-gray-900/70 to-gray-950 p-6 sm:p-8 shadow-[0_28px_55px_-28px_rgba(0,0,0,0.75)] backdrop-blur-xl';

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

  const steps = [
    {
      label: 'Review Cart',
      description: `${cart.items.length} item${cart.items.length === 1 ? '' : 's'} ready`,
      status: 'done' as const,
      icon: ShoppingBag,
    },
    {
      label: 'Shipping Details',
      description: 'Enter delivery information',
      status: 'current' as const,
      icon: Truck,
    },
    {
      label: 'Payment & Confirmation',
      description: 'Secure Stripe checkout',
      status: 'up-next' as const,
      icon: CreditCard,
    },
  ];

  const heroHighlights = [
    {
      icon: Shield,
      title: 'Payment protection',
      copy: '256-bit SSL encrypted checkout powered by Stripe.',
    },
    {
      icon: Truck,
      title: 'Tracked delivery',
      copy: 'Island-wide shipping with live updates in 2-3 business days.',
    },
    {
      icon: CheckCircle2,
      title: '30-day flexibility',
      copy: 'Easy exchanges or returns if something isn’t just right.',
    },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-brand-black text-brand-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,86,86,0.18),_transparent_55%),_radial-gradient(circle_at_bottom,_rgba(255,184,108,0.14),_transparent_60%)]"></div>
      <div className="relative z-10 flex flex-col min-h-screen">
        <div className="border-b border-gray-800/60 bg-black/60 backdrop-blur-lg">
          <div className="container flex items-center justify-between px-4 py-6 mx-auto">
            <Link
              href="/shop"
              className="inline-flex items-center gap-3 text-sm text-gray-400 transition-all duration-300 group hover:text-primary"
            >
              <span className="p-2 transition-all duration-300 border rounded-full border-gray-800/70 bg-gray-900/40 group-hover:border-primary/60 group-hover:bg-primary/10">
                <ArrowLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" />
              </span>
              <span className="font-medium tracking-wide">Back to shop</span>
            </Link>
            <span className="hidden text-xs font-semibold tracking-[0.4em] text-gray-600 uppercase sm:block">
              Secure checkout
            </span>
          </div>
        </div>

        <header className="container px-4 py-10 mx-auto sm:py-14">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-flex items-center justify-center gap-2 rounded-full border border-primary/50 bg-primary/10 px-4 py-2 text-xs font-semibold tracking-[0.3em] text-primary uppercase">
              <Shield className="w-4 h-4" /> Stripe protected
            </span>
            <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-5xl md:text-6xl">
              Complete your order
            </h1>
            <p className="mt-4 text-base text-gray-400 sm:text-lg">
              Review your details below and finish with our secure Stripe payment flow. Delivery updates will be
              sent to your inbox.
            </p>
          </div>

          <div className="grid gap-4 mt-10 sm:grid-cols-3">
            {heroHighlights.map(({ icon: HighlightIcon, title, copy }) => (
              <div
                key={title}
                className="flex items-start gap-3 p-4 text-left border rounded-2xl border-gray-700/50 bg-gray-900/30"
              >
                <span className="inline-flex items-center justify-center flex-shrink-0 w-10 h-10 mt-1 border rounded-2xl border-primary/30 bg-primary/10 text-primary">
                  <HighlightIcon className="w-5 h-5" />
                </span>
                <div>
                  <p className="text-base font-semibold text-brand-white">{title}</p>
                  <p className="mt-1 text-sm text-gray-300">{copy}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 mt-8 sm:grid-cols-3">
            {steps.map((step) => {
              const Icon = step.icon;
              const isDone = step.status === 'done';
              const isCurrent = step.status === 'current';

              return (
                <div
                  key={step.label}
                  className={`relative overflow-hidden rounded-2xl border p-5 transition-colors duration-300 ${
                    isDone
                      ? 'border-primary/50 bg-primary/10'
                      : isCurrent
                      ? 'border-primary/40 bg-gradient-to-r from-primary/10 to-accent/10'
                      : 'border-gray-800/60 bg-gray-900/40'
                  }`}
                >
                  <div className="absolute inset-0 transition-opacity duration-500 opacity-0 -z-10 bg-gradient-to-br from-white/10 via-transparent to-transparent hover:opacity-100" />
                  <div className="flex items-start gap-3">
                    <span
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border text-sm font-semibold ${
                        isDone
                          ? 'border-primary/40 bg-primary/20 text-primary'
                          : isCurrent
                          ? 'border-primary/40 bg-primary/15 text-primary'
                          : 'border-gray-800/70 bg-gray-900/50 text-gray-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-300">
                        {isDone ? 'Completed' : isCurrent ? 'In progress' : 'Up next'}
                      </p>
                      <p className="mt-2 text-lg font-semibold text-brand-white">{step.label}</p>
                      <p className="mt-1 text-sm text-gray-300">{step.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </header>

        <div className="container flex-1 px-4 pb-16 mx-auto">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div className="space-y-8">
              <section className={sectionCardClass}>
                <div className="flex items-start justify-between gap-4 sm:gap-6">
                  <div>
                    <p className={labelClass}>Step 1</p>
                    <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Contact details</h2>
                    <p className={helperTextClass}>We&apos;ll send receipts and delivery updates here.</p>
                  </div>
                  <div className="p-3 border rounded-3xl border-primary/40 bg-primary/10 text-primary">
                    <Shield className="w-6 h-6" />
                  </div>
                </div>

                <div className="mt-8 space-y-6">
                  <div>
                    <label htmlFor="email" className={labelClass}>
                      Email address
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      onChange={handleInputChange}
                      placeholder="you@example.com"
                      required
                      autoComplete="email"
                      className={inputClass}
                    />
                    <p className={helperTextClass}>We&apos;ll send your receipt and delivery timeline here.</p>
                  </div>

                  <div>
                    <label htmlFor="phone" className={labelClass}>
                      Mobile number
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-5 text-sm font-medium text-gray-300 border border-r-0 rounded-l-2xl border-gray-700/60 bg-gray-900/40">
                        🇱🇰 +94
                      </span>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        onChange={handleInputChange}
                        placeholder="71 234 5678"
                        required
                        autoComplete="tel"
                        className={`${inputClass} rounded-l-none border-l-0`}
                      />
                    </div>
                    <p className={helperTextClass}>We only use this if the courier needs extra delivery details.</p>
                  </div>

                  <div>
                    <label className={labelClass}>Full name</label>
                    <div className="grid gap-4 mt-3 sm:grid-cols-2">
                      <div>
                        <input
                          type="text"
                          name="firstName"
                          onChange={handleInputChange}
                          placeholder="First name"
                          required
                          autoComplete="given-name"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          name="lastName"
                          onChange={handleInputChange}
                          placeholder="Last name"
                          required
                          autoComplete="family-name"
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className={sectionCardClass}>
                <div className="flex items-start justify-between gap-4 sm:gap-6">
                  <div>
                    <p className={labelClass}>Step 2</p>
                    <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Delivery address</h2>
                    <p className={helperTextClass}>Packages ship within 2 business days across Sri Lanka.</p>
                  </div>
                  <div className="p-3 border rounded-3xl border-accent/40 bg-accent/10 text-accent">
                    <Truck className="w-6 h-6" />
                  </div>
                </div>

                <div className="mt-8 space-y-6">
                  <div>
                    <label htmlFor="address" className={labelClass}>
                      Street address
                    </label>
                    <input
                      type="text"
                      id="address"
                      name="address"
                      onChange={handleInputChange}
                      placeholder="House number and street"
                      required
                      autoComplete="street-address"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="city" className={labelClass}>
                      City
                    </label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      onChange={handleInputChange}
                      placeholder="City / Town"
                      required
                      autoComplete="address-level2"
                      className={inputClass}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="relative">
                      <label className={labelClass}>Country</label>
                      <input
                        type="text"
                        name="country"
                        value="Sri Lanka"
                        readOnly
                        className={`${inputClass} cursor-not-allowed border-dashed text-gray-400`}
                      />
                      <span className="absolute text-lg -translate-y-1/2 pointer-events-none right-5 top-1/2">🇱🇰</span>
                    </div>
                    <div>
                      <label htmlFor="postalCode" className={labelClass}>
                        Postal code
                      </label>
                      <input
                        type="text"
                        id="postalCode"
                        name="postalCode"
                        onChange={handleInputChange}
                        placeholder="Postal code"
                        required
                        autoComplete="postal-code"
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className={sectionCardClass}>
                <div className="flex items-start justify-between gap-4 sm:gap-6">
                  <div>
                    <p className={labelClass}>Step 3</p>
                    <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Payment</h2>
                    <p className={helperTextClass}>
                      Stripe encrypts your card details end-to-end. We never store payment information on our
                      servers.
                    </p>
                  </div>
                  <div className="p-3 border rounded-3xl border-primary/40 bg-primary/10 text-primary">
                    <CreditCard className="w-6 h-6" />
                  </div>
                </div>

                  <div className="p-4 mt-6 border rounded-3xl border-gray-700/50 bg-black/15 sm:p-6">
                  <Elements stripe={stripePromise} options={options}>
                    <StripePaymentHandler cart={cart} shippingDetails={shippingDetails} />
                  </Elements>
                    <div className="flex flex-wrap items-center gap-2 mt-4 text-sm font-medium text-gray-400">
                    <span className="px-3 py-1 border rounded-full border-gray-800/60 bg-gray-900/40">Visa</span>
                    <span className="px-3 py-1 border rounded-full border-gray-800/60 bg-gray-900/40">Mastercard</span>
                    <span className="px-3 py-1 border rounded-full border-gray-800/60 bg-gray-900/40">Amex</span>
                    <span className="px-3 py-1 border rounded-full border-gray-800/60 bg-gray-900/40">Apple Pay</span>
                    <span className="px-3 py-1 border rounded-full border-gray-800/60 bg-gray-900/40">Google Pay</span>
                  </div>
                </div>
              </section>
            </div>

            <aside className="space-y-6 xl:pl-2">
              <div className="sticky top-6">
                <div className={`${sectionCardClass} overflow-hidden`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className={labelClass}>Order summary</p>
                      <h2 className="mt-3 text-2xl font-semibold tracking-tight">You&apos;re almost there</h2>
                      <p className="mt-2 text-sm text-gray-300">{cart.items.length} item{cart.items.length === 1 ? '' : 's'} in cart</p>
                      <p className={helperTextClass}>Trusted by 10,000+ athletes across Sri Lanka.</p>
                    </div>
                    <div className="p-3 border rounded-3xl border-primary/40 bg-primary/10 text-primary">
                      <Sparkles className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="pr-1 mt-6 space-y-4 overflow-y-auto max-h-80">
                    {cart.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 p-4 transition-all duration-300 border rounded-2xl border-gray-800/60 bg-gray-900/40 hover:border-primary/40 hover:bg-primary/10"
                      >
                        <div className="relative flex-shrink-0 w-16 h-16 overflow-hidden border border-gray-800 rounded-xl">
                          <Image
                            src={
                              item.sku.variant.variant_images && item.sku.variant.variant_images.length > 0
                                ? item.sku.variant.variant_images[0].image_url
                                : item.sku.variant.thumbnail_url || '/images/image.jpg'
                            }
                            alt={item.sku.variant.product.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate text-brand-white">
                            {item.sku.variant.product.name}
                          </p>
                          <p className="mt-1 text-sm text-gray-300">
                            {item.sku.size} • {item.sku.variant.color_name}
                          </p>
                          <div className="inline-flex items-center gap-2 mt-2">
                            <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-primary">
                              Qty {item.quantity}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-brand-white">
                          LKR {(parseFloat(item.sku.variant.price) * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="pt-6 mt-8 space-y-4 text-sm border-t border-gray-800/60">
                    <div className="flex justify-between text-gray-300">
                      <span>Subtotal</span>
                      <span className="font-semibold text-brand-white">LKR {(cart.subtotal || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Shipping</span>
                      <span className="font-semibold text-brand-white">
                        {cart.totalShipping > 0 ? (
                          `LKR ${cart.totalShipping.toFixed(2)}`
                        ) : (
                            <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
                            <CheckCircle2 className="w-3 h-3" /> Free
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 mt-6 border rounded-2xl border-primary/30 bg-primary/5">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-semibold uppercase tracking-[0.3em] text-gray-300">
                        Total
                      </span>
                      <div className="text-right">
                        <p className="text-2xl font-black text-transparent bg-gradient-to-r from-primary to-accent bg-clip-text">
                          LKR {cart.totalAmount.toFixed(2)}
                        </p>
                        <p className={helperTextClass}>All taxes included</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 mt-6 text-sm text-gray-300 border rounded-2xl border-gray-700/50 bg-black/20">
                    <div className="flex items-center gap-2 text-gray-300">
                      <Shield className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold uppercase tracking-[0.2em]">30-day guarantee</span>
                    </div>
                    <p className="mt-2 leading-relaxed text-gray-300">
                      Need help? Reach us at support@ceaserbrand.com. We&apos;re here to make sure your order arrives fast
                      and in perfect shape.
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}