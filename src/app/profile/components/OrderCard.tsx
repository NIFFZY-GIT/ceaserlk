'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import type { Order } from '@/lib/types';
import { MapPin, ChevronDown, Banknote, Package, ImageOff } from 'lucide-react';

const ProductImage = ({ src, alt }: { src: string | null; alt: string }) => {
    const [error, setError] = useState(false);
    const imgSrc = src && !error ? src : '/images/image.jpg'; // Fallback to a placeholder
    return (<div className="relative flex-shrink-0 w-16 h-16 bg-gray-900 rounded-md">
        {imgSrc === '/images/image.jpg' && !src ? <ImageOff className="w-6 h-6 text-gray-700" /> : <Image src={imgSrc} alt={alt} fill className="object-cover rounded-md" onError={() => setError(true)} />}
    </div>);
};

const getStatusBadge = (status: Order['status']) => {
  const statusColors: { [key: string]: string } = {
    PAID: 'bg-blue-900 text-blue-300 border-blue-700',
    PROCESSING: 'bg-purple-900 text-purple-300 border-purple-700',
    PACKED: 'bg-gray-700 text-gray-300 border-gray-600',
    SHIPPED: 'bg-indigo-900 text-indigo-300 border-indigo-700',
    DELIVERED: 'bg-green-900 text-green-300 border-green-700',
    CANCELLED: 'bg-red-900 text-red-300 border-red-700',
    REFUNDED: 'bg-yellow-900 text-yellow-300 border-yellow-700',
    PENDING: 'bg-yellow-900 text-yellow-300 border-yellow-700',
  };
  
  return `px-3 py-1 text-sm font-semibold rounded-full border ${statusColors[status] || 'bg-gray-700 text-gray-300 border-gray-600'}`;
};

const OrderCard = ({ order }: { order: Order }) => {
  const [isOpen, setIsOpen] = useState(false);
  const orderDate = new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="overflow-hidden border border-gray-800 rounded-lg bg-brand-black">
      <div className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-3"><div className="flex items-center justify-center w-12 h-12 bg-gray-900 rounded-md"><Package className="w-6 h-6 text-primary"/></div><div><p className="text-lg font-bold text-gray-100">Order #{order.id.split('-')[0].toUpperCase()}</p><p className="text-sm text-gray-400">Placed on {orderDate}</p></div></div>
          <div className={getStatusBadge(order.status)}>{order.status.toLowerCase()}</div>
        </div>
      </div>
      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isOpen ? 'max-h-[2000px]' : 'max-h-0'}`}>
        <div className="p-4 border-t border-gray-800">
          <div className="mb-6 space-y-3">
            {order.items.map(item => (
              <div key={item.id} className="p-4 bg-gray-900 rounded-lg">
                <div className="flex items-center space-x-4">
                  <ProductImage src={item.imageUrl} alt={item.productName} />
                  <div className="flex-grow"><p className="font-semibold text-gray-200">{item.productName}</p><p className="text-sm text-gray-400">Qty: {item.quantity}</p></div>
                  <p className="font-medium text-gray-300">LKR {parseFloat(item.pricePaid).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="grid gap-6 pt-4 border-t border-gray-800 md:grid-cols-2">
             <div><h4 className="flex items-center mb-2 font-semibold text-gray-200"><MapPin className="w-4 h-4 mr-2 text-primary"/>Shipping Address</h4><address className="text-sm not-italic text-gray-400">{order.shippingAddress.fullName}, {order.shippingAddress.line1}, {order.shippingAddress.city}</address></div>
             <div><h4 className="flex items-center mb-2 font-semibold text-gray-200"><Banknote className="w-4 h-4 mr-2 text-primary"/>Total Amount</h4><p className="text-2xl font-bold text-gray-100">LKR {parseFloat(order.totalAmount).toFixed(2)}</p></div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end p-3 border-t border-gray-800 bg-gray-900/50"><button onClick={() => setIsOpen(!isOpen)} className="p-2 text-gray-400 hover:text-white"><ChevronDown className={`h-5 w-5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} /></button></div>
    </div>
  );
};

export default OrderCard;