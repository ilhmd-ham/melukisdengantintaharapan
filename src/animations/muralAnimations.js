import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Sets up the mural section's storytelling sequence — everything here is
// free-scrolling (nothing ever intercepts the wheel/touch or forces the
// page to move on its own): the image and text simply track scroll
// position directly, like layers of a parallax illustration.
// 1) the hero title's words rise up out of masked boxes once scrolled
//    into view (grigoriak.doctor "Your Beauty" style)
// 2) the image starts invisible on page load, already fairly wide (only
//    modestly inset from its left/right edges, not a thin sliver) and
//    centered on the page. As the section is scrolled into view it fades
//    and rises into place smoothly right away (a quick, non-scrubbed
//    tween — no black pause waiting on scroll). Separately, and slightly
//    overlapping, it curtains open top-to-bottom then widens outward —
//    left and right filling in from the center — to the full frame. That
//    curtain/widen part IS driven by scrub (stop scrolling and it stops
//    moving, scroll back up and it retreats the same way) but over a
//    shorter window so it reaches full width well before the section
//    scrolls all the way to the top.
// 3) the caption (the original multi-line slogan, now under the image)
//    and the long-form description each settle in with their own gentle,
//    scroll-triggered entrance once they come into view
//
// Returns the ScrollTrigger instances so the caller can kill them on unmount.
export function setupMuralScroll({
  sectionEl,
  backdropEl,
  frameEl,
  imageWrapEl,
  imageEl,
  heroTitleEl,
  heroClassEl,
  imageCaptionEl,
  descriptionEl,
  reduced,
}) {
  const triggers = [];
  const isMobile = window.matchMedia('(max-width: 900px)').matches;
  const heroWords = heroTitleEl ? heroTitleEl.querySelectorAll('.mural-hero-title-word') : [];
  // Slogan under the image now rises word-by-word out of masked boxes too
  // (see MuralSection.jsx + .mural-image-caption-word-mask CSS), same
  // technique as heroWords above — just its own querySelectorAll since it
  // lives in a different element.
  const captionWords = imageCaptionEl
    ? imageCaptionEl.querySelectorAll('.mural-image-caption-word')
    : [];

  if (reduced) {
    gsap.set(imageWrapEl, { opacity: 1, y: '0%', clipPath: 'inset(0% 0% 0% 0%)' });
    gsap.set(descriptionEl, { opacity: 1, y: 0 });
    gsap.set([heroWords, captionWords], { yPercent: 0, opacity: 1 });
    if (heroClassEl) gsap.set(heroClassEl, { opacity: 1, y: 0 });
    return { triggers, playHeroTitle: () => {} };
  }

  // On mobile the reveal previously started translated 55% below its own
  // box — the transform's downward offset visually pushed the image over
  // the caption sitting right underneath it (transforms don't reserve
  // layout space, so a big "y" excursion simply paints over whatever is
  // next in the flow). Mobile viewports are shorter and the gap to the
  // caption is tighter, so that overshoot is what caused the reported
  // overlap. Keeping the excursion much smaller on mobile keeps the same
  // "emerging" feel without ever reaching into the next block.
  const startY = isMobile ? '14%' : '28%';
  // How much the image starts inset from its left/right edges, as a
  // percentage eaten off each side. Kept modest on purpose (rather than
  // the ~49 that produced a hairline sliver dead-center) so the image is
  // already fairly wide before it's even scrolled into view — less
  // horizontal distance to animate, which also means the section doesn't
  // need to load/paint a big width change later. Plain number (no "%")
  // because it drives a hand-rolled clip-path string below, not a
  // gsap-tweened CSS value directly.
  const startInsetX = isMobile ? 18 : 14;

  // The clip-path's left and right insets are driven from ONE shared
  // number (clipState.side) instead of letting GSAP tween the two "49%"
  // occurrences inside a single clip-path string independently. Tweening
  // a multi-value clip-path string that way is what caused the reported
  // bug — left and right didn't always land on the same value at the
  // same time, so the reveal visibly snapped full on one side while the
  // other was still catching up. Driving both from one number and
  // building the string ourselves on every update guarantees they are
  // always identical, so the image can only ever widen evenly, in sync,
  // from dead-center outward.
  const clipState = { top: 100, side: startInsetX };
  const applyClip = () => {
    imageWrapEl.style.clipPath = `inset(${clipState.top}% ${clipState.side}% 0% ${clipState.side}%)`;
  };
  applyClip();

  // Starting state (also what's visible the instant the page loads, since
  // this section sits right below the intro and its ScrollTrigger hasn't
  // fired yet): fully transparent, sitting slightly below its resting
  // spot. clip-path itself is set above via applyClip().
  gsap.set(imageWrapEl, { opacity: 0, y: startY });
  gsap.set(imageEl, { scale: 1.12 });
  gsap.set([heroWords, captionWords], { yPercent: 120, opacity: 0 });
  gsap.set(descriptionEl, { opacity: 0, y: 40 });
  if (heroClassEl) gsap.set(heroClassEl, { opacity: 0, y: 22 });

  // Reveal is now split into two INDEPENDENT pieces instead of one combined
  // scrubbed timeline. That split is the actual fix for two reported bugs
  // at once:
  //
  // "abis di scroll masih hitam, beberapa saat baru muncul gambar" — when
  // opacity/y were tweened as part of the same heavily-scrubbed timeline as
  // the clip-path widen, GSAP's scrub smoothing itself adds a lag before
  // the smoothed progress starts moving (that lag scales with the scrub
  // number), so with a slow scrub the very first thing the timeline
  // controls — the fade-in — was delayed too, reading as "still black,
  // then image pops in a beat later". Pulling opacity/y out into their own
  // NON-scrubbed, toggleActions-driven tween fixes the black gap: it
  // starts the instant the frame enters view rather than waiting on scroll
  // input. Its own duration was then slowed down further (1.6s → 3.4s,
  // heavier power4 decel) per follow-up feedback — "lambatkan kemunculan
  // gambar dari bawah ... seperti melebarnya kesamping kanan kiri" — so
  // the rise-from-below now reads as unhurried as the side-widen below,
  // instead of finishing noticeably quicker just because it isn't
  // scroll-scrubbed.
  //
  // "gambarnya full [width] saat sudah di scroll sampe atas ... full
  // width nya kurang cepat" — the widen was previously stretched across
  // the same very long start→end range as the whole reveal, so it only
  // ever finished once the section had been scrolled almost all the way
  // to its own top. The clip-path curtain/widen below now runs over a
  // shorter, earlier-finishing range ('top 92%' → 'top 45%') so it
  // reaches full width well before the section reaches the top of the
  // viewport — while keeping a heavy scrub (2.2) so the up/curtain and
  // left-right widen motion itself still reads as slow and smooth, per
  // "tetap buat lambat animasi keatas dan kesamping kanan kirinya".
  const appearTl = gsap.timeline({
    scrollTrigger: {
      trigger: frameEl || imageWrapEl,
      start: 'top 92%',
      toggleActions: 'play none none reverse',
    },
  });
  appearTl.to(imageWrapEl, { opacity: 1, y: '0%', duration: 5.4, ease: 'power4.out' }, 0);
  triggers.push(appearTl.scrollTrigger);

  // Curtain (vertical) + widen (horizontal) — bound directly to the
  // SECTION'S OWN SCROLL POSITION (same technique as the parallax
  // further below) — NOT pinned, so scrolling itself never feels
  // "stuck". The vertical curtain (clipState.top) and the horizontal
  // widen (clipState.side) OVERLAP on purpose — see the comment on the
  // "side" tween below — so the rise-up and the left/right widen happen
  // together rather than as two separate stages.
  const widenTl = gsap.timeline({
    scrollTrigger: {
      trigger: frameEl || imageWrapEl,
      start: 'top 92%',
      end: 'top 45%',
      // Heavy scrub so the curtain/widen itself still feels slow and
      // weighty as you scroll — this is what keeps "animasi keatas dan
      // kesamping kanan kirinya" slow even though the range above is
      // shorter than before.
      scrub: 2.2,
    },
  });
  widenTl
    // Vertical curtain (clipState.top) duration bumped from 0.42 to 0.9 —
    // at 0.42 it finished at only ~42% of the way through the widen's
    // scroll range while the side-widen below takes the full range to
    // finish, so for the same amount of scrolling the curtain opened
    // upward far faster than the image widened sideways. That mismatch is
    // what read as "keatasnya cepet banget" even after the sideways speed
    // was already right — 0.9 brings the two much closer to finishing
    // together.
    .to(clipState, { top: 0, ease: 'none', duration: 0.9, onUpdate: applyClip }, 0)
    // Side-widen starts at 0.32 — DELIBERATELY before the vertical
    // curtain (clipState.top) finishes at 0.9. That overlap window
    // is the actual fix for an earlier bug: previously "side" only
    // started once "top" had completely finished, which produced a
    // visible dead flat spot right as you scrolled — the reported
    // "muncul ke atas lalu berhenti sesaat, baru melebar" bug. Starting
    // side widening while the curtain is still finishing its last
    // stretch keeps something moving on every frame of scroll.
    .to(clipState, { side: 0, ease: 'none', duration: 0.68, onUpdate: applyClip }, 0.32)
    .to(imageEl, { scale: 1.02, ease: 'none', duration: 1 }, 0);
  triggers.push(widenTl.scrollTrigger);

  // Continuous parallax: once settled, the backdrop and the image keep
  // drifting at their own speed as the section scrolls past — bound
  // directly to scroll position, independent of the reveal above.
  const parallaxTl = gsap.timeline({
    scrollTrigger: {
      trigger: sectionEl,
      start: 'top bottom',
      end: 'bottom top',
      scrub: true,
    },
  });
  parallaxTl.fromTo(backdropEl, { y: 0 }, { y: '-14%', ease: 'none' }, 0);
  parallaxTl.fromTo(imageEl, { y: isMobile ? '-3%' : '-6%' }, { y: isMobile ? '5%' : '10%', ease: 'none' }, 0);
  triggers.push(parallaxTl.scrollTrigger);

  // Description entrance: gentle fade + rise once scrolled into view.
  const descTrigger = ScrollTrigger.create({
    trigger: descriptionEl,
    start: 'top 92%',
    onEnter: () =>
      gsap.to(descriptionEl, { opacity: 1, y: 0, duration: 2, ease: 'power2.out', delay: 0.3 }),
    onLeaveBack: () => gsap.to(descriptionEl, { opacity: 0, y: 40, duration: 0.8, ease: 'power2.in' }),
  });
  triggers.push(descTrigger);

  // Caption entrance (the multi-line slogan, now living under the image):
  // same word-mask rise as the hero title above the image, just smaller —
  // each word slides up out of its own overflow-hidden box rather than
  // the block fading in as a whole. Slightly slower/heavier than the hero
  // (duration 2.6 vs 2.2, stagger 0.2 vs 0.16) so it still reads as the
  // quieter, "settling into place" echo of the big headline above.
  if (captionWords.length) {
    gsap.timeline({
      scrollTrigger: {
        trigger: imageCaptionEl,
        start: 'top 90%',
        toggleActions: 'play reverse play reverse',
      },
    }).to(captionWords, {
      yPercent: 0,
      opacity: 1,
      duration: 2.6,
      ease: 'power3.out',
      stagger: 0.2,
    });
  }

  // Hero title: each word lives inside its own overflow-hidden mask span
  // (see MuralSection.jsx + the .mural-hero-title-mask CSS), so animating
  // yPercent on the inner word slides it up from completely out of view to
  // resting position — the word appears to rise out from behind the line
  // below it, rather than fading (grigoriak.doctor's "Your Beauty"
  // headline). Staggered so the words arrive one after another, and
  // slowed down (was 1.3s/0.6s with a snappier 0.09 stagger) so the rise
  // reads as a deliberate reveal rather than a quick pop.
  //
  // This used to be driven by hand-rolled onEnter/onEnterBack/onLeaveBack
  // callbacks plus a manual "heroPlayed" boolean to avoid double-firing.
  // That flag is exactly what caused the reported "kadang tidak
  // beranimasi" bug: this section is the very first thing visible the
  // instant the intro collapses, so this trigger is frequently created
  // while already inside its own "active" zone. Between the flag's state
  // and ScrollTrigger's own enter/refresh events firing in slightly
  // different orders across devices/timings, it was possible for
  // "heroPlayed" to end up true before the tween itself had actually
  // been queued — silently swallowing the animation while still leaving
  // the words visible by the time any later event tried (and no-opped)
  // to play it. `toggleActions` replaces all of that with GSAP's own
  // built-in, battle-tested state machine — "play" on enter, "reverse" on
  // leaveBack, and "play"/"reverse" again on re-entering either
  // direction — so there's no separate boolean that can drift out of
  // sync with what's actually on screen.
  let heroTl = null;
  if (heroWords.length) {
    heroTl = gsap.timeline({
      paused: true,
      scrollTrigger: {
        trigger: heroTitleEl,
        start: 'top 90%',
        // Was 'play reverse play reverse' — with 'play' as the first
        // (onEnter) action, this fired itself the instant it was created
        // if the trigger element already happened to be in view (which
        // it always was here — this section is the very first thing on
        // screen once the intro collapses), so the reveal finished
        // playing out several seconds before the loader curtain (a much
        // longer sequence) had even finished, hidden the whole time.
        // 'none' as the first slot means creating/refreshing this while
        // already in view does nothing — playHeroTitle() below is the
        // only thing that starts it now. The other three slots (leave/
        // enterBack/leaveBack) are untouched, so scrolling the title out
        // of view and back still reverses/replays it normally.
        toggleActions: 'none reverse play reverse',
      },
    }).to(heroWords, {
      yPercent: 0,
      opacity: 1,
      duration: 2.2,
      ease: 'power3.out',
      stagger: 0.16,
    });

    if (heroClassEl) {
      heroTl.to(
        heroClassEl,
        { opacity: 1, y: 0, duration: 1, ease: 'power2.out' },
        '-=1.1'
      );
    }

    triggers.push(heroTl.scrollTrigger);
  }

  return { triggers, playHeroTitle: () => heroTl?.play(0) };
}
