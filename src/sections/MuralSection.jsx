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
  // "Your Beauty" headline).
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
          right under the artwork. */}
      <div className="mural-image-caption" ref={imageCaptionRef}>
        {sloganLines.map((line, i) => (
          <span className="mural-image-caption-line" key={i}>
            {line}
          </span>
        ))}
      </div>

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
    </section>
  );
});

export default MuralSection;
