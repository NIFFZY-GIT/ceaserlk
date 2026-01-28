'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import OrderHistory from './OrderHistory';
import AccountDetails from './AccountDetails';
import PromoSection from './PromoSection';
import TrackOrder from './TrackOrder';
import type { User, Order } from '@/lib/types';
import { UserCircle, ClipboardList, Gift, Truck, Package } from 'lucide-react';

interface ProfileClientProps {
  user: User;
  orders: Order[];
}

export default function ProfileClient({ user: initialUser, orders }: ProfileClientProps) {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'orders');
  const [user, setUser] = useState<User>(initialUser);

  // Update active tab when URL changes
  useEffect(() => {
    if (tabFromUrl && ['orders', 'promo', 'account', 'track'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const handleUserUpdate = (updatedUser: User) => {
    setUser(updatedUser);
  };

  return (
    <div className="flex flex-col md:flex-row md:space-x-8 lg:space-x-12">
      {/* Themed Sidebar Navigation */}
      <aside className="mb-8 md:w-1/4 md:mb-0">
        <div className="p-6 border border-gray-800 rounded-lg bg-gray-900/50">
          <div className="flex items-center mb-8 space-x-4">
            <UserCircle className="w-16 h-16 text-gray-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-100">{`${user.firstName} ${user.lastName}`}</h2>
              <p className="text-sm text-gray-400">{user.email}</p>
            </div>
          </div>
          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-md text-left transition-colors duration-200 group ${
                activeTab === 'orders' ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
              }`}
            >
              <ClipboardList className="w-5 h-5" />
              <span className="font-semibold">Order History</span>
            </button>
            <button
              onClick={() => setActiveTab('promo')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-md text-left transition-colors duration-200 group ${
                activeTab === 'promo' ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
              }`}
            >
              <Gift className="w-5 h-5" />
              <span className="font-semibold">Unlock Free Delivery</span>
            </button>
            <button
              onClick={() => setActiveTab('account')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-md text-left transition-colors duration-200 group ${
                activeTab === 'account' ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
              }`}
            >
              <UserCircle className="w-5 h-5" />
              <span className="font-semibold">Account Details</span>
            </button>
            <button
              onClick={() => setActiveTab('track')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-md text-left transition-colors duration-200 group ${
                activeTab === 'track' ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
              }`}
            >
              <Package className="w-5 h-5" />
              <span className="font-semibold">Track Order</span>
            </button>
            <a
              href="https://koombiyodelivery.lk/track"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-md text-left transition-colors duration-200 text-gray-400 hover:bg-blue-900/30 hover:text-blue-400"
            >
              <Truck className="w-5 h-5" />
              <span className="font-semibold">Track Delivery</span>
            </a>
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="md:w-3/4">
        <div className="p-6 border border-gray-800 rounded-lg bg-gray-900/50 sm:p-8">
          {activeTab === 'orders' && <OrderHistory orders={orders} />}
          {activeTab === 'promo' && <PromoSection />}
          {activeTab === 'account' && <AccountDetails user={user} onSaveSuccess={handleUserUpdate} />}
          {activeTab === 'track' && <TrackOrder />}
        </div>
      </main>
    </div>
  );
}