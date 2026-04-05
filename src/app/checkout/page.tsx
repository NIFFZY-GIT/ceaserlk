"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { Loader2, ArrowLeft, CreditCard, Shield, CheckCircle2, Sparkles, ShoppingBag, Truck, Banknote, Wallet, Gift, Plus, Minus, Trash2, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import PayHerePaymentHandler from './PayHerePaymentHandler';
import KokoPaymentHandler from './KokoPaymentHandler';

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

type CheckoutFieldName = 'email' | 'phone' | 'firstName' | 'lastName' | 'address' | 'city' | 'country' | 'postalCode';

const checkoutFieldEventNames: Record<CheckoutFieldName, string> = {
  email: 'Email_Field',
  phone: 'Phone_Field',
  firstName: 'First_Name_Field',
  lastName: 'Last_Name_Field',
  address: 'Street_Address_Field',
  city: 'City_Field',
  country: 'Country_Field',
  postalCode: 'Postal_Code_Field',
};

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { cart, loading: cartLoading, cartCount, fetchCart, updateQuantity, removeFromCart } = useCart();
  const { guestId } = useAuth();

  const kokoPaymentFailed = searchParams.get('payment_error') === 'koko_failed';

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
  const [paymentMethod, setPaymentMethod] = useState<'payhere' | 'koko' | 'cod'>('payhere');
  const [codSubmitting, setCodSubmitting] = useState(false);
  const [codError, setCodError] = useState<string | null>(null);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  // Cart expiration timer state
  const [cartTimeRemaining, setCartTimeRemaining] = useState<number | null>(null);
  const [cartExpired, setCartExpired] = useState(false);

  // Free delivery promo state (lifetime if earned)
  const [hasFreeDeliveryForLife, setHasFreeDeliveryForLife] = useState(false);
  const trackedFillEventsRef = useRef(new Set<string>());
  const pendingPixelEventsRef = useRef<string[]>([]);

  // Cart expiration timer effect
  useEffect(() => {
    if (!cart?.expiresAt) return;
    
    const updateTimer = () => {
      const expiresAt = new Date(cart.expiresAt!).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
      
      setCartTimeRemaining(remaining);
      if (remaining <= 0) {
        setCartExpired(true);
      }
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [cart?.expiresAt]);

  // Check for free delivery promo on mount
  const checkFreeDelivery = useCallback(async () => {
    try {
      const response = await fetch('/api/promo/free-delivery');
      if (response.ok) {
        const data = await response.json();
        const hasFreeDelivery = data.hasFreeDelivery && data.isLifetime;
        console.log('Free delivery check result:', { hasFreeDelivery, data });
        setHasFreeDeliveryForLife(hasFreeDelivery);
      } else {
        console.log('Free delivery check returned non-ok status:', response.status);
        setHasFreeDeliveryForLife(false);
      }
    } catch (error) {
      console.error('Error checking free delivery:', error);
      setHasFreeDeliveryForLife(false);
    }
  }, []);

  useEffect(() => {
    checkFreeDelivery();
  }, [checkFreeDelivery]);

  // Calculate actual shipping with free delivery applied (automatic if lifetime)
  const actualShipping = hasFreeDeliveryForLife ? 0 : (cart?.totalShipping || 0);
  const actualTotal = (cart?.subtotal || 0) + actualShipping;

  const validateShippingDetails = () => {
    return Object.entries(shippingDetails)
      .filter(([, value]) => {
        // Defensive check: ensure value is a string before calling trim()
        if (typeof value !== 'string') return true; // Mark as invalid if not a string
        return value.trim() === '';
      })
      .map(([key]) => key);
  };

  const handleDeferredOrder = async (selectedMethod: 'COD' | 'KOKO') => {
    setCodError(null);

    const missingFields = validateShippingDetails();
    if (missingFields.length > 0) {
      setCodError(`Please fill out all contact and shipping details before placing your order (missing: ${missingFields.join(', ')}).`);
      return;
    }

    if (!cart?.id) {
      setCodError('Your cart could not be found. Please refresh and try again.');
      return;
    }

    try {
      setCodSubmitting(true);
      
      // Ensure all shipping details are properly formatted
      const requestBody = {
        cartId: cart.id,
        shippingDetails: Object.fromEntries(
          Object.entries(shippingDetails).map(([key, value]) => [
            key,
            typeof value === 'string' ? value.trim() : value,
          ])
        ),
        useFreeDelivery: hasFreeDeliveryForLife,
        paymentMethod: selectedMethod,
      };

      console.log('Sending deferred payment order request:', {
        cartId: cart.id,
        paymentMethod: selectedMethod,
        fields: Object.keys(shippingDetails),
      });

      const response = await fetch('/api/checkout/place-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to place order. Please try again.';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          console.error('Deferred payment order API error:', { status: response.status, error: errorData });
        } catch (parseError) {
          console.error('Could not parse error response:', parseError);
        }
        setCodError(errorMessage);
        return;
      }

      const data = await response.json();
      console.log('Deferred payment order created successfully:', data);

      if (data?.orderId) {
        await fetchCart();
        router.push(`/order-confirmation?orderId=${data.orderId}`);
      } else {
        console.error('API response missing orderId:', data);
        setCodError('Order was created but no confirmation was returned. Please contact support.');
      }
    } catch (error) {
      console.error('Deferred payment order error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unexpected error while placing order. Please try again.';
      setCodError(errorMessage);
    } finally {
      setCodSubmitting(false);
    }
  };

  const inputClass = 'w-full rounded-lg sm:rounded-xl border border-gray-700/50 bg-gray-900/25 px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-brand-white placeholder-gray-400 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30';
  const labelClass = 'text-xs sm:text-sm font-semibold text-gray-200';
  const helperTextClass = 'mt-1 sm:mt-2 text-[10px] sm:text-xs text-gray-400';
  const sectionCardClass = 'relative overflow-hidden rounded-xl sm:rounded-2xl border border-gray-700/50 bg-gradient-to-br from-gray-950 via-gray-900/70 to-gray-950 p-3 sm:p-5 md:p-6 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.75)] backdrop-blur-xl';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (codError) {
      setCodError(null);
    }
    const { name, value } = e.target;
    setShippingDetails((previous) => ({ ...previous, [name]: value }));
  };

  const trackCheckoutFieldEvent = useCallback((field: CheckoutFieldName, interaction: 'Focus' | 'Fill') => {
    const eventName = `${checkoutFieldEventNames[field]}_${interaction}`;

    if (interaction === 'Fill') {
      if (trackedFillEventsRef.current.has(eventName)) {
        return;
      }

      trackedFillEventsRef.current.add(eventName);
    }

    if (typeof window === 'undefined' || typeof window.fbq !== 'function') {
      pendingPixelEventsRef.current.push(eventName);
      return;
    }

    window.fbq('trackCustom', eventName);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.fbq !== 'function' || pendingPixelEventsRef.current.length === 0) {
      return;
    }

    const queuedEvents = pendingPixelEventsRef.current.splice(0, pendingPixelEventsRef.current.length);
    queuedEvents.forEach((eventName) => {
      window.fbq?.('trackCustom', eventName);
    });
  });

  const getFieldTrackingProps = useCallback(
    (field: CheckoutFieldName) => ({
      onFocus: () => trackCheckoutFieldEvent(field, 'Focus'),
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        handleInputChange(e);

        if (e.target.value.trim()) {
          trackCheckoutFieldEvent(field, 'Fill');
        }
      },
    }),
    [trackCheckoutFieldEvent]
  );

  // Handle quantity update for cart items
  const handleQuantityUpdate = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    setUpdatingItemId(itemId);
    await updateQuantity(itemId, newQuantity);
    setUpdatingItemId(null);
  };

  // Handle remove item from cart
  const handleRemoveItem = async (itemId: string) => {
    setUpdatingItemId(itemId);
    await removeFromCart(itemId);
    setUpdatingItemId(null);
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

  if (cartExpired || !cart || cartCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center bg-brand-black">
        <div className="p-12 border border-gray-800 bg-gray-900/30 rounded-3xl backdrop-blur-sm">
          <div className="flex items-center justify-center w-24 h-24 mx-auto mb-6 rounded-full bg-gray-800/50">
            <span className="text-4xl">{cartExpired ? '⏰' : '🛒'}</span>
          </div>
          <h1 className="mb-4 text-3xl font-bold tracking-wide text-brand-white">
            {cartExpired ? 'Your cart session expired' : 'Your cart is empty'}
          </h1>
          <p className="max-w-md mb-8 text-gray-400">
            {cartExpired 
              ? 'Your cart session has expired for security reasons. Please add your items again to continue shopping.'
              : "Looks like you haven't added anything to your cart yet. Let's change that!"}
          </p>
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
      description: 'Choose payment method',
      status: 'up-next' as const,
      icon: CreditCard,
    },
  ];

  const paymentOptions = [
    {
      value: 'payhere' as const,
      label: 'Pay Online (Recommended)',
      description: 'Pay securely with Visa, Mastercard, Amex, bank transfer, or mobile wallets like FriMi.',
      icon: Wallet,
    },
    {
      value: 'koko' as const,
      label: 'Koko: Buy Now Pay Later',
      description: 'Pay in 3 interest free instalments with Koko.',
      icon: CreditCard,
    },
    {
      value: 'cod' as const,
      label: 'Pay on delivery',
      description: 'Place your order now and pay when it arrives at your doorstep.',
      icon: Banknote,
    },
  ];

  const heroHighlights = [
    {
      icon: Shield,
      title: 'Flexible payments',
      copy: 'Pay securely online or choose pay on delivery across Sri Lanka.',
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
    <main className="relative min-h-screen overflow-x-hidden bg-brand-black text-brand-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,86,86,0.18),_transparent_55%),_radial-gradient(circle_at_bottom,_rgba(255,184,108,0.14),_transparent_60%)]" />
      <div className="relative z-10 flex flex-col min-h-screen w-full max-w-full">
        <div className="border-b border-gray-800/60 bg-black/60 backdrop-blur-lg">
          <div className="container flex items-center justify-between px-4 py-4 sm:py-6 mx-auto max-w-7xl">
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-400 transition-all duration-300 group hover:text-primary"
            >
              <span className="p-1.5 sm:p-2 transition-all duration-300 border rounded-full border-gray-800/70 bg-gray-900/40 group-hover:border-primary/60 group-hover:bg-primary/10">
                <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-300 group-hover:-translate-x-1" />
              </span>
              <span className="font-medium tracking-wide">Back to shop</span>
            </Link>
            <span className="hidden text-xs font-semibold tracking-[0.4em] text-gray-600 uppercase sm:block">
              Secure checkout
            </span>
          </div>
        </div>

        <header className="container px-4 py-6 sm:py-8 md:py-14 mx-auto max-w-7xl">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-full border border-primary/50 bg-primary/10 px-3 py-1.5 text-[10px] sm:text-xs font-semibold tracking-[0.15em] sm:tracking-[0.3em] text-primary uppercase">
              <Shield className="w-3 h-3 sm:w-4 sm:h-4" /> Secure checkout
            </span>
            <h1 className="mt-4 sm:mt-6 text-xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight">
              Complete your order
            </h1>
            <p className="mt-2 sm:mt-4 text-xs sm:text-sm md:text-base text-gray-400">
              Review your details below and finish with our secure Stripe payment flow. Delivery updates will be
              sent to your inbox.
            </p>
          </div>

          <div className="hidden sm:grid gap-3 mt-6 sm:mt-10 grid-cols-1 sm:grid-cols-3">
            {heroHighlights.map(({ icon: HighlightIcon, title, copy }) => (
              <div
                key={title}
                className="flex items-start gap-3 p-3 sm:p-4 text-left border rounded-xl sm:rounded-2xl border-gray-700/50 bg-gray-900/30"
              >
                <span className="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 mt-0.5 border rounded-xl sm:rounded-2xl border-primary/30 bg-primary/10 text-primary">
                  <HighlightIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                </span>
                <div>
                  <p className="text-sm sm:text-base font-semibold text-brand-white">{title}</p>
                  <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-300">{copy}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden sm:grid gap-3 mt-6 sm:mt-8 grid-cols-1 sm:grid-cols-3">
            {steps.map((step) => {
              const Icon = step.icon;
              const isDone = step.status === 'done';
              const isCurrent = step.status === 'current';

              return (
                <div
                  key={step.label}
                  className={`relative overflow-hidden rounded-xl sm:rounded-2xl border p-4 sm:p-5 transition-colors duration-300 ${
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
                      className={`inline-flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl sm:rounded-2xl border text-sm font-semibold flex-shrink-0 ${
                        isDone
                          ? 'border-primary/40 bg-primary/20 text-primary'
                          : isCurrent
                          ? 'border-primary/40 bg-primary/15 text-primary'
                          : 'border-gray-800/70 bg-gray-900/50 text-gray-400'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </span>
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-gray-300">
                        {isDone ? 'Completed' : isCurrent ? 'In progress' : 'Up next'}
                      </p>
                      <p className="mt-1 sm:mt-2 text-base sm:text-lg font-semibold text-brand-white">{step.label}</p>
                      <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-300">{step.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </header>

        <div className="container flex-1 px-3 sm:px-4 pb-8 sm:pb-16 mx-auto max-w-7xl">
          {kokoPaymentFailed && (
            <div className="mb-4 sm:mb-6 rounded-xl sm:rounded-2xl border border-red-500/40 bg-red-500/10 px-4 sm:px-5 py-3 sm:py-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-red-300">
                  <AlertTriangle className="w-5 h-5" />
                </span>
                <div>
                  <p className="text-sm sm:text-base font-semibold text-red-200">
                    Your card payment did not go through.
                  </p>
                  <p className="mt-1 text-xs sm:text-sm text-red-100/90">
                    Please try again or choose another payment method.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:gap-6 lg:gap-8 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div className="space-y-4 sm:space-y-6 lg:space-y-8 order-2 xl:order-1">
              <section className={sectionCardClass}>
                <div className="flex items-start justify-between gap-2 sm:gap-4">
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs font-semibold text-primary uppercase tracking-wider">Step 1</p>
                    <h2 className="mt-1 sm:mt-2 text-base sm:text-xl md:text-2xl font-semibold tracking-tight">Contact details</h2>
                    <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-gray-400">We&apos;ll send receipts here.</p>
                  </div>
                  <div className="p-1.5 sm:p-2 border rounded-lg sm:rounded-xl border-primary/40 bg-primary/10 text-primary flex-shrink-0">
                    <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                </div>

                <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-5">
                  <div>
                    <label htmlFor="email" className={labelClass}>
                      Email address
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={shippingDetails.email}
                      {...getFieldTrackingProps('email')}
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
                    <div className="flex mt-1">
                      <span className="inline-flex items-center px-2 sm:px-3 text-[10px] sm:text-xs font-medium text-gray-300 border border-r-0 rounded-l-lg sm:rounded-l-xl border-gray-700/60 bg-gray-900/40">
                        🇱🇰 +94
                      </span>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={shippingDetails.phone}
                        {...getFieldTrackingProps('phone')}
                        placeholder="71 234 5678"
                        required
                        autoComplete="tel"
                        className={`${inputClass} rounded-l-none border-l-0`}
                      />
                    </div>
                    <p className={`${helperTextClass} text-xs sm:text-sm`}>We only use this if the courier needs extra delivery details.</p>
                  </div>

                  <div>
                    <label className={labelClass}>Full name</label>
                    <div className="grid gap-4 mt-3 sm:grid-cols-2">
                      <div>
                        <input
                          type="text"
                          name="firstName"
                          value={shippingDetails.firstName}
                          {...getFieldTrackingProps('firstName')}
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
                          value={shippingDetails.lastName}
                          {...getFieldTrackingProps('lastName')}
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
                <div className="flex items-start justify-between gap-2 sm:gap-4">
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs font-semibold text-accent uppercase tracking-wider">Step 2</p>
                    <h2 className="mt-1 sm:mt-2 text-base sm:text-xl md:text-2xl font-semibold tracking-tight">Delivery address</h2>
                    <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-gray-400">Ships in 2 business days.</p>
                  </div>
                  <div className="p-1.5 sm:p-2 border rounded-lg sm:rounded-xl border-accent/40 bg-accent/10 text-accent flex-shrink-0">
                    <Truck className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                </div>

                <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-5">
                  <div>
                    <label htmlFor="address" className={labelClass}>
                      Street address
                    </label>
                    <input
                      type="text"
                      id="address"
                      name="address"
                      value={shippingDetails.address}
                      {...getFieldTrackingProps('address')}
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
                      value={shippingDetails.city}
                      {...getFieldTrackingProps('city')}
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
                        {...getFieldTrackingProps('country')}
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
                        value={shippingDetails.postalCode}
                        {...getFieldTrackingProps('postalCode')}
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
                <div className="flex items-start justify-between gap-2 sm:gap-4">
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs font-semibold text-primary uppercase tracking-wider">Step 3</p>
                    <h2 className="mt-1 sm:mt-2 text-base sm:text-xl md:text-2xl font-semibold tracking-tight">Payment</h2>
                    <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-gray-400">Choose your payment method.</p>
                  </div>
                  <div className="p-1.5 sm:p-2 border rounded-lg sm:rounded-xl border-primary/40 bg-primary/10 text-primary flex-shrink-0">
                    <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                </div>

                <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-5">
                  <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-3">
                    {paymentOptions.map((option) => {
                      const Icon = option.icon;
                      const isActive = paymentMethod === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          aria-pressed={isActive}
                          onClick={() => {
                            setPaymentMethod(option.value);
                            setCodError(null);
                          }}
                          className={`flex w-full items-start gap-2 sm:gap-3 rounded-lg sm:rounded-xl border px-3 sm:px-4 py-2.5 sm:py-3 text-left transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                            isActive
                              ? 'border-primary/60 bg-primary/10'
                              : 'border-gray-700/60 bg-gray-900/40'
                          }`}
                        >
                          {option.value !== 'koko' && (
                            <span
                              className={`inline-flex h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 items-center justify-center rounded-lg sm:rounded-xl text-sm font-semibold ${
                                isActive
                                  ? 'border border-primary/40 bg-primary/20 text-primary'
                                  : 'border border-gray-800/70 bg-gray-900/50 text-gray-400'
                              }`}
                            >
                              <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            </span>
                          )}
                          <div className="min-w-0">
                            {option.value === 'koko' ? (
                              <div className="flex items-center h-5 sm:h-6">
                                <Image
                                  src="/assets/Koko Merchant Toolkit V4.0/Koko Assets/Koko logo/MAINLogo-HD_H.png"
                                  alt="Koko Buy Now Pay Later"
                                  width={116}
                                  height={22}
                                  className="h-[18px] sm:h-[22px] w-auto object-contain"
                                />
                                <span className="sr-only">{option.label}</span>
                              </div>
                            ) : (
                              <p className="text-xs sm:text-sm font-semibold text-brand-white">{option.label}</p>
                            )}
                            <p className="mt-0.5 text-[10px] sm:text-xs text-gray-400 line-clamp-2">{option.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {paymentMethod === 'payhere' ? (
                    <div className="p-3 sm:p-4 border rounded-xl sm:rounded-2xl border-blue-500/30 bg-blue-500/5">
                      <PayHerePaymentHandler cart={cart} shippingDetails={shippingDetails} useFreeDelivery={hasFreeDeliveryForLife} guestId={guestId} />
                    </div>
                  ) : paymentMethod === 'koko' ? (
                    <div className="p-3 sm:p-4 border rounded-xl sm:rounded-2xl border-orange-500/40 bg-orange-500/5">
                      <KokoPaymentHandler cart={cart} shippingDetails={shippingDetails} useFreeDelivery={hasFreeDeliveryForLife} guestId={guestId} />
                    </div>
                  ) : (
                    <div className="p-3 sm:p-4 border rounded-xl sm:rounded-2xl border-primary/40 bg-primary/5">
                      <div className="space-y-3 sm:space-y-4">
                        <div className="flex items-start gap-2 sm:gap-3">
                          <span className="inline-flex h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0 items-center justify-center rounded-lg sm:rounded-xl border border-primary/40 bg-primary/15 text-primary">
                            <Banknote className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </span>
                          <div>
                            <p className="text-sm sm:text-base font-semibold text-brand-white">Pay on delivery</p>
                            <p className="mt-0.5 text-[10px] sm:text-xs text-gray-400">
                              Pay when your order arrives. Cash and card accepted.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeferredOrder('COD')}
                          disabled={codSubmitting}
                          className="flex items-center justify-center w-full px-4 py-2.5 sm:py-3 text-sm font-bold text-brand-black transition-colors bg-primary border border-transparent rounded-lg shadow-sm hover:bg-primary/90 disabled:bg-gray-500 disabled:text-gray-200"
                        >
                          {codSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Place order'}
                        </button>
                        <p className="mt-2 text-[10px] text-center text-gray-400">
                          By placing this order, you agree to our{' '}
                          <Link href="/terms-conditions" target="_blank" className="underline hover:text-primary">
                            Terms
                          </Link>
                        </p>
                        {codError && <p className="text-xs text-red-500">{codError}</p>}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <aside className="space-y-4 sm:space-y-6 xl:pl-2 order-1 xl:order-2">
              <div className="xl:sticky xl:top-6">
                {/* Cart expiration warning */}
                {cartTimeRemaining !== null && cartTimeRemaining <= 600 && cartTimeRemaining > 0 && (
                  <div className="mb-4 p-3 sm:p-4 rounded-xl border border-amber-500/40 bg-amber-500/10">
                    <div className="flex items-center gap-2 text-amber-400">
                      <span className="text-lg">⏰</span>
                      <div>
                        <p className="text-xs sm:text-sm font-semibold">
                          Cart expires in {Math.floor(cartTimeRemaining / 60)}:{(cartTimeRemaining % 60).toString().padStart(2, '0')}
                        </p>
                        <p className="text-[10px] sm:text-xs text-amber-400/80">Complete checkout to secure your items</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className={`${sectionCardClass} overflow-hidden`}>
                  <div className="flex items-start justify-between gap-2 sm:gap-4">
                    <div className="min-w-0 flex-1">
                      <p className={`${labelClass} text-xs sm:text-sm`}>Order summary</p>
                      <h2 className="mt-1 sm:mt-3 text-lg sm:text-xl md:text-2xl font-semibold tracking-tight">You&apos;re almost there</h2>
                      <p className="mt-1 text-xs text-gray-300">{cart.items.length} item{cart.items.length === 1 ? '' : 's'} in cart</p>
                    </div>
                    <div className="p-2 border rounded-xl sm:rounded-2xl border-primary/40 bg-primary/10 text-primary flex-shrink-0">
                      <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                  </div>

                  <div className="mt-3 sm:mt-6 space-y-2 sm:space-y-3 overflow-y-auto max-h-48 sm:max-h-80">
                    {cart.items.map((item) => {
                      const isUpdating = updatingItemId === item.id;
                      // Get image URL with fallback logic matching CartDrawer
                      const getImageUrl = () => {
                        const variant = item.sku.variant;
                        if (variant.thumbnail_url) return variant.thumbnail_url;
                        if (variant.variant_images && variant.variant_images.length > 0) {
                          return variant.variant_images[0].image_url;
                        }
                        return '/images/image.jpg';
                      };
                      const imageUrl = getImageUrl();
                      
                      return (
                        <div
                          key={item.id}
                          className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 transition-all duration-300 border rounded-lg sm:rounded-xl border-gray-800/60 bg-gray-900/40 ${isUpdating ? 'opacity-50' : ''}`}
                        >
                          <div className="relative flex-shrink-0 w-10 h-10 sm:w-14 sm:h-14 overflow-hidden border border-gray-800 rounded-md sm:rounded-lg">
                            <Image
                              src={imageUrl}
                              alt={item.sku.variant.product.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] sm:text-sm font-semibold truncate text-brand-white">
                              {item.sku.variant.product.name}
                            </p>
                            <p className="text-[10px] sm:text-xs text-gray-300">
                              {item.sku.size} • {item.sku.variant.color_name}
                            </p>
                            {/* Quantity Controls */}
                            <div className="flex items-center gap-1.5 sm:gap-2 mt-1.5">
                              <button
                                onClick={() => handleQuantityUpdate(item.id, item.quantity - 1)}
                                disabled={isUpdating || item.quantity <= 1}
                                className="p-1 sm:p-1.5 rounded-md border border-gray-700 bg-gray-800/50 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                title="Decrease quantity"
                              >
                                <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-300" />
                              </button>
                              <span className="min-w-[20px] sm:min-w-[24px] text-center text-[11px] sm:text-xs font-semibold text-brand-white">
                                {isUpdating ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : item.quantity}
                              </span>
                              <button
                                onClick={() => handleQuantityUpdate(item.id, item.quantity + 1)}
                                disabled={isUpdating}
                                className="p-1 sm:p-1.5 rounded-md border border-gray-700 bg-gray-800/50 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                title="Increase quantity"
                              >
                                <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-300" />
                              </button>
                              <button
                                onClick={() => handleRemoveItem(item.id)}
                                disabled={isUpdating}
                                className="p-1 sm:p-1.5 ml-1 rounded-md border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                title="Remove item"
                              >
                                <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-red-400" />
                              </button>
                            </div>
                          </div>
                          <p className="text-[11px] sm:text-sm font-semibold text-brand-white whitespace-nowrap">
                            LKR {(parseFloat(item.sku.variant.price) * item.quantity).toLocaleString()}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-3 sm:pt-6 mt-3 sm:mt-6 space-y-2 sm:space-y-3 text-[11px] sm:text-sm border-t border-gray-800/60">
                    <div className="flex justify-between items-center text-gray-300">
                      <span>Subtotal</span>
                      <span className="font-semibold text-brand-white">LKR {(cart.subtotal || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-300">
                      <span>Shipping</span>
                      <span className="font-semibold text-brand-white">
                        {hasFreeDeliveryForLife ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] sm:text-xs font-semibold uppercase text-emerald-400">
                            <Gift className="w-2.5 h-2.5" /> Unlocked
                          </span>
                        ) : cart.totalShipping > 0 ? (
                          `LKR ${cart.totalShipping.toLocaleString()}`
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] sm:text-xs font-semibold uppercase text-primary">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Free
                          </span>
                        )}
                      </span>
                    </div>
                    
                    {/* Free Delivery For Life Banner */}
                    {hasFreeDeliveryForLife && cart.totalShipping > 0 && (
                      <div className="mt-2 p-2.5 sm:p-3 rounded-lg sm:rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="flex-shrink-0 p-1.5 rounded-lg bg-emerald-500/20">
                            <Gift className="w-4 h-4 text-emerald-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs sm:text-sm font-bold text-emerald-400">✨ Free delivery unlocked!</span>
                            <p className="mt-0.5 text-[10px] sm:text-xs text-gray-400">
                              Thank you for referring a friend!
                            </p>
                          </div>
                          <span className="text-xs font-bold text-emerald-400">
                            -LKR {cart.totalShipping.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-3 sm:p-4 mt-3 sm:mt-5 border rounded-lg sm:rounded-xl border-primary/30 bg-primary/5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-gray-300">
                        Total
                      </span>
                      <div className="text-right">
                        <p className="text-lg sm:text-xl font-bold text-white">
                          LKR {actualTotal.toLocaleString()}
                        </p>
                        <p className="text-[10px] sm:text-xs text-gray-400">All taxes included</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 sm:p-4 mt-3 sm:mt-5 text-gray-300 border rounded-lg sm:rounded-xl border-gray-700/50 bg-black/20">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                      <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">30-day guarantee</span>
                    </div>
                    <p className="mt-1 sm:mt-2 text-[10px] sm:text-xs leading-relaxed text-gray-400">
                      Need help? Reach us at support@ceaserbrand.com
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