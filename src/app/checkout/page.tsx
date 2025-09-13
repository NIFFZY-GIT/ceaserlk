"use client";

import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { Loader2, Lock, ShoppingBag, ArrowLeft, CreditCard } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import StripePaymentHandler from './StripePaymentHandler';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function CheckoutPage() {
  const { cart, loading: cartLoading, cartCount } = useCart();
  const router = useRouter();

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
  const [formError, setFormError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShippingDetails({ ...shippingDetails, [e.target.name]: e.target.value });
  };

  // --- THIS IS THE KEY CHANGE ---
  // This function's only job is to redirect the user to the confirmation page.
  // The confirmation page will then be responsible for verifying the payment and creating the order.
  const onPaymentSuccess = async (paymentIntentId: string) => {
    router.push(`/order-confirmation?payment_intent=${paymentIntentId}`);
  };

  if (cartLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;
  if (!cart || cartCount === 0) return <div className="flex flex-col items-center justify-center min-h-screen text-center"><h1 className="text-2xl font-bold">Your cart is empty.</h1><Link href="/shop" className="mt-4 text-primary hover:underline">Continue Shopping</Link></div>;

  const options = {
    mode: 'payment' as const,
    amount: Math.round(cart.totalAmount * 100),
    currency: 'lkr',
    // We pass the client secret later when we create the payment intent
  };

  return (
    <div className="bg-gray-50">
      <div className="bg-white border-b shadow-sm"><div className="px-4 py-4 mx-auto max-w-7xl sm:px-6 lg:px-8"><Link href="/shop" className="flex items-center gap-2 text-sm text-gray-600 transition-colors hover:text-gray-900"><ArrowLeft className="w-4 h-4" /><span>Back to Shop</span></Link></div></div>
      <div className="container px-4 py-16 mx-auto sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-x-16">
          <div className="lg:col-span-7">
            <div className="space-y-8">
              <div className="p-8 bg-white border shadow-sm rounded-xl">
                <div className="flex items-center gap-3 mb-6"><div className="flex items-center justify-center w-8 h-8 text-sm font-bold text-white bg-black rounded-full">1</div><h2 className="text-xl font-bold text-gray-900">Contact & Shipping</h2></div>
                <div className="space-y-4">
                  <div><label htmlFor="email" className="block mb-1 text-sm font-medium text-gray-700">Email</label><input type="email" id="email" name="email" onChange={handleInputChange} placeholder="you@example.com" required className="w-full px-4 py-3 border-gray-300 rounded-lg shadow-sm" /></div>
                  <div><label htmlFor="phone" className="block mb-1 text-sm font-medium text-gray-700">Mobile number</label><div className="flex"><span className="inline-flex items-center px-3 text-sm text-gray-600 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg">LK +94</span><input type="tel" id="phone" name="phone" onChange={handleInputChange} placeholder="71 234 5678" required className="w-full px-4 py-3 border-gray-300 rounded-r-lg shadow-sm" /></div></div>
                  <div><label className="block mb-1 text-sm font-medium text-gray-700">Full name</label><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><input type="text" name="firstName" onChange={handleInputChange} placeholder="First name" required className="w-full px-4 py-3 border-gray-300 rounded-lg shadow-sm" /><input type="text" name="lastName" onChange={handleInputChange} placeholder="Last name" required className="w-full px-4 py-3 border-gray-300 rounded-lg shadow-sm" /></div></div>
                  <div className="pt-4 mt-4 border-t"><label htmlFor="address" className="block mb-1 text-sm font-medium text-gray-700">Shipping Address</label><input type="text" id="address" name="address" onChange={handleInputChange} placeholder="Street Address" required className="w-full px-4 py-3 mt-2 border-gray-300 rounded-lg shadow-sm" /></div>
                  <input type="text" name="city" onChange={handleInputChange} placeholder="City" required className="w-full px-4 py-3 border-gray-300 rounded-lg shadow-sm" />
                  <div className="grid grid-cols-2 gap-4"><input type="text" name="country" value="Sri Lanka" readOnly className="w-full px-4 py-3 text-gray-600 bg-gray-100 border-gray-300 rounded-lg shadow-sm" /><input type="text" name="postalCode" onChange={handleInputChange} placeholder="Postal code" required className="w-full px-4 py-3 border-gray-300 rounded-lg shadow-sm" /></div>
                </div>
              </div>
              <div className="p-8 bg-white border shadow-sm rounded-xl">
                <div className="flex items-center gap-3 mb-6"><div className="flex items-center justify-center w-8 h-8 text-sm font-bold text-white bg-black rounded-full">2</div><h2 className="text-xl font-bold text-gray-900">Payment Details</h2><CreditCard className="w-6 h-6 text-gray-500" /></div>
                <Elements stripe={stripePromise} options={options}>
                  <StripePaymentHandler cart={cart} onPaymentSuccess={onPaymentSuccess} shippingDetails={shippingDetails} />
                </Elements>
                {formError && <div className="p-3 mt-4 text-sm text-red-700 bg-red-100 border border-red-200 rounded-lg">{formError}</div>}
              </div>
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="sticky p-8 bg-white border shadow-sm rounded-xl top-8">
              <h2 className="text-xl font-semibold text-gray-900">Your Order</h2>
              <div className="mt-6 space-y-4">
                {cart.items.map(item => (<div key={item.id} className="flex items-center gap-4"><div className="relative flex-shrink-0 w-20 h-20 overflow-hidden border rounded-md"><Image src={item.sku.variant.thumbnail_url || ''} alt={item.sku.variant.product.name} fill style={{objectFit: 'cover'}} /></div><div className="flex-1"><p className="font-medium text-gray-900">{item.sku.variant.product.name}</p><p className="text-sm text-gray-500">{item.sku.size} / {item.sku.variant.color_name}</p><p className="text-sm text-gray-500">Qty: {item.quantity}</p></div><p className="font-medium text-gray-900">LKR {(parseFloat(item.sku.variant.price) * item.quantity).toFixed(2)}</p></div>))}
              </div>
              <div className="pt-6 mt-6 space-y-2 border-t"><div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>LKR {(cart.subtotal || 0).toFixed(2)}</span></div><div className="flex justify-between text-sm text-gray-600"><span>Shipping</span><span>{cart.totalShipping > 0 ? `LKR ${cart.totalShipping.toFixed(2)}` : <span className="font-semibold text-green-600">Free</span>}</span></div></div>
              <div className="flex items-center justify-between pt-4 mt-4 text-lg font-bold text-gray-900 border-t"><span>Total</span><span>LKR {cart.totalAmount.toFixed(2)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}