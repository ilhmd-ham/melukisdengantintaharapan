import { useEffect, useRef } from 'react';
import { useLenis } from './SmoothScroll.jsx';

// A thin progress bar pinned to the bottom of the viewport, standing in
// for the native scrollbar (which is hidden globally — see global.css).
// Reads scroll position directly (from Lenis when it's running, native
// `scroll` otherwise under prefers-reduced-motion) rather than hooking
// into GSAP/ScrollTrigger, so it stays accurate even while other
// sections are pinned and the browser's own scroll position temporarily
// decouples from what's visually happening on screen.
export default function ScrollProgress() {
  const barRef = useRef(null);
  const lenis = useLenis();

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return undefined;

    const update = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, Math.max(0, scrollTop / max)) : 0;
      bar.style.transform = `scaleX(${progress})`;
    };

    update();

    if (lenis) {
      lenis.on('scroll', update);
    } else {
      window.addEventListener('scroll', update, { passive: true });
    }
    window.addEventListener('resize', update);

    return () => {
      if (lenis) {
        lenis.off('scroll', update);
      } else {
        window.removeEventListener('scroll', update);
      }
      window.removeEventListener('resize', update);
    };
  }, [lenis]);

  return (
    <div className="scroll-progress-track" aria-hidden="true">
      <div className="scroll-progress-bar" ref={barRef} />
    </div>
  );
}
