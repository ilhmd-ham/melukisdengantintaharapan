import { useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Enlarged view of a single card, shown centered over the whole screen
// when a card in the grid is clicked/tapped. Rendered via a portal to
// document.body so it always sits above everything else — including the
// intro wall's own `perspective`, which would otherwise turn a plain
// `position: fixed` here into something scoped to `.card-grid` instead of
// the real viewport (perspective establishes a containing block for
// fixed-position descendants, same as transform does).
//
// The open/close transitions are a manual FLIP (First-Last-Invert-Play):
// this card is always laid out at its natural resting spot (centered,
// full modal size) via CSS — GSAP never touches layout, only an inverted
// transform on top of it. On open, `origin` (captured by CharacterGrid at
// the moment of click — see measureCard()) gives the real card's exact
// on-screen position/size; we invert the modal into that exact spot with
// a transform, then animate the transform back to identity, so it
// visually "arrives" from wherever the clicked card actually was. On
// close we do the same in reverse, except the target has to be
// RE-measured at that exact moment (via getLiveOrigin) rather than reused
// from open time, because the ring never stops orbiting — the card has
// moved on since it was clicked.
//
// Deliberately position/scale only — no rotation. The ring's rotation
// value climbs continuously and unboundedly the longer the page has been
// open (it's just elapsed-time × angular speed, never wrapped back into
// 0-360), so animating "from" or "to" that raw number span hundreds or
// thousands of degrees of ACTUAL spinning rather than the short turn it
// looks like at a glance — that's what caused the card to visibly whirl
// around instead of just sliding in. Simplest reliable fix: the modal
// card never rotates at all, so there's nothing to wrap or spin — it
// always reads as a straight pull from one side, never a flip.
export default function CardModal({ character, origin, getLiveOrigin, onClose }) {
  const cardRef = useRef(null);
  const closingRef = useRef(false);

  useEffect(() => {
    if (!character) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') requestClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character]);

  // FLIP-in. Runs synchronously before paint so the very first frame the
  // user sees is already the inverted (origin) state, never a flash of
  // the resting centered state.
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el || !origin) return undefined;

    closingRef.current = false;

    const rect = el.getBoundingClientRect();
    const restX = rect.left + rect.width / 2;
    const restY = rect.top + rect.height / 2;
    const scale = rect.width ? origin.width / rect.width : 1;

    gsap.killTweensOf(el);

    if (prefersReducedMotion()) {
      gsap.set(el, { x: 0, y: 0, scale: 1, opacity: 1 });
      return undefined;
    }

    gsap.set(el, {
      x: origin.x - restX,
      y: origin.y - restY,
      scale,
      transformOrigin: '50% 50%',
    });
    gsap.to(el, {
      x: 0,
      y: 0,
      scale: 1,
      duration: 0.7,
      ease: 'power3.out',
    });

    return () => gsap.killTweensOf(el);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character, origin]);

  // FLIP-out. Re-measures the real card's LIVE position right now (not
  // the position it was at when opened) so the modal flies back to
  // wherever it has actually orbited to in the meantime, then only tells
  // the parent to unmount once that flight has actually landed.
  const requestClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;

    const el = cardRef.current;
    const live = el ? getLiveOrigin?.() : null;

    if (!el || !live || prefersReducedMotion()) {
      onClose();
      return;
    }

    const rect = el.getBoundingClientRect();
    const restX = rect.left + rect.width / 2;
    const restY = rect.top + rect.height / 2;
    const scale = rect.width ? live.width / rect.width : 1;

    gsap.killTweensOf(el);
    gsap.to(el, {
      x: live.x - restX,
      y: live.y - restY,
      scale,
      duration: 0.55,
      ease: 'power2.in',
      onComplete: onClose,
    });
  };

  if (!character) return null;

  const { symbol, name, palette } = character;

  return createPortal(
    <div
      className="card-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Kartu ${symbol}, ${name}`}
      onClick={requestClose}
    >
      <div
        className="card-modal-card"
        ref={cardRef}
        style={{
          background: palette.back,
          color: palette.ink,
          '--card-outline': palette.outline,
        }}
        // Stop the click from reaching the overlay (which closes the
        // modal) so tapping the card itself doesn't dismiss it.
        onClick={(e) => e.stopPropagation()}
      >
        <span className="card-modal-symbol">{symbol}</span>
        <span className="card-modal-name">{name}</span>
      </div>

      <button
        type="button"
        className="card-modal-close"
        onClick={requestClose}
        aria-label="Tutup"
      >
        ×
      </button>
    </div>,
    document.body
  );
}
