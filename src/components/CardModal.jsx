import { useEffect } from 'react';
import { createPortal } from 'react-dom';

// Enlarged view of a single card, shown centered over the whole screen
// when a card in the grid is clicked/tapped. Rendered via a portal to
// document.body so it always sits above everything else — including the
// intro wall's own `perspective`, which would otherwise turn a plain
// `position: fixed` here into something scoped to `.card-grid` instead of
// the real viewport (perspective establishes a containing block for
// fixed-position descendants, same as transform does).
export default function CardModal({ character, onClose }) {
  // Escape closes the modal from anywhere, no need to be focused on the
  // close button first.
  useEffect(() => {
    if (!character) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [character, onClose]);

  if (!character) return null;

  const { symbol, name, palette } = character;

  return createPortal(
    <div
      className="card-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Kartu ${symbol}, ${name}`}
      onClick={onClose}
    >
      <div
        className="card-modal-card"
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
        onClick={onClose}
        aria-label="Tutup"
      >
        ×
      </button>
    </div>,
    document.body
  );
}
