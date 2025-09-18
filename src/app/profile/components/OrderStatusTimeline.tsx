'use client';

import React from 'react';
import { CheckCircle, Package, Truck, ShoppingBag, X, RefreshCw } from 'lucide-react';
import type { Order } from '@/lib/types';

interface OrderStatusTimelineProps {
  status: Order['status'];
  className?: string;
}

const OrderStatusTimeline = ({ status, className = '' }: OrderStatusTimelineProps) => {
  const statusSteps = [
    { key: 'PAID', label: 'Confirmed', icon: CheckCircle },
    { key: 'PROCESSING', label: 'Processing', icon: Package },
    { key: 'PACKED', label: 'Packed', icon: ShoppingBag },
    { key: 'SHIPPED', label: 'Shipped', icon: Truck },
    { key: 'DELIVERED', label: 'Delivered', icon: CheckCircle },
  ];

  const getCurrentStepIndex = () => {
    if (status === 'CANCELLED') return -1;
    if (status === 'REFUNDED') return -1;
    if (status === 'PENDING') return -1;
    
    const index = statusSteps.findIndex(step => step.key === status);
    return index !== -1 ? index : 0;
  };

  const currentStepIndex = getCurrentStepIndex();

  // Handle special statuses
  if (status === 'CANCELLED' || status === 'REFUNDED') {
    return (
      <div className={`order-status-timeline ${className}`}>
        <div className="flex items-center justify-center p-4 bg-red-900/20 border border-red-700 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-8 h-8 bg-red-600 rounded-full">
              {status === 'CANCELLED' ? (
                <X className="w-4 h-4 text-white" />
              ) : (
                <RefreshCw className="w-4 h-4 text-white" />
              )}
            </div>
            <span className="text-sm font-medium text-red-300">
              Order {status.toLowerCase()}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'PENDING') {
    return (
      <div className={`order-status-timeline ${className}`}>
        <div className="flex items-center justify-center p-4 bg-yellow-900/20 border border-yellow-700 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-8 h-8 bg-yellow-600 rounded-full animate-pulse">
              <Package className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium text-yellow-300">
              Payment pending
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`order-status-timeline ${className}`}>
      <div className="flex items-center justify-between">
        {statusSteps.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = index <= currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isNext = index === currentStepIndex + 1;
          
          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center">
                <div className={`
                  flex items-center justify-center w-8 h-8 mb-1 rounded-full transition-all duration-300
                  ${isCompleted 
                    ? 'bg-green-500 shadow-lg' 
                    : isCurrent 
                      ? 'bg-primary shadow-lg animate-pulse' 
                      : isNext
                        ? 'bg-gray-600 border-2 border-gray-500'
                        : 'bg-gray-700'
                  }
                `}>
                  <Icon className={`
                    w-4 h-4 transition-colors duration-300
                    ${isCompleted || isCurrent ? 'text-white' : 'text-gray-400'}
                  `} />
                </div>
                <p className={`
                  text-xs font-medium text-center transition-colors duration-300
                  ${isCompleted 
                    ? 'text-green-400' 
                    : isCurrent 
                      ? 'text-primary' 
                      : 'text-gray-500'
                  }
                `}>
                  {step.label}
                </p>
              </div>
              
              {/* Connection line between steps */}
              {index < statusSteps.length - 1 && (
                <div className={`
                  flex-1 h-0.5 mx-2 rounded-full transition-all duration-500
                  ${index < currentStepIndex 
                    ? 'bg-gradient-to-r from-green-500 to-green-500' 
                    : index === currentStepIndex 
                      ? 'bg-gradient-to-r from-green-500 to-primary' 
                      : 'bg-gray-700'
                  }
                `} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default OrderStatusTimeline;