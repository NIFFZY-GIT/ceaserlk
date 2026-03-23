import { NextRequest, NextResponse } from 'next/server';
import { getUpcomingSnapshot, isValidPhoneNumber, joinWaitingList, normalizePhoneNumber } from '@/lib/upcoming';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const snapshot = await getUpcomingSnapshot();
    return NextResponse.json({ success: true, ...snapshot });
  } catch (error) {
    console.error('Failed to fetch waiting list snapshot:', error);
    return NextResponse.json({ error: 'Failed to fetch waiting list data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const snapshot = await getUpcomingSnapshot();
    if (!snapshot.upcomingEnabled) {
      return NextResponse.json(
        { error: 'Upcoming page is currently disabled.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const rawPhone = typeof body?.phoneNumber === 'string' ? body.phoneNumber : '';
    const phoneNumber = normalizePhoneNumber(rawPhone);

    if (!isValidPhoneNumber(phoneNumber)) {
      return NextResponse.json({ error: 'Please enter a valid phone number.' }, { status: 400 });
    }

    const { joined, snapshot: updatedSnapshot } = await joinWaitingList(phoneNumber);

    return NextResponse.json({
      success: true,
      joined,
      message: joined ? 'You are on the waiting list.' : 'This phone number is already on the waiting list.',
      ...updatedSnapshot,
    });
  } catch (error) {
    console.error('Failed to join waiting list:', error);
    return NextResponse.json({ error: 'Failed to join waiting list' }, { status: 500 });
  }
}
