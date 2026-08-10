import { createContext, useContext, useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const LenisContext = createContext(null);

// Wraps the whole app in a Lenis instance and keeps ScrollTrigger in sync.
// Respects prefers-reduced-motion by skipping smoothing entirely, so the
// browser's native (instant) scroll takes over and no content is hidden.
export default function SmoothScroll({ children }) {
  const lenisRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setReady(true);
      return undefined;
    }

    const lenis = new Lenis({
      // Slightly slower/heavier than before (was 1.35 / 0.85) so scroll-
      // driven sections like the mural reveal actually have time to read
      // as motion instead of resolving in a flick of the wheel.
      duration: 1.6,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.7,
      touchMultiplier: 1,
    });
    lenisRef.current = lenis;
    setReady(true);

    lenis.on('scroll', ScrollTrigger.update);

    const tick = (time) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  return (
    <LenisContext.Provider value={{ lenis: lenisRef, ready }}>
      {children}
    </LenisContext.Provider>
  );
}

// Returns a scrollTo(target) helper that uses Lenis when available and
// falls back to native smooth scroll (or instant, under reduced motion).
export function useScrollTo() {
  const ctx = useContext(LenisContext);

  return (target, options = {}) => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lenis = ctx?.lenis?.current;

    if (lenis) {
      lenis.scrollTo(target, { duration: prefersReducedMotion ? 0 : 1.6, ...options });
    } else if (typeof target !== 'number') {
      target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    } else {
      window.scrollTo({ top: target, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }
  };
}

// Returns the live Lenis instance (or null under reduced motion / before
// mount) so callers can lock/unlock scrolling with .stop() / .start().
export function useLenis() {
  const ctx = useContext(LenisContext);
  return ctx?.lenis?.current ?? null;
}
