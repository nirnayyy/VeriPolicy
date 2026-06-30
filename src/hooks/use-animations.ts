import { useEffect, useRef, useState } from "react";

/**
 * Animated counter hook that smoothly counts from 0 to a target value.
 * Uses easeOutExpo for a dramatic fast-start, slow-finish effect.
 */
export function useCountUp(
  target: number,
  options: {
    duration?: number;
    enabled?: boolean;
    decimals?: number;
    prefix?: string;
    suffix?: string;
  } = {}
) {
  const { duration = 2000, enabled = true, decimals = 0, prefix = "", suffix = "" } = options;
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) {
      setValue(0);
      return;
    }

    const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutExpo(progress);

      setValue(easedProgress * target);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    startTimeRef.current = 0;
    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration, enabled]);

  const display = `${prefix}${value.toFixed(decimals)}${suffix}`;
  const rounded = decimals === 0 ? Math.round(value) : parseFloat(value.toFixed(decimals));

  return { value: rounded, display, raw: value };
}

/**
 * Intersection observer hook — triggers when element scrolls into view.
 * Returns a ref to attach and a boolean for visibility.
 */
export function useInView(options: IntersectionObserverInit = { threshold: 0.3 }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        observer.disconnect(); // Only trigger once
      }
    }, options);

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, inView };
}
