import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getProfileWithOrders } from '@/lib/profile';

export async function GET(request: NextRequest) {
  try {
    const authUser = await verifyAuth(request);

    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required. Please log in to continue.' }, { status: 401 });
    }

    const userId = authUser.userId.toString();
    const profileData = await getProfileWithOrders(userId);

    if (!profileData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(profileData);
  } catch (error) {
    console.error(`API GET Profile Error:`, error);
    return NextResponse.json({ error: 'Failed to fetch profile data' }, { status: 500 });
  }
}