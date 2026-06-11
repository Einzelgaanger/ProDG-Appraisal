import { useEffect, useRef, useState } from 'react';

/**
 * Progressive loading: no UI for a beat (feels instant), then a light "quick" state,
 * then "heavy" (full skeleton). Mirrors "fast first, slow only if needed".
 */
export function useProgressiveBusy(
  busy: boolean,
  opts?: { quickAfterMs?: number; heavyAfterMs?: number },
) {
  const quickAfterMs = opts?.quickAfterMs ?? 100;
  const heavyAfterMs = opts?.heavyAfterMs ?? 380;

  const [tier, setTier] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    if (!busy) {
      setTier(0);
      return;
    }
    setTier(0);
    const t1 = window.setTimeout(() => setTier(1), quickAfterMs);
    const t2 = window.setTimeout(() => setTier(2), heavyAfterMs);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [busy, quickAfterMs, heavyAfterMs]);

  return {
    tier,
    showQuickPulse: busy && tier >= 1,
    showHeavySkeleton: busy && tier >= 2,
  };
}

/**
 * Avoid skeleton flash on snappy loads: only show after delay; hold at least minHoldMs once shown.
 */
export function useDeferredSkeleton(
  isLoading: boolean,
  delayBeforeShow = 140,
  minHoldMs = 260,
) {
  const [visible, setVisible] = useState(false);
  const shownAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (isLoading) {
      const id = window.setTimeout(() => {
        setVisible(true);
        shownAtRef.current = Date.now();
      }, delayBeforeShow);
      return () => window.clearTimeout(id);
    }

    if (shownAtRef.current == null && !visible) return;

    const shownAt = shownAtRef.current ?? Date.now();
    const elapsed = Date.now() - shownAt;
    const remaining = Math.max(0, minHoldMs - elapsed);
    const id = window.setTimeout(() => {
      setVisible(false);
      shownAtRef.current = null;
    }, remaining);
    return () => window.clearTimeout(id);
  }, [isLoading, delayBeforeShow, minHoldMs, visible]);

  return visible;
}
