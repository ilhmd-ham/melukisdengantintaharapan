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
  // Flip state is driven ONLY by click/tap/keyboard, through a single,
  // plain toggle — no secondary state, no nested setState calls, no
  // requestAnimationFrame bookkeeping. An earlier version layered a
  // "pop flash" animation on top of this (a second `justOpened` state set
  // from inside the `setPinned` updater, cleared via onAnimationEnd), and
  // that's what caused the reported bug where pressing a card didn't flip
  // it until the cursor moved away or another card was clicked: nesting a
  // second component's setState call inside the first one's functional
  // updater made the resulting re-render land a tick late, so the visual
  // flip only caught up once some later, unrelated event (mouseleave,
  // another click) forced the next re-render. Keeping this to one state
  // variable means the class change — and the CSS transition that plays
  // it — always commits in the exact same render as the click.
  const [pinned, setPinned] = useState(false);
  const { id, symbol, name, mark, palette } = character;

  const togglePinned = () => setPinned((p) => !p);

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
          className={`card ${pinned ? 'is-flipped' : ''}`}
          onClick={togglePinned}
          onKeyDown={handleKeyDown}
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
