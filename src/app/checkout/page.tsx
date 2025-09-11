"use client";

import { useState, useEffect } from 'react';
import { useCart, CartItem } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Loader2, CreditCard, Smartphone, Banknote, Lock } from 'lucide-react';

// Reusable input component for the form
const FormInput = ({ id, label, ...props }: {
  id: string;
  label: string;
} & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
    <input id={id} {...props} className="w-full p-3 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary" />
  </div>
);

const FormSelect = ({ id, label, children, ...props }: {
  id: string;
  label: string;
  children: React.ReactNode;
} & React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
    <select id={id} {...props} className="w-full p-3 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary">
      {children}
    </select>
  </div>
);

export default function CheckoutPage() {
  const { cart, clearCart } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  // Redirect to login if user is not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/login?redirect=/checkout');
    }
  }, [user, router]);

  const [formData, setFormData] = useState({
    email: '',
    firstName: '', 
    lastName: '', 
    address: '', 
    city: '', 
    zipCode: '', 
    country: 'Sri Lanka',
    phone: '',
    paymentMethod: 'stripe'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Show loading or login prompt if user is not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container px-6 py-20 mx-auto">
          <div className="max-w-md mx-auto text-center">
            <div className="p-8 bg-white border rounded-lg shadow-sm">
              <Lock className="w-16 h-16 mx-auto mb-6 text-gray-400" />
              <h1 className="mb-4 text-3xl font-bold text-gray-900">Authentication Required</h1>
              <p className="mb-6 text-gray-600">
                Please sign in to continue to checkout.
              </p>
              <button 
                onClick={() => router.push('/login?redirect=/checkout')}
                className="w-full py-3 font-bold text-white transition-colors duration-300 rounded-md bg-primary hover:bg-primary/90"
              >
                Sign In to Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  const items = cart?.items || [];
  const subtotal = items.reduce((sum: number, item: CartItem) => sum + item.price * item.quantity, 0);
  const shipping = subtotal > 5000 ? 0 : 500; // Free shipping over LKR 5000
  const tax = subtotal * 0.12; // 12% VAT in Sri Lanka
  const total = subtotal + shipping + tax;
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Prepare items in the format the backend expects
    const orderItems = items.map((item: CartItem) => ({
        productId: item.productId,
        sizeId: item.productSizeId,
        colorId: 1, // We'll need to handle color IDs properly later
        quantity: item.quantity,
    }));

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...formData, 
          items: orderItems,
          subtotal,
          shipping,
          tax,
          total
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to place order.");
      }
      
      // Order was successful
      clearCart(); 
      router.push(`/order-confirmation?orderId=${data.orderId}`);

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const paymentMethods = [
    { value: 'stripe', label: 'Credit/Debit Card', icon: CreditCard, description: 'Visa, Mastercard, Amex' },
    { value: 'paypal', label: 'PayPal', icon: Smartphone, description: 'Pay with your PayPal account' },
    { value: 'cod', label: 'Cash on Delivery', icon: Banknote, description: 'Pay when you receive your order' }
  ];

  if (items.length === 0 && !loading) {
      return (
          <div className="container p-8 mx-auto text-center">
              <h1 className="text-3xl font-bold">Your Cart is Empty</h1>
              <p className="mt-4 text-gray-600">You can&apos;t check out with an empty cart. Please add some products.</p>
          </div>
      )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container grid grid-cols-1 gap-12 p-6 mx-auto lg:grid-cols-3 lg:py-16">
        {/* Left Side: Shipping & Payment Form */}
        <div className="space-y-6 lg:col-span-2">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Checkout</h1>
            <div className="flex items-center gap-2 mt-2 text-sm text-green-600">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Guest checkout available - no account required</span>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Contact Information */}
            <div className="p-6 bg-white border rounded-lg shadow-sm">
              <h2 className="mb-6 text-xl font-semibold text-gray-900">Contact Information</h2>
              <FormInput 
                id="email" 
                name="email" 
                label="Email Address" 
                type="email" 
                value={formData.email} 
                onChange={handleChange} 
                required 
                placeholder="john@example.com"
              />
            </div>

            {/* Shipping Information */}
            <div className="p-6 bg-white border rounded-lg shadow-sm">
              <h2 className="mb-6 text-xl font-semibold text-gray-900">Shipping Information</h2>
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <FormInput 
                    id="firstName" 
                    name="firstName" 
                    label="First Name" 
                    type="text" 
                    value={formData.firstName} 
                    onChange={handleChange} 
                    required 
                  />
                  <FormInput 
                    id="lastName" 
                    name="lastName" 
                    label="Last Name" 
                    type="text" 
                    value={formData.lastName} 
                    onChange={handleChange} 
                    required 
                  />
                </div>
                <FormInput 
                  id="address" 
                  name="address" 
                  label="Street Address" 
                  type="text" 
                  value={formData.address} 
                  onChange={handleChange} 
                  required 
                  placeholder="123 Main Street, Apartment, studio, or floor"
                />
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  <FormInput 
                    id="city" 
                    name="city" 
                    label="City" 
                    type="text" 
                    value={formData.city} 
                    onChange={handleChange} 
                    required 
                  />
                  <FormInput 
                    id="zipCode" 
                    name="zipCode" 
                    label="Postal Code" 
                    type="text" 
                    value={formData.zipCode} 
                    onChange={handleChange} 
                    required 
                  />
                  <FormSelect 
                    id="country" 
                    name="country" 
                    label="Country" 
                    value={formData.country} 
                    onChange={handleChange} 
                    required
                  >
                    <option value="Sri Lanka">Sri Lanka</option>
                    <option value="India">India</option>
                    <option value="Maldives">Maldives</option>
                    <option value="Bangladesh">Bangladesh</option>
                    <option value="Pakistan">Pakistan</option>
                  </FormSelect>
                </div>
                <FormInput 
                  id="phone" 
                  name="phone" 
                  label="Phone Number" 
                  type="tel" 
                  value={formData.phone} 
                  onChange={handleChange} 
                  required 
                  placeholder="+94 77 123 4567"
                />
              </div>
            </div>

            {/* Payment Method */}
            <div className="p-6 bg-white border rounded-lg shadow-sm">
              <h2 className="mb-6 text-xl font-semibold text-gray-900">Payment Method</h2>
              <div className="space-y-4">
                {paymentMethods.map((method) => {
                  const IconComponent = method.icon;
                  return (
                    <label 
                      key={method.value} 
                      className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                        formData.paymentMethod === method.value 
                          ? 'border-primary bg-primary/5' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method.value}
                        checked={formData.paymentMethod === method.value}
                        onChange={handleChange}
                        className="w-4 h-4 text-primary focus:ring-primary"
                      />
                      <div className="flex items-center flex-1 ml-3">
                        <IconComponent className="w-6 h-6 text-gray-600" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{method.label}</p>
                          <p className="text-sm text-gray-500">{method.description}</p>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
            
            {error && (
              <div className="p-4 text-red-700 bg-red-100 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading} 
              className="flex items-center justify-center w-full gap-2 py-4 text-lg font-bold text-white uppercase rounded-md bg-primary hover:bg-primary/90 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing Order...
                </>
              ) : (
                `Place Order - LKR ${total.toFixed(2)}`
              )}
            </button>
          </form>
        </div>

        {/* Right Side: Order Summary */}
        <div className="lg:col-span-1">
          <div className="sticky p-6 bg-white border rounded-lg shadow-sm top-6">
            <h2 className="text-xl font-bold text-gray-900">Order Summary</h2>
            
            <div className="mt-6 space-y-4 overflow-y-auto max-h-96">
              {items.map((item: CartItem) => (
                <div key={item.id} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="relative w-16 h-16 overflow-hidden rounded-md">
                    <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                    <span className="absolute px-2 py-1 text-xs text-white rounded-full -top-2 -right-2 bg-primary">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.sizeName} / {item.colorName}</p>
                    <p className="text-sm font-medium text-gray-900">LKR {item.price.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="pt-6 mt-6 space-y-3 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">LKR {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Shipping</span>
                <span className="font-medium">
                  {shipping === 0 ? 'Free' : `LKR ${shipping.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax (VAT 12%)</span>
                <span className="font-medium">LKR {tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-3 text-lg font-bold border-t">
                <span>Total</span>
                <span>LKR {total.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-6">
              <div className="p-3 text-xs text-gray-600 rounded-md bg-gray-50">
                <p className="flex items-center gap-1">
                  🚚 Free shipping on orders over LKR 5,000
                </p>
                <p className="flex items-center gap-1 mt-1">
                  🔒 Secure checkout with SSL encryption
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}