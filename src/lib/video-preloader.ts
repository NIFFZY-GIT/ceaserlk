// Video Preloader Utility
// Preloads product videos in the background for faster loading on product pages

type PreloadStatus = 'pending' | 'loading' | 'loaded' | 'error';

interface PreloadedVideo {
  url: string;
  status: PreloadStatus;
  blob?: Blob;
}

class VideoPreloader {
  private cache: Map<string, PreloadedVideo> = new Map();
  private loadingQueue: string[] = [];
  private isProcessing = false;
  private maxConcurrent = 2; // Limit concurrent downloads to not hog bandwidth
  private activeLoads = 0;

  // Check if URL is a video
  isVideoUrl(url: string): boolean {
    return /\.(mp4|webm|ogg|mov|m4v)$/i.test(url);
  }

  // Preload a single video
  async preloadVideo(url: string): Promise<void> {
    // Skip if already cached or loading
    if (this.cache.has(url)) {
      return;
    }

    // Add to cache as pending
    this.cache.set(url, { url, status: 'pending' });
    this.loadingQueue.push(url);
    
    // Process queue
    this.processQueue();
  }

  // Preload multiple videos
  async preloadVideos(urls: string[]): Promise<void> {
    const videoUrls = urls.filter(url => this.isVideoUrl(url));
    
    for (const url of videoUrls) {
      await this.preloadVideo(url);
    }
  }

  // Process the loading queue
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.loadingQueue.length > 0 && this.activeLoads < this.maxConcurrent) {
      const url = this.loadingQueue.shift();
      if (!url) continue;

      const cached = this.cache.get(url);
      if (!cached || cached.status !== 'pending') continue;

      this.activeLoads++;
      this.loadVideoInBackground(url).finally(() => {
        this.activeLoads--;
        // Continue processing if more in queue
        if (this.loadingQueue.length > 0) {
          this.processQueue();
        }
      });
    }

    this.isProcessing = false;
  }

  // Load video in background using fetch to cache it
  private async loadVideoInBackground(url: string): Promise<void> {
    const cached = this.cache.get(url);
    if (!cached) return;

    try {
      cached.status = 'loading';
      this.cache.set(url, cached);

      // Use fetch to download and cache the video
      // The browser will cache this response, making subsequent loads instant
      const response = await fetch(url, {
        method: 'GET',
        cache: 'force-cache', // Force browser to cache
      });

      if (!response.ok) {
        throw new Error(`Failed to preload video: ${response.status}`);
      }

      // Read the response to ensure it's fully downloaded
      const blob = await response.blob();
      
      cached.status = 'loaded';
      cached.blob = blob;
      this.cache.set(url, cached);

      console.log(`[VideoPreloader] Preloaded: ${url}`);
    } catch (error) {
      console.error(`[VideoPreloader] Error preloading ${url}:`, error);
      cached.status = 'error';
      this.cache.set(url, cached);
    }
  }

  // Check if a video is preloaded
  isPreloaded(url: string): boolean {
    const cached = this.cache.get(url);
    return cached?.status === 'loaded';
  }

  // Get preload status
  getStatus(url: string): PreloadStatus | null {
    return this.cache.get(url)?.status || null;
  }

  // Get all cached video URLs
  getCachedUrls(): string[] {
    return Array.from(this.cache.entries())
      .filter(([, v]) => v.status === 'loaded')
      .map(([url]) => url);
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
    this.loadingQueue = [];
  }
}

// Singleton instance
export const videoPreloader = new VideoPreloader();

// Helper function to extract video URLs from product data
export function extractVideoUrlsFromProducts(products: Array<{
  variants?: Array<{
    images?: Array<{ url: string }> | null;
  }> | null;
}>): string[] {
  const videoUrls: string[] = [];

  for (const product of products) {
    if (!product.variants) continue;

    for (const variant of product.variants) {
      if (!variant.images) continue;

      for (const image of variant.images) {
        if (videoPreloader.isVideoUrl(image.url)) {
          videoUrls.push(image.url);
        }
      }
    }
  }

  return [...new Set(videoUrls)]; // Remove duplicates
}

// Preload videos from product list
export function preloadProductVideos(products: Array<{
  variants?: Array<{
    images?: Array<{ url: string }> | null;
  }> | null;
}>): void {
  const videoUrls = extractVideoUrlsFromProducts(products);
  
  if (videoUrls.length > 0) {
    console.log(`%c[VideoPreloader] Starting preload of ${videoUrls.length} videos`, 'color: #006633; font-weight: bold');
    console.log('[VideoPreloader] Videos to preload:', videoUrls);
    videoPreloader.preloadVideos(videoUrls);
  } else {
    console.log('[VideoPreloader] No videos found to preload');
  }
}
