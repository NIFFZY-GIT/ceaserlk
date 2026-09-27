import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth';
import { deleteHeroSlide, getHeroSlides, updateHeroSlide } from '@/lib/hero-slides';
import { prepareHeroSlidePayload } from '@/lib/hero-slide-payload';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

async function getSlideId(context: RouteContext): Promise<number | null> {
  const { id } = await context.params;
  const parsed = Number(id);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!await verifyAdminAuth(request)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const id = await getSlideId(context);
  if (!id) return NextResponse.json({ error: 'Invalid slide ID' }, { status: 400 });

  try {
    const existing = (await getHeroSlides(false)).find((slide) => slide.id === id);
    if (!existing) return NextResponse.json({ error: 'Hero slide not found' }, { status: 404 });

    const slide = await prepareHeroSlidePayload(request, existing.mediaUrl);
    if (!slide) return NextResponse.json({ error: 'Check the slide details and media URL.' }, { status: 400 });

    const updated = await updateHeroSlide(id, slide);
    return updated
      ? NextResponse.json({ slide: updated })
      : NextResponse.json({ error: 'Hero slide not found' }, { status: 404 });
  } catch (error) {
    console.error('Failed to update homepage hero slide:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update hero slide' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!await verifyAdminAuth(request)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const id = await getSlideId(context);
  if (!id) return NextResponse.json({ error: 'Invalid slide ID' }, { status: 400 });

  try {
    const deleted = await deleteHeroSlide(id);
    return deleted
      ? NextResponse.json({ success: true })
      : NextResponse.json({ error: 'Hero slide not found' }, { status: 404 });
  } catch (error) {
    console.error('Failed to delete homepage hero slide:', error);
    return NextResponse.json({ error: 'Failed to delete hero slide' }, { status: 500 });
  }
}