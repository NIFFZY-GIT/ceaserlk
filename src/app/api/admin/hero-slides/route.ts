import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth';
import { createHeroSlide, getHeroSlides } from '@/lib/hero-slides';
import { prepareHeroSlidePayload } from '@/lib/hero-slide-payload';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!await verifyAdminAuth(request)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    return NextResponse.json({ slides: await getHeroSlides(false) });
  } catch (error) {
    console.error('Failed to fetch admin hero slides:', error);
    return NextResponse.json({ error: 'Failed to load hero slides' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!await verifyAdminAuth(request)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const slide = await prepareHeroSlidePayload(request);
    if (!slide) return NextResponse.json({ error: 'Check the slide details and media URL.' }, { status: 400 });
    return NextResponse.json({ slide: await createHeroSlide(slide) }, { status: 201 });
  } catch (error) {
    console.error('Failed to create homepage hero slide:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create hero slide' }, { status: 400 });
  }
}