import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { setupMuralScroll } from '../animations/muralAnimations.js';
import { useScrollTo } from '../components/SmoothScroll.jsx';
import {
  MURAL_IMAGE,
  MURAL_IMAGE_ALT,
  MURAL_SLOGAN,
  MURAL_DESCRIPTION,
  MURAL_DESCRIPTION_EN,
  INTRO_TAGLINE,
} from '../data/content.js';

const MuralSection = forwardRef(function MuralSection(_props, ref) {
  const backdropRef = useRef(null);
  const frameRef = useRef(null);
  const imageWrapRef = useRef(null);
  const imageRef = useRef(null);
  const heroTitleRef = useRef(null);
  const imageCaptionRef = useRef(null);
  const descriptionRef = useRef(null);
  const lowerDecorRef = useRef(null);
  const scrollTo = useScrollTo();

  // Narration language toggle (ID/EN). Only the long-form description
  // block is bilingual — everything else on the page stays as-is.
  const [lang, setLang] = useState('id');

  // Refs for the height-matching logic below: langStackRef is the grid
  // wrapper whose inline height gets animated, idTextRef/enTextRef are
  // the two language blocks stacked inside it so we can measure
  // whichever one is actually active.
  const langStackRef = useRef(null);
  const idTextRef = useRef(null);
  const enTextRef = useRef(null);
  const isFirstHeightSync = useRef(true);

  // The translate button only makes sense while the reader is actually
  // in the narration block, so it stays hidden the rest of the page and
  // fades/slides in once .mural-lower-decor (description + end mark)
  // scrolls into view, and back out again once it's scrolled past.
  const [narrationVisible, setNarrationVisible] = useState(false);

  useEffect(() => {
    const el = lowerDecorRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setNarrationVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setNarrationVisible(entry.isIntersecting),
      { threshold: 0.08 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Keep the description stack's height matched to whichever language
  // is actually active, instead of always reserving room for the taller
  // of the two. scrollHeight of the active block is measured every time
  // `lang` changes (and on mount) and applied as an explicit px height;
  // the CSS transition on .mural-description-stack then animates
  // between sizes so the crossfade and the resize happen together.
  useLayoutEffect(() => {
    const stack = langStackRef.current;
    const activeEl = lang === 'id' ? idTextRef.current : enTextRef.current;
    if (!stack || !activeEl) return undefined;

    const targetHeight = activeEl.scrollHeight;

    if (isFirstHeightSync.current) {
      // First paint: set the height immediately, no animation, so there's
      // never a flash of the wrong size before the transition kicks in.
      gsap.set(stack, { height: targetHeight });
      isFirstHeightSync.current = false;
      return undefined;
    }

    gsap.killTweensOf(stack);
    gsap.to(stack, {
      height: targetHeight,
      duration: 0.5,
      ease: 'power2.inOut',
    });

    return () => gsap.killTweensOf(stack);
  }, [lang]);

  // Text can reflow at the same language (window resized, font loaded
  // late, etc.), so re-measure the active block on resize too — applied
  // instantly, no transition, since this isn't a language switch.
  useEffect(() => {
    const handleResize = () => {
      const stack = langStackRef.current;
      const activeEl = lang === 'id' ? idTextRef.current : enTextRef.current;
      if (!stack || !activeEl) return;
      gsap.set(stack, { height: activeEl.scrollHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [lang]);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const triggers = setupMuralScroll({
      sectionEl: ref.current,
      backdropEl: backdropRef.current,
      frameEl: frameRef.current,
      imageWrapEl: imageWrapRef.current,
      imageEl: imageRef.current,
      heroTitleEl: heroTitleRef.current,
      imageCaptionEl: imageCaptionRef.current,
      descriptionEl: descriptionRef.current,
      reduced,
    });
    return () => triggers.forEach((t) => t.kill());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sloganLines = MURAL_SLOGAN.split('\n');
  const descriptionParagraphsID = MURAL_DESCRIPTION.split('\n').filter((line) => line.trim().length > 0);
  const descriptionParagraphsEN = MURAL_DESCRIPTION_EN.split('\n').filter((line) => line.trim().length > 0);
  // Split on spaces so each word gets its own overflow-hidden "mask" span —
  // that's what lets the word slide up from underneath its own box rather
  // than just fading, the effect this is modelled on (grigoriak.doctor's
  // "Your Beauty" headline). Reused below for the slogan under the image
  // too, so both texts rise the same way.
  const heroTitleWords = INTRO_TAGLINE.split(' ');

  // Scrolls from the full-screen title down to the artwork just below it
  // — same Lenis-aware helper the rest of the app uses, so this respects
  // reduced-motion and falls back gracefully if Lenis isn't ready yet.
  const handleScrollHint = () => scrollTo(frameRef.current);

  return (
    <section className="mural" ref={ref} aria-label="Karya mural">
      <div className="mural-backdrop" ref={backdropRef} aria-hidden="true" />

      {/* 1. Full-screen title — just the short headline now, each word
          masked in its own overflow-hidden box and sliding up into place
          (grigoriak.doctor "Your Beauty" style). Scrolling here is
          completely free — nothing intercepts the wheel or touch input. */}
      <div className="mural-hero">
        {/* Purely decorative — three offset, overlapping rings behind the
            headline (echoes the card ring on the intro screen) so this
            first screen doesn't read as bare/empty. aria-hidden since
            they carry no information. */}
        <div className="mural-hero-rings" aria-hidden="true">
          <span className="mural-hero-ring mural-hero-ring--1" />
          <span className="mural-hero-ring mural-hero-ring--2" />
          <span className="mural-hero-ring mural-hero-ring--3" />
        </div>

        <h2 className="mural-hero-title" ref={heroTitleRef}>
          {heroTitleWords.map((word, i) => (
            <span className="mural-hero-title-mask" key={i}>
              <span className="mural-hero-title-word">{word}</span>
            </span>
          ))}
        </h2>

        {/* Pinned to the bottom of this full-screen title, hinting that
            there's more below — this section is free-scroll (no
            scroll-lock like the intro), so unlike the intro's CTA button
            this only needs to nudge the scroll along, not gate it. */}
        <button
          type="button"
          className="mural-scroll-hint"
          onClick={handleScrollHint}
          aria-label="Gulir ke bawah"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path
              d="M12 4 L12 19 M6 13 L12 19 L18 13"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* 2. Full-size image below the title — starts faded out, clipped
          down to a thin vertical sliver centered on the page, then as the
          section is scrolled into view it first rises/curtains open top-
          to-bottom, then widens outward from that centered sliver to fill
          the full frame (parallax-style: stop scrolling and it stops
          moving, scroll back up and it retreats). */}
      <div className="mural-frame" ref={frameRef}>
        <div className="mural-image-wrap" ref={imageWrapRef}>
          <img
            className="mural-image"
            ref={imageRef}
            src={MURAL_IMAGE}
            alt={MURAL_IMAGE_ALT}
            loading="lazy"
          />
        </div>
      </div>

      {/* 2b. The original multi-line slogan now lives here, as a caption
          right under the artwork. Same word-mask-and-rise treatment as the
          hero title above the image (each word in its own overflow-hidden
          box), just smaller and per-line instead of one flex-wrapped
          block — see .mural-image-caption-word in muralAnimations.js. */}
      <div className="mural-image-caption" ref={imageCaptionRef}>
        {sloganLines.map((line, i) => (
          <span className="mural-image-caption-line" key={i}>
            {line.split(' ').map((word, j) => (
              <span className="mural-image-caption-word-mask" key={j}>
                <span className="mural-image-caption-word">{word}</span>
              </span>
            ))}
          </span>
        ))}
      </div>

      {/* Divider between the slogan and the description below it. */}
      <hr className="mural-divider" />

      {/* Wraps the description + closing mark together purely so the
          decorative rings below (::before/::after) have one box to
          anchor to — same idea as .mural-hero-rings above, just tucked
          into the side gutters (well outside the description's own
          centered text column) instead of a corner, so the long stretch
          of paragraph text down here doesn't read as bare either. */}
      <div className="mural-lower-decor" ref={lowerDecorRef}>
        {/* 3. Description below the caption. Split into one <p> per
            paragraph (rather than a single block with raw \n's, which
            the browser would just collapse into spaces) so the
            long-form text keeps its paragraph breaks and stays
            readable. The ref stays on the wrapper so the existing
            single ScrollTrigger still fades the whole block in as one
            unit.

            Bilingual: both language versions are stacked in the same
            grid cell (see .mural-description-lang in global.css) so
            the container is always sized to the taller of the two —
            switching language crossfades in place instead of causing
            the page to jump. Only the active language is announced to
            screen readers. */}
        <div className="mural-description" ref={descriptionRef}>
          <div className="mural-description-stack" ref={langStackRef}>
            <div
              className={`mural-description-lang${lang === 'id' ? ' is-active' : ''}`}
              lang="id"
              aria-hidden={lang !== 'id'}
              ref={idTextRef}
            >
              {descriptionParagraphsID.map((paragraph, i) => (
                <p className="mural-description-paragraph" key={i}>
                  {paragraph}
                </p>
              ))}
            </div>
            <div
              className={`mural-description-lang${lang === 'en' ? ' is-active' : ''}`}
              lang="en"
              aria-hidden={lang !== 'en'}
              ref={enTextRef}
            >
              {descriptionParagraphsEN.map((paragraph, i) => (
                <p className="mural-description-paragraph" key={i}>
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* Closing mark — a short "end of chapter" flourish under the
            description, echoing the "TAMAT" divider at the end of a
            novel. */}
        <div className="mural-end-mark" aria-hidden="true">
          <span className="mural-end-mark-line" />
          <span className="mural-end-mark-ornament">
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
              <path
                d="M12 1 L14.5 9.5 L23 12 L14.5 14.5 L12 23 L9.5 14.5 L1 12 L9.5 9.5 Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <span className="mural-end-mark-line" />
        </div>
      </div>

      {/* Translate toggle — fixed to the bottom-right corner, only
          visible while the narration block is actually on screen
          (see the IntersectionObserver above). A sliding pill behind
          "IND"/"ENG" animates between the two, and the text itself
          crossfades via .mural-description-lang above. */}
      <div
        className={`lang-toggle${narrationVisible ? ' is-visible' : ''}`}
        role="group"
        aria-label="Pilih bahasa narasi / Narration language"
      >
        <span className="lang-toggle-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M3 12 H21 M12 3 C14.5 6 15.5 9 15.5 12 C15.5 15 14.5 18 12 21 C9.5 18 8.5 15 8.5 12 C8.5 9 9.5 6 12 3 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
        </span>
        <span className="lang-toggle-track">
          <span className={`lang-toggle-thumb${lang === 'en' ? ' lang-en' : ''}`} aria-hidden="true" />
          <button
            type="button"
            className={`lang-toggle-btn${lang === 'id' ? ' is-active' : ''}`}
            onClick={() => setLang('id')}
            aria-pressed={lang === 'id'}
          >
            IND
          </button>
          <button
            type="button"
            className={`lang-toggle-btn${lang === 'en' ? ' is-active' : ''}`}
            onClick={() => setLang('en')}
            aria-pressed={lang === 'en'}
          >
            ENG
          </button>
        </span>
      </div>
    </section>
  );
});

export default MuralSection;
