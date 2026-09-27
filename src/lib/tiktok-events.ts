import { createHash } from 'node:crypto';

const TIKTOK_PIXEL_ID = 'DAS9OVRC77U5PB60BIHG';
const TIKTOK_EVENTS_API_URL = 'https://business-api.tiktok.com/open_api/v1.3/event/track/';

export interface TikTokEventContext {
  url?: string;
  referrer?: string;
  email?: string;
  phone?: string;
  ip?: string;
  userAgent?: string;
  ttclid?: string;
  ttp?: string;
}

export async function normalizeTikTokEventProperties(
  properties: Record<string, unknown>
): Promise<Record<string, unknown>> {
  if (typeof properties.currency !== 'string' || properties.currency.toUpperCase() !== 'LKR') {
    return properties;
  }

  const rate = await getLkrToUsdRate();
  const normalized: Record<string, unknown> = {
    ...properties,
    currency: 'USD',
  };

  if (typeof properties.value === 'number' && Number.isFinite(properties.value)) {
    normalized.value = convertToUsd(properties.value, rate);
  }

  if (Array.isArray(properties.contents)) {
    normalized.contents = properties.contents.map((content) => {
      if (!content || typeof content !== 'object' || Array.isArray(content)) return content;
      const item = content as Record<string, unknown>;
      return typeof item.price === 'number' && Number.isFinite(item.price)
        ? { ...item, price: convertToUsd(item.price, rate) }
        : item;
    });
  }

  return normalized;
}

export async function sendTikTokServerEvent(
  event: string,
  eventId: string,
  properties: Record<string, unknown>,
  context: TikTokEventContext = {}
): Promise<boolean> {
  const accessToken = process.env.TIKTOK_EVENTS_API_ACCESS_TOKEN;
  if (!accessToken) return false;

  let normalizedProperties: Record<string, unknown>;
  try {
    normalizedProperties = await normalizeTikTokEventProperties(properties);
  } catch (error) {
    console.error('TikTok event currency conversion failed:', {
      event,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }

  const user: Record<string, string> = {};
  const normalizedEmail = context.email?.trim().toLowerCase();
  const normalizedPhone = context.phone?.replace(/\D/g, '');
  if (normalizedEmail) user.email = hash(normalizedEmail);
  if (normalizedPhone) user.phone = hash(normalizedPhone);
  if (context.ip) user.ip = context.ip;
  if (context.userAgent) user.user_agent = context.userAgent;
  if (context.ttclid) user.ttclid = context.ttclid;
  if (context.ttp) user.ttp = context.ttp;

  const payload = {
    event_source: 'web',
    event_source_id: TIKTOK_PIXEL_ID,
    data: [{
      event,
      event_id: eventId,
      event_time: Math.floor(Date.now() / 1000),
      user,
      page: {
        ...(context.url ? { url: context.url } : {}),
        ...(context.referrer ? { referrer: context.referrer } : {}),
      },
      properties: normalizedProperties,
    }],
  };

  try {
    const response = await fetch(TIKTOK_EVENTS_API_URL, {
      method: 'POST',
      headers: {
        'Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });

    const result = await response.json().catch(() => null) as { code?: number; message?: string } | null;
    if (!response.ok || (result?.code !== undefined && result.code !== 0)) {
      console.error('TikTok Events API rejected event:', {
        event,
        status: response.status,
        code: result?.code,
        message: result?.message,
      });
      return false;
    }
    return true;
  } catch (error) {
    console.error('TikTok Events API request failed:', {
      event,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

export function getTikTokEventContext(request: Request, pageUrl?: string, referrer?: string): TikTokEventContext {
  const requestUrl = new URL(request.url);
  const forwardedFor = request.headers.get('x-forwarded-for');
  const cookieHeader = request.headers.get('cookie') || '';
  const ttpCookie = cookieHeader.match(/(?:^|;\s*)_ttp=([^;]+)/)?.[1];
  let ttclid = requestUrl.searchParams.get('ttclid') || undefined;

  if (!ttclid && pageUrl) {
    try {
      ttclid = new URL(pageUrl).searchParams.get('ttclid') || undefined;
    } catch {
      ttclid = undefined;
    }
  }

  let ttp: string | undefined;
  try {
    ttp = ttpCookie ? decodeURIComponent(ttpCookie) : undefined;
  } catch {
    ttp = undefined;
  }

  return {
    url: pageUrl,
    referrer,
    ip: forwardedFor?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || undefined,
    userAgent: request.headers.get('user-agent') || undefined,
    ttclid,
    ttp,
  };
}

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

async function getLkrToUsdRate(): Promise<number> {
  const response = await fetch('https://open.er-api.com/v6/latest/LKR', {
    next: { revalidate: 3600 },
  });
  if (!response.ok) throw new Error(`Exchange rate request failed (${response.status})`);

  const data = await response.json() as { result?: string; rates?: { USD?: number } };
  const rate = data.rates?.USD;
  if (data.result !== 'success' || typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
    throw new Error('Exchange rate response did not include a valid LKR/USD rate');
  }
  return rate;
}

function convertToUsd(amountInLkr: number, rate: number): number {
  return Math.round(amountInLkr * rate * 100) / 100;
}