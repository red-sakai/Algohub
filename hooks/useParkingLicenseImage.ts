'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchLatestLicenseObjectPath, resolveLicenseImageUrl } from '@/actions/license/license';

type LicenseImageOptions = {
  defaultImage: string;
  storageKey: string;
  eventName: string;
};

type LicenseImageResult = {
  licenseImageUrl: string;
  currentLicenseImageSrc: string;
};

export function useParkingLicenseImage(options: LicenseImageOptions): LicenseImageResult {
  const { defaultImage, storageKey, eventName } = options;
  const [licenseImageUrl, setLicenseImageUrl] = useState<string>(defaultImage);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    let active = true;

    const loadFromLocalStorage = async () => {
      try {
        const stored = window.localStorage.getItem(storageKey);
        if (stored) {
          const url = await resolveLicenseImageUrl(stored);
          if (url && active) {
            setLicenseImageUrl(url);
            return true;
          }
        }
      } catch {}
      return false;
    };

    const loadFromDatabase = async () => {
      const objectPath = await fetchLatestLicenseObjectPath();
      if (!objectPath) {
        return;
      }
      const resolvedUrl = await resolveLicenseImageUrl(objectPath);
      if (resolvedUrl && active) {
        setLicenseImageUrl(resolvedUrl);
        try {
          window.localStorage.setItem(storageKey, objectPath);
        } catch {}
      }
    };

    const initialize = async () => {
      const hasLocal = await loadFromLocalStorage();
      if (!hasLocal) {
        await loadFromDatabase();
      }
    };

    initialize();

    const handleLicenseUpdated = (event: Event) => {
      const detail = (event as CustomEvent<string | null>)?.detail;
      const objectPath = typeof detail === 'string' && detail.trim().length > 0 ? detail : null;
      if (!objectPath) {
        setLicenseImageUrl(defaultImage);
        try {
          window.localStorage.removeItem(storageKey);
        } catch {}
        return;
      }
      resolveLicenseImageUrl(objectPath)
        .then((url) => {
          if (!url || !active) {
            return;
          }
          setLicenseImageUrl(url);
          try {
            window.localStorage.setItem(storageKey, objectPath);
          } catch {}
        })
        .catch(() => {});
    };

    window.addEventListener(eventName, handleLicenseUpdated as EventListener);

    return () => {
      active = false;
      window.removeEventListener(eventName, handleLicenseUpdated as EventListener);
    };
  }, [defaultImage, storageKey, eventName]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    if (!licenseImageUrl || licenseImageUrl === defaultImage) {
      return undefined;
    }

    let cancelled = false;

    const validateImage = async () => {
      try {
        const response = await fetch(licenseImageUrl, { method: 'HEAD', cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`status ${response.status}`);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        console.warn('[InteractMarker] License image unreachable, falling back', error);
        setLicenseImageUrl(defaultImage);
        try {
          window.localStorage.removeItem(storageKey);
        } catch {}
      }
    };

    validateImage();

    return () => {
      cancelled = true;
    };
  }, [defaultImage, storageKey, licenseImageUrl]);

  const currentLicenseImageSrc = useMemo(
    () => licenseImageUrl || defaultImage,
    [licenseImageUrl, defaultImage],
  );

  return { licenseImageUrl, currentLicenseImageSrc };
}
