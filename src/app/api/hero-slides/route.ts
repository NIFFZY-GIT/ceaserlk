import { NextResponse } from 'next/server';
import { getHeroSlides } from '@/lib/hero-slides';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const slides = await getHeroSlides(true);
    return NextResponse.json({ slides });
  } catch (error) {
    console.error('Failed to fetch homepage hero slides:', error);
    return NextResponse.json({ error: 'Failed to load hero slides' }, { status: 500 });
  }
}