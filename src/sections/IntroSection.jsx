import { forwardRef, useEffect, useRef } from 'react';
import CharacterGrid from '../components/CharacterGrid.jsx';
import { playIntroEntrance, playWallOpenTransition } from '../animations/introAnimations.js';
import { ARTIST_NAME, INTRO_TAGLINE, CTA_LABEL } from '../data/content.js';

const IntroSection = forwardRef(function IntroSection({ collapsed, onEnterMural }, ref) {
  const stageRef = useRef(null);
  const eyebrowRef = useRef(null);
  const nameRef = useRef(null);
  const taglineRef = useRef(null);
  const ctaRef = useRef(null);
  const hasOpened = useRef(false);
  const raf1Ref = useRef(null);

  useEffect(() => {
    // Mounting this section also mounts 36 fairly heavy card components
    // (each with an SVG glyph, two faces, etc.) in the same synchronous
    // React commit as this effect. That work can occupy the main thread
    // for a while right as the tween below is created — and because a
    // GSAP tween's progress is measured against real elapsed time, if the
    // thread is still busy when the tween's clock effectively starts, its
    // very first tick can land AFTER a big chunk of the duration has
    // already "elapsed", so it jumps straight to (or near) its end state
    // instead of visibly animating through it. That's the reported
    // "kadang tidak beranimasi" bug — the text still ends up fully
    // visible (so it doesn't look broken), it just skips the fade/rise on
    // slower devices or heavier first paints. A double rAF defers
    // creating the timeline until two full frames after mount, i.e. after
    // the browser has actually painted the initial (hidden) state and the
    // heavy card mount work is behind it — so the tween's clock only ever
    // starts once the thread is free to keep up with it every frame.
    let cancelled = false;
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => {
        if (cancelled) return;
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const textEls = [eyebrowRef.current, nameRef.current, taglineRef.current, ctaRef.current];
        playIntroEntrance({ entranceSelector: '.card-anim', introTextEls: textEls, reduced });
      });
      // Stash so cleanup can cancel it too — see below.
      raf1Ref.current = raf2;
    });
    raf1Ref.current = raf1;
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1Ref.current);
    };
  }, []);

  const handleEnterMural = () => {
    if (hasOpened.current) return;
    hasOpened.current = true;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const textEls = [eyebrowRef.current, nameRef.current, taglineRef.current, ctaRef.current];

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
        <div className="intro-wall">
          <CharacterGrid />
        </div>
        <br />
        <div className="intro-copy">
          <p className="intro-eyebrow" ref={eyebrowRef}>
            Selamat datang
          </p>
          <h1 className="intro-name" ref={nameRef}>
            {ARTIST_NAME}
          </h1>
          <p className="intro-tagline" ref={taglineRef}>
            {INTRO_TAGLINE}
          </p>
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
