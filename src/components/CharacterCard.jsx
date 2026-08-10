import { useState } from 'react';

// Six abstract, hand-drawn-feeling glyphs used on the card backs. They stand
// in for the artist's own mark-making — swap the <path> data for real
// symbols/sketches whenever you like.
const MARKS = [
  (c) => (
    <path d="M20 44 L44 20 M20 20 L44 44" stroke={c} strokeWidth="2.5" strokeLinecap="round" fill="none" />
  ),
  (c) => <circle cx="32" cy="32" r="14" stroke={c} strokeWidth="2.5" fill="none" />,
  (c) => (
    <path d="M18 46 C18 22 46 22 46 46" stroke={c} strokeWidth="2.5" strokeLinecap="round" fill="none" />
  ),
  (c) => <rect x="19" y="19" width="26" height="26" rx="2" stroke={c} strokeWidth="2.5" fill="none" transform="rotate(12 32 32)" />,
  (c) => (
    <path d="M32 16 L44 48 L20 48 Z" stroke={c} strokeWidth="2.5" strokeLinejoin="round" fill="none" />
  ),
  (c) => (
    <path d="M16 32 Q24 16 32 32 Q40 48 48 32" stroke={c} strokeWidth="2.5" strokeLinecap="round" fill="none" />
  ),
];

export default function CharacterCard({ character, style }) {
  // Flip state is driven ONLY by click/tap/keyboard (`pinned`). Earlier this
  // also flipped on mouse hover, which caused two bugs on desktop: (1) the
  // card would already be open by the time the click landed, so the click
  // appeared to do nothing, and (2) clicking again while the cursor was
  // still over the card couldn't close it, since hover kept forcing it
  // open. Using a single source of truth makes every click/tap register
  // immediately and predictably, on every device.
  const [pinned, setPinned] = useState(false);
  const [justOpened, setJustOpened] = useState(false);
  const flipped = pinned;
  const { id, symbol, name, mark, palette } = character;

  const togglePinned = () => {
    setPinned((p) => {
      const next = !p;
      if (next) {
        // Retriggers the "pop" micro-animation class each time a card opens.
        setJustOpened(false);
        requestAnimationFrame(() => setJustOpened(true));
      }
      return next;
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      togglePinned();
    }
  };

  return (
    <div className="card-slot" style={style}>
      {/* This inner wrapper is what the entrance animation (opacity/scale/y)
          targets. Keeping it separate from .card-slot means GSAP never
          overwrites the CSS-variable transform that scatters the cards, and
          separate from .card means it never fights the flip transition. */}
      <span className="card-anim">
        <button
          type="button"
          className={`card ${flipped ? 'is-flipped' : ''} ${flipped && justOpened ? 'is-opening' : ''}`}
          onClick={togglePinned}
          onKeyDown={handleKeyDown}
          onAnimationEnd={() => setJustOpened(false)}
          aria-pressed={pinned}
          aria-label={`Kartu ${symbol}, ${name}. ${pinned ? 'Tekan untuk kembali ke sisi depan' : 'Tekan untuk melihat nama'}`}
        >
          <span className="card-face card-front" style={{ background: palette.front, color: palette.back }}>
            <span className="card-symbol">{symbol}</span>
            <svg className="card-glyph" viewBox="0 0 64 64" aria-hidden="true">
              {MARKS[mark](palette.back)}
            </svg>
          </span>
          <span className="card-face card-back" style={{ background: palette.front, color: palette.back }}>
            <span className="card-back-number">{symbol}</span>
            <span className="card-back-name">{name}</span>
          </span>
        </button>
      </span>
    </div>
  );
}
