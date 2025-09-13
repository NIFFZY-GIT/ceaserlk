'use client';

import React, { useState } from 'react';
import Image from 'next/image'; // Import next/image
import type { Order } from '@/lib/types';
import {
    MapPin,
    ChevronDown,
    Banknote,
    Package,
    ImageOff // Icon for fallback
} from 'lucide-react';

// --- Reusable Image Component with Fallback ---
// This encapsulates the logic for displaying an image or a fallback.
const ProductImage = ({ src, alt }: { src: string; alt: string }) => {
    const [error, setError] = useState(false);

    return (
        <div className="relative flex-shrink-0 w-16 h-16 bg-gray-900 rounded-md">
            {error ? (
                <div className="flex items-center justify-center w-full h-full">
                    <ImageOff className="w-6 h-6 text-gray-700" />
                </div>
            ) : (
                <Image
                    src={src}
                    alt={alt}
                    fill // Use fill to cover the parent div
                    className="object-cover rounded-md"
                    onError={() => setError(true)} // Set error state if image fails
                    unoptimized // Add this if you are using static exports or certain deployment platforms
                />
            )}
        </div>
    );
};


// Status badge function remains the same
const getStatusBadge = (status: Order['status']) => {
  const baseClasses = 'px-3 py-1 text-xs font-bold rounded-full capitalize flex items-center gap-2';
  switch (status) {
    case 'PENDING': return `bg-yellow-500/10 text-yellow-400 ${baseClasses}`;
    case 'PAID': case 'PROCESSING': return `bg-blue-500/10 text-blue-400 ${baseClasses}`;
    case 'PACKED': return `bg-indigo-500/10 text-indigo-400 ${baseClasses}`;
    case 'SHIPPED': return `bg-primary/10 text-primary ${baseClasses}`;
    case 'DELIVERED': return `bg-green-500/10 text-green-400 ${baseClasses}`;
    case 'CANCELLED': case 'REFUNDED': return `bg-red-500/10 text-red-400 ${baseClasses}`;
    default: return `bg-gray-700/20 text-gray-400 ${baseClasses}`;
  }
};

const OrderCard = ({ order }: { order: Order }) => {
  const [isOpen, setIsOpen] = useState(false);
  const orderDate = new Date(order.createdAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });

  return (
    <div className="overflow-hidden border border-gray-800 rounded-lg bg-brand-black">
      {/* Card Header */}
      <div className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-12 h-12 bg-gray-900 rounded-md">
              <Package className="w-6 h-6 text-primary"/>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-100">Order #{order.id.split('-')[0]}</p>
              <p className="text-sm text-gray-400">Placed on {orderDate}</p>
            </div>
          </div>
          <div className={getStatusBadge(order.status)}>
            {order.status.toLowerCase()}
          </div>
        </div>
      </div>

      {/* Collapsible Content */}
      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-[1000px]' : 'max-h-0'}`}>
        <div className="p-4 border-t border-gray-800">
          {/* Order Items */}
          <div className="mb-6 space-y-3">
            {order.items.map(item => (
              <div key={item.id} className="flex items-center space-x-4">
                {/* USE THE NEW ProductImage COMPONENT */}
                <ProductImage src={item.imageUrl || '/placeholder-image.jpg'} alt={item.productName} />
                <div className="flex-grow">
                  <p className="font-semibold text-gray-200">{item.productName}</p>
                  <p className="text-sm text-gray-400">Qty: {item.quantity}</p>
                </div>
                <p className="font-medium text-gray-300">${parseFloat(item.pricePaid).toFixed(2)}</p>
              </div>
            ))}
          </div>
          {/* Shipping and Total */}
          <div className="grid gap-6 pt-4 border-t border-gray-800 md:grid-cols-2">
             <div>
                <h4 className="flex items-center mb-2 font-semibold text-gray-200"><MapPin className="w-4 h-4 mr-2 text-primary"/>Shipping Address</h4>
                <address className="text-sm not-italic text-gray-400">
                    {order.shippingAddress.fullName}, {order.shippingAddress.line1}, {order.shippingAddress.city}, {order.shippingAddress.country}
                </address>
             </div>
             <div>
                <h4 className="flex items-center mb-2 font-semibold text-gray-200"><Banknote className="w-4 h-4 mr-2 text-primary"/>Total Amount</h4>
                <p className="text-2xl font-bold text-gray-100">${parseFloat(order.totalAmount).toFixed(2)}</p>
             </div>
          </div>
        </div>
      </div>
      
      {/* Card Footer / Actions */}
      <div className="flex items-center justify-end p-3 border-t border-gray-800 bg-gray-900/50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-gray-400 hover:text-white"
          aria-label={isOpen ? 'Collapse order details' : 'Expand order details'}
        >
          <ChevronDown className={`h-5 w-5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </div>
  );
};

export default OrderCard;