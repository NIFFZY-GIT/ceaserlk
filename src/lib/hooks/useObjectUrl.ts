import { useEffect, useState, useRef } from 'react';

/**
 * Safely create a browser object URL for a File and clean it up on unmount.
 * Returns null on the server since the File API is not available.
 * 
 * Fixed for VPS/SSR environments:
 * - Uses ref to track if we're mounted (client-side)
 * - Properly handles hydration without mismatches
 * - Cleans up URLs to prevent memory leaks
 */
export function useObjectUrl(file: File | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    
    // Cleanup previous URL if it exists
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }

    if (!file) {
      setUrl(null);
      return () => {
        isMounted.current = false;
      };
    }

    // Only create URL on client-side
    if (typeof window !== 'undefined' && typeof URL !== 'undefined') {
      try {
        const objectUrl = URL.createObjectURL(file);
        urlRef.current = objectUrl;
        setUrl(objectUrl);
      } catch (error) {
        console.error('Failed to create object URL:', error);
        setUrl(null);
      }
    }

    return () => {
      isMounted.current = false;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [file]);

  return url;
}

/**
 * Create object URLs for multiple files at once.
 * More efficient for batch previews.
 */
export function useObjectUrls(files: File[]): Map<File, string> {
  const [urlMap, setUrlMap] = useState<Map<File, string>>(new Map());
  const urlMapRef = useRef<Map<File, string>>(new Map());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const newUrlMap = new Map<File, string>();
    const filesToCleanup = new Set(urlMapRef.current.keys());

    for (const file of files) {
      // Reuse existing URL if file is the same
      if (urlMapRef.current.has(file)) {
        newUrlMap.set(file, urlMapRef.current.get(file)!);
        filesToCleanup.delete(file);
      } else {
        try {
          const objectUrl = URL.createObjectURL(file);
          newUrlMap.set(file, objectUrl);
        } catch (error) {
          console.error('Failed to create object URL for file:', file.name, error);
        }
      }
    }

    // Cleanup URLs for removed files
    for (const file of filesToCleanup) {
      const oldUrl = urlMapRef.current.get(file);
      if (oldUrl) {
        URL.revokeObjectURL(oldUrl);
      }
    }

    urlMapRef.current = newUrlMap;
    setUrlMap(newUrlMap);

    return () => {
      // Cleanup all URLs on unmount
      for (const url of urlMapRef.current.values()) {
        URL.revokeObjectURL(url);
      }
      urlMapRef.current.clear();
    };
  }, [files]);

  return urlMap;
}
