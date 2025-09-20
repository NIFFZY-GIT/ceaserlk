'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import type { Order } from '@/lib/types';
import { MapPin, ChevronDown, Banknote, Package, ImageOff } from 'lucide-react';
import TradingCardDownload from '@/components/TradingCardDownload';
import OrderStatusTimeline from './OrderStatusTimeline';

interface OrderCardProps {
  order: Order;
}

const ProductImage = ({ item, compact = false }: { 
  item: { imageUrl: string | null; thumbnailUrl?: string | null; variant_images?: Array<{image_url: string}>; productName: string };
  compact?: boolean;
}) => {
  const [error, setError] = useState(false);
  
  // Use the first variant image if available, otherwise fallback to imageUrl, thumbnailUrl, or default
  const getImageSrc = () => {
    if (item.variant_images && item.variant_images.length > 0 && !error) {
      return item.variant_images[0].image_url;
    }
    if (item.imageUrl && !error) {
      return item.imageUrl;
    }
    if (item.thumbnailUrl && !error) {
      return item.thumbnailUrl;
    }
    return '/images/image.jpg';
  };
  
  const imgSrc = getImageSrc();
  const isPlaceholder = imgSrc === '/images/image.jpg';
  const sizeClass = compact ? 'w-12 h-12' : 'w-16 h-16';
  const iconSize = compact ? 'w-4 h-4' : 'w-6 h-6';
  
  return (
    <div className={`relative flex items-center justify-center flex-shrink-0 bg-gray-900 rounded-md ${sizeClass}`}>
      {isPlaceholder ? (
        <ImageOff className={`text-gray-700 ${iconSize}`} />
      ) : (
        <Image
          src={imgSrc}
          alt={item.productName}
          fill
          className="object-cover rounded-md"
          onError={() => setError(true)}
        />
      )}
    </div>
  );
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

const OrderCard = ({ order }: OrderCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showAllItems, setShowAllItems] = useState(false);
  const [isCompactView, setIsCompactView] = useState(order.items.length > 5);
  
  const orderDate = new Date(order.createdAt).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });

  // For large orders, show only first 3 items initially
  const INITIAL_ITEMS_COUNT = 3;
  const hasMoreItems = order.items.length > INITIAL_ITEMS_COUNT;
  const displayedItems = showAllItems ? order.items : order.items.slice(0, INITIAL_ITEMS_COUNT);

  return (
    <div className="overflow-hidden border border-gray-800 rounded-lg bg-brand-black">
      <div className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-12 h-12 bg-gray-900 rounded-md">
              <Package className="w-6 h-6 text-primary"/>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <p className="text-lg font-bold text-gray-100">
                  Order #{order.id.split('-')[0].toUpperCase()}
                </p>
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-800 text-gray-300">
                  {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-sm text-gray-400">Placed on {orderDate}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Compact View Toggle for large orders */}
            {order.items.length > 5 && isOpen && (
              <button
                onClick={() => setIsCompactView(!isCompactView)}
                className="p-2 text-gray-400 transition-colors rounded-md hover:text-white hover:bg-gray-800"
                title={isCompactView ? "Expand items" : "Compact view"}
              >
                {isCompactView ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4m-4 0l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                )}
              </button>
            )}
            <div className={getStatusBadge(order.status)}>
              {order.status.toLowerCase()}
            </div>
          </div>
        </div>
        
        {/* Order Status Timeline */}
        <div className="mt-6">
          <OrderStatusTimeline status={order.status} />
        </div>
      </div>
      
      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${
        isOpen ? 'max-h-none' : 'max-h-0'
      }`}>
        <div className="p-4 border-t border-gray-800">
          {/* Items Section with improved handling for large orders */}
          <div className="mb-6">
            <div className={`space-y-3 ${
              isOpen && order.items.length > 8 ? 'max-h-96 overflow-y-auto modern-scrollbar' : ''
            }`}>
              {displayedItems.map(item => (
                <div key={item.id} className={`${
                  isCompactView 
                    ? 'p-2 bg-gray-900/50 rounded-md' 
                    : 'p-4 bg-gray-900 rounded-lg'
                }`}>
                  <div className={`flex items-center space-x-4 ${
                    isCompactView ? 'text-sm' : ''
                  }`}>
                    <ProductImage item={item} compact={isCompactView} />
                    <div className="flex-grow min-w-0">
                      <p className={`font-semibold text-gray-200 truncate ${
                        isCompactView ? 'text-sm' : 'text-base'
                      }`}>
                        {item.productName}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-gray-400">
                          Qty: {item.quantity}
                        </p>
                        {(item.variantColor || item.variantSize) && (
                          <p className="text-xs text-gray-500">
                            {item.variantSize && `${item.variantSize}`}
                            {item.variantColor && item.variantSize && ' / '}
                            {item.variantColor && `${item.variantColor}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className={`font-medium text-gray-300 flex-shrink-0 ${
                      isCompactView ? 'text-sm' : 'text-base'
                    }`}>
                      LKR {parseFloat(item.pricePaid).toFixed(2)}
                    </p>
                  </div>
                  
                  {/* Trading Card Download Section - only show in expanded view */}
                  {!isCompactView && item.trading_card_image && item.product_id && 
                   ['PAID', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED'].includes(order.status) && (
                    <div className="mt-4">
                      <TradingCardDownload
                        userEmail={order.customerEmail || ''}
                        productId={item.product_id}
                        productName={item.productName}
                        hasTrading={!!item.trading_card_image}
                        className="mt-3"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Show More/Less Button for large orders */}
            {hasMoreItems && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowAllItems(!showAllItems)}
                  className="px-4 py-2 text-sm font-medium text-gray-300 transition-colors border border-gray-700 rounded-md hover:bg-gray-800 hover:text-white"
                >
                  {showAllItems 
                    ? `Show Less (${INITIAL_ITEMS_COUNT} of ${order.items.length})` 
                    : `Show All Items (${order.items.length - INITIAL_ITEMS_COUNT} more)`
                  }
                </button>
              </div>
            )}
            
            {/* Trading Cards Summary for compact view */}
            {isCompactView && order.items.some(item => 
              item.trading_card_image && ['PAID', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED'].includes(order.status)
            ) && (
              <div className="p-3 mt-4 border border-gray-700 rounded-md bg-gray-900/50">
                <p className="text-sm font-medium text-gray-300 mb-2">Trading Cards Available:</p>
                <div className="grid grid-cols-1 gap-2">
                  {order.items
                    .filter(item => item.trading_card_image && item.product_id)
                    .map(item => (
                      <TradingCardDownload
                        key={`trading-${item.id}`}
                        userEmail={order.customerEmail || ''}
                        productId={item.product_id!}
                        productName={item.productName}
                        hasTrading={!!item.trading_card_image}
                        className="text-xs"
                      />
                    ))
                  }
                </div>
              </div>
            )}
          </div>
          
          <div className="grid gap-6 pt-4 border-t border-gray-800 md:grid-cols-2">
            <div>
              <h4 className="flex items-center mb-2 font-semibold text-gray-200">
                <MapPin className="w-4 h-4 mr-2 text-primary"/>
                Shipping Address
              </h4>
              <address className="text-sm not-italic text-gray-400">
                {order.shippingAddress.fullName}, {order.shippingAddress.line1}, {order.shippingAddress.city}
              </address>
            </div>
            <div>
              <h4 className="flex items-center mb-2 font-semibold text-gray-200">
                <Banknote className="w-4 h-4 mr-2 text-primary"/>
                Total Amount
              </h4>
              <p className="text-2xl font-bold text-gray-100">
                LKR {parseFloat(order.totalAmount).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-end p-3 border-t border-gray-800 bg-gray-900/50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-gray-400 hover:text-white"
        >
          <ChevronDown className={`h-5 w-5 transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`} />
        </button>
      </div>
    </div>
  );
};

export default OrderCard;