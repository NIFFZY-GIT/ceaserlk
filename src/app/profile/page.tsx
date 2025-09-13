// src/app/profile/page.tsx (Server Component)

import ProfileClient from './components/ProfileClient';

async function getProfileData() {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  
  try {
    const response = await fetch(`${baseUrl}/api/profile`, {
      cache: 'no-store', // Disable caching for fresh data
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