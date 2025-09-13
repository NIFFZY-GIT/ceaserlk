import { headers } from 'next/headers';
import type { User, Order } from './types';

// Helper to get the base URL
const getBaseUrl = () => process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Fetches the complete user profile (details + orders)
export async function getProfileData(): Promise<{ user: User, orders: Order[] } | { user: null, orders: [] }> {
  try {
    const headersList = await headers();
    const requestHeaders = new Headers(headersList);
    const res = await fetch(`${getBaseUrl()}/api/profile`, {
      cache: 'no-store',
      headers: requestHeaders, // Forwards auth cookie
    });
    if (!res.ok) return { user: null, orders: [] };

    const profile = await res.json();
    const { orders, ...user } = profile;
    return { user, orders };
  } catch (error) {
    console.error("getProfileData error:", error);
    return { user: null, orders: [] };
  }
}

// Separate functions for clarity
export async function getUser(): Promise<User | null> {
    const { user } = await getProfileData();
    return user;
}
export async function getOrders(): Promise<Order[]> {
    const { orders } = await getProfileData();
    return orders;
}