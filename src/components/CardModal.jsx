import { useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
