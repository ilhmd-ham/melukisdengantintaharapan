import { useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Flies `el` from `from` to `to` along a single straight line — position,
// scale, and rotation all eased together in one tween (no bezier arc, no
// separate rotation stage). On open the card is tilted at its live angle
// on the ring and straightens out to upright as it arrives; on close it
// does the reverse, straight back to wherever the ring has carried it.
function flyCard(el, { from, to, duration, ease, onComplete }) {
  gsap.set(el, {
    x: from.x,
    y: from.y,
    scale: from.scale,
    rotation: from.rotation,
    transformOrigin: '50% 50%',
  });

  return gsap.to(el, {
    x: to.x,
    y: to.y,
    scale: to.scale,
    rotation: to.rotation,
    duration,
    ease,
    onComplete,
  });
}

export default function CardModal({ character, origin, getLiveOrigin, onClose }) {
  const cardRef = useRef(null);
  const closingRef = useRef(false);
  const tlRef = useRef(null);

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
  // the resting centered state. Flies the card from its live position AND
  // live tilt on the ring straight to the centered reading spot, scaling
  // up and straightening to upright as it arrives — a direct pull, not a
  // curved detour.
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el || !origin) return undefined;

    closingRef.current = false;
    tlRef.current?.kill();

    const rect = el.getBoundingClientRect();
    const restX = rect.left + rect.width / 2;
    const restY = rect.top + rect.height / 2;
    const scale = rect.width ? origin.width / rect.width : 1;

    gsap.killTweensOf(el);

    if (prefersReducedMotion()) {
      gsap.set(el, { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 });
      return undefined;
    }

    tlRef.current = flyCard(el, {
      from: { x: origin.x - restX, y: origin.y - restY, scale, rotation: origin.rotation },
      to: { x: 0, y: 0, scale: 1, rotation: 0 },
      duration: 0.65,
      ease: 'power3.out',
    });

    return () => tlRef.current?.kill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character, origin]);

  // FLIP-out. Re-measures the real card's LIVE position AND live tilt on
  // the ring right now (not where it was when opened) so the flight back
  // goes straight to wherever the ring has actually carried it to in the
  // meantime, shrinking and tilting back to that angle as it lands, then
  // only tells the parent to unmount once it arrives.
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
    tlRef.current?.kill();

    tlRef.current = flyCard(el, {
      from: { x: 0, y: 0, scale: 1, rotation: 0 },
      to: { x: live.x - restX, y: live.y - restY, scale, rotation: live.rotation },
      duration: 0.5,
      ease: 'power2.in',
      onComplete: onClose,
    });
  };

  if (!character) return null;

  const { symbol, name, aspiration, palette } = character;

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
        <span className="card-modal-aspiration">
          Saya ingin menjadi {aspiration ?? '...'}
        </span>
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
