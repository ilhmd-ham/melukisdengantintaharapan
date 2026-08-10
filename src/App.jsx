import { useEffect, useRef, useState } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SmoothScroll, { useLenis } from './components/SmoothScroll.jsx';
import ScrollProgress from './components/ScrollProgress.jsx';
import IntroSection from './sections/IntroSection.jsx';
import MuralSection from './sections/MuralSection.jsx';

// Browsers only allow entering fullscreen in direct response to a user
// gesture — there's no way to have the page arrive fullscreen on its own.
// This requests it on the very first tap/click/keypress anywhere on the
// page (whichever happens first), so in practice it goes fullscreen the
// moment the visitor starts interacting, then never asks again. Silently
// does nothing if the browser/device doesn't support or allow it (e.g.
// iOS Safari has no page-level Fullscreen API at all), rather than
// showing an error.
function useFullscreenOnFirstInteraction() {
  useEffect(() => {
    const root = document.documentElement;
    const requestFullscreen =
      root.requestFullscreen || root.webkitRequestFullscreen || root.mozRequestFullScreen || root.msRequestFullscreen;
    if (!requestFullscreen) return undefined;

    const requestOnce = () => {
      const alreadyFullscreen =
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement;
      if (!alreadyFullscreen) {
        Promise.resolve(requestFullscreen.call(root)).catch(() => {});
      }
      window.removeEventListener('pointerdown', requestOnce);
      window.removeEventListener('keydown', requestOnce);
      window.removeEventListener('touchstart', requestOnce);
    };

    // pointerdown already covers touch on modern browsers, but touchstart
    // is added as a belt-and-braces fallback for older mobile WebViews.
    window.addEventListener('pointerdown', requestOnce, { once: true });
    window.addEventListener('keydown', requestOnce, { once: true });
    window.addEventListener('touchstart', requestOnce, { once: true, passive: true });

    return () => {
      window.removeEventListener('pointerdown', requestOnce);
      window.removeEventListener('keydown', requestOnce);
      window.removeEventListener('touchstart', requestOnce);
    };
  }, []);
}

// Blocks the easy, everyday ways to copy content off the page: right-click
// (context menu), drag-and-drop (e.g. dragging an image out to save it),
// text selection, and copy/cut. Inputs/textareas/contenteditable elements
// are explicitly exempted so the site never breaks a real form field.
//
// This is a deterrent for casual copying, not real protection — anyone
// who opens devtools or view-source can still read everything. Don't rely
// on this alone for anything that actually needs to stay private.
function useDisableCopyingAndContextMenu() {
  useEffect(() => {
    const isEditable = (target) =>
      target?.closest?.('input, textarea, [contenteditable="true"], [contenteditable=""]');

    const blockUnlessEditable = (e) => {
      if (isEditable(e.target)) return;
      e.preventDefault();
    };

    document.addEventListener('contextmenu', blockUnlessEditable);
    document.addEventListener('dragstart', blockUnlessEditable);
    document.addEventListener('selectstart', blockUnlessEditable);
    document.addEventListener('copy', blockUnlessEditable);
    document.addEventListener('cut', blockUnlessEditable);

    return () => {
      document.removeEventListener('contextmenu', blockUnlessEditable);
      document.removeEventListener('dragstart', blockUnlessEditable);
      document.removeEventListener('selectstart', blockUnlessEditable);
      document.removeEventListener('copy', blockUnlessEditable);
      document.removeEventListener('cut', blockUnlessEditable);
    };
  }, []);
}

// Locks/unlocks page scroll based on `unlocked`. While locked, native
// scroll, wheel, and touch are blocked (via a CSS class) and Lenis is
// paused, so the intro can only be left by pressing the CTA button.
function useScrollLock(unlocked, lenis) {
  useEffect(() => {
    document.documentElement.classList.toggle('scroll-locked', !unlocked);
    document.body.classList.toggle('scroll-locked', !unlocked);

    if (unlocked) {
      lenis?.start();
    } else {
      lenis?.stop();
    }
  }, [unlocked, lenis]);
}

function AppInner() {
  const introRef = useRef(null);
  const muralRef = useRef(null);
  const [unlocked, setUnlocked] = useState(false);
  const [introCollapsed, setIntroCollapsed] = useState(false);
  const lenis = useLenis();

  useScrollLock(unlocked, lenis);
  useFullscreenOnFirstInteraction();
  useDisableCopyingAndContextMenu();

  // Called once the "wall opens" transition has finished playing. Collapses
  // the intro out of the document flow (so there is nothing to scroll back
  // up into), then re-measures Lenis + ScrollTrigger against the new,
  // shorter document before unlocking — otherwise the mural's scroll-linked
  // reveal computes against stale (pre-collapse) positions and gets stuck.
  const handleEnterMural = () => {
    setIntroCollapsed(true);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        lenis?.resize();
        ScrollTrigger.refresh();
        if (lenis) {
          // Scroll is already locked at 0 in the normal case, so this is
          // just a safety net — but it's eased rather than an instant
          // jump so if it ever does have distance to cover, it settles
          // smoothly instead of snapping.
          lenis.scrollTo(0, { duration: 0.6 });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        setUnlocked(true);
      });
    });
  };

  return (
    <main>
      <ScrollProgress />
      <IntroSection ref={introRef} collapsed={introCollapsed} onEnterMural={handleEnterMural} />
      <MuralSection ref={muralRef} />
    </main>
  );
}

export default function App() {
  return (
    <SmoothScroll>
      <AppInner />
    </SmoothScroll>
  );
}
