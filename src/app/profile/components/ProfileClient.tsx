'use client';

import React, { useState } from 'react';
import OrderHistory from './OrderHistory';
import AccountDetails from './AccountDetails';
import type { User, Order } from '@/lib/types';
import { UserCircle, ClipboardList } from 'lucide-react'; // Switched to Lucide

interface ProfileClientProps {
  user: User;
  orders: Order[];
}

export default function ProfileClient({ user: initialUser, orders }: ProfileClientProps) {
  const [activeTab, setActiveTab] = useState('orders');
  const [user, setUser] = useState<User>(initialUser);

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
              onClick={() => setActiveTab('account')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-md text-left transition-colors duration-200 group ${
                activeTab === 'account' ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
              }`}
            >
              <UserCircle className="w-5 h-5" />
              <span className="font-semibold">Account Details</span>
            </button>
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="md:w-3/4">
        <div className="p-6 border border-gray-800 rounded-lg bg-gray-900/50 sm:p-8">
          {activeTab === 'orders' && <OrderHistory orders={orders} />}
          {activeTab === 'account' && <AccountDetails user={user} onSaveSuccess={handleUserUpdate} />}
        </div>
      </main>
    </div>
  );
}