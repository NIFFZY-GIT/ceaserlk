"use client";

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Sidebar } from './_components/Sidebar';
import { Lock, AlertCircle } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Redirect if user is not authenticated or not an admin
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      if (user.role !== 'ADMIN') {
        router.push('/');
        return;
      }
    }
  }, [user, isLoading, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-4 border-2 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Show access denied if user is not authenticated
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="max-w-md p-8 text-center bg-white rounded-lg shadow-lg">
          <Lock className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="mb-6 text-gray-600">Please sign in to access the admin area.</p>
          <button 
            onClick={() => router.push('/login')}
            className="px-6 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // Show access denied if user is not an admin
  if (user.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="max-w-md p-8 text-center bg-white rounded-lg shadow-lg">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Unauthorized Access</h1>
          <p className="mb-6 text-gray-600">You don&apos;t have permission to access the admin area.</p>
          <button 
            onClick={() => router.push('/')}
            className="px-6 py-2 text-white bg-gray-600 rounded-md hover:bg-gray-700"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  // If user is authenticated and is an admin, show the admin layout
  return (
    <div className="flex min-h-screen text-gray-800 bg-gray-100">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8">
        {children}
      </main>
    </div>
  );
}
