'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackTikTokPageView } from '@/lib/tiktok';

export function TikTokPageView() {
  const pathname = usePathname();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || lastTrackedPath.current === pathname) return;

    lastTrackedPath.current = pathname;
    trackTikTokPageView();
  }, [pathname]);

  return null;
}