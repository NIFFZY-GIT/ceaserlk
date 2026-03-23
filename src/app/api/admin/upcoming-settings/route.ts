import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth';
import {
  clearWaitingListEntries,
  getUpcomingSnapshot,
  getWaitingListEntries,
  resetUpcomingSettings,
  saveUpcomingMedia,
  updateUpcomingSettings,
} from '@/lib/upcoming';

export const dynamic = 'force-dynamic';

function parseAndValidateSettings(payload: unknown): {
  upcomingEnabled: boolean;
  baseCount: number;
  tshirtReleaseAt: string;
  movieReleaseAt: string;
  backgroundMode: 'video' | 'slider';
} | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const data = payload as Record<string, unknown>;
  const upcomingEnabled =
    data.upcomingEnabled === undefined
      ? true
      : data.upcomingEnabled === true || data.upcomingEnabled === 'true';
  const baseCount = Number(data.baseCount);
  const tshirtReleaseAt = typeof data.tshirtReleaseAt === 'string' ? data.tshirtReleaseAt : '';
  const movieReleaseAt = typeof data.movieReleaseAt === 'string' ? data.movieReleaseAt : '';
  const backgroundMode = data.backgroundMode === 'video' ? 'video' : 'slider';

  if (!Number.isInteger(baseCount) || baseCount < 0) {
    return null;
  }

  const tshirtDate = new Date(tshirtReleaseAt);
  const movieDate = new Date(movieReleaseAt);

  if (Number.isNaN(tshirtDate.getTime()) || Number.isNaN(movieDate.getTime())) {
    return null;
  }

  return {
    upcomingEnabled,
    baseCount,
    tshirtReleaseAt: tshirtDate.toISOString(),
    movieReleaseAt: movieDate.toISOString(),
    backgroundMode,
  };
}

export async function GET(request: NextRequest) {
  const adminUser = await verifyAdminAuth(request);
  if (!adminUser) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const snapshot = await getUpcomingSnapshot();
    const waitingListEntries = await getWaitingListEntries();
    return NextResponse.json({ success: true, ...snapshot, waitingListEntries });
  } catch (error) {
    console.error('Failed to fetch admin upcoming settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const adminUser = await verifyAdminAuth(request);
  if (!adminUser) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const existing = await getUpcomingSnapshot();

    const contentType = request.headers.get('content-type') || '';
    let payload: Record<string, unknown> = {};
    let logoImageUrl = existing.logoImageUrl;
    let backgroundVideoUrl = existing.backgroundVideoUrl;
    let backgroundSliderImages = existing.backgroundSliderImages;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();

      payload = {
        upcomingEnabled: formData.get('upcomingEnabled'),
        baseCount: formData.get('baseCount'),
        tshirtReleaseAt: formData.get('tshirtReleaseAt'),
        movieReleaseAt: formData.get('movieReleaseAt'),
        backgroundMode: formData.get('backgroundMode'),
      };

      const logoFile = formData.get('logoFile');
      if (logoFile instanceof File && logoFile.size > 0) {
        logoImageUrl = await saveUpcomingMedia(logoFile, 'logo');
      }

      const backgroundVideoFile = formData.get('backgroundVideoFile');
      if (backgroundVideoFile instanceof File && backgroundVideoFile.size > 0) {
        backgroundVideoUrl = await saveUpcomingMedia(backgroundVideoFile, 'background');
      }

      const sliderFiles = formData.getAll('backgroundSliderImages').filter(
        (value): value is File => value instanceof File && value.size > 0
      );

      if (sliderFiles.length > 0) {
        const uploaded = await Promise.all(
          sliderFiles.slice(0, 5).map((file) => saveUpcomingMedia(file, 'background'))
        );
        backgroundSliderImages = [...backgroundSliderImages, ...uploaded]
          .map((url) => url.trim())
          .filter(Boolean)
          .slice(0, 5);
      }
    } else {
      payload = (await request.json()) as Record<string, unknown>;

      if (typeof payload.logoImageUrl === 'string' && payload.logoImageUrl.trim()) {
        logoImageUrl = payload.logoImageUrl.trim();
      }

      if (typeof payload.backgroundVideoUrl === 'string') {
        backgroundVideoUrl = payload.backgroundVideoUrl.trim() || null;
      }

      if (Array.isArray(payload.backgroundSliderImages)) {
        const cleaned = payload.backgroundSliderImages
          .filter((value): value is string => typeof value === 'string')
          .map((value) => value.trim())
          .filter(Boolean)
          .slice(0, 5);

        if (cleaned.length > 0) {
          backgroundSliderImages = cleaned;
        }
      }
    }

    const settings = parseAndValidateSettings(payload);

    if (!settings) {
      return NextResponse.json({ error: 'Invalid settings payload' }, { status: 400 });
    }

    if (settings.backgroundMode === 'slider' && backgroundSliderImages.length === 0) {
      backgroundSliderImages = ['/images/h123.JPG'];
    }

    if (settings.backgroundMode === 'video' && !backgroundVideoUrl) {
      return NextResponse.json({ error: 'Please upload/select a background video for video mode.' }, { status: 400 });
    }

    await updateUpcomingSettings({
      ...settings,
      logoImageUrl,
      backgroundVideoUrl,
      backgroundSliderImages,
    });
    const snapshot = await getUpcomingSnapshot();
    const waitingListEntries = await getWaitingListEntries();

    return NextResponse.json({ success: true, message: 'Settings updated', ...snapshot, waitingListEntries });
  } catch (error) {
    console.error('Failed to update admin upcoming settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const adminUser = await verifyAdminAuth(request);
  if (!adminUser) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { action?: string };
    const action = body?.action;

    if (action === 'reset-settings') {
      await resetUpcomingSettings();
    } else if (action === 'clear-waiting-list') {
      await clearWaitingListEntries();
    } else if (action === 'reset-all') {
      await resetUpcomingSettings();
      await clearWaitingListEntries();
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const snapshot = await getUpcomingSnapshot();
    const waitingListEntries = await getWaitingListEntries();

    const message =
      action === 'reset-settings'
        ? 'Upcoming settings reset to default values.'
        : action === 'clear-waiting-list'
          ? 'Waiting list entries deleted.'
          : 'Settings reset and waiting list cleared.';

    return NextResponse.json({ success: true, message, ...snapshot, waitingListEntries });
  } catch (error) {
    console.error('Failed to run admin upcoming action:', error);
    return NextResponse.json({ error: 'Failed to run action' }, { status: 500 });
  }
}
