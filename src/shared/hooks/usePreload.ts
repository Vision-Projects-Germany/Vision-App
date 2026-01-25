import { useEffect } from "react";

/**
 * Hook zum Preloading von Bildern und Assets
 */
export function usePreloadAssets(urls: string[]) {
  useEffect(() => {
    const images: HTMLImageElement[] = [];

    urls.forEach((url) => {
      const img = new Image();
      img.src = url;
      images.push(img);
    });

    return () => {
      images.forEach((img) => {
        img.src = "";
      });
    };
  }, [urls]);
}

/**
 * Hook zum Prefetching von Daten
 */
export function usePrefetchData<T>(
  fetchFn: () => Promise<T>,
  enabled: boolean = true,
  delay: number = 0
) {
  useEffect(() => {
    if (!enabled) return;

    const timeoutId = setTimeout(() => {
      fetchFn().catch(() => {
        // Fehler ignorieren beim Prefetch
      });
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [enabled, delay]);
}
