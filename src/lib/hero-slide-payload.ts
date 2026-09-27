import type { NextRequest } from 'next/server';
import { saveHeroMedia, type HeroMediaType, type HeroSlideInput } from '@/lib/hero-slides';

type HeroPayload = Record<string, unknown>;

async function readPayload(request: NextRequest): Promise<{ data: HeroPayload; file: File | null }> {
  if ((request.headers.get('content-type') || '').includes('multipart/form-data')) {
    const formData = await request.formData();
    const data: HeroPayload = {};
    formData.forEach((value, key) => {
      if (key !== 'mediaFile' && typeof value === 'string') data[key] = value;
    });
    const file = formData.get('mediaFile');
    return { data, file: file instanceof File && file.size > 0 ? file : null };
  }

  const data = await request.json();
  return { data: data && typeof data === 'object' ? data as HeroPayload : {}, file: null };
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function parseHeroPayload(data: HeroPayload, mediaUrl: string): HeroSlideInput | null {
  const title = typeof data.title === 'string' ? data.title.trim() : '';
  const description = typeof data.description === 'string' ? data.description.trim() : '';
  const ctaText = typeof data.ctaText === 'string' ? data.ctaText.trim() : '';
  const ctaHref = typeof data.ctaHref === 'string' ? data.ctaHref.trim() : '';
  const mediaType: HeroMediaType | null = data.mediaType === 'image' || data.mediaType === 'video'
    ? data.mediaType
    : null;
  const sortOrder = Number(data.sortOrder);
  const isActive = data.isActive === true || data.isActive === 'true';

  if (
    !title || title.length > 180 || description.length > 500 || ctaText.length > 80 ||
    !ctaHref || ctaHref.length > 500 || !mediaType || !Number.isInteger(sortOrder) ||
    sortOrder < 0 || sortOrder > 10000 || !mediaUrl || mediaUrl.length > 1000
  ) {
    return null;
  }

  if (!mediaUrl.startsWith('/') && !isHttpsUrl(mediaUrl)) return null;
  if (!ctaHref.startsWith('/') && !isHttpsUrl(ctaHref)) return null;

  return { title, description, ctaText, ctaHref, mediaType, mediaUrl, isActive, sortOrder };
}

export async function prepareHeroSlidePayload(
  request: NextRequest,
  currentMediaUrl = ''
): Promise<HeroSlideInput | null> {
  const { data, file } = await readPayload(request);
  const mediaType = data.mediaType;
  let mediaUrl = typeof data.mediaUrl === 'string' ? data.mediaUrl.trim() : currentMediaUrl;

  if (file) {
    if (mediaType !== 'image' && mediaType !== 'video') return null;
    mediaUrl = await saveHeroMedia(file, mediaType);
  }

  return parseHeroPayload(data, mediaUrl);
}