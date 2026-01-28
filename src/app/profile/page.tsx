import ProfileClient from './components/ProfileClient';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';
import { getProfileWithOrders } from '@/lib/profile';
import Link from 'next/link';
import { Package } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default async function ProfilePage() {
  try {
  const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session-token')?.value;
    const authUser = await verifySessionToken(sessionToken);

    if (!authUser) {
      // Redirect guests to track-order page instead
      return (
        <div className="min-h-screen p-8 bg-black flex items-center justify-center">
          <div className="max-w-md text-center space-y-6">
            <div className="flex justify-center">
              <Package className="w-16 h-16 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-white">Track Your Order</h1>
            <p className="text-gray-400">
              You&apos;re browsing as a guest. To view your full profile and order history, please sign in.
            </p>
            <div className="flex flex-col gap-3 mt-6">
              <Link
                href="/track-order"
                className="px-6 py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg transition-colors"
              >
                Track Order
              </Link>
              <Link
                href="/login?redirect=/profile"
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition-colors"
              >
                Sign In to View Profile
              </Link>
            </div>
          </div>
        </div>
      );
    }

    const profileData = await getProfileWithOrders(authUser.userId.toString());

    if (!profileData) {
      return <div className="min-h-screen p-8 text-center text-white bg-black">Profile not found.</div>;
    }

    const { id, firstName, lastName, email, phoneNumber, orders } = profileData;
  
    const user = {
      id,
      firstName,
      lastName,
      email,
      phoneNumber,
    };

    return (
      <div className="min-h-screen bg-black">
         <div className="container p-4 mx-auto sm:p-6 lg:p-8">
          <ProfileClient user={user} orders={orders || []} />
        </div>
      </div>
    );
  } catch (error) {
    console.error('Failed to render profile page:', error);
    return <div className="min-h-screen p-8 text-center text-white bg-black">Unable to load profile at this time.</div>;
  }
}