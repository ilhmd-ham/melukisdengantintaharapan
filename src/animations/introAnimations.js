import gsap from 'gsap';

// Plays once on mount: the 36 cards settle into place and the intro copy
// rises in behind them, like a wall being lit up.
//
// NOTE: this animates `.card-anim` (an inner wrapper), never `.card-slot`.
// `.card-slot` carries the CSS-variable-based scatter transform
// (translate/rotate/scale from CharacterGrid's seeded placement) — if GSAP
// wrote opacity/scale/y transforms onto that same element, its inline
// `transform` would permanently overwrite the scattered position the
// moment this animation ran, leaving every card dead-centered with no
// rotation. Animating the wrapper instead keeps the two systems independent.
export function playIntroEntrance({ entranceSelector, introTextEls, reduced }) {
  const introTl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  if (reduced) {
    gsap.set(entranceSelector, { opacity: 1, scale: 1, y: 0 });
    gsap.set(introTextEls, { opacity: 1, y: 0 });
    return introTl;
  }

  // The text is its own independent tween — NOT chained after the
  // 36-card tween the way it used to be. Chaining them meant the text's
  // .to() only got queued once the cards' .to() had been fully set up,
  // so anything that slowed down or interrupted the card tween delayed
  // or skipped the text along with it. Keeping them independent means
  // the text always gets its own clean run at animating in, regardless
  // of what the cards are doing.
  gsap.set(introTextEls, { opacity: 0, y: 24 });
  introTl.to(introTextEls, { opacity: 1, y: 0, duration: 0.9, stagger: 0.08 }, 0.35);

  try {
    const cardsTl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    cardsTl.set(entranceSelector, { opacity: 0, scale: 0.7, y: 28 });
    cardsTl.to(entranceSelector, {
      opacity: 1,
      scale: 1,
      y: 0,
      duration: 1.1,
      stagger: { each: 0.014, from: 'random' },
    });
  } catch (err) {
    gsap.set(entranceSelector, { opacity: 1, scale: 1, y: 0 });
  }

  // Last-resort safety net, not the primary mechanism: if for any reason
  // the tween above never got to run (a thrown error elsewhere on the
  // page, a tab that loaded fully backgrounded, etc.) the text must not
  // stay invisible forever. This fires well after the tween's own 0.9s +
  // 0.35s start delay would have finished, so in the normal case it's a
  // harmless no-op on already-correct values — it only ever matters as a
  // fallback, so it's never the thing skipping the animation itself.
  const forceVisible = () => gsap.set(introTextEls, { opacity: 1, y: 0 });
  setTimeout(forceVisible, 1800);

  return introTl;
}

// Cinematic hand-off from the card wall to the mural section. Cards break
// apart and drift outward, the intro copy dissolves upward, and the whole
// stage fades so the mural can rise from behind it. Calls onComplete once
// the visual beat has finished (used to trigger the smooth-scroll hand-off).
export function playWallOpenTransition({
  stageEl,
  cardsSelector,
  introTextEls,
  onComplete,
  reduced,
}) {
  const tl = gsap.timeline({
    defaults: { ease: 'power2.inOut' },
    onComplete,
  });

  if (reduced) {
    onComplete?.();
    return tl;
  }

  const cards = gsap.utils.toArray(cardsSelector);

  tl.to(introTextEls, { opacity: 0, y: -30, duration: 0.5, stagger: 0.03 }, 0);

  cards.forEach((card, i) => {
    const angle = (i / cards.length) * Math.PI * 2;
    const dist = 260 + (i % 7) * 30;
    tl.to(
      card,
      {
        x: `+=${Math.cos(angle) * dist}`,
        y: `+=${Math.sin(angle) * dist}`,
        rotate: `+=${(i % 2 === 0 ? 1 : -1) * (40 + (i % 5) * 12)}`,
        opacity: 0,
        scale: 0.4,
        duration: 0.9,
        ease: 'power1.in',
      },
      0.05 + (i % 12) * 0.012
    );
  });

  tl.to(stageEl, { opacity: 0, duration: 0.6, ease: 'power1.in' }, '-=0.35');

  return tl;
}
