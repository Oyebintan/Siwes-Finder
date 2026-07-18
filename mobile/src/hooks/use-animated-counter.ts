import { useEffect, useRef, useState } from 'react';

interface UseAnimatedCounterOptions {
  duration?: number;
  enabled?: boolean;
}

/**
 * Counts up from 0 to `target` with a cubic ease-out over `duration`ms
 * (900ms default, matching match-ring.tsx's gauge timing) -- for KPI/stat
 * numbers that should feel alive on mount/refresh instead of snapping in.
 * Re-triggers whenever `target` changes. Plain requestAnimationFrame on
 * the JS thread (not Reanimated) since this only drives a Text label, not
 * a gesture-linked transform -- same approach the design prototype itself
 * used for its KPI/gauge count-ups.
 */
export function useAnimatedCounter(target: number, { duration = 900, enabled = true }: UseAnimatedCounterOptions = {}): number {
  const [value, setValue] = useState(enabled ? 0 : target);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // The first requestAnimationFrame tick lands at ~elapsed=0 anyway, so
    // there's no need for a separate synchronous "reset to 0" setState
    // here -- letting the loop's own first frame do it keeps every
    // setValue call inside the (async) rAF callback, not the effect body.
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration, enabled]);

  return enabled ? value : target;
}
