import { useEffect, useState } from 'react';

/**
 * Safely create a browser object URL for a File and clean it up on unmount.
 * Returns null on the server since the File API is not available.
 */
export function useObjectUrl(file: File | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return () => undefined;
    }

    if (!file) {
      setUrl(null);
      return () => undefined;
    }

    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  return url;
}
