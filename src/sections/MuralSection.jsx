import { forwardRef, useEffect, useRef } from 'react';
import { setupMuralScroll } from '../animations/muralAnimations.js';
import {
  MURAL_IMAGE,
  MURAL_IMAGE_ALT,
  MURAL_SLOGAN,
  MURAL_DESCRIPTION,
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
  const descriptionParagraphs = MURAL_DESCRIPTION.split('\n').filter((line) => line.trim().length > 0);
  // Split on spaces so each word gets its own overflow-hidden "mask" span —
  // that's what lets the word slide up from underneath its own box rather
  // than just fading, the effect this is modelled on (grigoriak.doctor's
  // "Your Beauty" headline). Reused below for the slogan under the image
  // too, so both texts rise the same way.
  const heroTitleWords = INTRO_TAGLINE.split(' ');

  return (
    <section className="mural" ref={ref} aria-label="Karya mural">
      <div className="mural-backdrop" ref={backdropRef} aria-hidden="true" />

      {/* 1. Full-screen title — just the short headline now, each word
          masked in its own overflow-hidden box and sliding up into place
          (grigoriak.doctor "Your Beauty" style). Scrolling here is
          completely free — nothing intercepts the wheel or touch input. */}
      <div className="mural-hero">
        <h2 className="mural-hero-title" ref={heroTitleRef}>
          {heroTitleWords.map((word, i) => (
            <span className="mural-hero-title-mask" key={i}>
              <span className="mural-hero-title-word">{word}</span>
            </span>
          ))}
        </h2>
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

      {/* 3. Description below the caption. Split into one <p> per paragraph
          (rather than a single block with raw \n's, which the browser
          would just collapse into spaces) so the long-form text keeps its
          paragraph breaks and stays readable. The ref stays on the
          wrapper so the existing single ScrollTrigger still fades the
          whole block in as one unit. */}
      <div className="mural-description" ref={descriptionRef}>
        {descriptionParagraphs.map((paragraph, i) => (
          <p className="mural-description-paragraph" key={i}>
            {paragraph}
          </p>
        ))}
      </div>

      {/* Closing mark — a short "end of chapter" flourish under the
          description, echoing the "TAMAT" divider at the end of a novel. */}
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
    </section>
  );
});

export default MuralSection;
