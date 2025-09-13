"use client";

import { useState, useEffect } from 'react';
import { LayoutDashboard, Package, MapPin, User, LogOut, Lock, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

// --- TYPE DEFINITIONS for our fetched data ---
interface Order {
  id: string;
  created_at: string;
  total_amount: string;
  status: string;
}

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  orders: Order[];
}

type Tab = 'dashboard' | 'orders' | 'details';

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  
  // State for fetched profile data
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    if (user) {
      const fetchProfileData = async () => {
        setLoadingProfile(true);
        try {
          const res = await fetch('/api/profile');
          if (!res.ok) throw new Error('Failed to fetch profile data');
          const data: UserProfile = await res.json();
          setProfileData(data);
        } catch (error) {
          console.error(error);
        } finally {
          setLoadingProfile(false);
        }
      };
      fetchProfileData();
    }
  }, [user]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    // This will effectively log the user out by clearing context and redirecting
    window.location.href = '/login'; 
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'Order History', icon: Package },
    { id: 'details', label: 'Account Details', icon: User },
  ];

  if (authLoading || (user && loadingProfile)) {
    return <div className="flex items-center justify-center min-h-screen bg-brand-black"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black to-gray-900"><div className="container px-6 py-20 mx-auto"><div className="max-w-md mx-auto text-center"><div className="p-8 border border-gray-800 bg-gray-900/50 rounded-xl"><Lock className="w-16 h-16 mx-auto mb-6 text-gray-400" /><h1 className="mb-4 text-3xl font-bold text-white">Sign In Required</h1><p className="mb-6 text-gray-400">Please sign in to view your profile and order history.</p><div className="space-y-3"><Link href="/login" className="block w-full py-3 font-bold text-white transition-colors duration-300 rounded-md bg-primary hover:bg-primary/90">Sign In</Link><Link href="/signup" className="block w-full py-3 font-bold text-white transition-colors duration-300 border border-gray-600 rounded-md hover:bg-gray-800">Create Account</Link></div></div></div></div></div>
    );
  }
  
  if (!profileData) {
    return <div className="text-center text-white">Could not load profile data. Please try logging in again.</div>;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'orders': return <OrderHistoryContent orders={profileData.orders} />;
      case 'details': return <AccountDetailsContent user={profileData} />;
      default: return <DashboardContent user={profileData} setActiveTab={setActiveTab}/>;
    }
  };

  return (
    <main className="min-h-screen text-white bg-brand-black">
      <div className="container px-6 py-16 mx-auto">
        <h1 className="mb-12 text-4xl font-bold tracking-wider uppercase md:text-5xl">My Account</h1>
        <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
          <aside className="md:col-span-1">
            <div className="p-6 border border-gray-800 bg-gray-900/50 rounded-xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center justify-center w-16 h-16 text-2xl font-bold text-white bg-gray-700 rounded-full">{profileData.first_name[0]}{profileData.last_name[0]}</div>
                <div>
                  <p className="text-lg font-bold">{profileData.first_name} {profileData.last_name}</p>
                  <p className="text-sm text-gray-400 break-all">{profileData.email}</p>
                </div>
              </div>
              <nav className="space-y-2">
                {navItems.map(item => (<button key={item.id} onClick={() => setActiveTab(item.id as Tab)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-semibold transition-colors ${activeTab === item.id ? 'bg-primary text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}><item.icon size={20} /><span>{item.label}</span></button>))}
                <button onClick={handleLogout} className="flex items-center w-full gap-3 px-4 py-3 text-sm font-semibold text-gray-400 rounded-md hover:bg-gray-800 hover:text-white"><LogOut size={20} /><span>Logout</span></button>
              </nav>
            </div>
          </aside>
          <section className="md:col-span-3">{renderContent()}</section>
        </div>
      </div>
    </main>
  );
};


// --- UPDATED Content Components (Now accept real data via props) ---

const DashboardContent = ({ user, setActiveTab }: { user: UserProfile, setActiveTab: (tab: Tab) => void }) => (
  <div className="space-y-8">
    <h2 className="text-3xl font-bold">Welcome back, {user.first_name}!</h2>
    <div className="p-8 border border-gray-800 bg-gray-900/50 rounded-xl">
      <h3 className="mb-4 text-xl font-bold">Recent Order</h3>
      {user.orders && user.orders.length > 0 ? (
        <div className="p-4 bg-gray-900 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold">#{user.orders[0].id.split('-')[0].toUpperCase()}</p>
              <p className="text-sm text-gray-400">{new Date(user.orders[0].created_at).toLocaleDateString()}</p>
            </div>
            <div className="text-right">
              <p className="font-bold">LKR {Number(user.orders[0].total_amount).toFixed(2)}</p>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${user.orders[0].status === 'DELIVERED' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{user.orders[0].status}</span>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-gray-400">You haven't placed any orders yet.</p>
      )}
      <button onClick={() => setActiveTab('orders')} className="inline-block mt-6 font-semibold text-primary hover:underline">View all orders →</button>
    </div>
  </div>
);

const OrderHistoryContent = ({ orders }: { orders: Order[] }) => (
   <div className="p-8 border border-gray-800 bg-gray-900/50 rounded-xl">
      <h2 className="mb-6 text-3xl font-bold">Order History</h2>
      {orders && orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="grid items-center grid-cols-2 gap-4 p-4 bg-gray-900 rounded-lg md:grid-cols-4">
              <p className="font-bold">#{order.id.split('-')[0].toUpperCase()}</p>
              <p className="text-sm text-gray-400">{new Date(order.created_at).toLocaleDateString()}</p>
              <p className="font-bold text-center">LKR {Number(order.total_amount).toFixed(2)}</p>
              <div className="flex justify-end"><span className={`text-xs font-semibold px-2 py-1 rounded-full ${order.status === 'DELIVERED' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{order.status}</span></div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-400">You haven't placed any orders yet.</p>
      )}
   </div>
);

const AccountDetailsContent = ({ user }: { user: UserProfile }) => (
  <div className="p-8 border border-gray-800 bg-gray-900/50 rounded-xl">
    <h2 className="mb-6 text-3xl font-bold">Account Details</h2>
    <form className="max-w-lg space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div><label htmlFor="firstName" className="block mb-2 text-sm font-medium text-gray-300">First Name</label><input type="text" id="firstName" defaultValue={user.first_name} className="w-full p-3 text-white bg-gray-900 border border-gray-700 rounded-md" /></div>
        <div><label htmlFor="lastName" className="block mb-2 text-sm font-medium text-gray-300">Last Name</label><input type="text" id="lastName" defaultValue={user.last_name} className="w-full p-3 text-white bg-gray-900 border border-gray-700 rounded-md" /></div>
      </div>
      <div><label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-300">Email Address</label><input type="email" id="email" defaultValue={user.email} className="w-full p-3 text-white bg-gray-900 border border-gray-700 rounded-md" /></div>
      <div className="pt-4"><button type="submit" className="px-6 py-3 font-bold text-white rounded-md bg-accent">Save Changes</button></div>
    </form>
  </div>
);