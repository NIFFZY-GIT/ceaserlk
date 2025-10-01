import ProfileClient from './components/ProfileClient';
import { resolveServerBaseUrl, serializeRequestCookies } from '@/lib/server-urls';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

async function getProfileData() {
  try {
    const baseUrl = await resolveServerBaseUrl();
    const serializedCookies = await serializeRequestCookies();

    const response = await fetch(`${baseUrl}/api/profile`, {
      cache: 'no-store',
      headers: {
        ...(serializedCookies ? { cookie: serializedCookies } : {}),
        'Accept': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch profile data:', error);
    return null;
  }
}

export default async function ProfilePage() {
  const profileData = await getProfileData();

  if (!profileData) {
    // Render a login prompt or redirect
    return <div className="min-h-screen p-8 text-center text-white bg-black">Please log in to view your profile.</div>;
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
}