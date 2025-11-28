'use client';

import { createPortal } from 'react-dom';
import { useEffect } from '@/hooks/useEffect';
import { useRef } from '@/hooks/useRef';
import { useState } from '@/hooks/useState';
import LoadingOverlay from './LoadingOverlay';
import { subscribeGlobalLoader } from '@/lib/transition/globalLoaderBus';

export default function GlobalLoaderHost() {
  const [active, setActive] = useState(false);
  const [zIndex, setZIndex] = useState<number | undefined>(undefined);
  const portalRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const host = document.createElement('div');
    host.dataset.globalLoaderHost = 'true';
    document.body.appendChild(host);
    portalRef.current = host;
    return () => {
      if (host.parentNode) {
        host.parentNode.removeChild(host);
      }
      portalRef.current = null;
    };
  }, []);

  useEffect(() => {
    return subscribeGlobalLoader((next) => {
      setActive(next.active);
      setZIndex(next.zIndex);
    });
  }, []);

  if (!portalRef.current) {
    return null;
  }

  return createPortal(<LoadingOverlay active={active} zIndex={zIndex ?? 1600} />, portalRef.current);
}
