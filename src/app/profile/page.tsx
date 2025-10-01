import ProfileClient from './components/ProfileClient';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';
import { getProfileWithOrders } from '@/lib/profile';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default async function ProfilePage() {
  try {
  const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session-token')?.value;
    const authUser = await verifySessionToken(sessionToken);

    if (!authUser) {
      return <div className="min-h-screen p-8 text-center text-white bg-black">Please log in to view your profile.</div>;
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