import { forwardRef, useEffect, useLayoutEffect, useRef } from 'react';
import CharacterGrid from '../components/CharacterGrid.jsx';
import {
  playCardFormation,
  playWallOpenTransition,
  getCenterOffset,
  getRadius,
} from '../animations/introAnimations.js';
import { ARTIST_NAME_PREFIX, ARTIST_NAME_SHORT, INTRO_YEAR, CTA_LABEL } from '../data/content.js';

const IntroSection = forwardRef(function IntroSection({ collapsed, onEnterMural }, ref) {
  const stageRef = useRef(null);
  const wallRef = useRef(null);
  const yearRef = useRef(null);
  const nameRef = useRef(null);
  const ctaRef = useRef(null);
  const hasOpened = useRef(false);
  const rafRef = useRef(null);
  const formationRef = useRef(null); // { killOrbit } — see introAnimations.js

  // Sets --ring-cx (read by .intro-copy-center in global.css to shift the
  // name to match the ring's off-screen-left center on mobile) the instant
  // this section mounts — synchronously, before the browser paints. The
  // card-formation animation below also sets this same variable, but only
  // after two deferred animation frames; without this earlier pass, the
  // very first paint (and any resize that lands before the formation
  // effect runs) used CSS's own 0px fallback, so the name would flash — or
  // on slower devices genuinely sit — dead-center before snapping left.
  useLayoutEffect(() => {
    getCenterOffset(getRadius());
    const onResize = () => getCenterOffset(getRadius());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    // Mounting this section also mounts 36 fairly heavy card components in
    // the same synchronous React commit as this effect — a double rAF
    // defers starting the formation timeline until two full frames after
    // mount, i.e. after the browser has actually painted the initial
    // (hidden) state and that mount work is behind it. See the git history
    // of this file for the fuller explanation of why this matters.
    let cancelled = false;
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => {
        if (cancelled) return;
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const textEls = [yearRef.current, nameRef.current, ctaRef.current];
        formationRef.current = playCardFormation({
          entranceSelector: '.card-anim',
          introTextEls: textEls,
          // Makes the ring swipeable — a drag/swipe on the wall rotates
          // it (see startOrbit's pointer-drag handling in
          // introAnimations.js, which already had this wired up but was
          // never actually given an element to bind to). This is what
          // lets every card be reached by hand instead of only via the
          // slow ambient auto-rotation — most useful on mobile, where the
          // ring's far half sits off-screen (see getCenterOffset) and
          // otherwise only the automatic orbit would ever bring it into
          // view.
          dragEl: wallRef.current,
          reduced,
        });
      });
      rafRef.current = raf2;
    });
    rafRef.current = raf1;

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      formationRef.current?.killOrbit();
    };
  }, []);

  const handleEnterMural = () => {
    if (hasOpened.current) return;
    hasOpened.current = true;

    // Stop the idle orbit before anything else touches these elements —
    // otherwise it keeps writing x/y every frame right through the
    // fly-away transition below.
    formationRef.current?.killOrbit();

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const textEls = [yearRef.current, nameRef.current, ctaRef.current];

    playWallOpenTransition({
      stageEl: stageRef.current,
      cardsSelector: '.card-slot',
      introTextEls: textEls,
      reduced,
      onComplete: onEnterMural,
    });
  };

  return (
    <section
      className={`intro ${collapsed ? 'is-collapsed' : ''}`}
      ref={ref}
      aria-hidden={collapsed}
      aria-label="Perkenalan artis dan kartu karakter"
    >
      <div className="intro-stage" ref={stageRef}>
        <div className="intro-wall" ref={wallRef}>
          <CharacterGrid />
        </div>

        <div className="intro-copy">
          {/* Only shown on mobile (see .intro-year in global.css) — pinned
              to the top of the screen, above the ring. Hidden on desktop,
              where the name is centered as a single block same as before. */}
          <p className="intro-year" ref={yearRef}>
            {INTRO_YEAR}
          </p>

          {/* Kept in its own wrapper (rather than styling .intro-name
              directly) so the same left-shift-to-match-the-ring's-center
              trick (--ring-cx, see global.css) can apply to it without
              having to touch .intro-name itself. */}
          <div className="intro-copy-center">
            <h1 className="intro-name" ref={nameRef}>
              {/* "XII" is hidden on mobile via .intro-name-prefix in
                  global.css — only "RPL C" shows there; desktop shows
                  both. */}
              <span className="intro-name-prefix">{ARTIST_NAME_PREFIX} </span>
              {ARTIST_NAME_SHORT}
            </h1>
          </div>

          <button
            type="button"
            className="cta"
            ref={ctaRef}
            onClick={handleEnterMural}
            disabled={collapsed}
            tabIndex={collapsed ? -1 : 0}
          >
            <span>{CTA_LABEL}</span>
            <span className="cta-arrow" aria-hidden="true">
              →
            </span>
          </button>
        </div>
      </div>
    </section>
  );
});

export default IntroSection;
