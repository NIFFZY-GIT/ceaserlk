declare global {
  interface Window {
    ttq?: {
      track: (
        eventName: string,
        properties?: Record<string, unknown>,
        options?: { event_id: string }
      ) => void;
    };
  }
}

export function trackTikTokPageView() {
  trackTikTokEvent('PageView', {}, `page-${crypto.randomUUID()}`);
}

export function trackTikTokEvent(
  eventName: string,
  properties: Record<string, unknown>,
  eventId = crypto.randomUUID()
) {
  if (typeof window === 'undefined') return;

  void fetch('/api/tiktok/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: eventName,
      event_id: eventId,
      properties,
      url: window.location.href,
      referrer: document.referrer,
    }),
    keepalive: true,
  }).then(async (response) => {
    if (!response.ok) throw new Error(`TikTok event normalization failed (${response.status})`);
    const result = await response.json() as { properties?: Record<string, unknown> };
    window.ttq?.track(eventName, result.properties || properties, { event_id: eventId });
  }).catch((error: unknown) => {
    console.error('TikTok event request failed:', error);
  });
}