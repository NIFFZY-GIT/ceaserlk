// src/app/profile/page.tsx

"use client";

import { useState } from 'react';
import { LayoutDashboard, Package, MapPin, User, LogOut } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

// --- MOCK DATA (In a real app, this would come from your database) ---
const mockUser = {
  name: 'Alex Rider',
  email: 'alex.rider@example.com',
  avatarUrl: '/images/image.jpg', // A placeholder avatar image
};

const mockOrders = [
  { id: '#CEASER-8462', date: '2024-04-15', total: 74.98, status: 'Delivered' },
  { id: '#CEASER-8134', date: '2024-03-22', total: 35.00, status: 'Delivered' },
  { id: '#CEASER-7981', date: '2024-02-10', total: 104.97, status: 'Cancelled' },
];

const mockAddresses = [
  { id: 1, type: 'Shipping', isDefault: true, line1: '123 Ambition Ave', line2: 'Apt 4B', city: 'New York', state: 'NY', zip: '10001' },
  { id: 2, type: 'Billing', isDefault: false, line1: '456 Grind St', city: 'Los Angeles', state: 'CA', zip: '90001' },
];
// -------------------------------------------------------------------

type Tab = 'dashboard' | 'orders' | 'addresses' | 'details';

const ProfileDashboard = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'Order History', icon: Package },
    { id: 'addresses', label: 'Addresses', icon: MapPin },
    { id: 'details', label: 'Account Details', icon: User },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'orders': return <OrderHistoryContent />;
      case 'addresses': return <AddressesContent />;
      case 'details': return <AccountDetailsContent />;
      default: return <DashboardContent />;
    }
  };

  return (
    <main className="min-h-screen text-white bg-brand-black">
      <div className="container px-6 py-16 mx-auto">
        <h1 className="mb-12 text-4xl font-bold tracking-wider uppercase md:text-5xl">My Account</h1>
        <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
          
          {/* Sidebar Navigation */}
          <aside className="md:col-span-1">
            <div className="p-6 border border-gray-800 bg-gray-900/50 rounded-xl">
              <div className="flex items-center gap-4 mb-6">
                <Image src={mockUser.avatarUrl} alt="User Avatar" width={64} height={64} className="rounded-full" />
                <div>
                  <p className="text-lg font-bold">{mockUser.name}</p>
                  <p className="text-sm text-gray-400">{mockUser.email}</p>
                </div>
              </div>
              <nav className="space-y-2">
                {navItems.map(item => (
                  <button 
                    key={item.id} 
                    onClick={() => setActiveTab(item.id as Tab)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-semibold transition-colors ${activeTab === item.id ? 'bg-primary text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                  >
                    <item.icon size={20} />
                    <span>{item.label}</span>
                  </button>
                ))}
                <button className="flex items-center w-full gap-3 px-4 py-3 text-sm font-semibold text-gray-400 rounded-md hover:bg-gray-800 hover:text-white">
                  <LogOut size={20} />
                  <span>Logout</span>
                </button>
              </nav>
            </div>
          </aside>

          {/* Main Content Area */}
          <section className="md:col-span-3">
            {renderContent()}
          </section>
        </div>
      </div>
    </main>
  );
};


// --- Content Components for each tab ---

const DashboardContent = () => (
  <div className="space-y-8">
    <h2 className="text-3xl font-bold">Welcome back, {mockUser.name.split(' ')[0]}!</h2>
    <div className="p-8 border border-gray-800 bg-gray-900/50 rounded-xl">
      <h3 className="mb-4 text-xl font-bold">Recent Orders</h3>
      <div className="space-y-4">
        {mockOrders.slice(0, 2).map(order => (
          <div key={order.id} className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
            <div>
              <p className="font-bold">{order.id}</p>
              <p className="text-sm text-gray-400">{order.date}</p>
            </div>
            <div className="text-right">
              <p className="font-bold">${order.total.toFixed(2)}</p>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${order.status === 'Delivered' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{order.status}</span>
            </div>
          </div>
        ))}
      </div>
       <Link href="#" onClick={() => (document.querySelector('button[data-id="orders"]') as HTMLButtonElement)?.click()} className="inline-block mt-6 font-semibold text-primary">View all orders →</Link>
    </div>
  </div>
);

const OrderHistoryContent = () => (
   <div className="p-8 border border-gray-800 bg-gray-900/50 rounded-xl">
      <h2 className="mb-6 text-3xl font-bold">Order History</h2>
      <div className="space-y-4">
        {mockOrders.map(order => (
           <div key={order.id} className="grid items-center grid-cols-4 gap-4 p-4 bg-gray-900 rounded-lg">
            <p className="font-bold">{order.id}</p>
            <p className="text-sm text-gray-400">{order.date}</p>
            <p className="font-bold text-center">${order.total.toFixed(2)}</p>
            <div className="flex items-center justify-end gap-2">
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${order.status === 'Delivered' ? 'bg-green-500/20 text-green-400' : order.status === 'Cancelled' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{order.status}</span>
              <button className="text-sm font-semibold text-primary">Details</button>
            </div>
          </div>
        ))}
      </div>
   </div>
);

const AddressesContent = () => (
  <div className="p-8 border border-gray-800 bg-gray-900/50 rounded-xl">
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-3xl font-bold">Addresses</h2>
      <button className="px-4 py-2 text-sm font-bold text-white rounded-md bg-primary">Add New Address</button>
    </div>
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {mockAddresses.map(addr => (
        <div key={addr.id} className="p-6 bg-gray-900 rounded-lg">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-bold">{addr.type} Address</h3>
            {addr.isDefault && <span className="px-2 py-1 text-xs font-semibold rounded-full bg-primary/20 text-primary">Default</span>}
          </div>
          <address className="text-sm not-italic text-gray-400">
            {addr.line1}<br/>
            {addr.line2 && <>{addr.line2}<br/></>}
            {addr.city}, {addr.state} {addr.zip}
          </address>
          <div className="flex gap-4 mt-4 text-sm">
            <button className="font-semibold text-primary">Edit</button>
            <button className="font-semibold text-accent">Delete</button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const AccountDetailsContent = () => (
  <div className="p-8 border border-gray-800 bg-gray-900/50 rounded-xl">
    <h2 className="mb-6 text-3xl font-bold">Account Details</h2>
    <form className="max-w-lg space-y-6">
      <div>
        <label htmlFor="name" className="block mb-2 text-sm font-medium text-gray-300">Full Name</label>
        <input type="text" id="name" defaultValue={mockUser.name} className="w-full p-3 text-white bg-gray-900 border border-gray-700 rounded-md focus:ring-2 focus:ring-primary" />
      </div>
      <div>
        <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-300">Email Address</label>
        <input type="email" id="email" defaultValue={mockUser.email} className="w-full p-3 text-white bg-gray-900 border border-gray-700 rounded-md focus:ring-2 focus:ring-primary" />
      </div>
      <div>
        <button type="button" className="text-sm font-semibold text-primary">Change Password</button>
      </div>
      <div className="pt-4">
        <button type="submit" className="px-6 py-3 font-bold text-white rounded-md bg-accent">Save Changes</button>
      </div>
    </form>
  </div>
);


export default ProfileDashboard;